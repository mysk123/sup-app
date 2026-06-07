/**
 * /admin/trends — 管理画面
 * - pending_review な trends を一覧表示
 * - 「いま生成する」ボタン
 * - 各エントリに「公開」「アーカイブ」「内容を見る」
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/admin';
import AdminClient from './AdminClient';

export default async function AdminTrendsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/trends');
  if (!isAdminEmail(user.email)) {
    return (
      <div
        className="container"
        style={{ maxWidth: 560, padding: '60px 20px' }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>403 / 管理者専用</h1>
        <p style={{ color: 'var(--text-sub)', marginTop: 8 }}>
          このページは管理者のみアクセスできます。
        </p>
      </div>
    );
  }

  // 全ステータスの trends を取得(admin client で RLS バイパス)
  const admin = createAdminClient();
  const { data: trendsRaw } = await admin
    .from('trends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const trends = (trendsRaw ?? []) as Array<{
    id: string;
    title: string;
    description: string;
    body: string | null;
    trend_type: string;
    category: string | null;
    status: string;
    is_published: boolean;
    ai_generated: boolean;
    source_url: string | null;
    source_label: string | null;
    ingredient_keys: string[] | null;
    related_product_name: string | null;
    related_product_dosage: string | null;
    created_at: string;
    published_at: string;
  }>;

  return (
    <div className="container" style={{ maxWidth: 920, padding: '40px 20px' }}>
      <header style={{ marginBottom: 32 }}>
        <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '-0.02em'
            }}
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
              App / Admin
            </span>
          </span>
        </a>
      </header>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.025em',
          marginBottom: 14
        }}
      >
        Trends 管理
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.85,
          marginBottom: 28
        }}
      >
        毎月1日 9:00 に AI が自動生成 → ここでレビューして公開。
        いますぐ試したいときは下の「**今すぐ生成**」を押すと、即時で 5件の下書きが作られます(数分かかります)。
      </p>

      <AdminClient initialTrends={trends} />
    </div>
  );
}
