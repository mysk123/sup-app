'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // 成功時は Google にリダイレクトされるのでここに戻ってこない
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 48
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.02em'
          }}
        >
          Sup<span style={{ color: 'var(--accent)' }}>.</span>
          <span
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: 'var(--text-sub)',
              fontWeight: 600
            }}
          >
            App
          </span>
        </span>
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: 14
        }}
      >
        ログイン
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.75,
          marginBottom: 32
        }}
      >
        My Stack を端末を跨いで同期。Google アカウントでログインしてください。
      </p>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 22px',
          background: 'var(--card-bg)',
          color: 'var(--text-main)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'inherit',
          transition: 'all 0.15s'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {loading ? 'リダイレクト中...' : 'Googleでログイン'}
      </button>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          padding: '14px 16px',
          background: 'var(--accent-light)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--accent-dark)',
          lineHeight: 1.7
        }}
      >
        ログインしなくても、診断・効率ルート提案は
        <a
          href="https://sup-app.org"
          style={{ color: 'var(--accent)', fontWeight: 600 }}
        >
          {' '}
          sup-app.org{' '}
        </a>
        で利用できます。ログインは「My Stackの永続化」「端末跨ぎ同期」のために必要です。
      </div>
    </div>
  );
}
