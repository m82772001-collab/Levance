import "server-only";
import { getStripeClient } from "./client";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { handleSubscriptionWebhook } from "./subscriptions";

/**
 * Verifies Stripe webhook signature. This is the only trusted entry point
 * for payment confirmation — frontend redirects are never treated as paid.
 */
export function constructWebhookEvent(
  rawBody: string,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Dispatch verified Stripe events.
 * Order paid status is only set from checkout.session.completed when the
 * session is actually paid. Subscription events update paid memberships.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        await markOrderPaidFromSession(session, event);
      } else if (session.mode === "subscription") {
        await handleSubscriptionWebhook(event);
      }
      break;
    }
    case "payment_intent.succeeded": {
      // Checkout Session completion remains the authoritative order transition.
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (orderId) {
        const admin = createSupabaseAdminClient();
        await admin
          .from("orders")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("status", "awaiting_payment");
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed": {
      await handleSubscriptionWebhook(event);
      break;
    }
    default:
      break;
  }
}

async function markOrderPaidFromSession(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId || session.payment_status !== "paid") return;

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_cents, currency")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    console.error("Order not found for webhook:", orderId);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  const paymentResult = await admin.from("payments").upsert(
    {
      order_id: orderId,
      provider: "stripe",
      provider_payment_id: paymentIntentId,
      status: "paid",
      amount_cents: order.total_cents,
      currency: order.currency,
      raw_event: event as unknown as Record<string, unknown>,
    },
    { onConflict: "provider_payment_id", ignoreDuplicates: true }
  );

  if (paymentResult.error) {
    throw paymentResult.error;
  }

  await admin
    .from("orders")
    .update({
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("status", "paid");

  try {
    const { fulfillPaidOrder } = await import("@/lib/integrations/cj/fulfillment");
    await fulfillPaidOrder(orderId);
  } catch (err) {
    console.error("CJ fulfillment after payment:", err);
  }
}
