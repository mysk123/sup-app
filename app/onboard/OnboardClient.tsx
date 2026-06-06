'use client';

/**
 * /onboard のインタラクティブ部分
 * - 各 target と各サプリにチェックボックス
 * - 重複してる既存サプリは「登録済み」マーク + デフォルト未選択
 * - 件数は target / サプリ で別表示("3件選択"の曖昧さを排除)
 */
import { useState, useTransition } from 'react';
import { acceptOnboard } from './actions';
import { TARGET_LABELS, type Target } from '@/lib/audit/score';

type ItemWithDup = { name: string; dosage?: string; isDuplicate: boolean };

export default function OnboardClient({
  initialTargets,
  existingTargets,
  initialItems
}: {
  initialTargets: Target[];
  existingTargets: Target[];
  initialItems: ItemWithDup[];
}) {
  // target デフォルト: 既存にない target だけ ON
  const [targetChecks, setTargetChecks] = useState<Record<Target, boolean>>(
    () =>
      initialTargets.reduce(
        (acc, t) => ({
          ...acc,
          [t]: !existingTargets.includes(t)
        }),
        {} as Record<Target, boolean>
      )
  );
  // item デフォルト: 重複してないものだけ ON
  const [itemChecks, setItemChecks] = useState<boolean[]>(() =>
    initialItems.map((i) => !i.isDuplicate)
  );
  const [pending, startTransition] = useTransition();

  const selectedTargets = initialTargets.filter((t) => targetChecks[t]);
  const selectedItems = initialItems.filter((_, i) => itemChecks[i]);

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

  const submitLabel = buildSubmitLabel({
    targetCount: selectedTargets.length,
    itemCount: selectedItems.length,
    pending
  });
  const nothingSelected =
    selectedTargets.length === 0 && selectedItems.length === 0;

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
            目的(TARGET) — {selectedTargets.length} / {initialTargets.length} 件
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {initialTargets.map((t) => {
              const selected = targetChecks[t];
              const alreadyHave = existingTargets.includes(t);
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
                  {alreadyHave && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        opacity: 0.75,
                        fontWeight: 600
                      }}
                    >
                      (設定済み)
                    </span>
                  )}
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
              サプリ — {selectedItems.length} / {initialItems.length} 件
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
                    transition: 'all 0.15s ease',
                    opacity: item.isDuplicate && !selected ? 0.6 : 1
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 2,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text-main)'
                        }}
                      >
                        {item.name}
                      </div>
                      {item.isDuplicate && (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: 'Inter, sans-serif',
                            letterSpacing: '0.12em',
                            fontWeight: 700,
                            padding: '2px 7px',
                            background: '#fff8eb',
                            color: '#8a5a06',
                            borderRadius: 100
                          }}
                        >
                          登録済み
                        </span>
                      )}
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
          disabled={nothingSelected || pending}
          style={{
            background: nothingSelected ? 'var(--border)' : 'var(--accent)',
            color: nothingSelected ? 'var(--text-sub)' : 'white',
            border: 'none',
            padding: '13px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: nothingSelected
              ? 'not-allowed'
              : pending
                ? 'wait'
                : 'pointer',
            fontFamily: 'inherit',
            opacity: pending ? 0.7 : 1
          }}
        >
          {submitLabel}
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

function buildSubmitLabel({
  targetCount,
  itemCount,
  pending
}: {
  targetCount: number;
  itemCount: number;
  pending: boolean;
}): string {
  if (pending) return '追加中…';
  if (targetCount === 0 && itemCount === 0) return '何も選ばれていません';
  const parts: string[] = [];
  if (targetCount > 0) parts.push(`目的 ${targetCount}件`);
  if (itemCount > 0) parts.push(`サプリ ${itemCount}件`);
  return `${parts.join(' + ')} を追加 →`;
}
