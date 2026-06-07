'use client';

/**
 * Trends 管理画面のクライアント部分
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Trend = {
  id: string;
  title: string;
  description: string;
  body: string | null;
  trend_type: string;
  category: string | null;
  status: string;
  is_published: boolean;
  ai_generated: boolean;
  source_url: string | null;
  source_label: string | null;
  ingredient_keys: string[] | null;
  related_product_name: string | null;
  related_product_dosage: string | null;
  created_at: string;
  published_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: '#9a9a9a' },
  pending_review: { label: 'レビュー待ち', color: '#8a5a06' },
  published: { label: '公開中', color: 'var(--accent)' },
  archived: { label: 'アーカイブ', color: '#999' }
};

export default function AdminClient({
  initialTrends
}: {
  initialTrends: Trend[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function generateNow() {
    if (
      !confirm(
        'AI で月刊コンテンツを生成します(数分かかります)。続けますか?'
      )
    )
      return;
    setGenerating(true);
    setError(null);
    setGenResult(null);
    try {
      const res = await fetch('/api/admin/generate-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `エラー(${res.status})`);
      } else {
        setGenResult(data);
        // データ再取得
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    startTransition(async () => {
      const res = await fetch('/api/admin/trends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'エラー');
      } else {
        router.refresh();
      }
    });
  }

  const byStatus = {
    pending_review: initialTrends.filter((t) => t.status === 'pending_review'),
    published: initialTrends.filter((t) => t.status === 'published'),
    archived: initialTrends.filter((t) => t.status === 'archived')
  };

  return (
    <>
      {/* 生成ボタン */}
      <div
        style={{
          padding: '20px 24px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          marginBottom: 32
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.18em',
            color: 'var(--accent)',
            marginBottom: 10,
            fontWeight: 700
          }}
        >
          GENERATE NOW
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-main)',
            lineHeight: 1.75,
            marginBottom: 14
          }}
        >
          AI に月刊コンテンツ 5件(月刊特集 1件 + Research Digest 3件 +
          Ingredient Deep Dive 1件)を生成させます。
          全て「レビュー待ち」状態で保存されます。
        </div>
        <button
          onClick={generateNow}
          disabled={generating}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '11px 22px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: generating ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: generating ? 0.7 : 1
          }}
        >
          {generating ? 'AI が生成中…(数分)' : '今すぐ生成'}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            {error}
          </div>
        )}

        {genResult && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--accent-light)',
              border: '1px solid rgba(15, 91, 62, 0.18)',
              color: 'var(--accent-dark)',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.7
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              生成完了({genResult.month})
            </div>
            {genResult.cover_story && (
              <div>• 月刊特集: {genResult.cover_story.title}</div>
            )}
            {genResult.research_digest && (
              <div>
                • Research Digest: {genResult.research_digest.count} 件
              </div>
            )}
            {genResult.ingredient_deep_dive && (
              <div>
                • Ingredient Deep Dive:{' '}
                {genResult.ingredient_deep_dive.title}
              </div>
            )}
            {genResult.errors && genResult.errors.length > 0 && (
              <div style={{ color: '#991b1b', marginTop: 6 }}>
                エラー: {genResult.errors.join(' / ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* レビュー待ち */}
      <Section
        label="REVIEW QUEUE — レビュー待ち"
        trends={byStatus.pending_review}
        onAction={updateStatus}
        showActions={['publish', 'archive']}
      />

      {/* 公開中 */}
      <Section
        label="PUBLISHED — 公開中"
        trends={byStatus.published}
        onAction={updateStatus}
        showActions={['archive']}
      />

      {/* アーカイブ */}
      <Section
        label="ARCHIVED"
        trends={byStatus.archived}
        onAction={updateStatus}
        showActions={['publish']}
        collapsible
      />
    </>
  );
}

function Section({
  label,
  trends,
  onAction,
  showActions,
  collapsible
}: {
  label: string;
  trends: Trend[];
  onAction: (id: string, status: string) => void;
  showActions: ('publish' | 'archive')[];
  collapsible?: boolean;
}) {
  if (trends.length === 0) return null;
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {trends.map((t) => (
        <TrendRow
          key={t.id}
          trend={t}
          onAction={onAction}
          showActions={showActions}
        />
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details style={{ marginBottom: 28 }}>
        <summary
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.16em',
            color: 'var(--text-sub)',
            marginBottom: 14,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {label} ({trends.length})
        </summary>
        {content}
      </details>
    );
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          color: 'var(--accent)',
          marginBottom: 14,
          fontWeight: 700
        }}
      >
        {label} ({trends.length})
      </div>
      {content}
    </section>
  );
}

function TrendRow({
  trend,
  onAction,
  showActions
}: {
  trend: Trend;
  onAction: (id: string, status: string) => void;
  showActions: ('publish' | 'archive')[];
}) {
  const statusInfo = STATUS_LABELS[trend.status] ?? {
    label: trend.status,
    color: '#999'
  };
  return (
    <details
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12
      }}
    >
      <summary
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          listStyle: 'none',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 6,
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              padding: '2px 6px',
              background: statusInfo.color,
              color: 'white',
              borderRadius: 100
            }}
          >
            {statusInfo.label}
          </span>
          {trend.ai_generated && (
            <span
              style={{
                fontSize: 9,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.16em',
                fontWeight: 700,
                padding: '2px 6px',
                background: 'transparent',
                color: 'var(--text-sub)',
                border: '1px solid var(--border)',
                borderRadius: 100
              }}
            >
              AI
            </span>
          )}
          {trend.trend_type && (
            <span
              style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600 }}
            >
              {trend.trend_type}
            </span>
          )}
          {trend.category && (
            <span
              style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600 }}
            >
              · {trend.category}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: 'var(--text-sub)',
              opacity: 0.7
            }}
          >
            {new Date(trend.created_at).toLocaleDateString('ja-JP')}
          </span>
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.45
          }}
        >
          {trend.title}
        </div>
      </summary>
      <div
        style={{
          padding: '0 18px 14px 18px',
          fontSize: 13,
          color: 'var(--text-main)',
          lineHeight: 1.85,
          borderTop: '1px solid var(--border)'
        }}
      >
        <div style={{ paddingTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              fontWeight: 600,
              marginBottom: 4
            }}
          >
            DESCRIPTION
          </div>
          <div style={{ marginBottom: 14 }}>{trend.description}</div>

          {trend.body && (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  fontWeight: 600,
                  marginBottom: 4
                }}
              >
                BODY (長文)
              </div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  marginBottom: 14,
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.85,
                  maxHeight: 400,
                  overflowY: 'auto'
                }}
              >
                {trend.body}
              </div>
            </>
          )}

          {(trend.ingredient_keys?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>
                成分:{' '}
              </span>
              {trend.ingredient_keys!.map((k, i) => (
                <code
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    background: 'var(--accent-light)',
                    color: 'var(--accent-dark)',
                    borderRadius: 4,
                    marginRight: 4
                  }}
                >
                  {k}
                </code>
              ))}
            </div>
          )}

          {trend.source_url && (
            <div style={{ marginBottom: 10, fontSize: 12 }}>
              <span style={{ color: 'var(--text-sub)' }}>ソース: </span>
              <a
                href={trend.source_url}
                target="_blank"
                rel="noopener"
                style={{ color: 'var(--accent)' }}
              >
                {trend.source_label ?? trend.source_url}
              </a>
            </div>
          )}

          {trend.related_product_name && (
            <div style={{ marginBottom: 14, fontSize: 12 }}>
              <span style={{ color: 'var(--text-sub)' }}>関連商品: </span>
              {trend.related_product_name}
              {trend.related_product_dosage && (
                <span style={{ color: 'var(--accent)', marginLeft: 6 }}>
                  ({trend.related_product_dosage})
                </span>
              )}
            </div>
          )}

          {/* アクション */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px dashed var(--border)'
            }}
          >
            {showActions.includes('publish') && (
              <button
                onClick={() => onAction(trend.id, 'published')}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                公開する →
              </button>
            )}
            {showActions.includes('archive') && (
              <button
                onClick={() => onAction(trend.id, 'archived')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                アーカイブ
              </button>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
