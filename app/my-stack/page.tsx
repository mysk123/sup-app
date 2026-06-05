import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { addStackItem, deleteStackItem, toggleActiveStackItem } from './actions';
import { auditStack, type AuditFinding } from '@/lib/audit/engine';

type StackItem = {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  timing: string[] | null;
  notes: string | null;
  source: string | null;
  is_active: boolean;
  added_at: string;
};

const TIMING_LABELS: Record<string, string> = {
  morning: '朝',
  lunch: '昼',
  evening: '夕',
  bedtime: '就寝前',
  as_needed: '頓服'
};

export default async function MyStackPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: items, error } = await supabase
    .from('stack_items')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('added_at', { ascending: false });

  const stackItems: StackItem[] = items ?? [];
  const findings = auditStack(stackItems);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      {/* ヘッダー(brand + login state) */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 48,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)'
        }}
      >
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
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <span
            style={{ fontSize: 12, color: 'var(--text-sub)' }}
          >
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
      </header>

      <div style={{ marginBottom: 36 }}>
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
          MY STACK
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 10
          }}
        >
          飲んでるサプリ
          <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
            {' '}
            ({stackItems.filter((i) => i.is_active).length})
          </span>
        </h1>
        <p
          style={{
            color: 'var(--text-sub)',
            fontSize: 14,
            lineHeight: 1.75
          }}
        >
          現在の服用記録。重複・干渉チェック(Phase 3)、リマインダー(Phase 4)
          で活用していく。
        </p>
      </div>

      {/* 監査結果 */}
      {findings.length > 0 && <AuditSection findings={findings} />}

      {/* 追加フォーム */}
      <details
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 28
        }}
      >
        <summary
          style={{
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--accent)',
            userSelect: 'none'
          }}
        >
          + 新しいサプリを追加
        </summary>

        <form action={addStackItem} style={{ marginTop: 20 }}>
          <FormField label="サプリ名" name="name" required placeholder="例: マグネシウム グリシネート" />
          <FormField label="ブランド" name="brand" placeholder="例: NOW Foods(任意)" />
          <FormField label="用量・1日の量" name="dosage" placeholder="例: 300mg / 1日1回" />

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-sub)',
                marginBottom: 8,
                fontWeight: 600
              }}
            >
              タイミング(複数選択可)
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(TIMING_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 100,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    name="timing"
                    value={key}
                    style={{ margin: 0 }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-sub)',
                marginBottom: 6,
                fontWeight: 600
              }}
            >
              メモ
            </label>
            <textarea
              name="notes"
              placeholder="効果・気付き等、自由メモ"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '11px 22px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            追加する
          </button>
        </form>
      </details>

      {/* 一覧 */}
      {error && (
        <div
          style={{
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 13
          }}
        >
          読み込みエラー: {error.message}
        </div>
      )}

      {stackItems.length === 0 && (
        <div
          style={{
            padding: '36px 22px',
            background: 'var(--card-bg)',
            border: '1px dashed var(--border)',
            borderRadius: 14,
            textAlign: 'center',
            color: 'var(--text-sub)',
            fontSize: 14,
            lineHeight: 1.75
          }}
        >
          まだ登録されたサプリはありません。
          <br />
          上の「+ 新しいサプリを追加」から記録してみて。
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stackItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '18px 22px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              opacity: item.is_active ? 1 : 0.55
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 6
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 2,
                    lineHeight: 1.4
                  }}
                >
                  {item.name}
                </div>
                {item.brand && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-sub)',
                      marginBottom: 4
                    }}
                  >
                    {item.brand}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <form action={toggleActiveStackItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    type="hidden"
                    name="is_active"
                    value={String(item.is_active)}
                  />
                  <button
                    type="submit"
                    title={item.is_active ? '休止' : '再開'}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                      color: 'var(--text-sub)',
                      fontFamily: 'inherit'
                    }}
                  >
                    {item.is_active ? '休止' : '再開'}
                  </button>
                </form>
                <form action={deleteStackItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    title="削除"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                      color: 'var(--text-sub)',
                      fontFamily: 'inherit'
                    }}
                  >
                    ×
                  </button>
                </form>
              </div>
            </div>

            {item.dosage && (
              <div
                style={{
                  fontSize: 12,
                  fontFamily:
                    'ui-monospace, "SF Mono", "JetBrains Mono", monospace',
                  color: 'var(--accent)',
                  marginBottom: 6
                }}
              >
                {item.dosage}
              </div>
            )}

            {item.timing && item.timing.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 8
                }}
              >
                {item.timing.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      padding: '3px 9px',
                      background: 'var(--accent-light)',
                      color: 'var(--accent-dark)',
                      borderRadius: 100,
                      fontWeight: 600
                    }}
                  >
                    {TIMING_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            )}

            {item.notes && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  lineHeight: 1.65,
                  marginTop: 6
                }}
              >
                {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditSection({ findings }: { findings: AuditFinding[] }) {
  const dangerOrWarning = findings.filter(
    (f) => f.severity === 'danger' || f.severity === 'warning'
  );
  const info = findings.filter((f) => f.severity === 'info');

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: 14,
          fontWeight: 700
        }}
      >
        AUDIT — {findings.length}件の気づき
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dangerOrWarning.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
        {info.length > 0 && (
          <details
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 20px'
            }}
          >
            <summary
              style={{
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-sub)',
                userSelect: 'none'
              }}
            >
              ヒント・改善案 ({info.length}件)
            </summary>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 14
              }}
            >
              {info.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const styleByVariant = {
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      label: 'DANGER',
      labelColor: '#991b1b'
    },
    warning: {
      bg: '#fff8eb',
      border: '#fcdca2',
      label: 'WARNING',
      labelColor: '#8a5a06'
    },
    info: {
      bg: 'var(--accent-light)',
      border: 'rgba(15, 91, 62, 0.18)',
      label: 'TIP',
      labelColor: 'var(--accent-dark)'
    }
  };
  const s = styleByVariant[finding.severity];

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '14px 18px'
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          fontWeight: 700,
          color: s.labelColor,
          marginBottom: 6
        }}
      >
        {s.label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 6,
          lineHeight: 1.45
        }}
      >
        {finding.title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75
        }}
      >
        {finding.description}
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  required
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--text-sub)',
          marginBottom: 6,
          fontWeight: 600
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>
        )}
      </label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}
