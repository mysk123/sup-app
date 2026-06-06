import LegalLayout, { H2, P } from '@/app/legal/LegalLayout';

export const metadata = {
  title: '特定商取引法に基づく表示 / Sup. App',
  description: 'Sup. App 特定商取引法に基づく表示'
};

/**
 * 特定商取引法に基づく表示
 *
 * ⚠️ TODO: 本番化前に以下を実際の情報で埋める
 *  - 販売事業者(個人事業主の場合は氏名、屋号、所在地)
 *  - 連絡先(メール、電話)
 *  - 銀行口座(必要に応じて)
 */
export default function TokushohoPage() {
  return (
    <LegalLayout
      title="特定商取引法に基づく表示"
      lastUpdated="2026年6月7日"
    >
      <Row label="販売事業者">
        矢崎 誠人(屋号: Place to talk)
      </Row>

      <Row label="運営責任者">矢崎 誠人</Row>

      <Row label="所在地">
        ご請求があれば遅滞なく開示いたします。下記のお問い合わせ先までご連絡ください。
      </Row>

      <Row label="連絡先">
        <Placeholder>
          (Gmail 開設後に反映 / 電話番号は請求があれば開示)
        </Placeholder>
      </Row>

      <Row label="販売価格">
        Pro プラン: 月額 980円(税込)
      </Row>

      <Row label="商品代金以外の必要料金">
        なし(インターネット接続料金等は利用者負担)
      </Row>

      <Row label="支払方法">
        クレジットカード決済(Stripe)
      </Row>

      <Row label="支払時期">
        申込時に初回課金。以後、毎月の更新日に自動課金。
      </Row>

      <Row label="商品の引渡時期">
        決済完了後、即時にサービスをご利用いただけます。
      </Row>

      <Row label="返品・キャンセル">
        本サービスはデジタルコンテンツの性質上、原則として課金後の返金・キャンセルはお受けできません。次回更新前に解約された場合、現在の課金期間終了まで引き続きご利用いただけます。
      </Row>

      <Row label="解約方法">
        本サービス内の設定画面から、いつでも解約手続きが可能です。解約後、現在の課金期間終了まで Pro 機能をご利用いただけます。次回の課金は発生しません。
      </Row>

      <Row label="動作環境">
        最新版の主要 Web ブラウザ(Chrome、Safari、Edge、Firefox)を推奨します。
      </Row>

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-sub)' }}>
        本表示の内容は、関連する法令の改正等により随時更新される場合があります。
      </div>
    </LegalLayout>
  );
}

function Row({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--border)'
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-sub)',
          paddingTop: 2
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: '#fff8eb',
        color: '#8a5a06',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 13
      }}
    >
      ⚠ {children}
    </span>
  );
}
