/**
 * 日次バッチ: 振り返りリマインダーをメール送信
 *
 * Vercel Cron で呼ばれる(vercel.json で schedule 設定)
 * Authorization: Bearer ${CRON_SECRET} で認証
 *
 * 対象:
 *   monitoring_prompts.scheduled_at <= now()
 *   かつ responded_at, dismissed_at, notified_at が全て null
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, buildMonitoringReminderEmail } from '@/lib/email';

// Vercel の実行時間を最大に
export const maxDuration = 60;
// dynamic にしないと build 時に走る
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 認証チェック:Vercel Cron User-Agent または CRON_SECRET 一致で通す
  // (CRON_SECRET が Sensitive で値確認できない場合の保険)
  const authHeader = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent') ?? '';
  const isVercelCron = userAgent.startsWith('vercel-cron/');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const secretOk =
    cronSecret.length > 0 && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !secretOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 対象 prompts を取得(stack_item の name も join)
  const { data: prompts, error: promptError } = await admin
    .from('monitoring_prompts')
    .select(
      `
      id,
      user_id,
      stack_item_id,
      prompt_type,
      scheduled_at,
      stack_items!inner ( name, is_active )
      `
    )
    .lte('scheduled_at', new Date().toISOString())
    .is('responded_at', null)
    .is('dismissed_at', null)
    .is('notified_at', null)
    .limit(200); // 1日200通まで(Gmail SMTP の安全圏)

  if (promptError) {
    console.error('[cron] fetch prompts error:', promptError.message);
    return NextResponse.json(
      { error: promptError.message },
      { status: 500 }
    );
  }

  if (!prompts || prompts.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: 'no due prompts'
    });
  }

  // 関連ユーザーのメアドを取得(auth.users から)
  const userIds = Array.from(new Set(prompts.map((p) => p.user_id)));
  const userEmails = new Map<string, string>();
  for (const userId of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    if (userData?.user?.email) {
      userEmails.set(userId, userData.user.email);
    }
  }

  let sentCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const prompt of prompts) {
    const email = userEmails.get(prompt.user_id);
    if (!email) {
      errorCount++;
      errors.push(`no email for user ${prompt.user_id}`);
      continue;
    }

    const stackItem = (prompt.stack_items as unknown) as {
      name: string;
      is_active: boolean;
    };
    if (!stackItem || !stackItem.is_active) {
      // アクティブじゃないサプリは送らない、notified_at だけ立てて以後対象外に
      await admin
        .from('monitoring_prompts')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', prompt.id);
      continue;
    }

    try {
      const { subject, text, html } = buildMonitoringReminderEmail({
        itemName: stackItem.name,
        promptType: prompt.prompt_type as
          | 'week_1'
          | 'week_3'
          | 'month_2'
          | 'month_6'
      });
      await sendEmail({ to: email, subject, text, html });

      // notified_at を更新
      await admin
        .from('monitoring_prompts')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', prompt.id);

      sentCount++;
    } catch (err) {
      errorCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`send failed for ${prompt.id}: ${msg}`);
      console.error('[cron] send error:', msg);
    }
  }

  return NextResponse.json({
    ok: true,
    total: prompts.length,
    sent: sentCount,
    errors: errorCount,
    errorDetails: errors.slice(0, 5)
  });
}
