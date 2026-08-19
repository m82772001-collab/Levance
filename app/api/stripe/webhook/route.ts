import { NextResponse, type NextRequest } from "next/server";
import { constructWebhookEvent, handleWebhookEvent } from "@/lib/integrations/stripe/webhook";

/**
 * Stripe requires the raw request body (unparsed) to verify the
 * signature — do not use NextRequest.json() here.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = constructWebhookEvent(rawBody, signature);
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Never leak internal error detail to the caller.
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}
