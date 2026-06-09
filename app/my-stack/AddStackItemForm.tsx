'use client';

/**
 * サプリ追加フォーム(Client Component)
 * - 既存の Server Action `addStackItem` を form action として使う
 * - 「成分を AI で推測」ボタンで AI 抽出 → hidden input に保存して submit
 * - submit 成功後はフォームをリセット + details を閉じる
 */
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addStackItem } from './actions';

const TIMING_LABELS: Record<string, string> = {
  morning: '朝',
  lunch: '昼',
  evening: '夕',
  bedtime: '就寝前',
  as_needed: '頓服'
};

type DetectedIngredient = {
  name_ja: string;
  name_en: string;
};

type DetectResponse = {
  ingredients?: DetectedIngredient[];
  summary?: string;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
};

export default function AddStackItemForm() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectResponse | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addStackItem(formData);
    // 成功時クリーンアップ
    setName('');
    setBrand('');
    setDetected(null);
    setDetectError(null);
    formRef.current?.reset();
    // 親の <details> を閉じる(任意)
    const details = formRef.current?.closest('details') as HTMLDetailsElement | null;
    if (details) details.removeAttribute('open');
  }

  async function detectIngredients() {
    if (!name.trim()) {
      setDetectError('まず商品名をご入力ください');
      return;
    }
    setDetecting(true);
    setDetectError(null);
    setDetected(null);
    try {
      const res = await fetch('/api/audit/detect-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brand: brand.trim() })
      });
      const data: DetectResponse = await res.json();
      if (!res.ok) {
        setDetectError(data.error ?? `エラー(${res.status})`);
      } else {
        setDetected(data);
      }
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }

  // 成分リストをカンマ区切り文字列に
  // (engine.ts の detectIngredient はこれをマッチ対象にする)
  const detectedIngredientsText = detected?.ingredients
    ? detected.ingredients
        .flatMap((ing) => [ing.name_ja, ing.name_en])
        .join(', ')
    : '';

  return (
    <form ref={formRef} action={handleSubmit} style={{ marginTop: 20 }}>
      <FormField
        label="サプリ名"
        name="name"
        required
        value={name}
        onChange={setName}
        placeholder="例: マグネシウム グリシネート / オキシカット"
      />
      <FormField
        label="ブランド"
        name="brand"
        value={brand}
        onChange={setBrand}
        placeholder="例: NOW Foods, Hydroxycut(任意)"
      />

      {/* AI 成分推測 */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={detectIngredients}
          disabled={detecting || !name.trim()}
          style={{
            background: 'transparent',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: detecting || !name.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: !name.trim() ? 0.45 : 1
          }}
        >
          {detecting
            ? 'AI が推測中…'
            : detected
              ? '✓ 推測済み(再実行)'
              : '✦ 成分を AI で推測'}
        </button>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-sub)',
            marginTop: 6,
            lineHeight: 1.6
          }}
        >
          コンビ製品(オキシカット等)や成分名が分かりにくい商品は、
          AI で主要成分を推測することで、監査・分析の精度が上がります。
        </div>

        {detectError && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            {detectError}
          </div>
        )}

        {detected && (
          <div
            style={{
              marginTop: 10,
              padding: '12px 14px',
              background: 'var(--accent-light)',
              border: '1px solid rgba(15, 91, 62, 0.18)',
              borderRadius: 8
            }}
          >
            {detected.summary && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-main)',
                  marginBottom: 8,
                  lineHeight: 1.6
                }}
              >
                {detected.summary}
                {detected.confidence && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color:
                        detected.confidence === 'high'
                          ? 'var(--accent-dark)'
                          : detected.confidence === 'medium'
                            ? '#8a5a06'
                            : 'var(--text-sub)'
                    }}
                  >
                    [
                    {detected.confidence === 'high'
                      ? '確度: 高'
                      : detected.confidence === 'medium'
                        ? '確度: 中'
                        : '確度: 低'}
                    ]
                  </span>
                )}
              </div>
            )}
            {detected.ingredients && detected.ingredients.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                {detected.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      padding: '3px 9px',
                      background: 'white',
                      border: '1px solid rgba(15, 91, 62, 0.25)',
                      color: 'var(--accent-dark)',
                      borderRadius: 100,
                      fontWeight: 600
                    }}
                  >
                    {ing.name_ja}
                  </span>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-sub)'
                }}
              >
                AI は成分を特定できませんでした。商品名を具体的にするか、
                ブランド名を加えてお試しください。
              </div>
            )}
          </div>
        )}

        {/* Server Action に渡す hidden field */}
        <input
          type="hidden"
          name="detected_ingredients"
          value={detectedIngredientsText}
        />
      </div>

      <FormField
        label="用量・1日の量"
        name="dosage"
        placeholder="例: 300mg / 1日1回"
      />

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--text-sub)',
            marginBottom: 8,
            fontWeight: 600
          }}
        >
          タイミング(複数選択可)
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(TIMING_LABELS).map(([key, label]) => (
            <label
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: '1px solid var(--border)',
                borderRadius: 100,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                name="timing"
                value={key}
                style={{ margin: 0 }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--text-sub)',
            marginBottom: 6,
            fontWeight: 600
          }}
        >
          メモ
        </label>
        <textarea
          name="notes"
          placeholder="効果・気付き等、自由メモ"
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: 'var(--accent)',
        color: 'white',
        border: 'none',
        padding: '11px 22px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: pending ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        opacity: pending ? 0.7 : 1
      }}
    >
      {pending ? '追加中…' : '追加する'}
    </button>
  );
}

function FormField({
  label,
  name,
  placeholder,
  required,
  value,
  onChange
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const isControlled = value !== undefined && onChange !== undefined;
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
        {...(isControlled
          ? { value, onChange: (e) => onChange!(e.target.value) }
          : {})}
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
