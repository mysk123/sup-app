/**
 * Billing ヘルパー
 * - ユーザーのプラン取得
 * - 今月の AI 分析回数カウント
 * - 残り回数判定
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FREE_AI_ANALYSIS_LIMIT } from '@/lib/stripe';

export type UserPlan = 'free' | 'pro';

export type BillingStatus = {
  plan: UserPlan;
  ai_used_this_month: number;
  ai_limit_this_month: number | null; // null = 無制限(pro)
  ai_remaining: number | null; // null = 無制限
  current_period_end: string | null;
};

/**
 * ログイン中ユーザーの課金状態を取得
 * 通常の (anon) client + RLS で動く(自分の profile/usage しか読まない)
 */
export async function getBillingStatus(): Promise<BillingStatus | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  // profiles 取得(トリガーで自動作成されてるはず、なければ free 扱い)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const plan: UserPlan = (profile?.plan as UserPlan) ?? 'free';
  const current_period_end = profile?.current_period_end ?? null;

  // 今月の AI 使用回数(カレンダー月で集計)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', monthStart.toISOString());

  const used = count ?? 0;
  const limit = plan === 'pro' ? null : FREE_AI_ANALYSIS_LIMIT;
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return {
    plan,
    ai_used_this_month: used,
    ai_limit_this_month: limit,
    ai_remaining: remaining,
    current_period_end
  };
}

/**
 * AI 分析の使用ログを記録(service_role を使う)
 * /api/audit/ai 内で AI 呼び出し成功後に呼ぶ
 */
export async function recordAiUsage(args: {
  user_id: string;
  input_tokens: number;
  output_tokens: number;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from('ai_usage_logs').insert({
    user_id: args.user_id,
    input_tokens: args.input_tokens,
    output_tokens: args.output_tokens
  });
  if (error) {
    // ログ書き込み失敗は致命的じゃないので console だけ
    console.error('[recordAiUsage] failed:', error.message);
  }
}
