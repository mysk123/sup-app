'use client';

/**
 * メルマガ購読トグル(オプトイン)
 * - 明示的な同意でのみ subscribed=true(特定電子メール法対応)
 */
import { useState, useTransition } from 'react';
import { setNewsletterSubscription } from './actions';

export default function NewsletterOptIn({
  initialSubscribed
}: {
  initialSubscribed: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !subscribed;
    setSubscribed(next); // 楽観的
    startTransition(async () => {
      const res = await setNewsletterSubscription(next);
      if (res?.error) setSubscribed(!next); // 失敗したら戻す
    });
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          メール配信を受け取る
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--text-sub)',
            lineHeight: 1.7
          }}
        >
          サプリ最適化のコツ・新着コラム・アップデートを、月数回お届けします。
          いつでも解除できます。
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={subscribed}
        style={{
          flexShrink: 0,
          width: 52,
          height: 30,
          borderRadius: 999,
          border: 'none',
          background: subscribed ? 'var(--accent)' : 'var(--border)',
          position: 'relative',
          cursor: pending ? 'wait' : 'pointer',
          transition: 'background 0.2s',
          opacity: pending ? 0.7 : 1
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: subscribed ? 25 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      </button>
    </div>
  );
}
