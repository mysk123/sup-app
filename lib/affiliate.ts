/**
 * アフィリエイトリンク生成
 * - Amazon: tag=moyai123-22
 * - iHerb: rcode=QQA5918
 */
const AMAZON_TAG = 'moyai123-22';
const IHERB_RCODE = 'QQA5918';

export function amazonLink(keyword: string): string {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${AMAZON_TAG}`;
}

export function iherbLink(keyword: string): string {
  return `https://www.iherb.com/search?kw=${encodeURIComponent(keyword)}&rcode=${IHERB_RCODE}`;
}

/** /onboard に「これを My Stack に追加」する URL */
export function onboardAddUrl(item: {
  name: string;
  dosage?: string;
  category?: string;
}): string {
  const params = new URLSearchParams();
  params.set(
    'items',
    JSON.stringify([{ name: item.name, dosage: item.dosage ?? '' }])
  );
  if (item.category) params.set('targets', item.category);
  params.set('from', 'recommendation');
  return `/onboard?${params.toString()}`;
}
