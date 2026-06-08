'use client';

/**
 * Free ユーザー向けの Pro アップグレード CTA(trends ページ)
 */
import { useState } from 'react';

export default function TrendsUpgradeCTA() {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgradeToPro() {
    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Checkout の起動に失敗しました');
        setUpgrading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUpgrading(false);
    }
  }

  return (
    <div
      style={{
        background:
          'linear-gradient(135deg, var(--accent-light) 0%, var(--card-bg) 100%)',
        border: '1px solid rgba(15, 91, 62, 0.2)',
        borderRadius: 16,
        padding: '36px 32px',
        marginBottom: 28
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: 'var(--accent-dark)',
          marginBottom: 14
        }}
      >
        PRO ONLY
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1.4,
          letterSpacing: '-0.02em',
          marginBottom: 12
        }}
      >
        Premium Column は Pro 限定
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-sub)',
          lineHeight: 1.85,
          marginBottom: 20,
          maxWidth: 540
        }}
      >
        月初に届く、深掘りの読み物。
        月刊特集 / 成分の総合ガイド / 専門家の公開スタック /
        SNS と市場の動向。あなたの target に合うものから順に
        並びます。
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        {[
          'DEEP DIVE — 月刊特集と成分の総合ガイド(各 1000-2000字)',
          'EXPERT STACK — 専門家・著名人の公開スタック',
          'SNS / MARKET — 動向と購買インサイト',
          'あなたの target に合うものを優先表示',
          '気になる商品はワンクリックで My Stack に追加'
        ].map((f, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--text-main)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              lineHeight: 1.7
            }}
          >
            <span
              style={{
                color: 'var(--accent)',
                fontWeight: 800,
                marginTop: 1,
                flexShrink: 0
              }}
            >
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={upgradeToPro}
        disabled={upgrading}
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          padding: '13px 26px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: upgrading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          opacity: upgrading ? 0.7 : 1
        }}
      >
        {upgrading ? '移動中…' : 'Pro にアップグレード (¥600/月) →'}
      </button>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 12
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
