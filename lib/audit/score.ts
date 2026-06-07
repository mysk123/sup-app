/**
 * Optimization Score エンジン
 *
 * スタックの最適化度合いを 0-100 で算定する。
 * 7軸: 基礎栄養 / 目的整合 / シナジー / 過剰 / 干渉 / タイミング / 継続性
 *
 * 配点: 20 + 20 + 15 + 15 + 15 + 10 + 5 = 100
 */
import {
  INGREDIENTS,
  INTERACTIONS,
  SYNERGIES,
  detectAllIngredients,
  type Ingredient,
  type IngredientKey
} from './knowledge';
import { auditStack, type StackItem } from './engine';

export type Target =
  | 'focus' // 集中力強化
  | 'recovery' // 回復力強化
  | 'stability' // 安定性強化
  | 'appearance' // 印象強化
  | 'numbers'; // 数値改善

export const TARGET_LABELS: Record<Target, string> = {
  focus: '集中力強化',
  recovery: '回復力強化',
  stability: '安定性強化',
  appearance: '印象強化',
  numbers: '数値改善'
};

/** target ごとの推奨成分マップ */
const TARGET_INGREDIENTS: Record<Target, IngredientKey[]> = {
  focus: ['l_tyrosine', 'alpha_gpc', 'bacopa', 'l_theanine', 'caffeine'],
  recovery: ['glycine', 'magnesium', 'melatonin', 'ashwagandha'],
  stability: ['ashwagandha', 'rhodiola', 'omega_3', 'l_theanine'],
  appearance: ['collagen', 'biotin', 'zinc', 'hyaluronic_acid', 'astaxanthin'],
  numbers: ['berberine', 'chromium', 'alpha_lipoic_acid', 'nmn', 'coq10']
};

/** 基礎栄養とみなす成分(5つで20点、1つにつき4点) */
const FOUNDATIONAL: IngredientKey[] = [
  'vitamin_d3',
  'magnesium',
  'omega_3',
  'vitamin_b_complex',
  'zinc'
];

export type AxisScore = {
  score: number;
  max: number;
  detail: string;
};

export type ScoreResult = {
  total: number;
  axes: {
    coverage: AxisScore; // 基礎栄養 (20)
    target_alignment: AxisScore; // 目的整合 (20)
    synergy: AxisScore; // シナジー (15)
    overdose_risk: AxisScore; // 過剰リスクの低さ (15)
    interaction_risk: AxisScore; // 干渉リスクの低さ (10)
    timing: AxisScore; // タイミング (5)
    continuity: AxisScore; // 継続性 (5)
    effect: AxisScore; // 効果実感 (10) — モニタリング回答から算定
  };
  improvements: {
    axis: keyof ScoreResult['axes'];
    title: string;
    description: string;
    points_estimate: number;
  }[];
};

/** モニタリング回答(score 計算用に必要な最小フィールド) */
export type EffectResponseForScore = {
  stack_item_id: string;
  effect: 'good' | 'neutral' | 'bad';
  created_at: string;
};

/**
 * メイン関数: stack + target から ScoreResult を計算
 */
export function computeScore(
  items: StackItem[],
  targets: Target[],
  /** 最も古い added_at(継続性スコア用) */
  oldestAddedAt: string | null,
  /** モニタリング回答(効果実感スコア用、新しい順) */
  responses: EffectResponseForScore[] = []
): ScoreResult {
  const activeItems = items.filter((i) => i.is_active);

  // アクティブなサプリが 0 → 全軸を「評価不能」(0点)にする
  if (activeItems.length === 0) {
    const detail = '評価対象のサプリが未登録';
    return {
      total: 0,
      axes: {
        coverage: { score: 0, max: 20, detail },
        target_alignment: { score: 0, max: 20, detail },
        synergy: { score: 0, max: 15, detail },
        overdose_risk: { score: 0, max: 15, detail },
        interaction_risk: { score: 0, max: 10, detail },
        timing: { score: 0, max: 5, detail },
        continuity: { score: 0, max: 5, detail },
        effect: { score: 0, max: 10, detail }
      },
      improvements: []
    };
  }

  // 全成分を集計
  const presentKeys = new Set<IngredientKey>();
  for (const item of activeItems) {
    const text = `${item.name} ${item.brand ?? ''} ${item.detected_ingredients ?? ''}`;
    for (const ing of detectAllIngredients(text)) {
      presentKeys.add(ing.key);
    }
  }

  const coverage = scoreCoverage(presentKeys);
  const target_alignment = scoreTargetAlignment(presentKeys, targets);
  const synergy = scoreSynergy(presentKeys);
  const findings = auditStack(activeItems);
  const overdose_risk = scoreOverdose(findings);
  const interaction_risk = scoreInteraction(findings);
  const timing = scoreTiming(activeItems);
  const continuity = scoreContinuity(oldestAddedAt);
  const effect = scoreEffect(activeItems, responses);

  const total =
    coverage.score +
    target_alignment.score +
    synergy.score +
    overdose_risk.score +
    interaction_risk.score +
    timing.score +
    continuity.score +
    effect.score;

  const improvements = generateImprovements({
    presentKeys,
    targets,
    coverage,
    target_alignment,
    synergy,
    overdose_risk,
    interaction_risk,
    timing,
    effect
  });

  return {
    total: Math.round(total),
    axes: {
      coverage,
      target_alignment,
      synergy,
      overdose_risk,
      interaction_risk,
      timing,
      continuity,
      effect
    },
    improvements
  };
}

// ============================================================
// 各軸の計算
// ============================================================

function scoreCoverage(present: Set<IngredientKey>): AxisScore {
  const covered = FOUNDATIONAL.filter((k) => present.has(k));
  const score = (covered.length / FOUNDATIONAL.length) * 20;
  const missing = FOUNDATIONAL.filter((k) => !present.has(k))
    .map((k) => INGREDIENTS.find((i) => i.key === k)!.name_ja)
    .join('・');
  return {
    score,
    max: 20,
    detail:
      covered.length === FOUNDATIONAL.length
        ? '基礎栄養はフルカバー'
        : `不足: ${missing}`
  };
}

function scoreTargetAlignment(
  present: Set<IngredientKey>,
  targets: Target[]
): AxisScore {
  if (targets.length === 0) {
    return {
      score: 0,
      max: 20,
      detail: '目的(target)が未設定。設定するとここに加点される'
    };
  }

  // 複数 target の場合は平均
  let totalRatio = 0;
  const details: string[] = [];
  for (const target of targets) {
    const recommended = TARGET_INGREDIENTS[target];
    const covered = recommended.filter((k) => present.has(k));
    const ratio = covered.length / recommended.length;
    totalRatio += ratio;
    details.push(`${TARGET_LABELS[target]}: ${covered.length}/${recommended.length}`);
  }
  const avgRatio = totalRatio / targets.length;
  const score = avgRatio * 20;
  return {
    score,
    max: 20,
    detail: details.join(' / ')
  };
}

function scoreSynergy(present: Set<IngredientKey>): AxisScore {
  // 「片方持ってるシナジーペアの中で、もう片方も持ってる比率」
  let possible = 0;
  let achieved = 0;
  const missing: string[] = [];
  for (const syn of SYNERGIES) {
    if (present.has(syn.if_has)) {
      possible++;
      if (present.has(syn.but_missing)) {
        achieved++;
      } else {
        const ingMissing = INGREDIENTS.find((i) => i.key === syn.but_missing)!;
        missing.push(ingMissing.name_ja);
      }
    }
  }
  if (possible === 0) {
    return {
      score: 0,
      max: 15,
      detail: 'シナジーが発動する成分がまだない。基礎栄養を入れると活性化'
    };
  }
  const score = (achieved / possible) * 15;
  return {
    score,
    max: 15,
    detail:
      missing.length === 0
        ? '可能なシナジーは全て実現'
        : `シナジー候補で未取入: ${missing.slice(0, 3).join('・')}`
  };
}

function scoreOverdose(
  findings: ReturnType<typeof auditStack>
): AxisScore {
  const duplicates = findings.filter((f) => f.type === 'duplicate');
  // 重複1個につき -5、最大-15
  const penalty = Math.min(15, duplicates.length * 5);
  const score = 15 - penalty;
  return {
    score,
    max: 15,
    detail:
      duplicates.length === 0
        ? '重複なし。安全'
        : `${duplicates.length}件の成分重複あり`
  };
}

function scoreInteraction(
  findings: ReturnType<typeof auditStack>
): AxisScore {
  const interactions = findings.filter((f) => f.type === 'interaction');
  let penalty = 0;
  for (const f of interactions) {
    penalty += f.severity === 'danger' ? 6 : 4;
  }
  penalty = Math.min(10, penalty);
  const score = 10 - penalty;
  return {
    score,
    max: 10,
    detail:
      interactions.length === 0
        ? '干渉ルールには触れてない'
        : `${interactions.length}件の干渉警告あり`
  };
}

function scoreTiming(items: StackItem[]): AxisScore {
  const buckets: Record<string, number> = {
    morning: 0,
    lunch: 0,
    evening: 0,
    bedtime: 0,
    none: 0
  };
  for (const item of items) {
    const timings = item.timing ?? [];
    if (timings.length === 0) buckets.none++;
    for (const t of timings) {
      if (buckets[t] !== undefined) buckets[t]++;
    }
  }

  let score = 5;
  const issues: string[] = [];
  if (buckets.morning >= 5) {
    score -= 2;
    issues.push(`朝に${buckets.morning}本集中`);
  }
  if (buckets.none >= 2) {
    score -= 2;
    issues.push(`${buckets.none}本のタイミング未設定`);
  }
  score = Math.max(0, score);
  return {
    score,
    max: 5,
    detail: issues.length === 0 ? 'タイミング配分は良好' : issues.join(' / ')
  };
}

/**
 * 効果実感(モニタリング回答から算定)
 * - 各 active item の最新回答を取って effect を平均
 * - good=10 / neutral=5 / bad=0 でスケール
 */
function scoreEffect(
  items: StackItem[],
  responses: EffectResponseForScore[]
): AxisScore {
  if (responses.length === 0) {
    return {
      score: 0,
      max: 10,
      detail: 'モニタリング回答がまだない。1週・3週で振り返ると活性化'
    };
  }

  // 各 item の最新回答(responses は新しい順前提)
  const latestByItem = new Map<string, EffectResponseForScore>();
  for (const r of responses) {
    if (!latestByItem.has(r.stack_item_id)) {
      latestByItem.set(r.stack_item_id, r);
    }
  }

  // active item に絞って効果値を平均
  const itemIds = new Set(items.map((i) => i.id));
  const relevantResponses = Array.from(latestByItem.values()).filter((r) =>
    itemIds.has(r.stack_item_id)
  );

  if (relevantResponses.length === 0) {
    return {
      score: 0,
      max: 10,
      detail: 'まだ振り返り済みのサプリがない'
    };
  }

  const scoreMap: Record<string, number> = { good: 10, neutral: 5, bad: 0 };
  const sum = relevantResponses.reduce(
    (acc, r) => acc + scoreMap[r.effect],
    0
  );
  const avg = sum / relevantResponses.length;

  const goodCount = relevantResponses.filter((r) => r.effect === 'good').length;
  const badCount = relevantResponses.filter((r) => r.effect === 'bad').length;

  let detail: string;
  if (relevantResponses.length < items.length) {
    detail = `${relevantResponses.length}/${items.length}本 振り返り済み。良い: ${goodCount} / 悪い: ${badCount}`;
  } else if (badCount === 0 && goodCount > 0) {
    detail = '効果実感は良好';
  } else if (badCount > 0) {
    detail = `${badCount}本に効果が出ていない、見直し候補`;
  } else {
    detail = '体感は中立、もう少し継続を';
  }

  return {
    score: avg,
    max: 10,
    detail
  };
}

function scoreContinuity(oldestAddedAt: string | null): AxisScore {
  if (!oldestAddedAt) {
    return { score: 0, max: 5, detail: 'まだ始めたばかり' };
  }
  const monthsSince =
    (Date.now() - new Date(oldestAddedAt).getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  let score = 0;
  let label = '';
  if (monthsSince >= 24) {
    score = 5;
    label = '2年以上の継続';
  } else if (monthsSince >= 12) {
    score = 4;
    label = '1年以上の継続';
  } else if (monthsSince >= 6) {
    score = 3;
    label = '半年以上の継続';
  } else if (monthsSince >= 3) {
    score = 2;
    label = '3ヶ月以上の継続';
  } else if (monthsSince >= 1) {
    score = 1;
    label = '1ヶ月以上の継続';
  } else {
    score = 0;
    label = '記録開始 1ヶ月未満';
  }
  return { score, max: 5, detail: label };
}

// ============================================================
// 改善提案(Pro 限定で表示)
// ============================================================

function generateImprovements(ctx: {
  presentKeys: Set<IngredientKey>;
  targets: Target[];
  coverage: AxisScore;
  target_alignment: AxisScore;
  synergy: AxisScore;
  overdose_risk: AxisScore;
  interaction_risk: AxisScore;
  timing: AxisScore;
  effect: AxisScore;
}): ScoreResult['improvements'] {
  const improvements: ScoreResult['improvements'] = [];

  // 基礎栄養の不足
  if (ctx.coverage.score < 20) {
    const missing = FOUNDATIONAL.filter((k) => !ctx.presentKeys.has(k));
    for (const key of missing.slice(0, 3)) {
      const ing = INGREDIENTS.find((i) => i.key === key)!;
      improvements.push({
        axis: 'coverage',
        title: `${ing.name_ja} を追加`,
        description: `基礎栄養として推奨。${ing.description}`,
        points_estimate: 4
      });
    }
  }

  // 目的整合の不足
  if (ctx.targets.length > 0 && ctx.target_alignment.score < 20) {
    for (const target of ctx.targets) {
      const recommended = TARGET_INGREDIENTS[target];
      const missing = recommended.filter((k) => !ctx.presentKeys.has(k));
      for (const key of missing.slice(0, 2)) {
        const ing = INGREDIENTS.find((i) => i.key === key)!;
        improvements.push({
          axis: 'target_alignment',
          title: `${ing.name_ja} を追加(${TARGET_LABELS[target]} 向け)`,
          description: ing.description,
          points_estimate: Math.round(20 / recommended.length / ctx.targets.length)
        });
      }
    }
  }

  // シナジー欠落
  for (const syn of SYNERGIES) {
    if (
      ctx.presentKeys.has(syn.if_has) &&
      !ctx.presentKeys.has(syn.but_missing)
    ) {
      const ing = INGREDIENTS.find((i) => i.key === syn.but_missing)!;
      improvements.push({
        axis: 'synergy',
        title: syn.title,
        description: `${ing.name_ja} を加えるとシナジーが活性化する`,
        points_estimate: 3
      });
    }
  }

  // 重複
  if (ctx.overdose_risk.score < 15) {
    improvements.push({
      axis: 'overdose_risk',
      title: '成分重複を解消',
      description:
        '同じ成分を含むサプリの片方を整理 or 用量を確認することで安全性スコアが上がる',
      points_estimate: 5
    });
  }

  // 干渉
  if (ctx.interaction_risk.score < 15) {
    improvements.push({
      axis: 'interaction_risk',
      title: '干渉する組み合わせを見直し',
      description:
        '同時摂取で効果が打ち消し合うペアがある。タイミングを分けるか片方を外す',
      points_estimate: 5
    });
  }

  // タイミング
  if (ctx.timing.score < 5) {
    improvements.push({
      axis: 'timing',
      title: 'タイミング配分を最適化',
      description:
        '朝に集中しすぎ or タイミング未設定のサプリがある。脂溶性は食事と、空腹時に効くものは食前に分散',
      points_estimate: 3
    });
  }

  // 効果実感
  if (ctx.effect.score < 5) {
    improvements.push({
      axis: 'effect',
      title: '振り返り(モニタリング)に答える',
      description:
        '1週・3週で「体感どう?」に答えると、効果実感スコアが算定される。続ける/やめるの判断材料にもなる',
      points_estimate: 5
    });
  }

  // 上位の改善案を返す(最大8件)
  return improvements
    .sort((a, b) => b.points_estimate - a.points_estimate)
    .slice(0, 8);
}
