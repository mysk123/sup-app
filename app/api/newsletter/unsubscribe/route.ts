/**
 * メルマガ購読解除(トークンによるワンクリック)
 * - メール内の「配信停止」リンク / List-Unsubscribe から呼ばれる
 * - 認証不要(トークンで本人性を担保) → service_role で更新
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();
  const { error, count } = await admin
    .from('newsletter_subscriptions')
    .update({ subscribed: false, updated_at: new Date().toISOString() }, {
      count: 'exact'
    })
    .eq('unsubscribe_token', token);
  return !error && (count ?? 0) > 0;
}

// メール内リンク(GET) → 確認ページへリダイレクト
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const ok = await unsubscribe(searchParams.get('token'));
  return NextResponse.redirect(`${origin}/unsubscribe?ok=${ok ? '1' : '0'}`);
}

// List-Unsubscribe-Post(One-Click, POST) 用
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const ok = await unsubscribe(searchParams.get('token'));
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
