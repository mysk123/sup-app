/**
 * モニタリング関連の型定義
 */
export type PromptType = 'week_1' | 'week_3' | 'month_2' | 'month_6';
export type Effect = 'good' | 'neutral' | 'bad';
export type ContinueIntent = 'continue' | 'observe' | 'stop';

export const PROMPT_TYPE_LABELS: Record<PromptType, string> = {
  week_1: '1週経過',
  week_3: '3週経過',
  month_2: '2ヶ月経過',
  month_6: '6ヶ月経過'
};

export const EFFECT_LABELS: Record<Effect, { emoji: string; label: string }> = {
  good: { emoji: '😊', label: '良い' },
  neutral: { emoji: '😐', label: '変化なし' },
  bad: { emoji: '😞', label: '悪い' }
};

export const CONTINUE_INTENT_LABELS: Record<ContinueIntent, string> = {
  continue: '続ける',
  observe: '様子見',
  stop: 'やめる'
};

export type MonitoringPrompt = {
  id: string;
  stack_item_id: string;
  prompt_type: PromptType;
  scheduled_at: string;
};

export type MonitoringResponse = {
  id: string;
  stack_item_id: string;
  prompt_type: PromptType;
  effect: Effect;
  continue_intent: ContinueIntent | null;
  notes: string | null;
  created_at: string;
};
