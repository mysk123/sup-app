'use client';

/**
 * AI 包括分析パネル(クライアントコンポーネント)
 * - ボタン → /api/audit/ai を叩く → 結果を表示
 * - Free プランは月 N 回ゲート、超えたら Stripe Checkout へ誘導
 */
import { useState } from 'react';

type Recommendation = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

type Analysis = {
  overall: string;
  recommendations: Recommendation[];
  summary: string;
};

type ApiResponse = {
  analysis?: Analysis;
  error?: string;
  message?: string;
  usage?: { input_tokens: number; output_tokens: number };
  stack_count?: number;
  billing?: BillingStatusFromApi;
};

type BillingStatusFromApi = {
  plan: 'free' | 'pro';
  ai_used_this_month: number;
  ai_limit_this_month: number | null;
  ai_remaining: number | null;
};

export type BillingStatus = {
  plan: 'free' | 'pro';
  ai_used_this_month: number;
  ai_limit_this_month: number | null;
  ai_remaining: number | null;
};

export default function AiAnalysisPanel({
  initialBilling
}: {
  initialBilling: BillingStatus;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(
    initialBilling.plan === 'free' &&
      initialBilling.ai_remaining !== null &&
      initialBilling.ai_remaining <= 0
  );
  const [billing, setBilling] = useState<BillingStatus>(initialBilling);
  const [upgrading, setUpgrading] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/audit/ai', { method: 'POST' });
      const data: ApiResponse = await res.json();

      if (res.status === 402) {
        // 上限到達 → アップグレード CTA
        setLimitReached(true);
        if (data.billing) setBilling(data.billing);
        setError(null);
      } else if (!res.ok) {
        setError(data.message ?? data.error ?? `エラー(${res.status})`);
      } else if (data.analysis) {
        setResult(data.analysis);
        // 楽観的に残り回数 -1
        if (billing.ai_remaining !== null) {
          setBilling({
            ...billing,
            ai_used_this_month: billing.ai_used_this_month + 1,
            ai_remaining: Math.max(0, billing.ai_remaining - 1)
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Checkout の起動に失敗しました');
        setUpgrading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUpgrading(false);
    }
  }

  const isPro = billing.plan === 'pro';

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          AI ANALYSIS — スタック包括分析
        </div>
        <PlanBadge billing={billing} />
      </div>

      {/* 初期 / アイドル状態 */}
      {!result && !loading && !limitReached && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px 22px'
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-main)',
              lineHeight: 1.7,
              marginBottom: 14
            }}
          >
            ルールベースで拾えない「コンテキスト依存の改善案」を、AI
            に分析させます。スタック全体の方向性、足りない観点、シナジー候補を
            個別アドバイスとして返します。
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={runAnalysis}
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
              AI 包括分析を生成
            </button>
            {!isPro && (
              <button
                onClick={upgradeToPro}
                disabled={upgrading}
                style={{
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: upgrading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: upgrading ? 0.7 : 1
                }}
              >
                {upgrading ? '移動中…' : 'Pro で無制限にする (¥980/月)'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 上限到達状態(Free のみ) */}
      {limitReached && !loading && !result && (
        <div
          style={{
            background: '#fff8eb',
            border: '1px solid #fcdca2',
            borderRadius: 12,
            padding: '18px 22px'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: '#8a5a06',
              marginBottom: 8
            }}
          >
            FREE LIMIT REACHED
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 6,
              lineHeight: 1.4
            }}
          >
            今月の AI 分析(
            {billing.ai_limit_this_month ?? 0}回)を使い切りました
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.75,
              marginBottom: 14
            }}
          >
            Pro プラン(月額 ¥980)にアップグレードすると、AI
            包括分析が無制限になります。サプリを増やすたびに分析して、
            スタックを最適化していけます。
          </div>
          <button
            onClick={upgradeToPro}
            disabled={upgrading}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '11px 22px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: upgrading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: upgrading ? 0.7 : 1
            }}
          >
            {upgrading ? 'Stripe へ移動中…' : 'Pro にアップグレード →'}
          </button>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '24px 22px',
            textAlign: 'center',
            color: 'var(--text-sub)',
            fontSize: 14,
            lineHeight: 1.7
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                verticalAlign: 'middle',
                marginRight: 8
              }}
            />
            AI が分析中…
          </div>
          <div style={{ fontSize: 12 }}>
            (通常 10〜30 秒。スタックが多いと長くなる)
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.65,
            marginBottom: 10
          }}
        >
          <strong>分析に失敗しました</strong>
          <div style={{ marginTop: 6 }}>{error}</div>
          <button
            onClick={runAnalysis}
            style={{
              marginTop: 10,
              background: 'transparent',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            再試行
          </button>
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                marginBottom: 8
              }}
            >
              OVERALL
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-main)',
                lineHeight: 1.75
              }}
            >
              {result.overall}
            </div>
          </div>

          {result.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}

          <div
            style={{
              background: 'var(--accent-light)',
              border: '1px solid rgba(15, 91, 62, 0.18)',
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
                color: 'var(--accent-dark)',
                marginBottom: 6
              }}
            >
              SUMMARY
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-main)',
                lineHeight: 1.7,
                fontWeight: 500
              }}
            >
              {result.summary}
            </div>
          </div>

          {/* 再生成 or アップグレード */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isPro &&
              billing.ai_remaining !== null &&
              billing.ai_remaining <= 0 && (
                <button
                  onClick={upgradeToPro}
                  disabled={upgrading}
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: upgrading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 700
                  }}
                >
                  {upgrading
                    ? 'Stripe へ移動中…'
                    : 'Pro でもっと分析する →'}
                </button>
              )}
            {(isPro ||
              (billing.ai_remaining !== null && billing.ai_remaining > 0)) && (
              <button
                onClick={runAnalysis}
                style={{
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                再生成
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBadge({ billing }: { billing: BillingStatus }) {
  if (billing.plan === 'pro') {
    return (
      <span
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.1em',
          fontWeight: 700,
          background: 'var(--accent)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 100
        }}
      >
        PRO · 無制限
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--text-sub)',
        fontWeight: 600
      }}
    >
      今月 {billing.ai_used_this_month} / {billing.ai_limit_this_month} 回
    </span>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const styleByPriority = {
    high: {
      bg: '#fff8eb',
      border: '#fcdca2',
      label: 'HIGH',
      labelColor: '#8a5a06'
    },
    medium: {
      bg: 'var(--card-bg)',
      border: 'var(--border)',
      label: 'MEDIUM',
      labelColor: 'var(--accent)'
    },
    low: {
      bg: 'var(--card-bg)',
      border: 'var(--border)',
      label: 'LOW',
      labelColor: 'var(--text-sub)'
    }
  };
  const s = styleByPriority[rec.priority];

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
        {rec.title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75
        }}
      >
        {rec.description}
      </div>
    </div>
  );
}
