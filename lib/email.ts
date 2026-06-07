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
    html: args.html,
    // 迷惑メール判定を回避するためのヘッダ
    replyTo: FROM_EMAIL,
    headers: {
      'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=unsubscribe>, <https://app.sup-app.org/my-stack>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Entity-Ref-ID': `sup-app-${Date.now()}`
    }
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

  const subject = `${args.itemName}、飲み始めて${periodLabel}。体感どう?`;

  const text = `${args.itemName} を飲み始めて ${periodLabel} が経ったよ。

「効いてる気がする」「変わらない」「合わないかも」— どれでも OK。
1 分で記録しておくと、後で続けるかやめるかの判断材料になる。

▼ 記録する
https://app.sup-app.org/my-stack

— Sup. App


このメールが不要な場合、Sup. App でこのサプリの登録を解除するか、
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
                ${args.itemName}、<br>飲み始めて ${periodLabel} だね。
              </h1>
              <p style="font-size:14px;color:#5a5a5a;line-height:1.85;margin:0 0 24px;">
                体感どう?「効いてる気がする」「変わらない」「合わないかも」<br>
                — どれでも 1 分で残しとくと、後で続けるかやめるかの判断材料になる。
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
