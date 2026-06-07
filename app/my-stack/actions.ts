'use server';

/**
 * My Stack のサーバーアクション
 * フォーム送信 → サーバーサイドで Supabase 操作 → ページ再生成
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addStackItem(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string)?.trim();
  if (!name) return;

  const brand = (formData.get('brand') as string)?.trim() || null;
  const dosage = (formData.get('dosage') as string)?.trim() || null;
  const notes = (formData.get('notes') as string)?.trim() || null;
  const detected_ingredients =
    (formData.get('detected_ingredients') as string)?.trim() || null;
  const timing = formData.getAll('timing') as string[];

  await supabase.from('stack_items').insert({
    user_id: user.id,
    name,
    brand,
    dosage,
    notes,
    detected_ingredients,
    timing: timing.length > 0 ? timing : null,
    source: 'manual'
  });

  revalidatePath('/my-stack');
}

export async function deleteStackItem(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase
    .from('stack_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/my-stack');
}

/** ユーザーの target(目的)を更新 */
export async function updateTargets(targets: string[]) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const valid = targets.filter((t) =>
    ['focus', 'recovery', 'stability', 'appearance', 'numbers'].includes(t)
  );

  // RLS で profiles update できないので service_role
  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({ targets: valid })
    .eq('user_id', user.id);

  revalidatePath('/my-stack');
}

/** モニタリング: 振り返りに回答 */
export async function submitMonitoringResponse(args: {
  prompt_id: string;
  stack_item_id: string;
  prompt_type: string;
  effect: 'good' | 'neutral' | 'bad';
  continue_intent?: 'continue' | 'observe' | 'stop' | null;
  notes?: string;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. 回答を保存
  const { error: insertError } = await supabase
    .from('monitoring_responses')
    .insert({
      user_id: user.id,
      stack_item_id: args.stack_item_id,
      prompt_id: args.prompt_id,
      prompt_type: args.prompt_type,
      effect: args.effect,
      continue_intent: args.continue_intent ?? null,
      notes: args.notes?.trim() || null
    });
  if (insertError) {
    return { error: insertError.message };
  }

  // 2. プロンプトを「回答済み」にマーク
  await supabase
    .from('monitoring_prompts')
    .update({ responded_at: new Date().toISOString() })
    .eq('id', args.prompt_id)
    .eq('user_id', user.id);

  revalidatePath('/my-stack');
  return { ok: true };
}

/** モニタリング: 振り返りをスキップ(後で答える) */
export async function dismissMonitoringPrompt(prompt_id: string) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('monitoring_prompts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', prompt_id)
    .eq('user_id', user.id);

  revalidatePath('/my-stack');
}

export async function toggleActiveStackItem(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  const isActive = formData.get('is_active') === 'true';
  if (!id) return;

  await supabase
    .from('stack_items')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/my-stack');
}
