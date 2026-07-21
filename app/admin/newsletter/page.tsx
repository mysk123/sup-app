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
  const { count } = await admin
    .from('newsletter_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('subscribed', true);

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
        <strong style={{ color: 'var(--accent)' }}>{count ?? 0}</strong> 名。
        まず「テスト送信」で自分に届く見た目を確認してから、全員に配信してください。
      </p>

      <NewsletterAdmin subscriberCount={count ?? 0} />
    </div>
  );
}
