/**
 * Next.js middleware — Supabase の auth セッション cookie を自動更新する
 * (ログイン状態をリクエスト毎に維持するために必要)
 *
 * @supabase/ssr 0.5+ の getAll / setAll パターン
 * (古い get/set/remove は chunk cookie が壊れる既知問題あり)
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // 必ず getUser() を呼ぶ(セッション cookie の refresh)
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下のパス以外で middleware を実行:
     * - _next/static (静的アセット)
     * - _next/image (画像最適化)
     * - favicon.ico
     * - 画像ファイル
     * - /api/stripe/webhook (Stripe からの raw body を触らない)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
