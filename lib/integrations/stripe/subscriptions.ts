import "server-only";
import { getStripeClient, isStripeConfigured } from "./client";

/**
 * Stripe subscription boundary for PRO and PREMIUM memberships.
 *
 * MONARCH must NEVER use these functions — it is invitation-only.
 *
 * Authoritative flow:
 *   Customer → LÉVANCE → Stripe Checkout (subscription mode)
 *   → Stripe webhook → handleSubscriptionWebhook → Supabase membership update
 *
 * A frontend return from Stripe is never treated as proof of payment.
 */

export type SubscriptionTier = "PRO" | "PREMIUM";

export interface CreateSubscriptionCheckoutInput {
  userId: string;
  email: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
  /** Stripe Price ID for the selected tier — must be configured server-side. */
  priceId: string;
}

export interface CreateSubscriptionCheckoutResult {
  sessionId: string;
  url: string;
}

export async function createSubscriptionCheckout(
  _input: CreateSubscriptionCheckoutInput
): Promise<CreateSubscriptionCheckoutResult> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }
  getStripeClient();
  throw new Error(
    "createSubscriptionCheckout is not implemented yet. " +
      "Implement against current Stripe Checkout Session (mode=subscription) docs " +
      "after Price IDs for PRO and PREMIUM are created in the Stripe Dashboard. " +
      "Monarch must never call this function."
  );
}

export async function getSubscription(_subscriptionId: string): Promise<unknown> {
  getStripeClient();
  throw new Error("getSubscription is not implemented yet.");
}

export async function cancelSubscription(_subscriptionId: string): Promise<void> {
  getStripeClient();
  throw new Error("cancelSubscription is not implemented yet.");
}

export async function changeSubscription(
  _subscriptionId: string,
  _newPriceId: string
): Promise<void> {
  getStripeClient();
  throw new Error("changeSubscription is not implemented yet.");
}

/**
 * Handle subscription lifecycle events from Stripe webhooks.
 * Must update user_memberships via the service-role client only after
 * signature verification (already performed by constructWebhookEvent).
 */
export async function handleSubscriptionWebhook(_event: unknown): Promise<void> {
  throw new Error(
    "handleSubscriptionWebhook is not implemented yet. " +
      "Wire customer.subscription.created/updated/deleted and invoice.paid " +
      "to setUserMembership after verifying the event."
  );
}
