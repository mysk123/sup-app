/**
 * 管理者向け: いますぐ月刊コンテンツ生成を実行
 * (Vercel cron の月初実行を待たずにテストできる)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  // 本物のcronエンドポイントを内部から叩く
  const url = new URL('/api/cron/generate-monthly-content', request.url);
  const cronSecret = process.env.CRON_SECRET ?? '';
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      'User-Agent': 'vercel-cron/1.0 (admin-trigger)'
    }
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
