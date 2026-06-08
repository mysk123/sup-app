/**
 * Sup. App — Landing
 *
 * ターゲット: 知的生産者(考える人・書く人・作る人)
 * メッセージ: 自分のサプリ習慣を、スコアで見る
 */
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="container" style={{ maxWidth: 920 }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 64,
          paddingTop: 8
        }}
      >
        <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span
            style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}
          >
            Sup<span style={{ color: 'var(--accent)' }}>.</span>
            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: 'var(--text-sub)',
                fontWeight: 600,
                letterSpacing: '0.04em'
              }}
            >
              App
            </span>
          </span>
        </a>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
              {user.email}
            </span>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                ログアウト
              </button>
            </form>
          </div>
        ) : (
          <a
            href="/login"
            style={{
              fontSize: 13,
              color: 'var(--text-main)',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            ログイン →
          </a>
        )}
      </header>

      {/* Hero */}
      <section style={{ marginBottom: 96 }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
            marginBottom: 22,
            maxWidth: 720
          }}
        >
          自分のサプリ習慣を、
          <br />
          <span style={{ color: 'var(--accent)' }}>スコアで見る。</span>
        </h1>
        <p
          style={{
            color: 'var(--text-sub)',
            fontSize: 17,
            lineHeight: 1.85,
            maxWidth: 580,
            marginBottom: 36
          }}
        >
          重複・干渉・シナジー欠落・タイミングのズレ。
          飲んでいるサプリの「最適化スコア」を 0–100 で可視化します。
          AI が改善案をご提案します。考える・書く・作るのパフォーマンスを、
          サプリで底上げしたい方のためのアプリです。
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          {/* メイン CTA: まずは無料診断 */}
          <a
            href="https://sup-app.org/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent)',
              color: 'white',
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700
            }}
          >
            まずは無料で診断する →
          </a>
          {/* サブ CTA: ログイン/My Stack */}
          <a
            href={user ? '/my-stack' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: 'var(--accent)',
              textDecoration: 'none',
              padding: '13px 24px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid var(--accent)'
            }}
          >
            {user
              ? 'My Stack を開く'
              : 'すでに飲んでいる方はログイン'}
          </a>
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-sub)',
            marginTop: 14,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>{' '}
            診断は完全無料・5分で完了します
          </span>
          <span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>{' '}
            登録不要で始められます
          </span>
          <span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>{' '}
            結果はそのまま My Stack に送れます
          </span>
        </div>
      </section>

      {/* Problem */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>WHY</SectionLabel>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 32,
            lineHeight: 1.35,
            maxWidth: 640
          }}
        >
飲んでいるけれど、これが正解か分かりません。
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14
          }}
        >
          <ProblemCard
            quote="マグネシウムが2本にかぶってた"
            detail="商品名が違うと気づきにくい。過剰摂取のリスクも。"
          />
          <ProblemCard
            quote="鉄とカフェイン同時に飲んでた"
            detail="吸収阻害して、鉄が9割無駄になることもある。"
          />
          <ProblemCard
            quote="VD3 だけで K2 が抜けてた"
            detail="シナジーペアが片肺だと、効果半減 or 逆効果も。"
          />
        </div>
      </section>

      {/* Solution / Features */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>HOW</SectionLabel>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 32,
            lineHeight: 1.35,
            maxWidth: 640
          }}
        >
          スタックを 0–100 で測り、改善案を返す。
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14
          }}
        >
          <FeatureCard
            tag="01 / SCORE"
            title="Optimization Score"
            description="基礎栄養 / 目的整合 / シナジー / 過剰 / 干渉 / タイミング / 継続性の 7軸で 0–100 を算定。改善するとスコアが上がる。"
          />
          <FeatureCard
            tag="02 / AUDIT"
            title="ルールベース監査"
            description="重複・干渉・シナジー欠落・タイミング集中を自動検出。35種の主要成分、7つの干渉ルールに対応。"
          />
          <FeatureCard
            tag="03 / AI"
            title="AI 包括分析"
            description="ルールで拾えないコンテキスト依存の改善案を AI が提案。コンビ製品(Hydroxycut 等)の成分も自動推測。"
          />
        </div>
      </section>

      {/* Pricing */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>PRICING</SectionLabel>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 32,
            lineHeight: 1.35
          }}
        >
          まず無料で。続けたくなったら Pro。
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14
          }}
        >
          <PricingCard
            name="Free"
            price="¥0"
            priceNote="ずっと無料"
            features={[
              'サプリ登録 無制限',
              'ルールベース監査 全機能',
              'Optimization Score(総合点)',
              'AI 包括分析 月3回',
              '診断アプリ(sup-app.org)連携'
            ]}
          />
          <PricingCard
            name="Pro"
            price="¥600"
            priceNote="月額(税込)"
            highlighted
            features={[
              'Free の全機能 + 以下',
              'AI 包括分析 無制限',
              'Score の 7軸内訳が見える',
              '改善ロードマップ(+N点が見える)',
              '将来機能の優先アクセス'
            ]}
            ctaLabel={user ? 'My Stack で Pro にする' : 'ログインして Pro へ'}
            ctaHref={user ? '/my-stack' : '/login'}
          />
        </div>
      </section>

      {/* Diagnosis bridge */}
      <section
        style={{
          padding: '32px 32px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          marginBottom: 64
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.18em',
            color: 'var(--accent)',
            marginBottom: 14,
            fontWeight: 700,
            padding: '4px 10px',
            background: 'var(--accent-light)',
            borderRadius: 100
          }}
        >
          FREE / 登録不要
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          まだサプリを試したことがない方へ
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-sub)',
            lineHeight: 1.85,
            marginBottom: 20,
            maxWidth: 600
          }}
        >
          悩みから「動かす数値」「効く成分」「具体的なサプリ製品」までを
          5分の問診で診断。完全無料・アカウント登録なしで使えます。
          診断結果はそのまま Sup. App の My Stack に送れます。
        </p>
        <a
          href="https://sup-app.org/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--accent)',
            color: 'white',
            textDecoration: 'none',
            padding: '12px 22px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700
          }}
        >
          無料で診断を始める →
        </a>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function ProblemCard({
  quote,
  detail
}: {
  quote: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: '20px 22px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 10,
          lineHeight: 1.45,
          color: 'var(--text-main)'
        }}
      >
        「{quote}」
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function FeatureCard({
  tag,
  title,
  description
}: {
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: '24px 24px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          fontWeight: 700,
          color: 'var(--accent)',
          marginBottom: 10
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '-0.015em',
          marginBottom: 10,
          lineHeight: 1.4
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.85
        }}
      >
        {description}
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  priceNote,
  features,
  highlighted,
  ctaLabel,
  ctaHref
}: {
  name: string;
  price: string;
  priceNote: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div
      style={{
        padding: '24px 24px',
        background: highlighted ? 'var(--accent-light)' : 'var(--card-bg)',
        border: `1px solid ${highlighted ? 'rgba(15, 91, 62, 0.35)' : 'var(--border)'}`,
        borderRadius: 14,
        position: 'relative'
      }}
    >
      {highlighted && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: 24,
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.18em',
            fontWeight: 700,
            padding: '4px 10px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: 100
          }}
        >
          POPULAR
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: highlighted ? 'var(--accent-dark)' : 'var(--accent)',
          marginBottom: 12
        }}
      >
        {name.toUpperCase()}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 6
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1
          }}
        >
          {price}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-sub)',
            fontWeight: 600
          }}
        >
          {priceNote}
        </div>
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          marginTop: 18,
          marginBottom: ctaLabel ? 18 : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        {features.map((f, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--text-main)',
              lineHeight: 1.65,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start'
            }}
          >
            <span
              style={{
                color: 'var(--accent)',
                fontWeight: 800,
                marginTop: 1,
                flexShrink: 0
              }}
            >
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: highlighted ? 'var(--accent)' : 'transparent',
            color: highlighted ? 'white' : 'var(--accent)',
            textDecoration: 'none',
            padding: '11px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            border: highlighted ? 'none' : '1px solid var(--accent)'
          }}
        >
          {ctaLabel} →
        </a>
      )}
    </div>
  );
}
