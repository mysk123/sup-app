/**
 * 月初バッチ: Claude API で月刊コンテンツを生成 → trends に下書き保存
 *
 * Vercel Cron が毎月1日 03:00 JST(UTC 18:00 前日)に叩く
 *
 * 生成するもの:
 *   - 月刊特集(Cover Story) ×1件 (1500-2000字 body)
 *   - Research Digest ×3件 (各 250-300字)
 *   - Ingredient Deep Dive ×1件 (1000-1500字 body)
 *
 * すべて status='pending_review' で INSERT、
 * masato さんが Supabase ダッシュでレビュー → 'published' に変更で公開
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300; // 5分まで
export const dynamic = 'force-dynamic';

const CATEGORIES = ['focus', 'recovery', 'stability', 'appearance', 'numbers'];

// 月刊特集の SCHEMA
const COVER_STORY_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description: '40字以内のタイトル。引きのあるフレーズ'
    },
    description: {
      type: 'string',
      description: '200-250字のサマリ(リード文として使う)'
    },
    body: {
      type: 'string',
      description:
        '2500-3500字の本格的な深掘り記事。マークダウン可(## 見出し / ### サブ見出しを必ず複数入れて構造化)。各セクション 400-700字、合計 5-7 セクションで構成。引用研究の名前・年・要旨を明記。知的生産者が一杯のコーヒー時間で読み切る「重厚な読み物」のクオリティを目指す。'
    },
    category: {
      type: 'string',
      enum: CATEGORIES,
      description: '主に該当するカテゴリ'
    },
    source_url: {
      type: 'string',
      description:
        '主要な参考ソースの URL(Huberman Lab、PubMed、Sinclair Lab 等の公開・特定可能なもの)'
    },
    source_label: {
      type: 'string',
      description: 'ソースの簡潔なラベル'
    },
    ingredient_keys: {
      type: 'array',
      items: { type: 'string' },
      description:
        '関連成分の英語 key(magnesium, l_theanine, lions_mane, alpha_gpc, nmn, ashwagandha, omega_3, vitamin_d3, melatonin, glycine, l_tyrosine, bacopa, coq10, berberine, chromium, nac, quercetin, gaba, etc)'
    },
    related_product_name: {
      type: 'string',
      description: 'My Stack に追加する商品名(成分名 + 用量目安)'
    },
    related_product_dosage: {
      type: 'string',
      description: '推奨用量(例: 300mg、500mg)'
    }
  },
  required: [
    'title',
    'description',
    'body',
    'category',
    'source_url',
    'source_label',
    'ingredient_keys',
    'related_product_name',
    'related_product_dosage'
  ],
  additionalProperties: false
};

// Research Digest の SCHEMA(複数件まとめて返す)
const RESEARCH_DIGEST_SCHEMA = {
  type: 'object' as const,
  properties: {
    items: {
      type: 'array',
      description: '3件の研究紹介',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '40字以内' },
          description: {
            type: 'string',
            description: '250-300字。研究内容・対象・結果・解釈'
          },
          category: { type: 'string', enum: CATEGORIES },
          source_url: { type: 'string' },
          source_label: { type: 'string' },
          ingredient_keys: { type: 'array', items: { type: 'string' } },
          related_product_name: { type: 'string' },
          related_product_dosage: { type: 'string' }
        },
        required: [
          'title',
          'description',
          'category',
          'source_url',
          'source_label',
          'ingredient_keys',
          'related_product_name',
          'related_product_dosage'
        ],
        additionalProperties: false
      }
    }
  },
  required: ['items'],
  additionalProperties: false
};

// Ingredient Deep Dive の SCHEMA(成分の総合ガイド、2000-3000字)
const INGREDIENT_DEEP_DIVE_SCHEMA = {
  ...COVER_STORY_SCHEMA,
  properties: {
    ...COVER_STORY_SCHEMA.properties,
    body: {
      type: 'string',
      description:
        '2000-3000字の総合ガイド。マークダウンで構造化(## 大見出し 6-7個、各 300-500字)。1つの成分について「化学・歴史・エビデンス・用量・タイミング・副作用・干渉・シナジー・まとめ」を網羅的に解説。引用は具体的に。'
    }
  }
};

export async function GET(request: Request) {
  // 認証
  const authHeader = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent') ?? '';
  const isVercelCron = userAgent.startsWith('vercel-cron/');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const secretOk =
    cronSecret.length > 0 && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !secretOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const anthropic = new Anthropic();
  const admin = createAdminClient();
  const monthLabel = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  });

  const results = {
    cover_story: null as any,
    research_digest: null as any,
    ingredient_deep_dive: null as any,
    errors: [] as string[]
  };

  // 1. 月刊特集
  try {
    const coverStoryPrompt = `${monthLabel}の Sup. App 月刊特集記事を1本作成してください。これは「Premium Column」として Pro 会員に毎月お届けする、その月の目玉となる本格的な読み物です。

対象読者: 知的生産者(20代後半〜30代のクリエイター・起業家・研究者・エンジニア)で、すでにサプリ習慣があり、エビデンスを重視する層。

# 文章の質
- 2500-3500字の本格的な深掘り記事
- マークダウンで構造化:## 大見出し(3-5個)+ ### サブ見出しを必ず使う
- 各セクションは 400-700字、論理が前後で繋がること
- 知的生産者が一杯のコーヒー時間でじっくり読み切る重厚な読み物

# 推奨構成
## ${monthLabel} のテーマ:[テーマを具体的に]
### 1. なぜ今これに注目すべきか(社会的・科学的な背景)
### 2. 機序の解説(分子・生理学レベル、論文ベース)
### 3. 知的生産者に効くポイント(認知・気分・パフォーマンスへの作用)
### 4. 実用ガイド(用量・タイミング・食事との関係)
### 5. 注意点・干渉・副作用
### 6. 相性のいい成分・スタック例
### 7. まとめ:今月、何から始めるか

# 引用ソース(本文中に必ず1-3件、具体的に明記)
- Huberman Lab Podcast(エピソードの主旨を明記)
- Peter Attia(The Drive Podcast / 著書『Outlive』)
- David Sinclair Lab(NAD+ / 長寿研究)
- Examine.com(サプリのエビデンスデータベース)
- PubMed(著者・年・要旨を引いてください)
- Mayo Clinic / NIH / NEJM(信頼性の高い解説)

引用例:「Huberman は ○○ について、××年の podcast でこう述べています」「△△ら(2023)の研究では、N=○○ で○○ が示唆されました」のように具体的に。

# トーン
- 専門家として落ち着いた説明、ですます調
- 「効きます」ではなく「研究で示唆されています」「○○ という結果が報告されています」
- 知的生産者として「自分の判断材料が欲しい」読者の期待に応える

# 避けるべきもの
- 医療診断・治療効果の保証
- 速報性のある「今バズり中」系の表現
- 検証不能な噂・憶測
- 薬機法に触れる表現(「効く」「治る」「予防」)
- ふわっとした内容・無難すぎる結論

JSON形式で、指定スキーマに従って返してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16384,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: COVER_STORY_SCHEMA }
      },
      messages: [{ role: 'user', content: coverStoryPrompt }]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const data = JSON.parse(textBlock.text);
      const { error } = await admin.from('trends').insert({
        title: data.title,
        description: data.description,
        body: data.body,
        trend_type: 'research',
        category: data.category,
        source_url: data.source_url,
        source_label: data.source_label,
        ingredient_keys: data.ingredient_keys,
        related_product_name: data.related_product_name,
        related_product_dosage: data.related_product_dosage,
        status: 'pending_review',
        is_published: false,
        ai_generated: true
      });
      if (error) results.errors.push(`cover_story: ${error.message}`);
      else results.cover_story = { title: data.title };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`cover_story: ${msg}`);
  }

  // 2. Research Digest(3件)
  try {
    const researchPrompt = `${monthLabel} の Research Digest 3件を作成してください。

要件:
- 過去1-2年の信頼できる研究・Podcast・専門家発信から3件
- 各 250-300字
- 公開ソース(Huberman Lab / Peter Attia / PubMed / Mayo Clinic / Examine.com)を引用
- 各テーマは異なるカテゴリから(focus / recovery / stability / appearance / numbers のいずれか)

JSON形式で返してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16384,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: RESEARCH_DIGEST_SCHEMA }
      },
      messages: [{ role: 'user', content: researchPrompt }]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const data = JSON.parse(textBlock.text);
      const inserts = data.items.map((item: any) => ({
        title: item.title,
        description: item.description,
        body: null,
        trend_type: 'research',
        category: item.category,
        source_url: item.source_url,
        source_label: item.source_label,
        ingredient_keys: item.ingredient_keys,
        related_product_name: item.related_product_name,
        related_product_dosage: item.related_product_dosage,
        status: 'pending_review',
        is_published: false,
        ai_generated: true
      }));
      const { error } = await admin.from('trends').insert(inserts);
      if (error) results.errors.push(`research_digest: ${error.message}`);
      else results.research_digest = { count: inserts.length };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`research_digest: ${msg}`);
  }

  // 3. Ingredient Deep Dive
  try {
    const ingredientPrompt = `${monthLabel}の Ingredient Deep Dive を1件作成してください。これは1つの成分を多面的に総合解説する、読み応えのあるリファレンス記事です。

# 成分の選定
1つの成分を選んでください(過去の月とは別の成分、推奨候補:
Magnesium Glycinate / L-Theanine / Lions Mane / Ashwagandha (KSM-66) / Omega-3 EPA・DHA /
Vitamin D3 + K2 / Alpha-GPC / Bacopa Monnieri / L-Tyrosine / Berberine / Glycine /
NMN / NAC / Curcumin / Rhodiola / Creatine Monohydrate / CoQ10 + PQQ)

# 文章の質
- 2000-3000字の本格的な総合ガイド
- マークダウンで構造化:## 大見出し(6-7個)を必ず使う
- 各セクション 300-500字
- ガイドとして「この成分について知りたい全てが書かれている」レベル

# 推奨構成
## [成分名]とは何か
### 化学構造と分類(キレート形 / 結合形などの違いも)
### なぜ注目されているか(歴史的背景・近年の研究の進展)

## エビデンス
### 主要な研究と結果(著者・年・N数・結論を具体的に)
### 効果実感までの期間(○週間 / ○ヶ月)
### 個人差が出る要因

## 実用ガイド
### 推奨用量(成人男女別、初心者と慣れた人で異なれば明記)
### タイミング(朝 / 夕 / 就寝前)と食事との関係
### 形状の選び方(キレート / 結合形 / 徐放性 など)

## 注意点と副作用
### よくある副作用(用量別、頻度)
### 医薬品との相互作用(SSRI / 抗凝固薬 / 甲状腺薬など、該当成分があれば)
### 服用を避けるべき人(妊娠中・腎機能低下・服薬中など)

## シナジー・相乗効果
### 一緒に摂ると効くペア(科学的根拠とともに)
### 逆に同時摂取を避けるべきペア

## まとめ:こんな人におすすめ

# 引用ソース
- Examine.com(エビデンスサマリー)
- PubMed(具体的な論文)
- Huberman Lab / Peter Attia などの podcast

引用は本文中に具体的に明記してください(著者・年など)。

# トーン
- 専門家として落ち着いた説明、ですます調
- 客観的なエビデンスベース
- 「効く」断言ではなく「研究で示唆されています」

JSON形式で返してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16384,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: INGREDIENT_DEEP_DIVE_SCHEMA }
      },
      messages: [{ role: 'user', content: ingredientPrompt }]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const data = JSON.parse(textBlock.text);
      const { error } = await admin.from('trends').insert({
        title: data.title,
        description: data.description,
        body: data.body,
        trend_type: 'research',
        category: data.category,
        source_url: data.source_url,
        source_label: data.source_label,
        ingredient_keys: data.ingredient_keys,
        related_product_name: data.related_product_name,
        related_product_dosage: data.related_product_dosage,
        status: 'pending_review',
        is_published: false,
        ai_generated: true
      });
      if (error) results.errors.push(`ingredient_deep_dive: ${error.message}`);
      else results.ingredient_deep_dive = { title: data.title };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`ingredient_deep_dive: ${msg}`);
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    month: monthLabel,
    ...results
  });
}
