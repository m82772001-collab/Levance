import "server-only";
import { getStripeClient } from "./client";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { setUserMembership } from "@/lib/membership/assign";
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
 * Order paid status is only set from checkout.session.completed /
 * payment_intent.succeeded when metadata contains a valid order_id.
 * Subscription events update PRO/PREMIUM membership only (never Monarch).
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        await markOrderPaidFromSession(session, event);
      } else if (session.mode === "subscription") {
        // Membership subscription — handled after subscription object exists
        await handleSubscriptionWebhook(event);
      }
      break;
    }
    case "payment_intent.succeeded": {
      // Backup path if checkout.session.completed is delayed
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
      // Unhandled event types are acknowledged but ignored
      break;
  }
}

async function markOrderPaidFromSession(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("checkout.session.completed missing order_id metadata");
    return;
  }

  if (session.payment_status !== "paid") {
    return;
  }

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

  if ((order as { status: string }).status === "paid") {
    return; // idempotent
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  // Insert payment row (service role only — no RLS insert policy for clients)
  await admin.from("payments").insert({
    order_id: orderId,
    provider: "stripe",
    provider_payment_id: paymentIntentId,
    status: "paid",
    amount_cents: (order as { total_cents: number }).total_cents,
    currency: (order as { currency: string }).currency,
    raw_event: event as unknown as Record<string, unknown>,
  });

  await admin
    .from("orders")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  // Authoritative sequence: paid first, then CJ fulfillment (idempotent).
  // Failure leaves order PAID and logs NEEDS_ATTENTION via cj_sync_logs.
  try {
    const { fulfillPaidOrder } = await import("@/lib/integrations/cj/fulfillment");
    await fulfillPaidOrder(orderId);
  } catch (err) {
    console.error("CJ fulfillment after payment:", err);
  }
}
