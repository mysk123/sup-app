'use server';

/**
 * /onboard 用の Server Action
 * - sup-app.org 側の診断結果から渡された target / items を一括登録
 * - 既存スタックと重複する items は server 側でも除外(防御層)
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { isDuplicateName } from '@/lib/onboard-utils';

export type OnboardItem = {
  name: string;
  dosage?: string;
};

export async function acceptOnboard(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const targetsRaw = (formData.get('targets') as string) ?? '';
  const itemsJson = (formData.get('items') as string) ?? '[]';

  const validTargets = ['focus', 'recovery', 'stability', 'appearance', 'numbers'];
  const targets = targetsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => validTargets.includes(t));

  let items: OnboardItem[] = [];
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((i) => i && typeof i.name === 'string' && i.name.trim())
        .slice(0, 30); // 最大30件まで
    }
  } catch {
    /* ignore */
  }

  // 1. profiles.targets を更新(既存のと合体、重複排除)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('targets')
    .eq('user_id', user.id)
    .maybeSingle();
  const merged = Array.from(
    new Set([...(profile?.targets ?? []), ...targets])
  );
  await admin
    .from('profiles')
    .update({ targets: merged })
    .eq('user_id', user.id);

  // 2. 既存スタックを取得して重複を server 側でも除外
  const { data: existing } = await supabase
    .from('stack_items')
    .select('name')
    .eq('user_id', user.id);
  const existingNames = (existing ?? []).map((i) => i.name);

  const dedupedItems = items.filter(
    (item) => !isDuplicateName(item.name, existingNames)
  );

  // 3. stack_items に bulk insert(source: 'diagnosis')
  if (dedupedItems.length > 0) {
    await supabase.from('stack_items').insert(
      dedupedItems.map((item) => ({
        user_id: user.id,
        name: item.name.trim(),
        dosage: item.dosage?.trim() || null,
        source: 'diagnosis',
        is_active: true
      }))
    );
  }

  redirect('/my-stack');
}
