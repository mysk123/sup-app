/**
 * 初回ユーザー向けウェルカムパネル
 *
 * 表示条件: target 未設定 or stack(active)が 0 の場合
 * 両方完了したら自動で消える
 */
export default function WelcomePanel({
  hasTargets,
  hasItems
}: {
  hasTargets: boolean;
  hasItems: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: 28,
        padding: '24px 26px',
        background:
          'linear-gradient(135deg, var(--accent-light) 0%, var(--card-bg) 100%)',
        border: '1px solid rgba(15, 91, 62, 0.18)',
        borderRadius: 16
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          color: 'var(--accent)',
          marginBottom: 12,
          fontWeight: 700
        }}
      >
        WELCOME
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          lineHeight: 1.4,
          letterSpacing: '-0.02em',
          marginBottom: 8
        }}
      >
        最適化スコアを出すまで、3 ステップ。
      </h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75,
          marginBottom: 20
        }}
      >
        どれも 1 分で終わる。完了するとこのパネルは自動で消える。
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <Step
          number="1"
          title="目的(TARGET)を選ぶ"
          description="集中力 / 回復 / 安定 / 印象 / 数値改善 から複数選択可。下の TARGET セクションでチップを押すだけ。"
          done={hasTargets}
        />
        <Step
          number="2"
          title="飲んでるサプリを登録"
          description={
            hasTargets || hasItems
              ? '「+ 新しいサプリを追加」から手動入力、または診断結果から一括取り込み'
              : 'まだ何も飲んでないなら、まず無料診断で「何を飲むべきか」を出してから取り込む流れがオススメ'
          }
          done={hasItems}
          actions={
            !hasItems
              ? [
                  {
                    label: 'まずは無料診断 →',
                    href: 'https://sup-app.org/',
                    primary: true,
                    external: true
                  },
                  {
                    label: 'すでに飲んでる(下のフォームへ)',
                    href: '#add-form',
                    primary: false
                  }
                ]
              : undefined
          }
        />
        <Step
          number="3"
          title="Optimization Score を確認"
          description="登録が済むと、7軸でスコアが算定される。改善案も自動で出る(Pro なら内訳もフル表示)。"
          done={hasTargets && hasItems}
        />
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  done,
  actions
}: {
  number: string;
  title: string;
  description: string;
  done: boolean;
  actions?: {
    label: string;
    href: string;
    primary?: boolean;
    external?: boolean;
  }[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '12px 14px',
        background: done ? 'rgba(15, 91, 62, 0.08)' : 'transparent',
        borderRadius: 10,
        transition: 'background 0.2s ease'
      }}
    >
      {/* ステップ番号 or チェック */}
      <div
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 100,
          background: done ? 'var(--accent)' : 'var(--card-bg)',
          border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
          color: done ? 'white' : 'var(--text-sub)',
          fontSize: 14,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {done ? '✓' : number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 4,
            color: 'var(--text-main)',
            textDecoration: done ? 'line-through' : 'none',
            opacity: done ? 0.6 : 1
          }}
        >
          {title}
        </div>
        {!done && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              lineHeight: 1.7,
              marginBottom: actions && actions.length > 0 ? 10 : 0
            }}
          >
            {description}
          </div>
        )}
        {!done && actions && actions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {actions.map((a, i) => (
              <a
                key={i}
                href={a.href}
                target={a.external ? '_blank' : undefined}
                rel={a.external ? 'noopener' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: a.primary ? 'var(--accent)' : 'transparent',
                  color: a.primary ? 'white' : 'var(--accent)',
                  textDecoration: 'none',
                  border: a.primary
                    ? 'none'
                    : '1px solid var(--accent)',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'inherit'
                }}
              >
                {a.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
