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
import { amazonLink, iherbLink } from '@/lib/affiliate';
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
  sns_buzz: 'SNS / MARKET',
  celebrity: 'EXPERT STACK',
  research: 'DEEP DIVE'
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

  // body 付き(長文記事)を最新1件 = FEATURED
  const featured = trends.find((t) => t.body && t.body.length > 1000);

  // user の target にマッチする trends と、それ以外
  const forYou = trends.filter(
    (t) =>
      t.category &&
      userTargets.includes(t.category as Target) &&
      t.id !== featured?.id
  );
  const otherByType = {
    sns_buzz: trends.filter(
      (t) =>
        t.trend_type === 'sns_buzz' &&
        !forYou.includes(t) &&
        t.id !== featured?.id
    ),
    celebrity: trends.filter(
      (t) =>
        t.trend_type === 'celebrity' &&
        !forYou.includes(t) &&
        t.id !== featured?.id
    ),
    research: trends.filter(
      (t) =>
        t.trend_type === 'research' &&
        !forYou.includes(t) &&
        t.id !== featured?.id
    )
  };

  return (
    <div
      className="container"
      style={{ maxWidth: 720, padding: '40px 20px' }}
    >
      <PageHeader />

      {featured && <FeaturedSection trend={featured} />}

      {forYou.length > 0 && (
        <Section
          label="FOR YOU"
          subLabel={`あなたの target に合致する ${forYou.length} 件`}
          trends={forYou}
        />
      )}

      {otherByType.research.length > 0 && (
        <Section
          label="DEEP DIVE"
          subLabel="月刊特集 / 成分の総合ガイド"
          trends={otherByType.research}
        />
      )}

      {otherByType.celebrity.length > 0 && (
        <Section
          label="EXPERT STACK"
          subLabel="専門家・著名人の公開スタック"
          trends={otherByType.celebrity}
        />
      )}

      {otherByType.sns_buzz.length > 0 && (
        <Section
          label="SNS / MARKET"
          subLabel="SNS・市場動向"
          trends={otherByType.sns_buzz}
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
        PREMIUM COLUMN — 月刊読み物
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
        サプリを「続ける」ための、月刊読み物。
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
        月刊特集の深掘り記事、研究ベースの解説、成分の総合ガイド、
        SNS/専門家の最新動向。考えながらサプリを選ぶための、
        じっくり読める知の蓄積を月初にお届けします。
      </p>
    </>
  );
}

function FeaturedSection({ trend }: { trend: Trend }) {
  const categoryLabel =
    trend.category && TARGET_LABELS[trend.category as Target];

  return (
    <section
      style={{
        marginBottom: 40,
        background:
          'linear-gradient(135deg, var(--accent-light) 0%, var(--card-bg) 100%)',
        border: '1px solid rgba(15, 91, 62, 0.2)',
        borderRadius: 16,
        padding: '24px 24px 28px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.2em',
          fontWeight: 700,
          color: 'var(--accent-dark)',
          marginBottom: 12,
          display: 'inline-block',
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 100
        }}
      >
        ★ FEATURED / 月の特集
      </div>
      {categoryLabel && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-sub)',
            fontWeight: 600,
            marginBottom: 4
          }}
        >
          {categoryLabel}
        </div>
      )}
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1.35,
          letterSpacing: '-0.025em',
          marginBottom: 12,
          color: 'var(--text-main)'
        }}
      >
        {trend.title}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-sub)',
          lineHeight: 1.85,
          marginBottom: 18
        }}
      >
        {trend.description}
      </p>

      {trend.body && (
        <details
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 14
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              listStyle: 'none',
              userSelect: 'none',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            ▾ 本文を読む(約{Math.round(trend.body.length / 100) * 100}字)
          </summary>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              fontSize: 14,
              lineHeight: 2,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-main)'
            }}
          >
            {trend.body}
          </div>
        </details>
      )}

      {trend.source_url && (
        <div style={{ fontSize: 12, marginBottom: 10 }}>
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

      {trend.related_product_name && (
        <ProductActions
          name={trend.related_product_name}
          dosage={trend.related_product_dosage}
          category={trend.category}
        />
      )}
    </section>
  );
}

function ProductActions({
  name,
  dosage,
  category
}: {
  name: string;
  dosage?: string | null;
  category?: string | null;
}) {
  const onboardUrl = `/onboard?items=${encodeURIComponent(
    JSON.stringify([{ name, dosage: dosage ?? '' }])
  )}${category ? `&targets=${category}` : ''}&from=trends`;
  const searchKeyword = name;

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 10
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-sub)',
          fontWeight: 700,
          marginBottom: 8
        }}
      >
        {name}
        {dosage && (
          <span style={{ color: 'var(--accent)', marginLeft: 6 }}>
            ({dosage})
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <a
          href={onboardUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--accent)',
            color: 'white',
            textDecoration: 'none',
            padding: '7px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700
          }}
        >
          ↗ My Stack に追加
        </a>
        <a
          href={iherbLink(searchKeyword)}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: 'var(--accent)',
            textDecoration: 'none',
            border: '1px solid var(--accent)',
            padding: '6px 11px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          iHerb で探す →
        </a>
        <a
          href={amazonLink(searchKeyword)}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            border: '1px solid var(--border)',
            padding: '6px 11px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          Amazon で探す →
        </a>
      </div>
    </div>
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
