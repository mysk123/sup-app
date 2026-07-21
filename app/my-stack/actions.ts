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

export async function updateStackItem(args: {
  id: string;
  name?: string;
  brand?: string | null;
  dosage?: string | null;
  timing?: string[];
  notes?: string | null;
  detected_ingredients?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const update: Record<string, unknown> = {};
  if (args.name !== undefined) update.name = args.name.trim();
  if (args.brand !== undefined) update.brand = args.brand?.trim() || null;
  if (args.dosage !== undefined) update.dosage = args.dosage?.trim() || null;
  if (args.notes !== undefined) update.notes = args.notes?.trim() || null;
  if (args.detected_ingredients !== undefined)
    update.detected_ingredients = args.detected_ingredients?.trim() || null;
  if (args.timing !== undefined)
    update.timing = args.timing.length > 0 ? args.timing : null;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from('stack_items')
    .update(update)
    .eq('id', args.id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/my-stack');
  return { ok: true };
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

/** 効果トラッキング: 週次チェックイン(主観4軸)を記録 */
export async function recordEffectLog(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clamp15 = (v: FormDataEntryValue | null) => {
    const n = parseInt((v as string) ?? '', 10);
    if (Number.isNaN(n)) return 3;
    return Math.max(1, Math.min(5, n));
  };

  const allowed = ['poor_sleep', 'alcohol', 'sick', 'busy', 'exercised'];
  const confounds = (formData.getAll('confounds') as string[]).filter((c) =>
    allowed.includes(c)
  );
  const note = (formData.get('note') as string)?.trim() || null;

  await supabase.from('effect_logs').insert({
    user_id: user.id,
    focus: clamp15(formData.get('focus')),
    sleep: clamp15(formData.get('sleep')),
    mood: clamp15(formData.get('mood')),
    energy: clamp15(formData.get('energy')),
    confounds: confounds.length > 0 ? confounds : null,
    note
  });

  revalidatePath('/my-stack');
}

/** メルマガ購読の同意/解除(ログインユーザー本人) */
export async function setNewsletterSubscription(optIn: boolean) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('newsletter_subscriptions').upsert(
    {
      user_id: user.id,
      email: user.email,
      subscribed: optIn,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
  if (error) return { error: error.message };

  revalidatePath('/my-stack');
  return { ok: true };
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
