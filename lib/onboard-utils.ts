/**
 * /onboard 用の共通ユーティリティ
 * 商品名の正規化(重複検出用)
 */

/** 「マグネシウム グリシネート」と「マグネシウム(グリシネート)」を同一視できる正規化 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKC') // 半角全角統一
    .replace(/\s+/g, '') // 空白除去
    .replace(/[()()「」『』【】[\]]/g, '') // 括弧
    .replace(/[、,\-_/／・]/g, '') // 区切り記号
    .trim();
}

/** 既存スタック内の名前リストと衝突するかを判定 */
export function isDuplicateName(
  candidate: string,
  existingNames: string[]
): boolean {
  const n = normalizeName(candidate);
  if (!n) return false;
  return existingNames.some((e) => normalizeName(e) === n);
}
