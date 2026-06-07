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
        '1500-2000字の本文(マークダウン可、## 見出し OK)。研究データを引きつつ、知的生産者向けに「なぜ重要か→機序→使い方→注意点」の構成。'
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

// Ingredient Deep Dive の SCHEMA(月刊特集と同じ形だが body の構成が違う)
const INGREDIENT_DEEP_DIVE_SCHEMA = COVER_STORY_SCHEMA;

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
    const coverStoryPrompt = `${monthLabel}の Sup. App 月刊特集記事を1本作成してください。

対象読者: 知的生産者(20代後半〜30代のクリエイター・起業家・研究者)で、すでにサプリ習慣がある層。

要件:
- タイトルは引きのあるフレーズ(40字以内)
- 1500-2000字の深掘り読み物
- 構成: なぜ重要か(背景・課題)→ 機序(エビデンス)→ 使い方(用量・タイミング)→ 注意点
- 引用は公開ソース(Huberman Lab Podcast / PubMed / Andrew Attia / Peter Attia / Sinclair Lab / 主要な栄養学論文)を優先
- 効果保証ではなく「研究で示唆されている」「使われている」という表現で
- 知的生産者の関心(集中力 / 回復 / 思考のクオリティ)に紐づける

避けるべき:
- 医療診断・治療効果の保証
- 速報性のある「今バズってる」系の表現
- 検証不能な噂や憶測
- 薬機法に触れる表現

JSON形式で返してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
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
      max_tokens: 8192,
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
    const ingredientPrompt = `${monthLabel}の Ingredient Deep Dive を 1件作成してください。

1つの成分を選んで(過去の月とは別の成分、できれば「Magnesium / L-Theanine / Lions Mane / Ashwagandha / Omega-3 / VD3+K2 / Alpha-GPC / Berberine / Glycine / NMN / NAC」のいずれか)、1000-1500字で総合解説。

構成:
1. この成分の概要(機序・主要な研究背景)
2. 期待される効果と研究エビデンス
3. 推奨用量・タイミング(食事との関係も)
4. 副作用・干渉・注意点
5. おすすめの組み合わせ(シナジーペア)

引用は公開ソース。

JSON形式で返してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
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
