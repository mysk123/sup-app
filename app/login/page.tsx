'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number | string;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded) return;
    if (!window.google || !buttonRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Client ID 未設定(NEXT_PUBLIC_GOOGLE_CLIENT_ID)');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setLoading(true);
        setError(null);
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential
          });
          if (error) {
            setError(error.message);
            setLoading(false);
          } else {
            router.push('/');
            router.refresh();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Login failed');
          setLoading(false);
        }
      }
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'ja'
    });
  }, [scriptLoaded, router]);

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

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

      <div
        ref={buttonRef}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          minHeight: 44
        }}
      />

      {loading && (
        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: 'var(--text-sub)'
          }}
        >
          認証中...
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
