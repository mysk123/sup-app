/**
 * 効果トラッキング v1 の分析ロジック(純粋関数)
 *
 * 設計の肝:
 * - ベースライン: 全記録の平均(mean)とブレ幅(SD)を個人ごとに算定
 * - 1変数判定: あるサプリ追加の前後で各軸を比較。同時期に複数追加されていたら
 *   「切り分け不能(交絡)」として確度を落とす
 * - ブレ幅で語る: 変化を SD 単位(effect size)で表現し、平常の揺れを超えたかで判定
 */

export type EffectLog = {
  id: string;
  focus: number;
  sleep: number;
  mood: number;
  energy: number;
  note: string | null;
  confounds: string[] | null;
  created_at: string;
};

export type AxisKey = 'focus' | 'sleep' | 'mood' | 'energy';

export const EFFECT_AXES: { key: AxisKey; label: string }[] = [
  { key: 'focus', label: '集中力' },
  { key: 'sleep', label: '睡眠の質' },
  { key: 'mood', label: '気分' },
  { key: 'energy', label: 'エネルギー' }
];

export const CONFOUND_OPTIONS: { key: string; label: string }[] = [
  { key: 'poor_sleep', label: '睡眠不足' },
  { key: 'alcohol', label: '飲酒' },
  { key: 'sick', label: '体調不良' },
  { key: 'busy', label: '繁忙・締切' },
  { key: 'exercised', label: 'よく運動した' }
];

const CONFOUND_LABEL: Record<string, string> = Object.fromEntries(
  CONFOUND_OPTIONS.map((c) => [c.key, c.label])
);
export function confoundLabel(key: string): string {
  return CONFOUND_LABEL[key] ?? key;
}

/** 1記録の効果スコア(4軸平均, 1-5 → 0-100) */
export function effectScoreOf(l: {
  focus: number;
  sleep: number;
  mood: number;
  energy: number;
}): number {
  const avg = (l.focus + l.sleep + l.mood + l.energy) / 4;
  return Math.round(((avg - 1) / 4) * 100);
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

export type AxisStat = {
  key: AxisKey;
  label: string;
  mean: number;
  sd: number;
  latest: number;
};

export type EffectStats = {
  n: number;
  overall: number; // 0-100
  axes: AxisStat[];
  trend: { date: string; score: number }[];
  lastLogAt: string | null;
};

/** logs は新しい順で受け取る想定 */
export function computeStats(logs: EffectLog[]): EffectStats {
  const asc = [...logs].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );
  const axes: AxisStat[] = EFFECT_AXES.map((ax) => {
    const vals = asc.map((l) => l[ax.key]);
    return {
      key: ax.key,
      label: ax.label,
      mean: mean(vals),
      sd: sd(vals),
      latest: vals.length ? vals[vals.length - 1] : 0
    };
  });
  const overall =
    axes.length && asc.length
      ? effectScoreOf({
          focus: axes[0].mean,
          sleep: axes[1].mean,
          mood: axes[2].mean,
          energy: axes[3].mean
        })
      : 0;
  return {
    n: asc.length,
    overall,
    axes,
    trend: asc.map((l) => ({ date: l.created_at, score: effectScoreOf(l) })),
    lastLogAt: asc.length ? asc[asc.length - 1].created_at : null
  };
}

export type AxisDelta = {
  key: AxisKey;
  label: string;
  deltaRaw: number; // after - before (1-5 スケール)
  deltaSigma: number; // ブレ幅(SD)単位
  direction: 'up' | 'down' | 'flat';
};

export type Attribution = {
  itemId: string;
  itemName: string;
  addedAt: string;
  nBefore: number;
  nAfter: number;
  confounded: boolean; // 同時期に他のサプリも追加
  confounders: string[]; // その名前
  confidence: 'high' | 'mid' | 'low' | 'insufficient';
  top: AxisDelta | null;
  perAxis: AxisDelta[];
};

const DAY = 86400000;
const WINDOW = 6; // 前後それぞれ最大何記録を見るか
const CONFOUND_DAYS = 10; // この日数内に他のサプリ追加があれば交絡

type ItemForAttr = {
  id: string;
  name: string;
  added_at: string;
  is_active: boolean;
};

export function attributeItems(
  logs: EffectLog[],
  items: ItemForAttr[]
): Attribution[] {
  const stats = computeStats(logs);
  const sigmaOf: Record<AxisKey, number> = {
    focus: stats.axes[0]?.sd || 0,
    sleep: stats.axes[1]?.sd || 0,
    mood: stats.axes[2]?.sd || 0,
    energy: stats.axes[3]?.sd || 0
  };
  const active = items.filter((i) => i.is_active && i.added_at);

  const out: Attribution[] = active.map((item) => {
    const t = +new Date(item.added_at);
    const before = logs
      .filter((l) => +new Date(l.created_at) < t)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, WINDOW);
    const after = logs
      .filter((l) => +new Date(l.created_at) >= t)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
      .slice(0, WINDOW);

    const confounders = active
      .filter(
        (o) =>
          o.id !== item.id &&
          Math.abs(+new Date(o.added_at) - t) <= CONFOUND_DAYS * DAY
      )
      .map((o) => o.name);
    const confounded = confounders.length > 0;

    const perAxis: AxisDelta[] = EFFECT_AXES.map((ax) => {
      const mb = mean(before.map((l) => l[ax.key]));
      const ma = mean(after.map((l) => l[ax.key]));
      const deltaRaw = ma - mb;
      const sigma = sigmaOf[ax.key] || 0.5;
      const deltaSigma = deltaRaw / sigma;
      const direction =
        Math.abs(deltaSigma) < 0.3 ? 'flat' : deltaSigma > 0 ? 'up' : 'down';
      return { key: ax.key, label: ax.label, deltaRaw, deltaSigma, direction };
    });

    const top = [...perAxis].sort(
      (a, b) => Math.abs(b.deltaSigma) - Math.abs(a.deltaSigma)
    )[0];

    let confidence: Attribution['confidence'];
    if (before.length < 2 || after.length < 2) {
      confidence = 'insufficient';
    } else if (confounded) {
      confidence = 'low';
    } else if (top && Math.abs(top.deltaSigma) >= 0.8 && after.length >= 3) {
      confidence = 'high';
    } else if (top && Math.abs(top.deltaSigma) >= 0.5) {
      confidence = 'mid';
    } else {
      confidence = 'low';
    }

    return {
      itemId: item.id,
      itemName: item.name,
      addedAt: item.added_at,
      nBefore: before.length,
      nAfter: after.length,
      confounded,
      confounders,
      confidence,
      top: top ?? null,
      perAxis
    };
  });

  // 判定できたものを、変化の大きさ順に
  const rank = { high: 3, mid: 2, low: 1, insufficient: 0 };
  return out.sort((a, b) => {
    if (rank[b.confidence] !== rank[a.confidence])
      return rank[b.confidence] - rank[a.confidence];
    return Math.abs(b.top?.deltaSigma ?? 0) - Math.abs(a.top?.deltaSigma ?? 0);
  });
}

export const CONFIDENCE_LABEL: Record<Attribution['confidence'], string> = {
  high: '確度: 高',
  mid: '確度: 中',
  low: '確度: 低',
  insufficient: 'データ不足'
};
