'use client';

/**
 * /onboard のインタラクティブ部分
 * - 各 target と各サプリにチェックボックス
 * - 「選んだ○件を追加」ボタンに動的件数を表示
 */
import { useState, useTransition } from 'react';
import { acceptOnboard } from './actions';
import { TARGET_LABELS, type Target } from '@/lib/audit/score';

type Item = { name: string; dosage?: string };

export default function OnboardClient({
  initialTargets,
  initialItems
}: {
  initialTargets: Target[];
  initialItems: Item[];
}) {
  // デフォルト全選択(ユーザーは「外す」操作だけで済む)
  const [targetChecks, setTargetChecks] = useState<Record<Target, boolean>>(
    () =>
      initialTargets.reduce(
        (acc, t) => ({ ...acc, [t]: true }),
        {} as Record<Target, boolean>
      )
  );
  const [itemChecks, setItemChecks] = useState<boolean[]>(() =>
    initialItems.map(() => true)
  );
  const [pending, startTransition] = useTransition();

  const selectedTargets = initialTargets.filter((t) => targetChecks[t]);
  const selectedItems = initialItems.filter((_, i) => itemChecks[i]);
  const total = selectedTargets.length + selectedItems.length;

  function toggleTarget(t: Target) {
    setTargetChecks((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  function toggleItem(i: number) {
    setItemChecks((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function selectAllItems(value: boolean) {
    setItemChecks(initialItems.map(() => value));
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('targets', selectedTargets.join(','));
      formData.set('items', JSON.stringify(selectedItems));
      await acceptOnboard(formData);
    });
  }

  return (
    <>
      {/* TARGETS */}
      {initialTargets.length > 0 && (
        <section style={{ marginBottom: 24 }}>
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
            目的(TARGET)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {initialTargets.map((t) => {
              const selected = targetChecks[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTarget(t)}
                  style={{
                    background: selected
                      ? 'var(--accent)'
                      : 'transparent',
                    color: selected ? 'white' : 'var(--text-main)',
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    padding: '7px 14px',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {selected ? '✓ ' : ''}
                  {TARGET_LABELS[t]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ITEMS */}
      {initialItems.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.15em',
                color: 'var(--accent)',
                fontWeight: 700
              }}
            >
              推奨サプリ({selectedItems.length} / {initialItems.length} 選択中)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => selectAllItems(true)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                全選択
              </button>
              <button
                type="button"
                onClick={() => selectAllItems(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                全解除
              </button>
            </div>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {initialItems.map((item, i) => {
              const selected = itemChecks[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleItem(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    background: selected
                      ? 'var(--accent-light)'
                      : 'var(--card-bg)',
                    border: `1px solid ${selected ? 'rgba(15, 91, 62, 0.35)' : 'var(--border)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent)' : 'transparent',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1
                    }}
                  >
                    {selected ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        marginBottom: 2,
                        color: 'var(--text-main)'
                      }}
                    >
                      {item.name}
                    </div>
                    {item.dosage && (
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--accent)'
                        }}
                      >
                        {item.dosage}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* アクション */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={total === 0 || pending}
          style={{
            background: total === 0 ? 'var(--border)' : 'var(--accent)',
            color: total === 0 ? 'var(--text-sub)' : 'white',
            border: 'none',
            padding: '13px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: total === 0 ? 'not-allowed' : pending ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: pending ? 0.7 : 1
          }}
        >
          {pending
            ? '追加中…'
            : total === 0
              ? '何も選ばれていません'
              : `選んだ ${total} 件を追加 →`}
        </button>
        <a
          href="/my-stack"
          style={{
            background: 'transparent',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            border: '1px solid var(--border)',
            padding: '12px 22px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          キャンセル
        </a>
      </div>
    </>
  );
}
