/**
 * Supabase server client
 * Server Components / Route Handlers / Server Actions から使う
 *
 * @supabase/ssr 0.5+ の getAll / setAll パターン
 * (古い get/set/remove は chunk cookie が壊れる既知問題あり)
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component から呼ばれた場合は middleware で更新する
          }
        }
      }
    }
  );
}
