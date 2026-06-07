import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0f5b3e'
};

export const metadata: Metadata = {
  title: 'Sup. App — サプリメント管理アプリ',
  description:
    '飲んでいるサプリメントを記録・確認・調整できる、知的生産者のためのサプリメント管理アプリ。',
  metadataBase: new URL('https://app.sup-app.org'),
  openGraph: {
    type: 'website',
    siteName: 'Sup. App',
    title: 'Sup. App — サプリメント管理アプリ',
    description:
      '今飲んでいるサプリの記録・現状チェック・タイミングのリマインドまで。',
    url: 'https://app.sup-app.org/',
    locale: 'ja_JP'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sup. App — サプリメント管理アプリ',
    description:
      '今飲んでいるサプリの記録・現状チェック・タイミングのリマインドまで。'
  },
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230f5b3e' rx='20'/%3E%3Ctext x='50' y='68' text-anchor='middle' fill='white' font-size='56' font-weight='700' font-family='-apple-system,sans-serif'%3ES%3C/text%3E%3C/svg%3E"
  }
};

function Footer() {
  return (
    <footer
      style={{
        maxWidth: 720,
        margin: '60px auto 32px',
        padding: '24px 20px 0',
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-sub)',
        lineHeight: 1.8
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 10
        }}
      >
        <a
          href="/trends"
          style={{ color: 'var(--text-sub)', textDecoration: 'none' }}
        >
          トレンド
        </a>
        <a
          href="/terms"
          style={{ color: 'var(--text-sub)', textDecoration: 'none' }}
        >
          利用規約
        </a>
        <a
          href="/privacy"
          style={{ color: 'var(--text-sub)', textDecoration: 'none' }}
        >
          プライバシーポリシー
        </a>
        <a
          href="/tokushoho"
          style={{ color: 'var(--text-sub)', textDecoration: 'none' }}
        >
          特定商取引法に基づく表示
        </a>
        <a
          href="https://sup-app.org/"
          style={{ color: 'var(--text-sub)', textDecoration: 'none' }}
        >
          診断する (sup-app.org)
        </a>
      </div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        © 2026 Sup. App — サプリメントの組み合わせを、続けやすく。
      </div>
    </footer>
  );
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
