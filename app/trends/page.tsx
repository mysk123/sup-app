/**
 * /trends — SNS バズ・芸能人サプリのキュレーション(Pro 限定)
 *
 * Free ユーザー: アップグレード CTA だけ表示
 * Pro ユーザー: 自分の target に合うトレンドを優先表示、その後カテゴリ別
 */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBillingStatus } from '@/lib/billing/usage';
import { TARGET_LABELS, type Target } from '@/lib/audit/score';
import { INGREDIENTS, type IngredientKey } from '@/lib/audit/knowledge';
import TrendsUpgradeCTA from './TrendsUpgradeCTA';

type Trend = {
  id: string;
  title: string;
  description: string;
  body: string | null;
  trend_type: 'sns_buzz' | 'celebrity' | 'research';
  category: string | null;
  source_url: string | null;
  source_label: string | null;
  ingredient_keys: string[] | null;
  related_product_name: string | null;
  related_product_dosage: string | null;
  published_at: string;
};

const TYPE_LABELS: Record<Trend['trend_type'], string> = {
  sns_buzz: 'SNS BUZZ',
  celebrity: 'CELEBRITY STACK',
  research: 'RESEARCH'
};

export default async function TrendsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/trends');

  const billing = await getBillingStatus();

  // Free ユーザーは訴求 CTA のみ
  if (!billing || billing.plan !== 'pro') {
    return (
      <div
        className="container"
        style={{ maxWidth: 720, padding: '40px 20px' }}
      >
        <PageHeader />
        <TrendsUpgradeCTA />
      </div>
    );
  }

  // profile.targets を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('targets')
    .eq('user_id', user.id)
    .maybeSingle();
  const userTargets: Target[] = (profile?.targets ?? []) as Target[];

  // trends を取得(新しい順)
  const { data: trendsRaw } = await supabase
    .from('trends')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  const trends: Trend[] = (trendsRaw ?? []) as Trend[];

  // user の target にマッチする trends と、それ以外
  const forYou = trends.filter(
    (t) => t.category && userTargets.includes(t.category as Target)
  );
  const otherByType = {
    sns_buzz: trends.filter(
      (t) => t.trend_type === 'sns_buzz' && !forYou.includes(t)
    ),
    celebrity: trends.filter(
      (t) => t.trend_type === 'celebrity' && !forYou.includes(t)
    ),
    research: trends.filter(
      (t) => t.trend_type === 'research' && !forYou.includes(t)
    )
  };

  return (
    <div
      className="container"
      style={{ maxWidth: 720, padding: '40px 20px' }}
    >
      <PageHeader />

      {forYou.length > 0 && (
        <Section
          label="FOR YOU"
          subLabel={`あなたの target に合致する ${forYou.length} 件`}
          trends={forYou}
        />
      )}

      {otherByType.sns_buzz.length > 0 && (
        <Section
          label="SNS BUZZ"
          subLabel="TikTok / X / Instagram でバズり中"
          trends={otherByType.sns_buzz}
        />
      )}

      {otherByType.celebrity.length > 0 && (
        <Section
          label="CELEBRITY STACK"
          subLabel="本人公表ベースの公開情報"
          trends={otherByType.celebrity}
        />
      )}

      {otherByType.research.length > 0 && (
        <Section
          label="RESEARCH"
          subLabel="最新研究・論文ベース"
          trends={otherByType.research}
        />
      )}

      {trends.length === 0 && (
        <div
          style={{
            padding: '40px 22px',
            background: 'var(--card-bg)',
            border: '1px dashed var(--border)',
            borderRadius: 14,
            textAlign: 'center',
            color: 'var(--text-sub)',
            fontSize: 14,
            lineHeight: 1.75
          }}
        >
          まだトレンドが公開されていません。
          <br />
          月初に新しいキュレーションが追加されます。
        </div>
      )}

      <div
        style={{
          marginTop: 40,
          padding: '16px 18px',
          fontSize: 12,
          color: 'var(--text-sub)',
          background: 'var(--card-bg)',
          border: '1px dashed var(--border)',
          borderRadius: 10,
          lineHeight: 1.75
        }}
      >
        ※ 掲載情報は公開ソースに基づく事実の紹介です。効果を保証するものではありません。
        各サプリは医師・薬剤師の指導下でご利用ください。
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <>
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
        TRENDS — 月次キュレーション
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.35,
          marginBottom: 12
        }}
      >
        いま、SNSで何が動いているか。
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.85,
          marginBottom: 36,
          maxWidth: 540
        }}
      >
        TikTok / X / 海外 podcast でいまバズってるサプリ、
        芸能人やトップアスリートが公表しているスタック、
        最新の研究データ。あなたの target に合うものから順に表示します。
      </p>
    </>
  );
}

function Section({
  label,
  subLabel,
  trends
}: {
  label: string;
  subLabel?: string;
  trends: Trend[];
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          color: 'var(--accent)',
          marginBottom: 6,
          fontWeight: 700
        }}
      >
        {label}
      </div>
      {subLabel && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-sub)',
            marginBottom: 12,
            fontWeight: 500
          }}
        >
          {subLabel}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trends.map((t) => (
          <TrendCard key={t.id} trend={t} />
        ))}
      </div>
    </section>
  );
}

function TrendCard({ trend }: { trend: Trend }) {
  // 関連成分名を日本語に
  const ingredientNames =
    (trend.ingredient_keys ?? [])
      .map((k) => INGREDIENTS.find((i) => i.key === (k as IngredientKey))?.name_ja)
      .filter(Boolean) as string[];

  // onboard 用 URL(My Stack に追加)
  const onboardUrl = trend.related_product_name
    ? `/onboard?items=${encodeURIComponent(
        JSON.stringify([
          {
            name: trend.related_product_name,
            dosage: trend.related_product_dosage ?? ''
          }
        ])
      )}${trend.category ? `&targets=${trend.category}` : ''}`
    : null;

  const typeLabel = TYPE_LABELS[trend.trend_type];
  const categoryLabel =
    trend.category && TARGET_LABELS[trend.category as Target];

  return (
    <details
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden'
      }}
    >
      <summary
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          listStyle: 'none',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 6,
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              padding: '3px 7px',
              background: 'var(--accent-light)',
              color: 'var(--accent-dark)',
              borderRadius: 100
            }}
          >
            {typeLabel}
          </span>
          {categoryLabel && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-sub)',
                fontWeight: 600
              }}
            >
              {categoryLabel}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'var(--text-sub)',
              opacity: 0.7
            }}
          >
            ▾ タップで詳細
          </span>
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
            lineHeight: 1.45
          }}
        >
          {trend.title}
        </div>
      </summary>
      <div
        style={{
          padding: '0 20px 18px 20px',
          fontSize: 13,
          color: 'var(--text-main)',
          lineHeight: 1.85,
          borderTop: '1px solid var(--border)'
        }}
      >
        <div style={{ paddingTop: 14 }}>{trend.description}</div>

        {/* 長文 body があれば展開表示 */}
        {trend.body && (
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: 'rgba(15, 91, 62, 0.04)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.95,
              whiteSpace: 'pre-wrap'
            }}
          >
            {trend.body}
          </div>
        )}

        {ingredientNames.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ingredientNames.map((n, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '3px 9px',
                  background: 'var(--accent-light)',
                  color: 'var(--accent-dark)',
                  borderRadius: 100,
                  fontWeight: 600
                }}
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {trend.source_url && (
          <div style={{ marginTop: 14, fontSize: 12 }}>
            <span style={{ color: 'var(--text-sub)' }}>ソース: </span>
            <a
              href={trend.source_url}
              target="_blank"
              rel="noopener"
              style={{ color: 'var(--accent)' }}
            >
              {trend.source_label ?? trend.source_url}
            </a>
          </div>
        )}

        {onboardUrl && (
          <div style={{ marginTop: 16 }}>
            <a
              href={onboardUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--accent)',
                color: 'white',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700
              }}
            >
              ↗ {trend.related_product_name} を My Stack に追加
            </a>
          </div>
        )}
      </div>
    </details>
  );
}
