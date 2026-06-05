/**
 * POST /api/stripe/webhook
 * Stripe からの課金イベントを受けて profiles を更新する。
 *
 * 必須 env: STRIPE_WEBHOOK_SECRET
 * Stripe ダッシュボードで Endpoint 登録時に subscribe するイベント:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: 'webhook secret not configured' },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe webhook] signature verify failed:', msg);
    return NextResponse.json(
      { error: `signature verify failed: ${msg}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Checkout 完了。subscription_id を取得して profiles に保存
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !subscriptionId) {
          console.warn(
            '[stripe webhook] checkout.session.completed: missing userId or subscriptionId',
            { userId, subscriptionId }
          );
          break;
        }

        // subscription を retrieve して current_period_end を取る
        // Stripe SDK 22+ では current_period_end は items.data[0] に移動
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(
          subscription.items.data[0].current_period_end * 1000
        ).toISOString();

        await admin
          .from('profiles')
          .update({
            plan: 'pro',
            stripe_subscription_id: subscriptionId,
            current_period_end: periodEnd
          })
          .eq('user_id', userId);

        console.log('[stripe webhook] user upgraded to pro:', userId);
        break;
      }

      case 'customer.subscription.updated': {
        // 期間更新 or プラン変更 or キャンセル予約
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          console.warn(
            '[stripe webhook] customer.subscription.updated: no supabase_user_id'
          );
          break;
        }

        const periodEnd = new Date(
          subscription.items.data[0].current_period_end * 1000
        ).toISOString();

        // active / trialing → pro、それ以外(canceled / past_due 等)→ free
        const isActive =
          subscription.status === 'active' ||
          subscription.status === 'trialing';

        await admin
          .from('profiles')
          .update({
            plan: isActive ? 'pro' : 'free',
            stripe_subscription_id: subscription.id,
            current_period_end: periodEnd
          })
          .eq('user_id', userId);

        console.log(
          '[stripe webhook] subscription updated:',
          userId,
          subscription.status
        );
        break;
      }

      case 'customer.subscription.deleted': {
        // 解約完了。free に戻す
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          console.warn(
            '[stripe webhook] customer.subscription.deleted: no supabase_user_id'
          );
          break;
        }

        await admin
          .from('profiles')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            current_period_end: null
          })
          .eq('user_id', userId);

        console.log('[stripe webhook] subscription deleted, user→free:', userId);
        break;
      }

      default:
        // それ以外は無視(invoice.paid 等)
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe webhook] handler error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
