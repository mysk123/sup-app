/**
 * My Stack ページから Premium Column へ誘導する目立つカード
 * - Pro: 最新の Featured 記事(タイトル+冒頭)+「続きを読む」
 * - Free: ロック表示 +「Pro でアンロック」CTA
 */

type FeaturedTrend = {
  id: string;
  title: string;
  description: string;
  trend_type: 'sns_buzz' | 'celebrity' | 'research';
};

const TYPE_LABELS: Record<FeaturedTrend['trend_type'], string> = {
  sns_buzz: 'SNS / MARKET',
  celebrity: 'EXPERT STACK',
  research: 'DEEP DIVE'
};

export default function PremiumColumnCard({
  isPro,
  featured,
  totalArticles
}: {
  isPro: boolean;
  featured: FeaturedTrend | null;
  totalArticles: number;
}) {
  return (
    <a
      href="/trends"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background:
          'linear-gradient(135deg, var(--accent-light) 0%, #ffffff 70%)',
        border: '1px solid rgba(15, 91, 62, 0.22)',
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ラベル + 右上 chevron */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.15em',
            color: 'var(--accent-dark)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span
            style={{
              background: 'var(--accent)',
              color: 'white',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 10,
              letterSpacing: '0.12em'
            }}
          >
            ★ PREMIUM COLUMN
          </span>
          {!isPro && (
            <span
              style={{
                background: 'white',
                color: 'var(--text-sub)',
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                border: '1px solid var(--border)'
              }}
            >
              LOCKED
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 18,
            color: 'var(--accent)',
            fontWeight: 700
          }}
        >
          →
        </span>
      </div>

      {isPro && featured ? (
        <>
          {/* タイプラベル */}
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              color: 'var(--text-sub)',
              fontWeight: 700,
              marginBottom: 6
            }}
          >
            最新 · {TYPE_LABELS[featured.trend_type]}
          </div>
          {/* タイトル */}
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              lineHeight: 1.4,
              color: 'var(--text-main)'
            }}
          >
            {featured.title}
          </h3>
          {/* 冒頭 */}
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.75,
              marginBottom: 12,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {featured.description}
          </div>
          {/* フッター */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: 'var(--accent-dark)',
              fontWeight: 700
            }}
          >
            <span>続きを読む</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 600 }}>
              · 他 {Math.max(0, totalArticles - 1)} 本の記事
            </span>
          </div>
        </>
      ) : isPro && !featured ? (
        // Pro だが記事がまだない
        <>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              lineHeight: 1.4
            }}
          >
            Premium Column はこちら
          </h3>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.75
            }}
          >
            SNS バズ・専門家スタック・研究レビューのキュレーションを毎週月曜に更新します。
          </div>
        </>
      ) : (
        // Free
        <>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              lineHeight: 1.4
            }}
          >
            Premium Column を読む
          </h3>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.75,
              marginBottom: 10
            }}
          >
            SNS バズ・芸能人スタック・研究レビューを毎週キュレーション。
            あなたの目的にマッチしたものを優先表示します。
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--accent-dark)',
              fontWeight: 700
            }}
          >
            Pro プラン(¥600/月)でアンロック →
          </div>
        </>
      )}
    </a>
  );
}
