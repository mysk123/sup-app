'use client';

/**
 * AI 包括分析パネル(クライアントコンポーネント)
 * - ボタン → /api/audit/ai を叩く → 結果を表示
 * - Free プランは月 N 回ゲート、超えたら Stripe Checkout へ誘導
 */
import { useState } from 'react';
import { amazonLink, iherbLink } from '@/lib/affiliate';

type Recommendation = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  /** AI が新しいサプリの追加を提案している場合の検索キーワード(例: "L-テアニン", "アシュワガンダ KSM-66") */
  related_product_name?: string;
  related_product_dosage?: string;
  /** 提案の根拠。your_data=本人の効果トラッキング(実測)に基づく */
  evidence?: 'your_data' | 'structure' | 'general';
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
        setError(
          `分析エラー: ${data.message ?? data.error ?? `(${res.status})`}`
        );
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
        setError(
          `アップグレードエラー: ${data.error ?? 'Checkout の起動に失敗しました'}`
        );
        setUpgrading(false);
      }
    } catch (err) {
      setError(
        `アップグレードエラー: ${err instanceof Error ? err.message : String(err)}`
      );
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
                {upgrading ? '移動中…' : 'Pro で無制限にする (¥600/月)'}
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
            Pro プラン(月額 ¥600)にアップグレードすると、AI
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
          <strong>問題が発生しました</strong>
          <div style={{ marginTop: 6 }}>{error}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => {
                setError(null);
              }}
              style={{
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
              閉じる
            </button>
          </div>
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
              OVERALL — 全体評価
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

          {/* 改善案セクションラベル */}
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: 'var(--accent)',
              marginTop: 6,
              display: 'flex',
              gap: 10,
              alignItems: 'center'
            }}
          >
            <span>RECOMMENDATIONS — 改善案 {result.recommendations.length} 件</span>
            <span style={{
              fontSize: 10,
              color: 'var(--text-sub)',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}>
              タップで詳細
            </span>
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
    <details
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      <summary
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          listStyle: 'none',
          userSelect: 'none',
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.16em',
            fontWeight: 700,
            color: s.labelColor,
            background: 'rgba(255,255,255,0.7)',
            padding: '3px 8px',
            borderRadius: 100,
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          {s.label}
        </span>
        {rec.evidence === 'your_data' && (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.08em',
              fontWeight: 700,
              color: 'white',
              background: 'var(--accent)',
              padding: '3px 8px',
              borderRadius: 100,
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            ◆ あなたのデータ
          </span>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.45,
            flex: 1
          }}
        >
          {rec.title}
        </span>
        <span
          aria-hidden
          style={{
            fontSize: 14,
            color: 'var(--text-sub)',
            fontWeight: 700,
            flexShrink: 0,
            transition: 'transform 0.2s ease'
          }}
          className="rec-chevron"
        >
          ▾
        </span>
      </summary>
      <div
        style={{
          padding: '0 18px 14px 18px',
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.85,
          borderTop: `1px solid ${s.border}`
        }}
      >
        <div style={{ paddingTop: 12 }}>{rec.description}</div>
        {rec.related_product_name && (
          <RecommendationActions
            name={rec.related_product_name}
            dosage={rec.related_product_dosage}
          />
        )}
      </div>
    </details>
  );
}

function RecommendationActions({
  name,
  dosage
}: {
  name: string;
  dosage?: string;
}) {
  const onboardUrl = `/onboard?items=${encodeURIComponent(
    JSON.stringify([{ name, dosage: dosage ?? '' }])
  )}&from=ai_analysis`;
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px dashed var(--border)',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }}
    >
      <a
        href={onboardUrl}
        style={{
          background: 'var(--accent)',
          color: 'white',
          textDecoration: 'none',
          padding: '7px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700
        }}
      >
        ↗ My Stack に追加
      </a>
      <a
        href={iherbLink(name)}
        target="_blank"
        rel="noopener"
        style={{
          background: 'transparent',
          color: 'var(--accent)',
          textDecoration: 'none',
          border: '1px solid var(--accent)',
          padding: '6px 11px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600
        }}
      >
        iHerb で探す →
      </a>
      <a
        href={amazonLink(name)}
        target="_blank"
        rel="noopener"
        style={{
          background: 'transparent',
          color: 'var(--text-sub)',
          textDecoration: 'none',
          border: '1px solid var(--border)',
          padding: '6px 11px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600
        }}
      >
        Amazon で探す →
      </a>
    </div>
  );
}
