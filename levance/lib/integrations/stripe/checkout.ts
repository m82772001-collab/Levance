import { getStripeClient } from "./client";
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from "./types";

/**
 * Creates a Stripe Checkout Session for one-time order payment.
 * Uses the secret key (server-only). Does NOT mark the order paid —
 * that happens only in the verified webhook handler.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CreateCheckoutSessionResult> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: input.lineItems.map((li) => ({
      quantity: li.quantity,
      price_data: {
        currency: li.currency.toLowerCase(),
        unit_amount: li.unitAmountCents,
        product_data: { name: li.name },
      },
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      order_id: input.orderId,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}
