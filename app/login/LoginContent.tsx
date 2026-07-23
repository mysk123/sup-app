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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

  // メール OTP ログイン
  const [emailStep, setEmailStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

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

  async function sendCode() {
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setOtpError('メールアドレスの形式をご確認ください');
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      const supabase = createClient();
      // shouldCreateUser: true → 初めてのメールアドレスならアカウントも作成
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { shouldCreateUser: true }
      });
      if (error) {
        setOtpError(error.message);
      } else {
        setEmail(addr);
        setEmailStep('code');
      }
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'コードの送信に失敗しました');
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyCode() {
    const token = code.replace(/\s/g, '');
    if (token.length < 6) {
      setOtpError('メールに届いた6桁のコードを入力してください');
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email'
      });
      if (error) {
        setOtpError('コードが正しくないか、期限切れです。もう一度お試しください。');
        setOtpBusy(false);
      } else {
        router.push(safeNext);
        router.refresh();
      }
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : '認証に失敗しました');
      setOtpBusy(false);
    }
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
          style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}
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
        ログイン / 新規登録
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.75,
          marginBottom: 32
        }}
      >
        My Stack を端末を跨いで同期。Google またはメールアドレスでご利用いただけます。
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
              ? 'Threads・Instagram・LINE などのアプリ内ブラウザは、Google 側の仕様でログインがブロックされます。下の「メールでログイン」ならそのままご利用いただけます（Google を使いたい場合は Safari / Chrome で開き直してください）。'
              : '広告ブロッカー・プライバシーブラウザ等で Google ログインが読み込めないことがあります。下の「メールでログイン」をご利用いただくか、Safari / Chrome で開き直してください。'}
          </div>
          <button
            onClick={copyUrl}
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {copied ? '✓ コピーしました' : 'このページのURLをコピー'}
          </button>
        </div>
      )}

      {/* Google ボタン */}
      <div
        ref={buttonRef}
        style={{ display: 'flex', justifyContent: 'flex-start', minHeight: 44 }}
      />

      {loading && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-sub)' }}>
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

      {/* 区切り */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '24px 0 20px'
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>または</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* メール OTP ログイン */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px'
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          メールでログイン / 新規登録
        </div>

        {emailStep === 'email' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-sub)',
                lineHeight: 1.7,
                marginBottom: 12
              }}
            >
              メールアドレスに6桁の確認コードをお送りします。LINE・Threads
              などのアプリ内ブラウザでもそのままご利用いただけます。
            </div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '11px 13px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 15,
                fontFamily: 'inherit',
                marginBottom: 12
              }}
            />
            <button
              type="submit"
              disabled={otpBusy}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '12px 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: otpBusy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: otpBusy ? 0.7 : 1
              }}
            >
              {otpBusy ? '送信中…' : '確認コードを送る'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode();
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-sub)',
                lineHeight: 1.7,
                marginBottom: 12
              }}
            >
              <strong style={{ color: 'var(--text-main)' }}>{email}</strong>{' '}
              に6桁のコードをお送りしました。メールをご確認のうえ入力してください。
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
              }
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '11px 13px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 20,
                letterSpacing: '0.3em',
                textAlign: 'center',
                fontFamily: 'inherit',
                marginBottom: 12
              }}
            />
            <button
              type="submit"
              disabled={otpBusy}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '12px 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: otpBusy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: otpBusy ? 0.7 : 1
              }}
            >
              {otpBusy ? '確認中…' : 'ログイン'}
            </button>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 12,
                fontSize: 12.5
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEmailStep('email');
                  setCode('');
                  setOtpError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-sub)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0
                }}
              >
                ← メールアドレスを変更
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={otpBusy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  cursor: otpBusy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  padding: 0
                }}
              >
                コードを再送
              </button>
            </div>
          </form>
        )}

        {otpError && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 8,
              fontSize: 12.5,
              lineHeight: 1.6
            }}
          >
            {otpError}
          </div>
        )}
      </div>

      {/* 同意文言(メルマガ自動登録の根拠) */}
      <p
        style={{
          marginTop: 18,
          fontSize: 11.5,
          color: 'var(--text-soft)',
          lineHeight: 1.75
        }}
      >
        ログイン / 新規登録により、
        <a href="/terms" style={{ color: 'var(--text-sub)' }}>
          利用規約
        </a>
        ・
        <a href="/privacy" style={{ color: 'var(--text-sub)' }}>
          プライバシーポリシー
        </a>
        に同意し、Sup. App からのお知らせメール配信に登録されます
        （メール内のリンクや My Stack からいつでも解除できます）。
      </p>

      <div
        style={{
          marginTop: 24,
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
