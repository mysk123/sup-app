/**
 * Stripe クライアント(サーバー専用 / lazy init)
 *
 * モジュール先頭で new Stripe() するとビルド時(env未設定)にコケるので、
 * getStripe() で遅延初期化する。
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true
  });
  return _stripe;
}

export const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? '';

/** Free プランの月間 AI 分析上限 */
export const FREE_AI_ANALYSIS_LIMIT = 3;
