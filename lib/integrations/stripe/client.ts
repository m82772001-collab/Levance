import "server-only";
import Stripe from "stripe";

/**
 * Single Stripe SDK instance. Server-only — the secret key must never
 * reach the browser bundle.
 *
 * The API version below is a placeholder; pin it to the version shown
 * in your Stripe Dashboard when real integration work begins, and keep
 * it in sync with what your webhook handler expects.
 */
let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it before calling any Stripe operation."
    );
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}
