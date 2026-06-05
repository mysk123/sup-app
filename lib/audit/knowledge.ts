/**
 * サプリの知識ベース(Stack 監査エンジン用)
 *
 * - INGREDIENTS: 主要成分の辞書 / ユーザー入力との照合キーワード付き
 * - INTERACTIONS: 注意すべき組み合わせ
 * - SYNERGIES: 相乗効果のあるペア(片方しか飲んでない時に追加提案)
 */

export type IngredientKey =
  | 'magnesium'
  | 'zinc'
  | 'iron'
  | 'vitamin_c'
  | 'vitamin_d3'
  | 'vitamin_k2'
  | 'vitamin_b_complex'
  | 'omega_3'
  | 'ashwagandha'
  | 'rhodiola'
  | 'melatonin'
  | 'glycine'
  | 'l_theanine'
  | 'l_tyrosine'
  | 'alpha_gpc'
  | 'bacopa'
  | 'coq10'
  | 'nmn'
  | 'creatine'
  | 'berberine'
  | 'chromium'
  | 'alpha_lipoic_acid'
  | 'astaxanthin'
  | 'collagen'
  | 'hyaluronic_acid'
  | 'biotin'
  | 'saw_palmetto'
  | 'five_htp'
  | 'probiotic'
  | 'glutamine'
  | 'lions_mane'
  | 'silymarin'
  | 'nac'
  | 'quercetin'
  | 'green_tea'
  | 'caffeine';

export interface Ingredient {
  key: IngredientKey;
  name_ja: string;
  match_keywords: string[]; // ユーザー入力との照合用(大文字小文字無視)
  category: '基礎栄養' | 'アダプトゲン' | '睡眠' | 'ヌートロピック' | 'ミトコンドリア' | '血糖代謝' | '抗酸化' | '美容' | '神経伝達' | '腸内環境' | '肝臓' | '抗炎症' | 'その他';
  upper_limit_note?: string; // 上限量の注意
  default_timing?: ('morning' | 'lunch' | 'evening' | 'bedtime')[];
  description: string;
}

export const INGREDIENTS: Ingredient[] = [
  // ミネラル
  { key: 'magnesium', name_ja: 'マグネシウム', match_keywords: ['マグネシウム', 'magnesium', 'グリシネート', 'glycinate'], category: '基礎栄養', upper_limit_note: '上限:1日500-600mg(サプリから)', default_timing: ['bedtime'], description: '神経安定・睡眠の質。日本人の8割不足。' },
  { key: 'zinc', name_ja: '亜鉛', match_keywords: ['亜鉛', 'zinc', 'ピコリン酸亜鉛'], category: '基礎栄養', upper_limit_note: '上限:1日40mg(過剰で銅欠乏のリスク)', default_timing: ['morning'], description: '免疫・皮脂調整・テストステロン。' },
  { key: 'iron', name_ja: '鉄', match_keywords: ['鉄', 'iron', 'ヘム鉄', 'heme'], category: '基礎栄養', upper_limit_note: '上限:1日45mg / 過剰摂取は肝臓に負担', default_timing: ['morning'], description: '隠れ貧血の補正、女性は要モニター。' },
  // ビタミン
  { key: 'vitamin_c', name_ja: 'ビタミンC', match_keywords: ['ビタミンc', 'vitamin c', 'アスコルビン酸'], category: '基礎栄養', upper_limit_note: '上限:1日2000mg程度(超過で下痢)', description: '抗酸化、コラーゲン産生、鉄吸収補助。' },
  { key: 'vitamin_d3', name_ja: 'ビタミンD3', match_keywords: ['ビタミンd', 'vitamin d', 'd3', 'コレカルシフェロール'], category: '基礎栄養', upper_limit_note: '上限:1日4000IU(長期は採血推奨)', default_timing: ['morning'], description: '免疫・骨・気分。日本人の半数不足。' },
  { key: 'vitamin_k2', name_ja: 'ビタミンK2', match_keywords: ['ビタミンk', 'vitamin k', 'k2', 'mk-7', 'mk7'], category: '基礎栄養', description: 'VD3と必ずセットで(カルシウムを骨に向ける)。' },
  { key: 'vitamin_b_complex', name_ja: 'ビタミンB群', match_keywords: ['ビタミンb', 'vitamin b', 'b-complex', 'b complex', 'b50', 'b-50'], category: '基礎栄養', default_timing: ['morning'], description: 'エネルギー代謝の鍵。' },
  { key: 'omega_3', name_ja: 'オメガ3', match_keywords: ['オメガ3', 'omega 3', 'omega-3', 'epa', 'dha', '魚油'], category: '抗炎症', default_timing: ['morning', 'evening'], description: '抗炎症の万能薬。脳機能・心血管・気分。' },
  // アダプトゲン
  { key: 'ashwagandha', name_ja: 'アシュワガンダ', match_keywords: ['アシュワガンダ', 'ashwagandha', 'ksm-66', 'ksm66'], category: 'アダプトゲン', default_timing: ['morning', 'bedtime'], description: 'コルチゾール低下、ストレス耐性。' },
  { key: 'rhodiola', name_ja: 'ロディオラ', match_keywords: ['ロディオラ', 'rhodiola'], category: 'アダプトゲン', default_timing: ['morning'], description: '疲労感の改善、ストレス耐性。' },
  // 睡眠
  { key: 'melatonin', name_ja: 'メラトニン', match_keywords: ['メラトニン', 'melatonin'], category: '睡眠', upper_limit_note: '高用量(5mg+)は逆効果のことあり', default_timing: ['bedtime'], description: '体内時計のリセット。少量(0.5-1mg)が効く。' },
  { key: 'glycine', name_ja: 'グリシン', match_keywords: ['グリシン', 'glycine'], category: '睡眠', default_timing: ['bedtime'], description: '深部体温↓、深睡眠アップ。' },
  // ヌートロピック
  { key: 'l_theanine', name_ja: 'L-テアニン', match_keywords: ['テアニン', 'theanine', 'l-theanine'], category: 'ヌートロピック', description: 'α波増加、リラックス×集中。' },
  { key: 'l_tyrosine', name_ja: 'L-チロシン', match_keywords: ['チロシン', 'tyrosine', 'l-tyrosine'], category: 'ヌートロピック', default_timing: ['morning'], description: 'ドーパミン・ノルアドレナリン前駆体。空腹時に。' },
  { key: 'alpha_gpc', name_ja: 'アルファGPC', match_keywords: ['アルファgpc', 'alpha gpc', 'alpha-gpc', 'gpc'], category: 'ヌートロピック', default_timing: ['morning'], description: 'アセチルコリン前駆体、記憶・注意。' },
  { key: 'bacopa', name_ja: 'バコパモニエラ', match_keywords: ['バコパ', 'bacopa', 'モニエラ'], category: 'ヌートロピック', description: 'ワーキングメモリ。効果実感まで8週間+。' },
  // ミトコンドリア
  { key: 'coq10', name_ja: 'CoQ10', match_keywords: ['coq10', 'co-q10', 'コエンザイム', 'ユビキノール', 'ubiquinol'], category: 'ミトコンドリア', default_timing: ['morning'], description: 'ミトコンドリアエネルギー、脂溶性。' },
  { key: 'nmn', name_ja: 'NMN', match_keywords: ['nmn'], category: 'ミトコンドリア', default_timing: ['morning'], description: 'NAD+前駆体、空腹時。' },
  { key: 'creatine', name_ja: 'クレアチン', match_keywords: ['クレアチン', 'creatine', 'モノハイドレート', 'monohydrate'], category: 'ミトコンドリア', description: 'ATP供給、筋肉+脳機能。' },
  // 血糖代謝
  { key: 'berberine', name_ja: 'ベルベリン', match_keywords: ['ベルベリン', 'berberine'], category: '血糖代謝', default_timing: ['morning', 'lunch', 'evening'], description: 'メトホルミン類似、血糖降下。食前。' },
  { key: 'chromium', name_ja: 'クロム', match_keywords: ['クロム', 'chromium', 'ピコリン酸クロム'], category: '血糖代謝', description: 'インスリン感受性。食前。' },
  { key: 'alpha_lipoic_acid', name_ja: 'αリポ酸', match_keywords: ['αリポ酸', 'リポ酸', 'alpha lipoic', 'ala'], category: '血糖代謝', default_timing: ['morning'], description: 'インスリン感受性 + 抗酸化、空腹時。' },
  // 抗酸化・美容
  { key: 'astaxanthin', name_ja: 'アスタキサンチン', match_keywords: ['アスタキサンチン', 'astaxanthin'], category: '抗酸化', default_timing: ['morning'], description: '強力な抗酸化、脂溶性。' },
  { key: 'collagen', name_ja: 'コラーゲン', match_keywords: ['コラーゲン', 'collagen', 'ペプチド', 'peptide'], category: '美容', description: '皮膚水分・弾力、3ヶ月継続。' },
  { key: 'hyaluronic_acid', name_ja: 'ヒアルロン酸', match_keywords: ['ヒアルロン酸', 'hyaluronic'], category: '美容', description: '肌の保水力。' },
  { key: 'biotin', name_ja: 'ビオチン', match_keywords: ['ビオチン', 'biotin'], category: '美容', description: '髪・爪の構造維持。' },
  { key: 'saw_palmetto', name_ja: 'ノコギリヤシ', match_keywords: ['ノコギリヤシ', 'saw palmetto', 'palmetto'], category: '美容', default_timing: ['morning'], description: '5αリダクターゼ阻害、男性型脱毛サポート。' },
  // 神経伝達
  { key: 'five_htp', name_ja: '5-HTP', match_keywords: ['5-htp', '5htp', 'hydroxytryptophan'], category: '神経伝達', default_timing: ['bedtime'], description: 'セロトニン前駆体。SSRIとの併用禁忌。' },
  // 腸内・肝臓
  { key: 'probiotic', name_ja: 'プロバイオティクス', match_keywords: ['プロバイオティクス', 'probiotic', '乳酸菌', 'ビフィズス'], category: '腸内環境', description: '腸内環境改善。' },
  { key: 'glutamine', name_ja: 'グルタミン', match_keywords: ['グルタミン', 'glutamine', 'l-glutamine'], category: '腸内環境', description: '腸粘膜修復、空腹時。' },
  { key: 'lions_mane', name_ja: 'ライオンズメイン', match_keywords: ['ライオンズメイン', 'lions mane', 'lion\'s mane', 'ヤマブシタケ'], category: 'ヌートロピック', description: 'NGF産生促進、認知機能。' },
  { key: 'silymarin', name_ja: 'シリマリン', match_keywords: ['シリマリン', 'silymarin', 'マリアアザミ', 'milk thistle'], category: '肝臓', description: '肝細胞保護・解毒酵素サポート。' },
  { key: 'nac', name_ja: 'NAC', match_keywords: ['nac', 'n-acetyl', 'アセチルシステイン'], category: '肝臓', description: 'グルタチオン前駆体、肝臓解毒。' },
  { key: 'quercetin', name_ja: 'ケルセチン', match_keywords: ['ケルセチン', 'quercetin'], category: '抗炎症', description: '尿酸 + 抗炎症。' },
  { key: 'green_tea', name_ja: '緑茶カテキン', match_keywords: ['緑茶', 'カテキン', 'egcg', 'green tea'], category: 'その他', description: '脂肪燃焼、内臓脂肪減少。' },
  { key: 'caffeine', name_ja: 'カフェイン', match_keywords: ['カフェイン', 'caffeine'], category: 'その他', upper_limit_note: '上限:1日400mg / 14時以降は睡眠への影響注意', description: '覚醒、半減期6時間。' }
];

export type FindingSeverity = 'info' | 'warning' | 'danger';

export interface Interaction {
  ingredients: IngredientKey[]; // 同時にスタックに存在する場合に発火
  severity: FindingSeverity;
  title: string;
  description: string;
}

export const INTERACTIONS: Interaction[] = [
  {
    ingredients: ['five_htp'],
    severity: 'danger',
    title: '5-HTP は SSRI / 抗うつ薬と併用禁忌',
    description: '5-HTPはセロトニンを上げます。SSRIや三環系抗うつ薬を服用中の方は「セロトニン症候群」のリスクがあるため併用しないでください。服薬中なら医師に相談を。'
  },
  {
    ingredients: ['iron', 'caffeine'],
    severity: 'warning',
    title: '鉄とカフェインのタイミング干渉',
    description: '鉄サプリの前後30分はコーヒー・緑茶を避けてください(吸収率が大きく落ちます)。'
  },
  {
    ingredients: ['zinc'],
    severity: 'info',
    title: '亜鉛の長期高用量に注意',
    description: '亜鉛40mg/日以上の長期摂取は銅欠乏のリスク。3ヶ月以上続ける場合は銅(2-4mg)の補充も検討を。'
  },
  {
    ingredients: ['vitamin_d3'],
    severity: 'info',
    title: 'ビタミンD3 は K2 とセットが推奨',
    description: 'D3 単独だとカルシウムが血管壁に沈着するリスク。K2(MK-7)を併用することで骨に向かう代謝になります。'
  },
  {
    ingredients: ['melatonin'],
    severity: 'info',
    title: 'メラトニンは少量で十分',
    description: '0.5-1mgで効果あり。5mg以上は逆に翌朝のだるさに繋がります。'
  },
  {
    ingredients: ['ashwagandha'],
    severity: 'info',
    title: 'アシュワガンダの長期注意',
    description: '甲状腺機能亢進症の方・甲状腺薬を服用中の方は併用注意。6ヶ月以上の連用は休止期間を挟むことを推奨。'
  },
  {
    ingredients: ['caffeine'],
    severity: 'info',
    title: 'カフェインは「14時カットオフ」',
    description: 'カフェインの半減期は約6時間。14時以降の摂取は睡眠の質を下げる可能性があります。'
  }
];

export interface Synergy {
  if_has: IngredientKey;
  but_missing: IngredientKey;
  title: string;
  description: string;
}

export const SYNERGIES: Synergy[] = [
  {
    if_has: 'vitamin_d3',
    but_missing: 'vitamin_k2',
    title: 'ビタミンD3 と K2 のセット推奨',
    description: 'D3だけだとカルシウムが血管に沈着するリスク。K2(MK-7) 100-200μg/日を追加で骨代謝が最適化されます。'
  },
  {
    if_has: 'iron',
    but_missing: 'vitamin_c',
    title: '鉄サプリは VC とセットで',
    description: 'ビタミンC 500mgを鉄と同時摂取で吸収率が倍になります。'
  },
  {
    if_has: 'ashwagandha',
    but_missing: 'magnesium',
    title: 'アシュワガンダ + マグネシウムで相乗効果',
    description: 'どちらもコルチゾール低下・神経安定に効きますが、作用機序が違うため併用で効果が上がります。マグネシウム就寝前300-400mgが定番。'
  },
  {
    if_has: 'glycine',
    but_missing: 'magnesium',
    title: 'グリシン + マグネシウムで深睡眠UP',
    description: 'グリシンの深部体温低下作用とマグネシウムの神経安定で深睡眠比率を最大化できます。'
  },
  {
    if_has: 'berberine',
    but_missing: 'chromium',
    title: 'ベルベリン + クロムで血糖管理を強化',
    description: 'ベルベリンは血糖降下、クロムはインスリン感受性改善。両方使うと食後血糖の安定がさらに進みます。'
  },
  {
    if_has: 'coq10',
    but_missing: 'magnesium',
    title: 'CoQ10 + マグネシウムでミトコンドリア最適化',
    description: 'CoQ10 がエネルギー産生、マグネシウムが ATP 合成の補因子。ペアで効率最大化。'
  },
  {
    if_has: 'collagen',
    but_missing: 'vitamin_c',
    title: 'コラーゲン + ビタミンCで合成促進',
    description: 'コラーゲン合成にはVCが必須。両方摂ることで皮膚水分・弾力の効果が出やすくなります。'
  }
];

/** ユーザー入力(name + brand)から成分を検出する */
export function detectIngredient(text: string): Ingredient | null {
  const lower = text.toLowerCase();
  // より厳密にマッチさせるため、キーワードが長い順にチェック
  const sorted = [...INGREDIENTS].sort((a, b) => {
    const aMax = Math.max(...a.match_keywords.map((k) => k.length));
    const bMax = Math.max(...b.match_keywords.map((k) => k.length));
    return bMax - aMax;
  });
  for (const ing of sorted) {
    if (ing.match_keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return ing;
    }
  }
  return null;
}
