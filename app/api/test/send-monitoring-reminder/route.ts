/**
 * テスト用: ログイン中ユーザーに振り返りメールを 1通送る
 *
 * - active な最古のサプリを対象にする
 * - そのサプリに week_1 prompt がなければ自動作成
 * - すでにあれば期限到達 + 未通知状態に強制
 * - その後メール送信
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

  // 1. ログイン中ユーザーの active な最古のサプリ
  const { data: items } = await admin
    .from('stack_items')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('added_at', { ascending: true })
    .limit(1);

  if (!items || items.length === 0) {
    return NextResponse.json({
      ok: false,
      message:
        'アクティブなサプリが1つもありません。/my-stack でサプリを1つ追加してから再試行してください。'
    });
  }

  const item = items[0];

  // 2. その sprite に week_1 prompt があるか確認、なければ作成
  const { data: existing } = await admin
    .from('monitoring_prompts')
    .select('id')
    .eq('stack_item_id', item.id)
    .eq('prompt_type', 'week_1')
    .limit(1);

  let promptId: string;
  if (!existing || existing.length === 0) {
    const { data: created, error: insertErr } = await admin
      .from('monitoring_prompts')
      .insert({
        user_id: user.id,
        stack_item_id: item.id,
        prompt_type: 'week_1',
        scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      })
      .select('id')
      .single();
    if (insertErr || !created) {
      return NextResponse.json(
        { error: insertErr?.message ?? 'failed to create prompt' },
        { status: 500 }
      );
    }
    promptId = created.id;
  } else {
    promptId = existing[0].id;
    // 期限到達 + 未通知に強制
    await admin
      .from('monitoring_prompts')
      .update({
        scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        notified_at: null,
        responded_at: null,
        dismissed_at: null
      })
      .eq('id', promptId);
  }

  // 3. メール送信
  try {
    const { subject, text, html } = buildMonitoringReminderEmail({
      itemName: item.name,
      promptType: 'week_1'
    });
    const info = await sendEmail({
      to: user.email,
      subject,
      text,
      html
    });

    // 4. notified_at を更新
    await admin
      .from('monitoring_prompts')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', promptId);

    return NextResponse.json({
      ok: true,
      sent_to: user.email,
      item_name: item.name,
      prompt_type: 'week_1',
      message_id: info.messageId
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[test send] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
