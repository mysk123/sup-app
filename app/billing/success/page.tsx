/**
 * Stripe Checkout 完了後の戻り先
 * Webhook で profiles.plan が 'pro' に更新されるまで多少ラグがあるので、
 * シンプルに「ありがとう」表示 + My Stack に戻るリンク
 */
export default function BillingSuccessPage() {
  return (
    <div className="container" style={{ maxWidth: 560, padding: '80px 20px' }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          color: 'var(--accent)',
          marginBottom: 16,
          fontWeight: 700
        }}
      >
        UPGRADE COMPLETE
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: '-0.025em',
          marginBottom: 16
        }}
      >
        Pro プランへようこそ。
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 15,
          lineHeight: 1.85,
          marginBottom: 28
        }}
      >
        AI 包括分析が無制限になりました。スタックが増えるたびに、
        遠慮なく分析を回してください。
        <br />
        反映まで数秒かかる場合があります。
      </p>
      <a
        href="/my-stack"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--accent)',
          color: 'white',
          textDecoration: 'none',
          padding: '13px 24px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700
        }}
      >
        My Stack に戻る →
      </a>
    </div>
  );
}
