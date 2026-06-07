/**
 * メール送信ヘルパー(Gmail SMTP 経由)
 *
 * 必須 env:
 *   GMAIL_APP_PASSWORD — Gmail のアプリパスワード(16文字)
 *
 * 送信元: supapp.support@gmail.com
 */
import nodemailer from 'nodemailer';

const FROM_EMAIL = 'supapp.support@gmail.com';
const FROM_NAME = 'Sup. App サポート';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_APP_PASSWORD is not set');
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: FROM_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  return _transporter;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html
  });
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

  const subject = `「${args.itemName}」を始めて ${periodLabel} — 振り返りませんか?`;

  const text = `「${args.itemName}」を飲み始めて ${periodLabel} が経ちました。

体感に変化はありましたか?
1分で振り返りを送信できます。

▼ 振り返る
https://app.sup-app.org/my-stack

— Sup. App
https://app.sup-app.org/

このメールに心当たりがない場合や、リマインダーを停止したい場合は、Sup. App にログインしてサプリの登録を解除してください。`;

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
                MONITORING REMINDER
              </div>
              <h1 style="font-size:22px;font-weight:800;line-height:1.45;letter-spacing:-0.02em;margin:0 0 14px;">
                「${args.itemName}」を始めて ${periodLabel} が経ちました。
              </h1>
              <p style="font-size:14px;color:#5a5a5a;line-height:1.85;margin:0 0 24px;">
                体感に変化はありましたか?<br>
                1分で振り返りを送信できます。続ける/様子見/やめる の判断材料になります。
              </p>
              <a href="https://app.sup-app.org/my-stack" style="display:inline-block;background:#0f5b3e;color:white;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:700;">
                振り返りに答える →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #e8e6e0;font-size:11px;color:#9a9a9a;line-height:1.7;">
              このメールに心当たりがない場合は、<a href="https://app.sup-app.org/my-stack" style="color:#0f5b3e;">My Stack</a> でサプリの登録を解除すると今後のリマインダーは送られません。<br><br>
              Sup. App / 運営: 矢崎 誠人(屋号: Place to talk)
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
