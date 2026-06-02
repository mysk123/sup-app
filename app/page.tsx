/**
 * Sup. App — Home (landing for the management app)
 *
 * 既存の sup-app.org(診断/入り口)とは別物の、
 * 「飲んでるサプリを管理する」アプリのトップページ。
 *
 * Phase 2 では:
 *  - ログインでクラウド同期される My Stack
 *  - 既存の Saved List(localStorage)からの引き継ぎ
 *  - Stack 監査 / リマインダー(Phase 3, 4)
 */

export default function Home() {
  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 48
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.02em'
          }}
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
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-sub)',
            letterSpacing: '0.02em'
          }}
        >
          サプリメント管理アプリ
        </span>
      </div>

      <div style={{ marginBottom: 88 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.18em',
            color: 'var(--accent)',
            marginBottom: 16,
            fontWeight: 600
          }}
        >
          BUILDING IN PUBLIC / PHASE 2
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: '-0.035em',
            marginBottom: 20
          }}
        >
          飲んでるサプリを、
          <br />
          <span style={{ color: 'var(--accent)' }}>続けやすく</span>。
        </h1>
        <p
          style={{
            color: 'var(--text-sub)',
            fontSize: 16,
            lineHeight: 1.85,
            maxWidth: 540
          }}
        >
          今飲んでいるサプリの記録 / 重複・干渉チェック / 服用タイミングの
          リマインドまで一気通貫で。Sup. の診断結果も、ここに集約。
        </p>
      </div>

      <div
        style={{
          padding: '28px 28px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          marginBottom: 40
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            marginBottom: 10,
            fontWeight: 700
          }}
        >
          DISCOVERY (別サイト)
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          まだサプリを試したことがない方へ
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-sub)',
            lineHeight: 1.75,
            marginBottom: 16
          }}
        >
          悩みから「動かす数値」「効く成分」「具体的なサプリ製品」まで、
          5分の問診で診断する Sup. の本家サイトはこちら。
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
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          sup-app.org で診断する →
        </a>
      </div>

      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: 12,
          fontWeight: 700,
          marginTop: 40
        }}
      >
        ROADMAP
      </div>
      <ul
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.85,
          paddingLeft: 22
        }}
      >
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 2.1</strong>{' '}
          Next.js skeleton ← 今ここ
        </li>
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 2.2</strong>{' '}
          Supabase + Google 認証
        </li>
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 2.3</strong> My
          Stack DB スキーマ + 永続化(端末跨ぎ同期)
        </li>
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 3</strong> Stack
          監査(重複・干渉・不足のチェック)
        </li>
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 4</strong>{' '}
          服用タイミングのリマインダー
        </li>
        <li>
          <strong style={{ color: 'var(--text-main)' }}>Phase 5</strong> iOS
          ネイティブアプリ
        </li>
      </ul>
    </div>
  );
}
