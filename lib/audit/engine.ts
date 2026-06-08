/**
 * Stack 監査エンジン(ルールベース)
 * 入力: stack_items 配列
 * 出力: AuditFinding 配列(発見・警告・推奨)
 */
import {
  INGREDIENTS,
  INTERACTIONS,
  SYNERGIES,
  detectAllIngredients,
  type Ingredient,
  type IngredientKey,
  type FindingSeverity
} from './knowledge';

export type StackItem = {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  timing: string[] | null;
  is_active: boolean;
  detected_ingredients?: string | null;
};

export interface AuditFinding {
  id: string;
  type: 'duplicate' | 'interaction' | 'synergy_missing' | 'timing' | 'tip';
  severity: FindingSeverity;
  title: string;
  description: string;
  related_item_ids?: string[];
}

/** 各 stack_item から検出された成分のリストのマップを作る(複数成分対応) */
function buildItemIngredientMap(
  items: StackItem[]
): Map<string, Ingredient[]> {
  const map = new Map<string, Ingredient[]>();
  for (const item of items) {
    // AI 推測済みの成分テキストも検出対象に含める
    const text = `${item.name} ${item.brand ?? ''} ${item.detected_ingredients ?? ''}`;
    map.set(item.id, detectAllIngredients(text));
  }
  return map;
}

/** 重複検出: 同じ成分が複数アイテムに存在 */
function checkDuplicates(
  items: StackItem[],
  itemToIngredient: Map<string, Ingredient[]>
): AuditFinding[] {
  const byKey = new Map<IngredientKey, StackItem[]>();
  for (const item of items) {
    const ings = itemToIngredient.get(item.id) ?? [];
    for (const ing of ings) {
      if (!byKey.has(ing.key)) byKey.set(ing.key, []);
      byKey.get(ing.key)!.push(item);
    }
  }

  const findings: AuditFinding[] = [];
  for (const [key, groupedItems] of Array.from(byKey.entries())) {
    if (groupedItems.length < 2) continue;
    const ing = INGREDIENTS.find((i) => i.key === key)!;
    findings.push({
      id: `dup_${key}`,
      type: 'duplicate',
      severity: 'warning',
      title: `${ing.name_ja} が ${groupedItems.length}本 に重複`,
      description: `${groupedItems
        .map((i) => `「${i.name}」`)
        .join(' と ')} に同じ成分(${ing.name_ja})が入っている可能性があります。合計量をご確認いただき、過剰摂取になっていないかをチェックしてみてください。${ing.upper_limit_note ?? ''}`,
      related_item_ids: groupedItems.map((i) => i.id)
    });
  }
  return findings;
}

/** 干渉・注意ルール検出 */
function checkInteractions(
  items: StackItem[],
  itemToIngredient: Map<string, Ingredient[]>
): AuditFinding[] {
  const presentKeys = new Set<IngredientKey>();
  const keyToItems = new Map<IngredientKey, string[]>();
  for (const item of items) {
    const ings = itemToIngredient.get(item.id) ?? [];
    for (const ing of ings) {
      presentKeys.add(ing.key);
      if (!keyToItems.has(ing.key)) keyToItems.set(ing.key, []);
      keyToItems.get(ing.key)!.push(item.id);
    }
  }

  const findings: AuditFinding[] = [];
  for (const rule of INTERACTIONS) {
    if (rule.ingredients.every((k) => presentKeys.has(k))) {
      const related = rule.ingredients.flatMap(
        (k) => keyToItems.get(k) ?? []
      );
      findings.push({
        id: `int_${rule.ingredients.join('_')}`,
        type: 'interaction',
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        related_item_ids: related
      });
    }
  }
  return findings;
}

/** 不足検出: 既存成分とのシナジー候補 */
function checkSynergies(
  items: StackItem[],
  itemToIngredient: Map<string, Ingredient[]>
): AuditFinding[] {
  const presentKeys = new Set<IngredientKey>();
  for (const item of items) {
    const ings = itemToIngredient.get(item.id) ?? [];
    for (const ing of ings) presentKeys.add(ing.key);
  }

  const findings: AuditFinding[] = [];
  for (const syn of SYNERGIES) {
    if (presentKeys.has(syn.if_has) && !presentKeys.has(syn.but_missing)) {
      findings.push({
        id: `syn_${syn.if_has}_${syn.but_missing}`,
        type: 'synergy_missing',
        severity: 'info',
        title: syn.title,
        description: syn.description
      });
    }
  }
  return findings;
}

/** タイミング集中の警告(朝に集中しすぎ等) */
function checkTiming(items: StackItem[]): AuditFinding[] {
  const buckets: Record<string, StackItem[]> = {
    morning: [],
    lunch: [],
    evening: [],
    bedtime: []
  };
  for (const item of items) {
    for (const t of item.timing ?? []) {
      if (buckets[t]) buckets[t].push(item);
    }
  }

  const findings: AuditFinding[] = [];
  const morningCount = buckets.morning.length;
  if (morningCount >= 5) {
    findings.push({
      id: `timing_morning_overload`,
      type: 'timing',
      severity: 'info',
      title: `朝に${morningCount}本集中してる`,
      description:
        '朝にまとめて飲むのは続けやすい反面、吸収効率や胃腸負担で損するケースもあります。脂溶性(VD・VE・オメガ3・CoQ10)は食事と一緒に、空腹時に効くもの(L-チロシン・αリポ酸・NMN)は朝食前、その他は分散をご検討ください。',
      related_item_ids: buckets.morning.map((i) => i.id)
    });
  }
  return findings;
}

/** 全体的なヒント(コンテキスト依存) */
function generalTips(
  items: StackItem[],
  itemToIngredient: Map<string, Ingredient[]>
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  // detect_unknown(全件で成分0個の場合)
  const unmatched = items.filter(
    (i) => (itemToIngredient.get(i.id) ?? []).length === 0
  );
  if (unmatched.length > 0 && unmatched.length === items.length) {
    findings.push({
      id: 'tip_unmatched_all',
      type: 'tip',
      severity: 'info',
      title: '登録されたサプリの成分を判別できませんでした',
      description:
        '商品名に成分名が含まれていないと判別できません。フォームの「✦ 成分を AI で推測」ボタンで AI に成分を抽出させるか、商品名に成分名をご併記ください(例:「オキシカット (カフェイン Lカルニチン)」)。'
    });
  }
  return findings;
}

export function auditStack(rawItems: StackItem[]): AuditFinding[] {
  const items = rawItems.filter((i) => i.is_active);
  if (items.length === 0) return [];

  const itemToIngredient = buildItemIngredientMap(items);

  return [
    ...checkInteractions(items, itemToIngredient),
    ...checkDuplicates(items, itemToIngredient),
    ...checkSynergies(items, itemToIngredient),
    ...checkTiming(items),
    ...generalTips(items, itemToIngredient)
  ];
}
