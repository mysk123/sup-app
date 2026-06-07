/**
 * 管理者向け: trends エントリの状態更新
 * - PATCH: status の変更('pending_review' → 'published' / 'archived' 等)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json(
      { error: 'id and status required' },
      { status: 400 }
    );
  }

  const validStatuses = ['draft', 'pending_review', 'published', 'archived'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: 'invalid status' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const update: { status: string; is_published?: boolean; published_at?: string } = {
    status: body.status
  };
  if (body.status === 'published') {
    update.is_published = true;
    update.published_at = new Date().toISOString();
  } else {
    update.is_published = false;
  }

  const { error } = await admin
    .from('trends')
    .update(update)
    .eq('id', body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
