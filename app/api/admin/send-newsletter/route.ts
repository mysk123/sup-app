/**
 * POST /api/admin/send-newsletter
 * 無料メルマガを、購読同意済みのユーザーへ配信する(管理者のみ)。
 *
 * body: { subject: string; body: string; testOnly?: boolean; segment?: 'all' | 'free' | 'pro' }
 *  - testOnly=true のときは、実行した管理者本人にだけ送る(下書き確認用)
 *  - segment: 配信対象。free=無料プランのみ / pro=Proのみ / all=購読者全員(既定)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { sendEmail, buildNewsletterEmail } from '@/lib/email';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  let payload: {
    subject?: string;
    body?: string;
    testOnly?: boolean;
    segment?: 'all' | 'free' | 'pro';
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const segment = payload.segment ?? 'all';
  const subject = payload.subject?.trim();
  const body = payload.body?.trim();
  if (!subject || !body) {
    return NextResponse.json(
      { error: '件名と本文は必須です' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 宛先(購読同意済み)
  type Sub = { user_id: string; email: string; unsubscribe_token: string };
  let recipients: Sub[];
  if (payload.testOnly) {
    // 管理者本人の購読レコードを引く。無ければテスト用トークンで本人宛
    const { data } = await admin
      .from('newsletter_subscriptions')
      .select('user_id, email, unsubscribe_token')
      .eq('user_id', user.id)
      .maybeSingle();
    recipients = data
      ? [data as Sub]
      : [
          {
            user_id: user.id,
            email: user.email!,
            unsubscribe_token: 'test'
          }
        ];
  } else {
    const { data, error } = await admin
      .from('newsletter_subscriptions')
      .select('user_id, email, unsubscribe_token')
      .eq('subscribed', true);
    if (error) {
      return NextResponse.json(
        { error: `DB error: ${error.message}` },
        { status: 500 }
      );
    }
    recipients = (data ?? []) as Sub[];

    // プラン別セグメント(free/pro)
    if (segment !== 'all' && recipients.length > 0) {
      const ids = recipients.map((r) => r.user_id);
      const { data: profs } = await admin
        .from('profiles')
        .select('user_id, plan')
        .in('user_id', ids);
      const proSet = new Set(
        (profs ?? [])
          .filter((p: { plan: string | null }) => p.plan === 'pro')
          .map((p: { user_id: string }) => p.user_id)
      );
      recipients = recipients.filter((r) =>
        segment === 'pro' ? proSet.has(r.user_id) : !proSet.has(r.user_id)
      );
    }
  }

  let sent = 0;
  let failed = 0;
  // 少人数想定でシンプルに逐次送信(Resend のレート内)
  for (const r of recipients) {
    const unsubscribeUrl = `${origin}/api/newsletter/unsubscribe?token=${r.unsubscribe_token}`;
    const mail = buildNewsletterEmail({ subject, body, unsubscribeUrl });
    try {
      await sendEmail({
        to: r.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        listUnsubscribeUrl: unsubscribeUrl
      });
      sent++;
    } catch (e) {
      console.error('newsletter send failed:', r.email, e);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    testOnly: !!payload.testOnly,
    segment,
    recipients: recipients.length,
    sent,
    failed
  });
}
