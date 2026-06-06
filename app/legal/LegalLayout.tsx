/**
 * 法的ページ共通レイアウト
 */
import type { ReactNode } from 'react';

export default function LegalLayout({
  title,
  lastUpdated,
  children
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="container" style={{ maxWidth: 720, padding: '40px 20px 80px' }}>
      <header style={{ marginBottom: 40 }}>
        <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span
            style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}
          >
            Sup<span style={{ color: 'var(--accent)' }}>.</span>
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: 'var(--text-sub)',
                fontWeight: 600
              }}
            >
              App
            </span>
          </span>
        </a>
      </header>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.025em',
          marginBottom: 8
        }}
      >
        {title}
      </h1>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-sub)',
          marginBottom: 32
        }}
      >
        最終更新日: {lastUpdated}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.95,
          color: 'var(--text-main)'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.015em',
        marginTop: 36,
        marginBottom: 12
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul
      style={{
        paddingLeft: 22,
        marginBottom: 14,
        lineHeight: 1.85
      }}
    >
      {children}
    </ul>
  );
}
