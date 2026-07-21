/**
 * 配信停止の確認ページ
 */
export default function UnsubscribePage({
  searchParams
}: {
  searchParams: { ok?: string };
}) {
  const ok = searchParams.ok === '1';
  return (
    <div
      className="container"
      style={{ maxWidth: 480, padding: '64px 20px', textAlign: 'center' }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.02em',
          marginBottom: 28
        }}
      >
        Sup<span style={{ color: 'var(--accent)' }}>.</span>{' '}
        <span style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600 }}>
          App
        </span>
      </div>
      {ok ? (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>
            配信を停止しました
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-sub)',
              lineHeight: 1.85
            }}
          >
            今後、Sup. App からのメール配信はお送りしません。
            またご希望の際は、My Stack の「メール配信を受け取る」からいつでも再開できます。
          </p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>
            リンクが無効です
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-sub)',
              lineHeight: 1.85
            }}
          >
            リンクの有効期限が切れているか、すでに解除済みの可能性があります。
            設定は{' '}
            <a href="/my-stack" style={{ color: 'var(--accent)' }}>
              My Stack
            </a>{' '}
            から変更できます。
          </p>
        </>
      )}
    </div>
  );
}
