/**
 * /onboard ?targets=focus,recovery&items=[{"name":"マグネシウム グリシネート","dosage":"300mg"},...]
 *
 * sup-app.org 側の診断結果から「My Stack に送る」ボタンで遷移してくる。
 * 内容を確認画面で見せ、ユーザーが承認すると一括登録。
 */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { acceptOnboard } from './actions';
import { TARGET_LABELS, type Target } from '@/lib/audit/score';

type Item = { name: string; dosage?: string };

function parseItems(raw: string | undefined): Item[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((i) => i && typeof i.name === 'string')
      .map((i) => ({
        name: String(i.name).trim(),
        dosage: i.dosage ? String(i.dosage).trim() : undefined
      }))
      .filter((i) => i.name.length > 0)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function parseTargets(raw: string | undefined): Target[] {
  if (!raw) return [];
  const valid: Target[] = [
    'focus',
    'recovery',
    'stability',
    'appearance',
    'numbers'
  ];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is Target => valid.includes(t as Target));
}

export default async function OnboardPage({
  searchParams
}: {
  searchParams: { targets?: string; items?: string; from?: string };
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    // ログイン後にここに戻ってこれるよう、現在のクエリ込みで /login に行く
    const search = new URLSearchParams();
    if (searchParams.targets) search.set('targets', searchParams.targets);
    if (searchParams.items) search.set('items', searchParams.items);
    if (searchParams.from) search.set('from', searchParams.from);
    const back = `/onboard?${search.toString()}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const targets = parseTargets(searchParams.targets);
  const items = parseItems(searchParams.items);

  if (targets.length === 0 && items.length === 0) {
    // 何も渡されてない場合は my-stack に飛ばす
    redirect('/my-stack');
  }

  // hidden form 用に JSON 文字列化
  const itemsJson = JSON.stringify(items);

  return (
    <div className="container" style={{ maxWidth: 560, padding: '40px 20px' }}>
      <header
        style={{
          marginBottom: 32
        }}
      >
        <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span
            style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}
          >
            Sup<span style={{ color: 'var(--accent)' }}>.</span>
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: 'var(--text-sub)',
                fontWeight: 600
              }}
            >
              App
            </span>
          </span>
        </a>
      </header>

      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.18em',
          color: 'var(--accent)',
          marginBottom: 14,
          fontWeight: 700
        }}
      >
        FROM DIAGNOSIS
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: '-0.025em',
          marginBottom: 14
        }}
      >
        診断結果を My Stack に追加
      </h1>
      <p
        style={{
          color: 'var(--text-sub)',
          fontSize: 14,
          lineHeight: 1.85,
          marginBottom: 28
        }}
      >
        sup-app.org の診断で出た推奨を、ここから一括で My Stack に取り込みます。
        承認すれば、すぐに Optimization Score の計算が始まる。
      </p>

      {/* 取り込む target */}
      {targets.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              marginBottom: 10,
              fontWeight: 700
            }}
          >
            目的(TARGET)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {targets.map((t) => (
              <span
                key={t}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent-light)',
                  color: 'var(--accent-dark)',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                {TARGET_LABELS[t]}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 取り込むサプリ */}
      {items.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              marginBottom: 10,
              fontWeight: 700
            }}
          >
            推奨サプリ({items.length}件)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 2
                  }}
                >
                  {item.name}
                </div>
                {item.dosage && (
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--accent)'
                    }}
                  >
                    {item.dosage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <form
        action={acceptOnboard}
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
      >
        <input type="hidden" name="targets" value={targets.join(',')} />
        <input type="hidden" name="items" value={itemsJson} />
        <button
          type="submit"
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '13px 26px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          My Stack に追加する →
        </button>
        <a
          href="/my-stack"
          style={{
            background: 'transparent',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            border: '1px solid var(--border)',
            padding: '12px 22px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          キャンセル
        </a>
      </form>

      <div
        style={{
          marginTop: 32,
          padding: '12px 16px',
          background: 'var(--card-bg)',
          border: '1px dashed var(--border)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--text-sub)',
          lineHeight: 1.7
        }}
      >
        ※ 追加後、商品名・ブランド・タイミングなどの詳細は My Stack
        で編集できる。重複した場合は手動で整理してください。
      </div>
    </div>
  );
}
