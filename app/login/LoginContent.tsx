'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
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

/** Threads/Instagram/LINE 等のアプリ内ブラウザ(webview)を判定。
 *  これらでは Google Identity Services のログインがブロックされる。 */
function detectInAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Threads|Barcelona|Line\/|LINE|MicroMessenger|KAKAOTALK|TikTok|musical_ly|Twitter|Snapchat|Pinterest/i.test(
    ua
  );
}

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [gisFailed, setGisFailed] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  const queryError = searchParams.get('error');

  // ?next= でログイン後の遷移先を指定可能
  // ただし安全性のため /onboard 等の内部パスのみ許可
  const rawNext = searchParams.get('next');
  const safeNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/';

  // アプリ内ブラウザ判定
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setInApp(detectInAppBrowser(navigator.userAgent || ''));
  }, []);

  // GIS が一定時間で読み込めなければ失敗扱い
  // (広告ブロッカー / プライバシーブラウザ / アプリ内ブラウザ等で発生)
  useEffect(() => {
    const id = setTimeout(() => {
      if (!window.google) setGisFailed(true);
    }, 6000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!scriptLoaded) return;
    if (!window.google || !buttonRef.current) return;
    setGisFailed(false);

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
            router.push(safeNext);
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
  }, [scriptLoaded, router, safeNext]);

  function copyUrl() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  const showHelp = inApp || gisFailed;

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setGisFailed(true)}
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

      {/* コールバック失敗(?error=) */}
      {queryError && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          ログインに失敗しました。もう一度お試しください。
        </div>
      )}

      {/* アプリ内ブラウザ / GIS 失敗の案内 */}
      {showHelp && (
        <div
          style={{
            marginBottom: 24,
            padding: '16px 18px',
            background: '#fff8eb',
            border: '1px solid #fcdca2',
            borderRadius: 12
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
              color: '#8a5a06'
            }}
          >
            {inApp
              ? 'アプリ内ブラウザでは Google ログインが使えません'
              : 'Google ログインを読み込めませんでした'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.8,
              marginBottom: 12
            }}
          >
            {inApp
              ? 'Threads や Instagram などのアプリ内ブラウザは、Google のセキュリティ仕様でログインがブロックされます。お手数ですが、画面右上(または「…」メニュー)の「ブラウザで開く」から Safari / Chrome で開き直してください。'
              : '広告ブロッカー・プライバシーブラウザ・アプリ内ブラウザだと Google ログインが読み込めないことがあります。Safari / Chrome で開き直すか、拡張機能を一時的にオフにしてお試しください。'}
          </div>
          <button
            onClick={copyUrl}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {copied ? '✓ コピーしました' : 'このページのURLをコピー'}
          </button>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              marginLeft: 10
            }}
          >
            → ブラウザに貼り付けて開く
          </span>
        </div>
      )}

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
