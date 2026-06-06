'use client';

/**
 * 目的 (target) 選択 UI
 * 5つのカテゴリから複数選択可。即時保存。
 */
import { useOptimistic, useTransition } from 'react';
import { updateTargets } from './actions';
import { TARGET_LABELS, type Target } from '@/lib/audit/score';

const TARGET_DESCRIPTIONS: Record<Target, string> = {
  focus: 'ヌートロピック中心',
  recovery: '睡眠・疲労回復',
  stability: 'ストレス耐性',
  appearance: '美容・印象',
  numbers: '健康診断の数値'
};

export default function TargetSelector({
  initialTargets
}: {
  initialTargets: Target[];
}) {
  const [optimisticTargets, applyOptimistic] = useOptimistic<
    Target[],
    Target
  >(initialTargets, (current, toggled) =>
    current.includes(toggled)
      ? current.filter((t) => t !== toggled)
      : [...current, toggled]
  );

  const [, startTransition] = useTransition();

  function toggle(target: Target) {
    startTransition(async () => {
      applyOptimistic(target);
      const next = optimisticTargets.includes(target)
        ? optimisticTargets.filter((t) => t !== target)
        : [...optimisticTargets, target];
      await updateTargets(next);
    });
  }

  return (
    <div
      style={{
        marginBottom: 24,
        padding: '16px 20px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: 6,
          fontWeight: 700
        }}
      >
        TARGET — 何を最適化したい?
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-sub)',
          marginBottom: 12,
          lineHeight: 1.6
        }}
      >
        選んだ目的に合わせてスコアの「目的整合」軸が計算される(複数選択可)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(Object.entries(TARGET_LABELS) as [Target, string][]).map(
          ([key, label]) => {
            const selected = optimisticTargets.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                style={{
                  background: selected ? 'var(--accent)' : 'transparent',
                  color: selected ? 'white' : 'var(--text-main)',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  padding: '8px 14px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 10,
                    marginLeft: 6,
                    opacity: 0.75,
                    fontWeight: 500
                  }}
                >
                  {TARGET_DESCRIPTIONS[key]}
                </span>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
