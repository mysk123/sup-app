import { Suspense } from 'react';
import LoginContent from './LoginContent';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: 480,
            margin: '80px auto',
            padding: 20,
            textAlign: 'center',
            color: 'var(--text-sub)'
          }}
        >
          読み込み中…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
