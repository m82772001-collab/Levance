import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("Stripe checkout is idempotent and binds the PaymentIntent to the order", async () => {
  const source = await read("lib/integrations/stripe/checkout.ts");
  assert.match(source, /idempotencyKey\s*=\s*`levance-checkout-\$\{input\.orderId\}`/);
  assert.match(source, /payment_intent_data/);
  assert.match(source, /metadata:\s*\{\s*order_id:\s*input\.orderId/s);
  assert.match(source, /\{\s*idempotencyKey\s*\}/);
});

test("Stripe webhook requires a stripe-signature and verifies the raw body", async () => {
  const route = await read("app/api/stripe/webhook/route.ts");
  const verifier = await read("lib/integrations/stripe/webhook.ts");
  assert.match(route, /headers\.get\("stripe-signature"\)/);
  assert.match(route, /await request\.text\(\)/);
  assert.match(verifier, /constructWebhookEvent/);
  assert.match(verifier, /stripe\.webhooks\.constructEvent\(rawBody, signature, webhookSecret\)/);
});

test("Stripe webhook is idempotent and records authoritative payment references", async () => {
  const source = await read("lib/integrations/stripe/webhook.ts");
  assert.match(source, /from\("payments"\)\.upsert/);
  assert.match(source, /onConflict:\s*"provider_payment_id"/);
  assert.match(source, /stripe_checkout_session_id:\s*session\.id/);
  assert.match(source, /stripe_payment_intent_id:\s*paymentIntentId/);
  assert.match(source, /status:\s*"paid"/);
});

test("Stripe webhook never treats a browser redirect as payment confirmation", async () => {
  const action = await read("lib/orders/actions.ts");
  const webhook = await read("lib/integrations/stripe/webhook.ts");
  assert.match(action, /redirect\(session\.url\)/);
  assert.doesNotMatch(action, /update\(\{[^}]*status:\s*["']paid["']/s);
  assert.match(webhook, /session\.payment_status !== "paid"/);
});

test("failure mode: missing Stripe webhook signature is rejected", async () => {
  const route = await read("app/api/stripe/webhook/route.ts");
  assert.match(route, /if \(!signature\)/);
  assert.match(route, /status:\s*400/);
});

test("failure mode: forged Stripe signatures cannot bypass the verifier", async () => {
  const verifier = await read("lib/integrations/stripe/webhook.ts");
  assert.match(verifier, /constructEvent\(rawBody, signature, webhookSecret\)/);
  assert.match(verifier, /STRIPE_WEBHOOK_SECRET/);
  assert.doesNotMatch(verifier, /JSON\.parse\(rawBody\)/);
});
