'use client';

/**
 * 効果トラッキング v1
 * - 週次の主観4軸チェックイン(集中/睡眠/気分/エネルギー, 1-5)
 * - 効果スコアの推移(全員) + サプリ追加の前後比較(Pro)
 * - 構造スコア(予測)と効果スコア(実測)の二層表示
 */
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { recordEffectLog } from './actions';
import {
  EFFECT_AXES,
  CONFOUND_OPTIONS,
  CONFIDENCE_LABEL,
  type EffectStats,
  type Attribution,
  type AxisKey
} from '@/lib/effect/analyze';

type Props = {
  plan: 'free' | 'pro';
  stats: EffectStats;
  attributions: Attribution[];
  structuralScore: number | null;
  hasStack: boolean;
};

const AXIS_ANCHORS: Record<AxisKey, [string, string]> = {
  focus: ['散漫', '冴えてる'],
  sleep: ['浅い', '熟睡'],
  mood: ['沈む', '上向き'],
  energy: ['だるい', '充実']
};

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - +new Date(iso)) / 86400000);
}

export default function EffectTrackingPanel({
  plan,
  stats,
  attributions,
  structuralScore,
  hasStack
}: Props) {
  const isPro = plan === 'pro';
  const [vals, setVals] = useState<Record<AxisKey, number>>({
    focus: 3,
    sleep: 3,
    mood: 3,
    energy: 3
  });
  const [confounds, setConfounds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(stats.n === 0);
  const [upgrading, setUpgrading] = useState(false);

  const since = daysAgo(stats.lastLogAt);
  const needsLog = since === null || since >= 6;

  async function submit(fd: FormData) {
    await recordEffectLog(fd);
    setVals({ focus: 3, sleep: 3, mood: 3, energy: 3 });
    setConfounds([]);
    setNote('');
    setOpen(false);
  }

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string } = await res.json();
      if (data.url) window.location.href = data.url;
      else setUpgrading(false);
    } catch {
      setUpgrading(false);
    }
  }

  function toggleConfound(key: string) {
    setConfounds((c) =>
      c.includes(key) ? c.filter((x) => x !== key) : [...c, key]
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap'
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
          EFFECT TRACKING — 効果トラッキング
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600 }}>
          {stats.n > 0 ? `${stats.n} 回記録` : '記録なし'}
        </div>
      </div>

      {/* チェックイン */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12
        }}
      >
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            style={{
              width: '100%',
              background: needsLog ? 'var(--accent)' : 'transparent',
              color: needsLog ? 'white' : 'var(--accent)',
              border: needsLog ? 'none' : '1px solid var(--accent)',
              padding: '11px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {needsLog
              ? '＋ 今週のコンディションを記録する'
              : `記録する（前回 ${since} 日前）`}
          </button>
        ) : (
          <form action={submit}>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-sub)',
                lineHeight: 1.7,
                marginBottom: 14
              }}
            >
              この1週間の体感を5段階で。なるべく同じ曜日・同じ気分の基準で付けると、
              あとで効果の判定精度が上がります。
            </div>

            {EFFECT_AXES.map((ax) => (
              <div key={ax.key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {ax.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--accent)'
                    }}
                  >
                    {vals[ax.key]}
                  </span>
                </div>
                <input
                  type="range"
                  name={ax.key}
                  min={1}
                  max={5}
                  step={1}
                  value={vals[ax.key]}
                  onChange={(e) =>
                    setVals((v) => ({
                      ...v,
                      [ax.key]: parseInt(e.target.value, 10)
                    }))
                  }
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    color: 'var(--text-soft)',
                    marginTop: 2
                  }}
                >
                  <span>{AXIS_ANCHORS[ax.key][0]}</span>
                  <span>{AXIS_ANCHORS[ax.key][1]}</span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 6, marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-sub)',
                  fontWeight: 600,
                  marginBottom: 7
                }}
              >
                今週あった交絡要因（任意・判定の精度に使います）
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {CONFOUND_OPTIONS.map((c) => {
                  const on = confounds.includes(c.key);
                  return (
                    <label key={c.key} style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="confounds"
                        value={c.key}
                        checked={on}
                        onChange={() => toggleConfound(c.key)}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          padding: '5px 11px',
                          borderRadius: 999,
                          border: `1px solid ${
                            on ? 'var(--accent)' : 'var(--border)'
                          }`,
                          background: on ? 'var(--accent-light)' : 'transparent',
                          color: on ? 'var(--accent-dark)' : 'var(--text-sub)',
                          fontWeight: on ? 700 : 500
                        }}
                      >
                        {c.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="メモ（任意）"
              rows={2}
              maxLength={300}
              style={{
                width: '100%',
                padding: '9px 11px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 12
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <SubmitButton />
              {stats.n > 0 && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-sub)',
                    border: '1px solid var(--border)',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  閉じる
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* 推移 + 二層スコア */}
      {stats.n > 0 && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 12
          }}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--text-sub)',
                  fontWeight: 700,
                  marginBottom: 4
                }}
              >
                効果スコア（実測）
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}
              >
                {stats.overall}
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--text-sub)',
                    fontWeight: 700
                  }}
                >
                  /100
                </span>
              </div>
            </div>
            {structuralScore !== null && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--text-sub)',
                    fontWeight: 700,
                    marginBottom: 4
                  }}
                >
                  構造スコア（予測）
                </div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-sub)'
                  }}
                >
                  {structuralScore}
                  <span style={{ fontSize: 14, fontWeight: 700 }}>/100</span>
                </div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 160 }}>
              <Sparkline trend={stats.trend} />
            </div>
          </div>

          {/* 二層の一致/不一致(Pro, データ十分時) */}
          {isPro && structuralScore !== null && stats.n >= 3 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12.5,
                color: 'var(--text-sub)',
                lineHeight: 1.7,
                borderTop: '1px solid var(--border)',
                paddingTop: 10
              }}
            >
              {structuralScore >= 70 && stats.overall < 50
                ? '構造は良好なのに体感が伸びていません。用量・タイミング・個人差(非レスポンダー)を見直す余地があります。'
                : structuralScore >= 70 && stats.overall >= 65
                  ? '構造・体感とも良好。今の組み合わせは機能しています。'
                  : structuralScore < 60
                    ? 'まず構造スコアに改善余地があります（下の AI 分析の提案を参照）。'
                    : '体感を記録し続けると、構造と実測のズレからボトルネックが見えてきます。'}
            </div>
          )}
        </div>
      )}

      {/* インサイト(前後比較) */}
      {stats.n > 0 && (
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
            INSIGHTS — サプリ追加の前後比較
          </div>

          {stats.n < 3 ? (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-sub)',
                lineHeight: 1.75
              }}
            >
              あと <strong style={{ color: 'var(--accent)' }}>{3 - stats.n}</strong>{' '}
              回記録すると、各サプリを足す前後でコンディションがどう動いたかを
              分析できます。まずはベースライン作りです。
            </div>
          ) : !isPro ? (
            <LockedInsights onUpgrade={upgradeToPro} upgrading={upgrading} />
          ) : (
            <InsightList attributions={attributions} hasStack={hasStack} />
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: 'var(--accent)',
        color: 'white',
        border: 'none',
        padding: '10px 22px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        cursor: pending ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        opacity: pending ? 0.7 : 1
      }}
    >
      {pending ? '記録中…' : '記録する'}
    </button>
  );
}

function Sparkline({ trend }: { trend: { date: string; score: number }[] }) {
  const data = trend.slice(-12);
  if (data.length < 2) {
    return (
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--text-soft)',
          paddingTop: 18
        }}
      >
        2回目以降、推移グラフが出ます
      </div>
    );
  }
  const W = 220;
  const H = 44;
  const pad = 3;
  const xs = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const ys = (s: number) => H - pad - (s / 100) * (H - pad * 2);
  const pts = data.map((d, i) => `${xs(i).toFixed(1)},${ys(d.score).toFixed(1)}`);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xs(data.length - 1)}
        cy={ys(data[data.length - 1].score)}
        r={3}
        fill="var(--accent)"
      />
    </svg>
  );
}

function LockedInsights({
  onUpgrade,
  upgrading
}: {
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff8eb',
        border: '1px solid #fcdca2',
        borderRadius: 10,
        padding: '14px 16px'
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          fontWeight: 700,
          color: '#8a5a06',
          marginBottom: 6
        }}
      >
        PRO
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
        前後比較インサイトは Pro 機能です
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75,
          marginBottom: 12
        }}
      >
        「L-テアニンを足してから集中が平常の変動幅を超えて上振れ（確度:中）」のように、
        どのサプリが効いたかをあなたのデータから判定します。記録は無料のまま貯まります。
      </div>
      <button
        onClick={onUpgrade}
        disabled={upgrading}
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: upgrading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          opacity: upgrading ? 0.7 : 1
        }}
      >
        {upgrading ? 'Stripe へ移動中…' : 'Pro にアップグレード →'}
      </button>
    </div>
  );
}

function InsightList({
  attributions,
  hasStack
}: {
  attributions: Attribution[];
  hasStack: boolean;
}) {
  const judged = attributions.filter((a) => a.confidence !== 'insufficient');
  const pending = attributions.filter((a) => a.confidence === 'insufficient');

  if (!hasStack) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.75 }}>
        スタックにサプリを追加すると、追加の前後でコンディションを比較します。
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {judged.length === 0 && (
        <div
          style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.75 }}
        >
          まだ明確な変化は検出されていません。記録を続けると精度が上がります。
        </div>
      )}
      {judged.map((a) => (
        <AttributionCard key={a.itemId} a={a} />
      ))}
      {pending.length > 0 && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--text-soft)',
            lineHeight: 1.7,
            marginTop: 2
          }}
        >
          判定待ち（前後にもう少し記録が必要）:{' '}
          {pending.map((p) => p.itemName).join(' / ')}
        </div>
      )}
    </div>
  );
}

function AttributionCard({ a }: { a: Attribution }) {
  const top = a.top;
  const dir =
    top?.direction === 'up'
      ? { color: 'var(--accent)', arrow: '↑', word: '上振れ' }
      : top?.direction === 'down'
        ? { color: '#c0503c', arrow: '↓', word: '低下' }
        : { color: 'var(--text-sub)', arrow: '→', word: '変化なし' };

  const confColor =
    a.confidence === 'high'
      ? 'var(--accent)'
      : a.confidence === 'mid'
        ? '#8a5a06'
        : 'var(--text-sub)';

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{a.itemName}</span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: confColor,
            border: `1px solid ${confColor}`,
            padding: '2px 8px',
            borderRadius: 999,
            whiteSpace: 'nowrap'
          }}
        >
          {CONFIDENCE_LABEL[a.confidence]}
        </span>
      </div>

      {top && top.direction !== 'flat' ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          追加後、
          <strong style={{ color: dir.color }}>
            {top.label} が {top.deltaRaw >= 0 ? '+' : ''}
            {top.deltaRaw.toFixed(1)} {dir.arrow} {dir.word}
          </strong>
          <span style={{ color: 'var(--text-sub)' }}>
            {' '}
            （平常の{Math.abs(top.deltaSigma).toFixed(1)}σ・前{a.nBefore}/後
            {a.nAfter}記録）
          </span>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7 }}>
          目立った変化は検出されていません（前{a.nBefore}/後{a.nAfter}記録）。
        </div>
      )}

      {a.confounded && (
        <div
          style={{
            fontSize: 11.5,
            color: '#8a5a06',
            marginTop: 6,
            lineHeight: 1.6
          }}
        >
          ⚠ 同時期に {a.confounders.join('・')} も追加。どれの効果かは切り分け不能です。
        </div>
      )}
    </div>
  );
}
