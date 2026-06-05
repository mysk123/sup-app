/**
 * POST /api/audit/detect-ingredients
 * 商品名・ブランドから主要成分を AI で推測する。
 * オキシカット等のコンビ製品の中身を判別するため。
 *
 * 認証必須。Free でも Pro でも回数無制限(軽い分析なので)。
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const SCHEMA = {
  type: 'object' as const,
  properties: {
    ingredients: {
      type: 'array',
      description:
        'この製品に含まれる主要成分。最大8件。不明な製品なら空配列で返す。',
      items: {
        type: 'object',
        properties: {
          name_ja: {
            type: 'string',
            description: '日本語成分名 (例: カフェイン、Lカルニチン)'
          },
          name_en: {
            type: 'string',
            description: '英語成分名 (例: caffeine, l-carnitine)'
          }
        },
        required: ['name_ja', 'name_en'],
        additionalProperties: false
      }
    },
    summary: {
      type: 'string',
      description: 'この商品が何のための製品か、1文で(50字以内)'
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description:
        'high=有名な製品で配合が明確、medium=ジャンルから推測、low=不明'
    }
  },
  required: ['ingredients', 'summary', 'confidence'],
  additionalProperties: false
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { name?: string; brand?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { name, brand } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const prompt = `次のサプリメント商品の含有成分を推測してください。

商品名: ${name}
${brand ? `ブランド: ${brand}` : ''}

# 指示
- 主要成分(その商品の特徴を示す成分)を最大8件
- 有名なコンビ製品(オキシカット/Hydroxycut、ALL DAY YOU MAY、OPTI-MEN、Burn-XT 等)は知ってる範囲で正確に
- マイナーな製品でジャンルだけ分かる場合は medium、全く不明なら confidence: low + ingredients: [] で返す
- 用量は不要(成分名だけでOK)

JSON で返してください。`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA }
      },
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AIからのレスポンスが空でした' },
        { status: 500 }
      );
    }
    const data = JSON.parse(textBlock.text);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json(
        { error: `成分推測エラー(${err.status})` },
        { status: 500 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
