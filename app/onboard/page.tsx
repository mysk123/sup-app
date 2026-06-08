/**
 * /onboard ?targets=focus,recovery&items=[{"name":"マグネシウム グリシネート","dosage":"300mg"},...]
 *
 * sup-app.org 側の診断結果から「My Stack に送る」ボタンで遷移してくる。
 * プレビュー画面で「どれを追加するか」を選んで承認できる。
 *
 * 既存スタックと重複してるサプリは「登録済み」マークしてデフォルト未選択。
 */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardClient from './OnboardClient';
import { type Target } from '@/lib/audit/score';
import { isDuplicateName } from '@/lib/onboard-utils';

type Item = { name: string; dosage?: string };

function parseItems(raw: string | undefined): Item[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((i) => i && typeof i.name === 'string')
      .map((i) => ({
        name: String(i.name).trim(),
        dosage: i.dosage ? String(i.dosage).trim() : undefined
      }))
      .filter((i) => i.name.length > 0)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function parseTargets(raw: string | undefined): Target[] {
  if (!raw) return [];
  const valid: Target[] = [
    'focus',
    'recovery',
    'stability',
    'appearance',
    'numbers'
  ];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is Target => valid.includes(t as Target));
}

export default async function OnboardPage({
  searchParams
}: {
  searchParams: { targets?: string; items?: string; from?: string };
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const search = new URLSearchParams();
    if (searchParams.targets) search.set('targets', searchParams.targets);
    if (searchParams.items) search.set('items', searchParams.items);
    if (searchParams.from) search.set('from', searchParams.from);
    const back = `/onboard?${search.toString()}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const targets = parseTargets(searchParams.targets);
  const items = parseItems(searchParams.items);

  if (targets.length === 0 && items.length === 0) {
    redirect('/my-stack');
  }

  // 既存スタックを取得して、重複してる items にフラグを立てる
  const { data: existingItems } = await supabase
    .from('stack_items')
    .select('name')
    .eq('user_id', user.id);
  const existingNames = (existingItems ?? []).map((i) => i.name);

  const itemsWithDup = items.map((item) => ({
    ...item,
    isDuplicate: isDuplicateName(item.name, existingNames)
  }));

  // 既存 profile.targets を取得して、既に持ってる target にフラグ
  const { data: profile } = await supabase
    .from('profiles')
    .select('targets')
    .eq('user_id', user.id)
    .maybeSingle();
  const existingTargets: Target[] = (profile?.targets ?? []) as Target[];

  return (
    <div className="container" style={{ maxWidth: 560, padding: '40px 20px' }}>
      <header style={{ marginBottom: 32 }}>
        <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span
            style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}
          >
            Sup<span style={{ color: 'var(--accent)' }}>.</span>
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: 'var(--text-sub)',
                fontWeight: 600
              }}
            >
              App
            </span>
          </span>
        </a>
      </header>

      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          color: 'var(--accent)',
          marginBottom: 14,
          fontWeight: 700
        }}
      >
        FROM DIAGNOSIS
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: '-0.025em',
          marginBottom: 14
        }}
      >
        どれを My Stack に追加する?
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.85,
          marginBottom: 28
        }}
      >
        sup-app.org の診断で出た推奨。最初の一本だけ試したい場合や、
        すでに飲んでいるものを除く場合は、チェックを外せば対象から外れます。
        重複しているサプリは自動で除外候補にしてます。
      </p>

      <OnboardClient
        initialTargets={targets}
        existingTargets={existingTargets}
        initialItems={itemsWithDup}
      />

      <div
        style={{
          marginTop: 32,
          padding: '12px 16px',
          background: 'var(--card-bg)',
          border: '1px dashed var(--border)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--text-sub)',
          lineHeight: 1.7
        }}
      >
        ※ 追加後、商品名・ブランド・タイミング等の詳細は My Stack
        で編集できる。
      </div>
    </div>
  );
}
