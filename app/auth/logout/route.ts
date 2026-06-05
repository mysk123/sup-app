/**
 * ログアウト
 * GET でも POST でも動くようにしておく(URLでも、formでも可)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function handle(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
