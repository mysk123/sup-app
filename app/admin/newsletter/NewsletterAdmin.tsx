'use client';

import { useState } from 'react';

export default function NewsletterAdmin({
  subscriberCount
}: {
  subscriberCount: number;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(testOnly: boolean) {
    if (!subject.trim() || !body.trim()) {
      setError('件名と本文を入力してください');
      return;
    }
    if (!testOnly) {
      const ok = window.confirm(
        `購読者 ${subscriberCount} 名に配信します。よろしいですか?`
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), testOnly })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `エラー(${res.status})`);
      } else {
        setResult(
          testOnly
            ? `テスト送信しました(自分宛)。届いた見た目を確認してください。`
            : `配信完了: ${data.sent} 件送信 / ${data.failed} 件失敗(対象 ${data.recipients} 名)`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 13px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit'
  } as const;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '22px 24px'
      }}
    >
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-sub)',
          marginBottom: 6
        }}
      >
        件名
      </label>
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="例: 鉄とコーヒーの話 / 今週のサプリ最適化のコツ"
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-sub)',
          marginBottom: 6
        }}
      >
        本文(プレーンテキスト / 空行で段落)
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        placeholder={'こんにちは、Sup. App です。\n\n今週は「鉄とカフェイン」の話を…\n\n▼ 続きはこちら\nhttps://app.sup-app.org/trends'}
        style={{ ...inputStyle, resize: 'vertical', marginBottom: 18, lineHeight: 1.7 }}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => send(true)}
          disabled={busy}
          style={{
            background: 'transparent',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            padding: '11px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit'
          }}
        >
          テスト送信(自分に)
        </button>
        <button
          onClick={() => send(false)}
          disabled={busy}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '11px 22px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: busy ? 0.7 : 1
          }}
        >
          {busy ? '送信中…' : `全員に配信(${subscriberCount}名)`}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'var(--accent-light)',
            border: '1px solid rgba(15,91,62,0.2)',
            color: 'var(--accent-dark)',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          {result}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
