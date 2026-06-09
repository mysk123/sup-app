'use client';

/**
 * 折りたたみ式のユーザーメニュー
 * - 左上のアバター/イニシャル → クリックで開閉
 * - メアド表示・ログアウト・Premium Column への導線をここに集約
 */
import { useEffect, useRef, useState } from 'react';

export default function HeaderMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const initial = (email[0] ?? '?').toUpperCase();

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="ユーザーメニュー"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: open ? 'var(--accent-light)' : 'transparent',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          padding: '5px 12px 5px 5px',
          borderRadius: 100,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          color: 'var(--text-main)',
          transition: 'all 0.15s ease'
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {initial}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 240,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
            padding: 6,
            zIndex: 100
          }}
        >
          {/* メアド */}
          <div
            style={{
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text-sub)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 4,
              wordBreak: 'break-all',
              lineHeight: 1.6
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-sub)',
                letterSpacing: '0.12em',
                fontWeight: 700,
                marginBottom: 4
              }}
            >
              SIGNED IN
            </div>
            {email}
          </div>

          {/* メニュー項目 */}
          <a
            href="/trends"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              fontSize: 13,
              color: 'var(--text-main)',
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 600
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--accent-light)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            ★ Premium Column
          </a>

          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              fontSize: 13,
              color: 'var(--text-main)',
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 600
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--accent-light)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            ← トップに戻る
          </a>

          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '6px 4px'
            }}
          />

          <form action="/auth/logout" method="POST" style={{ width: '100%' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: '10px 12px',
                fontSize: 13,
                color: '#991b1b',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                borderRadius: 8
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              ↩ ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
