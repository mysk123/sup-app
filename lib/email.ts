/**
 * メール送信ヘルパー(Resend 経由 / sup-app.org 独自ドメイン認証済み)
 *
 * 必須 env:
 *   RESEND_API_KEY — Resend の API キー
 *
 * 送信元: noreply@sup-app.org (Resend で SPF/DKIM/DMARC 認証済み)
 * 返信先: supapp.support@gmail.com (問い合わせ窓口)
 */
import { Resend } from 'resend';

const FROM_EMAIL = 'noreply@sup-app.org';
const FROM_NAME = 'Sup. App';
const REPLY_TO = 'supapp.support@gmail.com';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** 指定すると List-Unsubscribe をこの URL(ワンクリック解除)にする。メルマガ用。 */
  listUnsubscribeUrl?: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
    replyTo: REPLY_TO,
    // List-Unsubscribe ヘッダ(Gmail/Outlook の真面目な送信者扱いを得る)
    headers: {
      'List-Unsubscribe': args.listUnsubscribeUrl
        ? `<${args.listUnsubscribeUrl}>`
        : `<mailto:${REPLY_TO}?subject=unsubscribe>, <https://app.sup-app.org/my-stack>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  });
}

/**
 * メルマガ(無料号)テンプレート。
 * body はプレーンテキスト(改行区切り)を受け取り、本文に整形する。
 * 購読解除リンク(トークン)を必ずフッターに入れる(特定電子メール法対応)。
 */
export function buildNewsletterEmail(args: {
  subject: string;
  body: string;
  unsubscribeUrl: string;
}) {
  const paragraphs = args.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="font-size:15px;color:#1c1c1c;line-height:1.9;margin:0 0 18px;">${p
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  const text = `${args.body}

────────────────
配信の停止はこちら:
${args.unsubscribeUrl}

Sup. App / 運営: 矢崎 誠人(屋号: Place to talk)
特定商取引法に基づく表示: https://app.sup-app.org/tokushoho`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<body style="margin:0;padding:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;color:#1c1c1c;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fafaf7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:white;border-radius:14px;border:1px solid #e8e6e0;">
          <tr>
            <td style="padding:32px 32px 8px;">
              <div style="font-weight:700;font-size:18px;letter-spacing:-0.02em;margin-bottom:24px;">
                Sup<span style="color:#0f5b3e;">.</span>
                <span style="margin-left:6px;font-size:11px;color:#7a7a7a;font-weight:600;">App</span>
              </div>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #e8e6e0;font-size:11px;color:#9a9a9a;line-height:1.7;">
              このメールは Sup. App のメール配信に同意された方にお送りしています。<br>
              配信の停止は <a href="${args.unsubscribeUrl}" style="color:#0f5b3e;">こちら（ワンクリック）</a> から。<br><br>
              Sup. App<br>
              運営: 矢崎 誠人(屋号: Place to talk)<br>
              <a href="https://app.sup-app.org/tokushoho" style="color:#9a9a9a;">特定商取引法に基づく表示</a> ・ <a href="https://app.sup-app.org/privacy" style="color:#9a9a9a;">プライバシーポリシー</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: args.subject, text, html };
}

/** 振り返りリマインダーのメールテンプレート */
export function buildMonitoringReminderEmail(args: {
  itemName: string;
  promptType: 'week_1' | 'week_3' | 'month_2' | 'month_6';
}) {
  const PROMPT_LABELS = {
    week_1: '1週間',
    week_3: '3週間',
    month_2: '2ヶ月',
    month_6: '6ヶ月'
  };
  const periodLabel = PROMPT_LABELS[args.promptType];

  const subject = `${args.itemName}、飲み始めて${periodLabel}が経過しました。体感はいかがですか?`;

  const text = `${args.itemName} を飲み始めて ${periodLabel} が経過しました。

「効いている気がする」「変わらない」「合わないかも」— どれでも構いません。
1 分で記録しておくと、後で続けるか様子を見るかの判断材料になります。

▼ 記録する
https://app.sup-app.org/my-stack

— Sup. App


このメールが不要な場合、Sup. App でこのサプリの登録を解除いただくか、
本メールに「unsubscribe」と返信してください。`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<body style="margin:0;padding:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;color:#1c1c1c;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fafaf7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;background:white;border-radius:14px;border:1px solid #e8e6e0;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <div style="font-weight:700;font-size:18px;letter-spacing:-0.02em;margin-bottom:24px;">
                Sup<span style="color:#0f5b3e;">.</span>
                <span style="margin-left:6px;font-size:11px;color:#7a7a7a;font-weight:600;">App</span>
              </div>
              <div style="font-size:11px;color:#0f5b3e;letter-spacing:0.16em;font-weight:700;margin-bottom:14px;">
                ${periodLabel} 経過
              </div>
              <h1 style="font-size:24px;font-weight:800;line-height:1.4;letter-spacing:-0.02em;margin:0 0 14px;">
                ${args.itemName}、<br>飲み始めて ${periodLabel} が経過しました。
              </h1>
              <p style="font-size:14px;color:#5a5a5a;line-height:1.85;margin:0 0 24px;">
                体感はいかがですか?「効いている気がする」「変わらない」「合わないかも」<br>
                — どれでも 1 分で残していただくと、続けるか様子を見るかの判断材料になります。
              </p>
              <a href="https://app.sup-app.org/my-stack" style="display:inline-block;background:#0f5b3e;color:white;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:700;">
                記録する
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #e8e6e0;font-size:11px;color:#9a9a9a;line-height:1.7;">
              このメールの停止をご希望の場合、<a href="https://app.sup-app.org/my-stack" style="color:#0f5b3e;">My Stack</a> でサプリの登録を解除するか、本メールに「unsubscribe」と返信してください。<br><br>
              Sup. App<br>
              運営: 矢崎 誠人(屋号: Place to talk)<br>
              <a href="https://app.sup-app.org/tokushoho" style="color:#9a9a9a;">特定商取引法に基づく表示</a> ・ <a href="https://app.sup-app.org/privacy" style="color:#9a9a9a;">プライバシーポリシー</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
