'use client';

/**
 * モニタリング(振り返り)の回答 UI と履歴表示
 * stack_item カード内に展開される
 */
import { useState, useTransition } from 'react';
import {
  submitMonitoringResponse,
  dismissMonitoringPrompt
} from './actions';
import {
  PROMPT_TYPE_LABELS,
  EFFECT_LABELS,
  CONTINUE_INTENT_LABELS,
  type Effect,
  type ContinueIntent,
  type MonitoringPrompt,
  type MonitoringResponse
} from '@/lib/monitoring/types';

export function MonitoringBadge({ prompt }: { prompt: MonitoringPrompt }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.12em',
        fontWeight: 700,
        padding: '3px 9px',
        background: '#fff8eb',
        color: '#8a5a06',
        borderRadius: 100,
        whiteSpace: 'nowrap'
      }}
    >
      ⚠ 振り返り: {PROMPT_TYPE_LABELS[prompt.prompt_type]}
    </span>
  );
}

export function MonitoringForm({
  prompt,
  itemId
}: {
  prompt: MonitoringPrompt;
  itemId: string;
}) {
  const [effect, setEffect] = useState<Effect | null>(null);
  const [continueIntent, setContinueIntent] = useState<ContinueIntent | null>(
    null
  );
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const requiresContinue = prompt.prompt_type !== 'week_1';

  function handleSubmit() {
    if (!effect) {
      setError('体感を選んでね');
      return;
    }
    if (requiresContinue && !continueIntent) {
      setError('続けるかどうかを選んでね');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitMonitoringResponse({
        prompt_id: prompt.id,
        stack_item_id: itemId,
        prompt_type: prompt.prompt_type,
        effect,
        continue_intent: continueIntent,
        notes: notes.trim() || undefined
      });
      if (res?.error) setError(res.error);
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissMonitoringPrompt(prompt.id);
    });
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: '14px 16px',
        background: '#fff8eb',
        border: '1px solid #fcdca2',
        borderRadius: 10
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#8a5a06',
          fontWeight: 700,
          marginBottom: 10,
          lineHeight: 1.5
        }}
      >
        {PROMPT_TYPE_LABELS[prompt.prompt_type]} — 体感はどうですか?
      </div>

      {/* 体感3択 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {(Object.entries(EFFECT_LABELS) as [Effect, { emoji: string; label: string }][]).map(
          ([key, { emoji, label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEffect(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: effect === key ? '#8a5a06' : 'white',
                color: effect === key ? 'white' : '#8a5a06',
                border: `1px solid ${effect === key ? '#8a5a06' : '#fcdca2'}`,
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <span style={{ fontSize: 16 }}>{emoji}</span>
              {label}
            </button>
          )
        )}
      </div>

      {/* 続ける意向(3週以降) */}
      {requiresContinue && (
        <>
          <div
            style={{
              fontSize: 12,
              color: '#8a5a06',
              fontWeight: 700,
              marginBottom: 8
            }}
          >
            このまま続ける?
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(Object.entries(CONTINUE_INTENT_LABELS) as [ContinueIntent, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContinueIntent(key)}
                  style={{
                    padding: '7px 12px',
                    background: continueIntent === key ? '#8a5a06' : 'white',
                    color: continueIntent === key ? 'white' : '#8a5a06',
                    border: `1px solid ${continueIntent === key ? '#8a5a06' : '#fcdca2'}`,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* メモ */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="気づき・体感の変化(任意)"
        rows={2}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'white',
          border: '1px solid #fcdca2',
          borderRadius: 8,
          fontSize: 13,
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: 10
        }}
      />

      {error && (
        <div
          style={{
            fontSize: 12,
            color: '#991b1b',
            marginBottom: 10
          }}
        >
          {error}
        </div>
      )}

      {/* アクション */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          style={{
            background: '#8a5a06',
            color: 'white',
            border: 'none',
            padding: '9px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: pending ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: pending ? 0.7 : 1
          }}
        >
          {pending ? '送信中…' : '送信'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          style={{
            background: 'transparent',
            color: '#8a5a06',
            border: '1px solid #fcdca2',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: pending ? 'wait' : 'pointer',
            fontFamily: 'inherit'
          }}
        >
          今は答えない →
        </button>
      </div>
    </div>
  );
}

export function MonitoringHistory({
  responses
}: {
  responses: MonitoringResponse[];
}) {
  if (responses.length === 0) return null;

  return (
    <details
      style={{
        marginTop: 8,
        fontSize: 12,
        color: 'var(--text-sub)'
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 600,
          userSelect: 'none',
          paddingTop: 4
        }}
      >
        振り返り履歴({responses.length}件)
      </summary>
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingLeft: 4
        }}
      >
        {responses.map((r) => (
          <div
            key={r.id}
            style={{
              padding: '8px 10px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              lineHeight: 1.65
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: r.notes ? 4 : 0
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {PROMPT_TYPE_LABELS[r.prompt_type as keyof typeof PROMPT_TYPE_LABELS]}
              </span>
              <span style={{ fontSize: 14 }}>
                {EFFECT_LABELS[r.effect].emoji}
              </span>
              <span>{EFFECT_LABELS[r.effect].label}</span>
              {r.continue_intent && (
                <span style={{ color: 'var(--accent)' }}>
                  ・{CONTINUE_INTENT_LABELS[r.continue_intent]}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.75 }}>
                {new Date(r.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            {r.notes && (
              <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>
                「{r.notes}」
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
