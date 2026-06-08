'use client';

/**
 * スタック一覧 (Client Component)
 * useOptimistic でボタン押下時に即座に UI が反応するようにする
 */
import { useOptimistic, useTransition } from 'react';
import { deleteStackItem, toggleActiveStackItem } from './actions';
import {
  MonitoringBadge,
  MonitoringForm,
  MonitoringHistory
} from './MonitoringPanel';
import type {
  MonitoringPrompt,
  MonitoringResponse
} from '@/lib/monitoring/types';

const TIMING_LABELS: Record<string, string> = {
  morning: '朝',
  lunch: '昼',
  evening: '夕',
  bedtime: '就寝前',
  as_needed: '頓服'
};

export type StackItem = {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  timing: string[] | null;
  notes: string | null;
  source: string | null;
  is_active: boolean;
  added_at: string;
  detected_ingredients: string | null;
};

type OptimisticAction =
  | { type: 'delete'; id: string }
  | { type: 'toggle'; id: string };

export default function StackItemsList({
  items,
  duePromptsByItem = {},
  responsesByItem = {}
}: {
  items: StackItem[];
  duePromptsByItem?: Record<string, MonitoringPrompt[]>;
  responsesByItem?: Record<string, MonitoringResponse[]>;
}) {
  const [optimisticItems, applyOptimistic] = useOptimistic<
    StackItem[],
    OptimisticAction
  >(items, (current, action) => {
    switch (action.type) {
      case 'delete':
        return current.filter((i) => i.id !== action.id);
      case 'toggle':
        return current.map((i) =>
          i.id === action.id ? { ...i, is_active: !i.is_active } : i
        );
    }
  });

  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id });
      const fd = new FormData();
      fd.set('id', id);
      await deleteStackItem(fd);
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: 'toggle', id });
      const fd = new FormData();
      fd.set('id', id);
      fd.set('is_active', String(currentActive));
      await toggleActiveStackItem(fd);
    });
  }

  if (optimisticItems.length === 0) {
    return (
      <div
        style={{
          padding: '32px 24px',
          background: 'var(--card-bg)',
          border: '1px dashed var(--border)',
          borderRadius: 14,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 6
          }}
        >
          まだ登録されたサプリはありません
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-sub)',
            lineHeight: 1.75,
            marginBottom: 18
          }}
        >
          始め方はどちらでも結構です。下からお選びください。
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          <a
            href="https://sup-app.org/"
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent)',
              color: 'white',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700
            }}
          >
            まずは無料診断 →
          </a>
          <a
            href="#add-form"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              color: 'var(--accent)',
              textDecoration: 'none',
              border: '1px solid var(--accent)',
              padding: '9px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700
            }}
          >
            すでに飲んでいるものを登録
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {optimisticItems.map((item) => {
        const duePrompts = duePromptsByItem[item.id] ?? [];
        const responses = responsesByItem[item.id] ?? [];
        const hasDue = duePrompts.length > 0;
        return (
        <div
          key={item.id}
          style={{
            padding: '18px 22px',
            background: 'var(--card-bg)',
            border: hasDue && item.is_active
              ? '1px solid #fcdca2'
              : '1px solid var(--border)',
            borderRadius: 12,
            opacity: item.is_active ? 1 : 0.55,
            transition: 'opacity 0.15s ease'
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
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                {item.name}
                {hasDue && item.is_active && (
                  <MonitoringBadge prompt={duePrompts[0]} />
                )}
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
              <button
                type="button"
                onClick={() => handleToggle(item.id, item.is_active)}
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
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
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

          {/* AI 推測済み成分があれば表示 */}
          {item.detected_ingredients && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-sub)',
                marginTop: 4,
                marginBottom: 4,
                lineHeight: 1.6
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                成分:
              </span>{' '}
              {item.detected_ingredients}
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

          {/* 振り返り(due な prompt があれば最古の1つを表示) */}
          {hasDue && item.is_active && (
            <MonitoringForm prompt={duePrompts[0]} itemId={item.id} />
          )}

          {/* 過去の振り返り履歴 */}
          {responses.length > 0 && <MonitoringHistory responses={responses} />}
        </div>
      );
      })}
    </div>
  );
}
