/**
 * POST /api/stripe/checkout
 * アップグレード CTA から叩く。Stripe Checkout セッションを作って URL を返す。
 */
import { NextResponse } from 'next/server';
import { getStripe, STRIPE_PRICE_ID } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  // 1. 認証
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: 'STRIPE_PRICE_ID is not configured' },
      { status: 500 }
    );
  }

  // 2. profiles を取得して既存の stripe_customer_id があれば使い回す
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, plan')
    .eq('user_id', user.id)
    .maybeSingle();

  // すでに Pro なら何もしないで終わり(ボタン2度押しガード)
  if (profile?.plan === 'pro') {
    return NextResponse.json(
      { error: 'すでに Pro プランです' },
      { status: 400 }
    );
  }

  let customerId = profile?.stripe_customer_id ?? null;

  const stripe = getStripe();

  // 3. Stripe Customer がなければ作る
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: user.id
      }
    });
    customerId = customer.id;

    // profiles に保存(同じ user の今後の Checkout で使い回す)
    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }

  // 4. Checkout セッション作成
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/my-stack`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        supabase_user_id: user.id
      }
    },
    metadata: {
      supabase_user_id: user.id
    }
  });

  if (!session.url) {
    return NextResponse.json(
      { error: 'Checkout URL の作成に失敗しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
