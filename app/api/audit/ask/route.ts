/**
 * POST /api/audit/ask
 * サプリに関するオープンクエスチョン
 * Free: 月3回 / Pro: 無制限(AI 分析と同じルール、別カウント)
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBillingStatus, recordAiUsage } from '@/lib/billing/usage';
import { auditStack, type StackItem as AuditStackItem } from '@/lib/audit/engine';

type DbStackItem = {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  timing: string[] | null;
  notes: string | null;
  is_active: boolean;
  detected_ingredients?: string | null;
};

const TIMING_LABEL: Record<string, string> = {
  morning: '朝',
  lunch: '昼',
  evening: '夕',
  bedtime: '就寝前',
  as_needed: '頓服'
};

function formatStack(items: DbStackItem[]): string {
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

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const question = body.question?.trim();
  if (!question || question.length < 3) {
    return NextResponse.json(
      { error: '質問を3文字以上で入力してください' },
      { status: 400 }
    );
  }
  if (question.length > 500) {
    return NextResponse.json(
      { error: '質問は500文字以内にしてください' },
      { status: 400 }
    );
  }

  // 課金ゲート: Free は月3回まで
  const billing = await getBillingStatus();
  if (
    billing &&
    billing.plan === 'free' &&
    billing.ai_question_remaining !== null &&
    billing.ai_question_remaining <= 0
  ) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        message: `今月の AI 質問(${billing.ai_limit_this_month}回)を使い切りました。Pro プランで無制限にご利用いただけます。`,
        billing
      },
      { status: 402 }
    );
  }

  // ユーザーの現在のスタックをコンテキストに含める
  const { data: items } = await supabase
    .from('stack_items')
    .select('id, name, brand, dosage, timing, notes, is_active, detected_ingredients')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const stackText =
    items && items.length > 0
      ? formatStack(items as DbStackItem[])
      : '(まだスタックに何も登録していません)';

  // ルールベース監査の結果も含める(コンテキスト強化)
  const auditItems: AuditStackItem[] = (items ?? []).map((i: any) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    dosage: i.dosage,
    timing: i.timing,
    is_active: i.is_active,
    detected_ingredients: i.detected_ingredients
  }));
  const findings = auditStack(auditItems);
  const findingsText =
    findings.length > 0
      ? findings.map((f) => `- ${f.title}: ${f.description}`).join('\n')
      : '(現状の指摘事項なし)';

  const prompt = `あなたはサプリメント・栄養の専門アドバイザーです。Sup. App ユーザーからの質問に丁寧に回答してください。

# ユーザーの現在のスタック
${stackText}

# 既に検出されている指摘事項(参考)
${findingsText}

# ユーザーの質問
${question}

# 回答のルール
- ですます調で、専門家として落ち着いた説明
- 質問が現在のスタックと関連する場合、具体的にスタックに触れる
- 根拠(研究・機序)を可能なら含める
- 「医療アドバイスではない」等の断り書きは不要(UIで担保)
- 効果保証は避け、「研究で示唆されている」「使われている」という表現で
- 短すぎず、長すぎず(目安 400-700字、必要なら長くしてもOK)
- マークダウン可(## 見出し、- リスト)

回答を返してください。`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AI からの回答が空でした' },
        { status: 500 }
      );
    }
    const answer = textBlock.text;

    // 使用ログ + 質問履歴を記録
    await recordAiUsage({
      user_id: user.id,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      kind: 'question'
    });

    const admin = createAdminClient();
    await admin.from('ai_questions').insert({
      user_id: user.id,
      question,
      answer
    });

    return NextResponse.json({
      answer,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json(
        { error: `AI エラー(${err.status})` },
        { status: 500 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
