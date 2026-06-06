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
