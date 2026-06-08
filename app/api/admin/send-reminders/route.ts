/**
 * 管理者向け: いますぐ振り返りリマインダー cron を実行
 * (本番 cron の翌朝 09:00 を待たずにテストできる)
 *
 * GET でもブラウザから叩けるようにする(masato さんが URL 開けばOK)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  const url = new URL('/api/cron/monitoring-reminders', request.url);
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
