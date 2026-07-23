/**
 * /admin/newsletter — 無料メルマガの作成・配信(管理者専用)
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/admin';
import NewsletterAdmin from './NewsletterAdmin';

export default async function AdminNewsletterPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/newsletter');
  if (!isAdminEmail(user.email)) {
    return (
      <div className="container" style={{ maxWidth: 560, padding: '60px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>403 / 管理者専用</h1>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from('newsletter_subscriptions')
    .select('user_id')
    .eq('subscribed', true);
  const ids = (subs ?? []).map((s: { user_id: string }) => s.user_id);
  let proCount = 0;
  if (ids.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('user_id, plan')
      .in('user_id', ids);
    proCount = (profs ?? []).filter(
      (p: { plan: string | null }) => p.plan === 'pro'
    ).length;
  }
  const count = ids.length;
  const freeCount = count - proCount;

  return (
    <div className="container" style={{ maxWidth: 640, padding: '40px 20px' }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          fontWeight: 700,
          marginBottom: 10
        }}
      >
        ADMIN · NEWSLETTER
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: 8
        }}
      >
        無料メルマガ配信
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-sub)',
          lineHeight: 1.7,
          marginBottom: 28
        }}
      >
        現在の購読者(同意済み):{' '}
        <strong style={{ color: 'var(--accent)' }}>{count}</strong> 名
        (無料 {freeCount} / Pro {proCount})。
        まず「テスト送信」で自分に届く見た目を確認してから配信してください。
      </p>

      <NewsletterAdmin
        counts={{ all: count, free: freeCount, pro: proCount }}
      />
    </div>
  );
}
