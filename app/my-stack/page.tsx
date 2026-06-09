import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { auditStack, type AuditFinding } from '@/lib/audit/engine';
import { computeScore, type Target } from '@/lib/audit/score';
import AiAnalysisPanel from './AiAnalysisPanel';
import AddStackItemForm from './AddStackItemForm';
import StackItemsList, { type StackItem } from './StackItemsList';
import TargetSelector from './TargetSelector';
import ScorePanel from './ScorePanel';
import WelcomePanel from './WelcomePanel';
import { getBillingStatus } from '@/lib/billing/usage';

export default async function MyStackPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: items, error } = await supabase
    .from('stack_items')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('added_at', { ascending: false });

  const stackItems: StackItem[] = items ?? [];
  const findings = auditStack(stackItems);
  const billing = await getBillingStatus();

  // モニタリング: 期限が来てて未回答・未スキップの prompts
  const { data: duePromptsRaw } = await supabase
    .from('monitoring_prompts')
    .select('id, stack_item_id, prompt_type, scheduled_at')
    .eq('user_id', user.id)
    .lte('scheduled_at', new Date().toISOString())
    .is('responded_at', null)
    .is('dismissed_at', null)
    .order('scheduled_at', { ascending: true });

  const duePromptsByItem: Record<
    string,
    { id: string; stack_item_id: string; prompt_type: string; scheduled_at: string }[]
  > = {};
  for (const p of duePromptsRaw ?? []) {
    if (!duePromptsByItem[p.stack_item_id]) duePromptsByItem[p.stack_item_id] = [];
    duePromptsByItem[p.stack_item_id].push(p);
  }

  // モニタリング: 過去の回答
  const { data: responsesRaw } = await supabase
    .from('monitoring_responses')
    .select(
      'id, stack_item_id, prompt_type, effect, continue_intent, notes, created_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const responsesByItem: Record<string, typeof responsesRaw> = {};
  for (const r of responsesRaw ?? []) {
    if (!responsesByItem[r.stack_item_id])
      responsesByItem[r.stack_item_id] = [];
    responsesByItem[r.stack_item_id]!.push(r);
  }

  // profiles から targets を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('targets')
    .eq('user_id', user.id)
    .maybeSingle();
  const targets: Target[] = (profile?.targets ?? []) as Target[];

  // 最古の added_at を継続性スコア用に
  const oldest =
    stackItems.length > 0
      ? stackItems.reduce((min, i) =>
          i.added_at < min.added_at ? i : min
        ).added_at
      : null;

  // 効果実感スコアのために responses を渡す
  const effectResponses = (responsesRaw ?? []).map((r) => ({
    stack_item_id: r.stack_item_id,
    effect: r.effect as 'good' | 'neutral' | 'bad',
    created_at: r.created_at
  }));

  // スコア計算
  const score = computeScore(stackItems, targets, oldest, effectResponses);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      {/* ヘッダー(brand + login state)— 2段組でスマホでも崩れない */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 36,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)'
        }}
      >
        {/* 上段: ロゴ + メニュー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: '-0.02em'
              }}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <a
              href="/trends"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent-dark)',
                background: 'var(--accent-light)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 100,
                whiteSpace: 'nowrap'
              }}
            >
              ★ Column
            </a>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                title="ログアウト"
                aria-label="ログアウト"
                style={{
                  fontSize: 11,
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: 100,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap'
                }}
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>

        {/* 下段: メアド(右寄せ、小さく) */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-sub)',
            textAlign: 'right',
            opacity: 0.75,
            wordBreak: 'break-all'
          }}
        >
          {user.email}
        </div>
      </header>

      <div style={{ marginBottom: 36 }}>
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
          MY STACK
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 10
          }}
        >
          飲んでるサプリ
          <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
            {' '}
            ({stackItems.filter((i) => i.is_active).length})
          </span>
        </h1>
        <p
          style={{
            color: 'var(--text-sub)',
            fontSize: 14,
            lineHeight: 1.75
          }}
        >
          現在の服用記録です。重複・干渉チェック、振り返り(+1週/+3週)、Optimization Score の算定に活用されます。
        </p>
      </div>

      {/* ウェルカム — target 未設定 or スタック空のときだけ表示 */}
      {(targets.length === 0 ||
        stackItems.filter((i) => i.is_active).length === 0) && (
        <WelcomePanel
          hasTargets={targets.length > 0}
          hasItems={stackItems.filter((i) => i.is_active).length > 0}
        />
      )}

      {/* 目的(target)選択 */}
      <TargetSelector initialTargets={targets} />

      {/* Optimization Score — スタックがある場合のみ */}
      {billing && stackItems.filter((i) => i.is_active).length > 0 && (
        <ScorePanel score={score} plan={billing.plan} />
      )}

      {/* 監査結果(ルールベース) */}
      {findings.length > 0 && <AuditSection findings={findings} />}

      {/* AI 包括分析 */}
      {stackItems.filter((i) => i.is_active).length > 0 && billing && (
        <AiAnalysisPanel
          initialBilling={{
            plan: billing.plan,
            ai_used_this_month: billing.ai_used_this_month,
            ai_limit_this_month: billing.ai_limit_this_month,
            ai_remaining: billing.ai_remaining
          }}
        />
      )}

      {/* 追加フォーム */}
      <details
        id="add-form"
        open={stackItems.filter((i) => i.is_active).length === 0}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 28,
          scrollMarginTop: 16
        }}
      >
        <summary
          style={{
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--accent)',
            userSelect: 'none'
          }}
        >
          + 新しいサプリを追加
        </summary>

        <AddStackItemForm />
      </details>

      {/* 一覧 */}
      {error && (
        <div
          style={{
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 13
          }}
        >
          読み込みエラー: {error.message}
        </div>
      )}

      <StackItemsList
        items={stackItems}
        duePromptsByItem={duePromptsByItem as any}
        responsesByItem={responsesByItem as any}
      />
    </div>
  );
}

function AuditSection({ findings }: { findings: AuditFinding[] }) {
  const dangerOrWarning = findings.filter(
    (f) => f.severity === 'danger' || f.severity === 'warning'
  );
  const info = findings.filter((f) => f.severity === 'info');

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: 14,
          fontWeight: 700
        }}
      >
        AUDIT — {findings.length}件の気づき
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dangerOrWarning.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
        {info.length > 0 && (
          <details
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 20px'
            }}
          >
            <summary
              style={{
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-sub)',
                userSelect: 'none'
              }}
            >
              ヒント・改善案 ({info.length}件)
            </summary>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 14
              }}
            >
              {info.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const styleByVariant = {
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      label: 'DANGER',
      labelColor: '#991b1b'
    },
    warning: {
      bg: '#fff8eb',
      border: '#fcdca2',
      label: 'WARNING',
      labelColor: '#8a5a06'
    },
    info: {
      bg: 'var(--accent-light)',
      border: 'rgba(15, 91, 62, 0.18)',
      label: 'TIP',
      labelColor: 'var(--accent-dark)'
    }
  };
  const s = styleByVariant[finding.severity];

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '14px 18px'
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.16em',
          fontWeight: 700,
          color: s.labelColor,
          marginBottom: 6
        }}
      >
        {s.label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 6,
          lineHeight: 1.45
        }}
      >
        {finding.title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.75
        }}
      >
        {finding.description}
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  required
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--text-sub)',
          marginBottom: 6,
          fontWeight: 600
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>
        )}
      </label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}
