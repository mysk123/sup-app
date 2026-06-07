/**
 * テスト用: ログイン中ユーザーの due な monitoring prompts を1通だけメール送信
 *
 * 通常のcron(/api/cron/monitoring-reminders)はVercel Cron専用で
 * CRON_SECRETがSensitiveになるとローカルから叩けないので、
 * ログイン中ユーザーが自分でテストできる経路を用意。
 *
 * 動作確認後はこのファイルを削除推奨。
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, buildMonitoringReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: 'login required' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 自分のdue prompts(notified_at が null 以外でも、テスト目的なので無視で1通だけ送る)
  const { data: prompts, error } = await admin
    .from('monitoring_prompts')
    .select(
      `
      id,
      stack_item_id,
      prompt_type,
      scheduled_at,
      notified_at,
      stack_items!inner ( name, is_active )
      `
    )
    .eq('user_id', user.id)
    .lte('scheduled_at', new Date().toISOString())
    .is('responded_at', null)
    .is('dismissed_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!prompts || prompts.length === 0) {
    return NextResponse.json({
      ok: false,
      message:
        'due な prompt が見つかりません。Supabase で 1つ scheduled_at を過去日に更新してから再試行してください。'
    });
  }

  const prompt = prompts[0];
  const stackItem = prompt.stack_items as unknown as {
    name: string;
    is_active: boolean;
  };

  try {
    const { subject, text, html } = buildMonitoringReminderEmail({
      itemName: stackItem.name,
      promptType: prompt.prompt_type as 'week_1' | 'week_3'
    });
    const info = await sendEmail({
      to: user.email,
      subject,
      text,
      html
    });

    // notified_at を更新
    await admin
      .from('monitoring_prompts')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', prompt.id);

    return NextResponse.json({
      ok: true,
      sent_to: user.email,
      item_name: stackItem.name,
      prompt_type: prompt.prompt_type,
      message_id: info.messageId
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[test send] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
