/**
 * AI 包括スタック分析(Phase 3 の本丸)
 *
 * ユーザーの stack_items を Claude に分析させ、ルールベースで拾えない
 * コンテキスト依存の改善案を返す。
 *
 * モデル: claude-opus-4-8 (最強。コスト気になったら claude-sonnet-4-6 に)
 * 思考: adaptive thinking
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { auditStack, type StackItem as AuditStackItem } from '@/lib/audit/engine';
import { getBillingStatus, recordAiUsage } from '@/lib/billing/usage';

type DbStackItem = {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  timing: string[] | null;
  notes: string | null;
  is_active: boolean;
};

const TIMING_LABEL: Record<string, string> = {
  morning: '朝',
  lunch: '昼',
  evening: '夕',
  bedtime: '就寝前',
  as_needed: '頓服'
};

/** Claude に渡す JSON Schema(構造化出力で形を保証) */
const ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    overall: {
      type: 'string',
      description:
        '全体評価。このスタックが何を最適化しようとしてるか、強み・足りない観点。2-3文(120-200字)。'
    },
    recommendations: {
      type: 'array',
      description:
        '具体的な改善案。最大5件。ルールベースで既に検出済みの項目は重複しないこと。',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '改善案のタイトル(40字以内)'
          },
          description: {
            type: 'string',
            description:
              '具体的な根拠と推奨アクション(120-220字)。「〜を検討」「〜だと吸収効率が」など、なぜそうするのかを含める。'
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description:
              'high=今すぐ対応推奨、medium=次の購入時に検討、low=知っておくと良い'
          },
          related_product_name: {
            type: 'string',
            description:
              '【新規サプリの追加を提案する場合のみ必須】 例: "L-テアニン", "アシュワガンダ KSM-66", "マグネシウム グリシネート"。検索キーワードとして使えるシンプルな成分・商品名。既存スタックの調整(タイミング変更・休止など)が主旨の場合は空でよい。'
          },
          related_product_dosage: {
            type: 'string',
            description:
              '推奨用量(例: "200mg", "600mg/日")。related_product_name と組み合わせて使う。'
          }
        },
        required: ['title', 'description', 'priority'],
        additionalProperties: false
      }
    },
    summary: {
      type: 'string',
      description:
        '総括(1-2文、80-120字)。「現在のスタックは〜、追加で〜を検討するとさらに〜」のような形。'
    }
  },
  required: ['overall', 'recommendations', 'summary'],
  additionalProperties: false
};

function formatStackForPrompt(items: DbStackItem[]): string {
  return items
    .map((item, i) => {
      const timing = (item.timing ?? [])
        .map((t) => TIMING_LABEL[t] ?? t)
        .join('・');
      const parts = [
        `${i + 1}. ${item.name}`,
        item.brand ? `(${item.brand})` : '',
        item.dosage ? ` / 用量: ${item.dosage}` : '',
        timing ? ` / タイミング: ${timing}` : '',
        item.notes ? ` / メモ: ${item.notes}` : ''
      ];
      return parts.filter(Boolean).join('');
    })
    .join('\n');
}

export async function POST() {
  // 認証
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 課金ゲート: Free プランは月3回まで
  const billing = await getBillingStatus();
  if (
    billing &&
    billing.plan === 'free' &&
    billing.ai_remaining !== null &&
    billing.ai_remaining <= 0
  ) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        message: `今月の AI 分析(${billing.ai_limit_this_month}回)を使い切りました。Pro プランにアップグレードすると無制限になります。`,
        billing
      },
      { status: 402 }
    );
  }

  // スタック取得(active のみ)
  const { data: items, error: dbError } = await supabase
    .from('stack_items')
    .select('id, name, brand, dosage, timing, notes, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('added_at', { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: `DB error: ${dbError.message}` },
      { status: 500 }
    );
  }
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'まずサプリを1つ以上登録してから分析してください' },
      { status: 400 }
    );
  }

  // ルールベース監査(AIに「これは既に検出済み」と伝えるため)
  const auditItems: AuditStackItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    dosage: i.dosage,
    timing: i.timing,
    is_active: i.is_active
  }));
  const ruleFindings = auditStack(auditItems);
  const ruleFindingsText =
    ruleFindings.length > 0
      ? ruleFindings.map((f) => `- ${f.title}`).join('\n')
      : '(なし)';

  // プロンプト構築
  const stackText = formatStackForPrompt(items);
  const userPrompt = `あなたはサプリメント・栄養の専門アドバイザーです。Sup. App ユーザーの現在のスタックを分析し、コンテキスト依存の改善案を返してください。

# ユーザーの現在のスタック
${stackText}

# ルールベース監査で既に検出済み(これらと重複しないこと)
${ruleFindingsText}

# あなたの分析タスク
1. **全体評価**: このユーザーは何を最適化しようとしているか?(集中力強化? 睡眠? 回復? 数値改善?)現在のスタックの強みと、どんな観点が抜けてるか
2. **改善案 (最大5件)**: 具体的に何を追加・除去・タイミング調整すべきか
   - ルールベースで検出済みの項目は除外
   - 「足りない成分の補完」「シナジー候補」「タイミング最適化」「過剰摂取・コスト効率の警告」「ライフスタイル介入」を中心に
   - 各案には根拠(なぜそうするのか)を含める
3. **総括**: 1-2文で

# トーン
- 丁寧語(ですます調)で書いてください。
- 専門家として落ち着いた説明、固すぎず親しみがあるトーン
- 具体的・実用的(「〜を検討してみてください」「〜が推奨されます」など)
- 「医療アドバイスではない」等の断り書きは不要(UIで担保)

JSON形式で、指定されたスキーマに従って返してください。`;

  // Claude 呼び出し
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: {
          type: 'json_schema',
          schema: ANALYSIS_SCHEMA
        }
      },
      messages: [{ role: 'user', content: userPrompt }]
    });

    // 構造化出力なので最初の text ブロックは valid JSON のはず
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AIからのレスポンスが空でした' },
        { status: 500 }
      );
    }

    const analysis = JSON.parse(textBlock.text);

    // 使用ログ記録(成功時のみ)。失敗してもユーザーには影響させない
    await recordAiUsage({
      user_id: user.id,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    });

    return NextResponse.json({
      analysis,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      },
      stack_count: items.length
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json(
        { error: `AI分析エラー(${err.status}): ${err.message}` },
        { status: 500 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI route unexpected error:', msg);
    return NextResponse.json(
      { error: `予期しないエラー: ${msg}` },
      { status: 500 }
    );
  }
}
