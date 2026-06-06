'use client';

/**
 * Optimization Score 表示パネル
 * - Free: 総合スコアの数字のみ、内訳と改善案は伏せて Pro 訴求
 * - Pro: 7軸の内訳 + 改善案フル表示
 */
import { useState } from 'react';
import type { ScoreResult } from '@/lib/audit/score';

type Plan = 'free' | 'pro';

const AXIS_LABELS: Record<keyof ScoreResult['axes'], string> = {
  coverage: '基礎栄養カバレッジ',
  target_alignment: '目的整合性',
  synergy: 'シナジー実現度',
  overdose_risk: '過剰摂取の安全度',
  interaction_risk: '干渉の安全度',
  timing: 'タイミング最適度',
  continuity: '継続性'
};

export default function ScorePanel({
  score,
  plan
}: {
  score: ScoreResult;
  plan: Plan;
}) {
  const [upgrading, setUpgrading] = useState(false);
  const isPro = plan === 'pro';

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) window.location.href = data.url;
      else setUpgrading(false);
    } catch {
      setUpgrading(false);
    }
  }

  const grade =
    score.total >= 85
      ? 'EXCELLENT'
      : score.total >= 70
        ? 'GREAT'
        : score.total >= 55
          ? 'GOOD'
          : score.total >= 40
            ? 'FAIR'
            : 'NEEDS WORK';

  const gradeColor =
    score.total >= 70
      ? 'var(--accent)'
      : score.total >= 40
        ? '#8a5a06'
        : '#991b1b';

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
        OPTIMIZATION SCORE
      </div>

      {/* スコア本体 */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '24px 24px 20px',
          marginBottom: isPro ? 12 : 0
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            marginBottom: 6
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: gradeColor
            }}
          >
            {score.total}
          </div>
          <div
            style={{
              paddingBottom: 8,
              color: 'var(--text-sub)',
              fontSize: 18,
              fontWeight: 600
            }}
          >
            / 100
          </div>
          <div
            style={{
              marginLeft: 'auto',
              paddingBottom: 8,
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.18em',
              fontWeight: 700,
              color: gradeColor
            }}
          >
            {grade}
          </div>
        </div>

        {/* 進捗バー */}
        <div
          style={{
            height: 6,
            background: 'var(--border)',
            borderRadius: 100,
            overflow: 'hidden',
            marginTop: 12
          }}
        >
          <div
            style={{
              width: `${score.total}%`,
              height: '100%',
              background: gradeColor,
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* Free 訴求 */}
        {!isPro && (
          <div
            style={{
              marginTop: 20,
              padding: '14px 16px',
              background: 'var(--accent-light)',
              border: '1px solid rgba(15, 91, 62, 0.18)',
              borderRadius: 10
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-dark)',
                marginBottom: 4
              }}
            >
              内訳と改善ロードマップは Pro で見られる
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-sub)',
                lineHeight: 1.7,
                marginBottom: 10
              }}
            >
              7軸ごとの減点理由 / 「○○ を追加で +○点」の改善提案 /
              月次のスコア推移グラフが見られる
            </div>
            <button
              onClick={upgradeToPro}
              disabled={upgrading}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: upgrading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: upgrading ? 0.7 : 1
              }}
            >
              {upgrading ? '移動中…' : 'Pro で全部見る (¥980/月) →'}
            </button>
          </div>
        )}
      </div>

      {/* Pro: 軸内訳 */}
      {isPro && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 12
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 12
            }}
          >
            軸内訳
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              Object.entries(score.axes) as [
                keyof ScoreResult['axes'],
                ScoreResult['axes'][keyof ScoreResult['axes']]
              ][]
            ).map(([key, axis]) => (
              <AxisRow key={key} label={AXIS_LABELS[key]} axis={axis} />
            ))}
          </div>
        </div>
      )}

      {/* Pro: 改善案 */}
      {isPro && score.improvements.length > 0 && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 12
            }}
          >
            次の一手 — スコアを上げる
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {score.improvements.map((imp, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  background: 'var(--accent-light)',
                  border: '1px solid rgba(15, 91, 62, 0.15)',
                  borderRadius: 10
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 4
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-main)'
                    }}
                  >
                    {imp.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--accent-dark)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    +{imp.points_estimate} 点
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-sub)',
                    lineHeight: 1.65
                  }}
                >
                  {imp.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AxisRow({
  label,
  axis
}: {
  label: string;
  axis: { score: number; max: number; detail: string };
}) {
  const pct = (axis.score / axis.max) * 100;
  const color =
    pct >= 80 ? 'var(--accent)' : pct >= 50 ? '#8a5a06' : '#991b1b';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color,
            fontFamily: 'ui-monospace, monospace'
          }}
        >
          {Math.round(axis.score)} / {axis.max}
        </div>
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--border)',
          borderRadius: 100,
          overflow: 'hidden',
          marginBottom: 4
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-sub)',
          lineHeight: 1.5
        }}
      >
        {axis.detail}
      </div>
    </div>
  );
}
