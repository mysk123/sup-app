'use client';

/**
 * サプリに関するオープンクエスチョンを送れるパネル
 * Free: 月3回 / Pro: 無制限
 */
import { useState } from 'react';

export type AskBillingStatus = {
  plan: 'free' | 'pro';
  ai_question_used_this_month: number;
  ai_question_remaining: number | null;
  ai_limit_this_month: number | null;
};

type ApiResponse = {
  answer?: string;
  error?: string;
  message?: string;
  billing?: AskBillingStatus;
};

export default function AskPanel({
  initialBilling
}: {
  initialBilling: AskBillingStatus;
}) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(
    initialBilling.plan === 'free' &&
      initialBilling.ai_question_remaining !== null &&
      initialBilling.ai_question_remaining <= 0
  );
  const [billing, setBilling] = useState(initialBilling);
  const [upgrading, setUpgrading] = useState(false);

  async function ask() {
    if (question.trim().length < 3) {
      setError('質問を3文字以上で入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/audit/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() })
      });
      const data: ApiResponse = await res.json();
      if (res.status === 402) {
        setLimitReached(true);
        if (data.billing) setBilling(data.billing);
      } else if (!res.ok) {
        setError(data.message ?? data.error ?? `エラー(${res.status})`);
      } else if (data.answer) {
        setAnswer(data.answer);
        if (billing.ai_question_remaining !== null) {
          setBilling({
            ...billing,
            ai_question_used_this_month:
              billing.ai_question_used_this_month + 1,
            ai_question_remaining: Math.max(
              0,
              billing.ai_question_remaining - 1
            )
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        setError(data.error ?? 'Checkout の起動に失敗しました');
        setUpgrading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUpgrading(false);
    }
  }

  const isPro = billing.plan === 'pro';

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            fontWeight: 700
          }}
        >
          ASK — 質問する
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600 }}>
          {isPro
            ? 'PRO · 無制限'
            : `今月 ${billing.ai_question_used_this_month} / ${billing.ai_limit_this_month} 回`}
        </div>
      </div>

      {/* 上限到達(Free のみ) */}
      {limitReached && !answer && (
        <div
          style={{
            background: '#fff8eb',
            border: '1px solid #fcdca2',
            borderRadius: 12,
            padding: '18px 22px'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: '#8a5a06',
              marginBottom: 8
            }}
          >
            FREE LIMIT REACHED
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 6,
              lineHeight: 1.4
            }}
          >
            今月の AI 質問({billing.ai_limit_this_month}回)を使い切りました
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.75,
              marginBottom: 14
            }}
          >
            Pro プラン(月額 ¥600)で AI 質問と AI 分析が両方無制限になります。
          </div>
          <button
            onClick={upgradeToPro}
            disabled={upgrading}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '11px 22px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: upgrading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: upgrading ? 0.7 : 1
            }}
          >
            {upgrading ? 'Stripe へ移動中…' : 'Pro にアップグレード →'}
          </button>
        </div>
      )}

      {/* 通常状態 */}
      {!limitReached && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px 20px'
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-sub)',
              marginBottom: 12,
              lineHeight: 1.7
            }}
          >
            サプリの飲み合わせ・成分の効き方・タイミングの相談など、
            気になることを自由にご質問ください。あなたのスタックを踏まえて回答します。
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            placeholder="例:オキシカットと夕方のコーヒーを併用しても大丈夫ですか?"
            rows={3}
            maxLength={500}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: 10
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <button
              onClick={ask}
              disabled={loading || question.trim().length < 3}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity:
                  loading || question.trim().length < 3 ? 0.6 : 1
              }}
            >
              {loading ? '考え中…' : '質問する'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
              {question.length} / 500 文字
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 12,
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 12,
            padding: '18px 20px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.16em',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 10
            }}
          >
            ANSWER
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-main)',
              lineHeight: 1.95,
              whiteSpace: 'pre-wrap'
            }}
          >
            {answer}
          </div>
          <button
            onClick={() => {
              setAnswer(null);
              setQuestion('');
            }}
            style={{
              marginTop: 14,
              background: 'transparent',
              color: 'var(--text-sub)',
              border: '1px solid var(--border)',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            別の質問をする
          </button>
        </div>
      )}
    </div>
  );
}
