'use client';

/**
 * AI 包括分析パネル(クライアントコンポーネント)
 * ボタン → /api/audit/ai を叩く → 結果を表示
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
  usage?: { input_tokens: number; output_tokens: number };
  stack_count?: number;
};

export default function AiAnalysisPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/audit/ai', { method: 'POST' });
      const data: ApiResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? `エラー(${res.status})`);
      } else if (data.analysis) {
        setResult(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

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
        AI ANALYSIS — Claude による包括分析
      </div>

      {!result && !loading && (
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
            ルールベースで拾えない「コンテキスト依存の改善案」を、Claude
            に分析させます。スタック全体の方向性、足りない観点、シナジー候補を
            個別アドバイスとして返します。
          </div>
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
        </div>
      )}

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
            Claude が分析中…
          </div>
          <div style={{ fontSize: 12 }}>
            (通常 10〜30 秒。スタックが多いと長くなる)
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

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

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 全体評価 */}
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

          {/* 改善案リスト */}
          {result.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}

          {/* 総括 */}
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

          {/* 再生成ボタン */}
          <button
            onClick={runAnalysis}
            style={{
              marginTop: 8,
              background: 'transparent',
              color: 'var(--text-sub)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              alignSelf: 'flex-start'
            }}
          >
            再生成
          </button>
        </div>
      )}
    </div>
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
