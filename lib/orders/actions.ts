"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prepareOrderFromCart } from "./prepare";
import { createCheckoutSession } from "@/lib/integrations/stripe/checkout";
import { getCartLines } from "@/lib/cart/service";

const checkoutSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(30),
  countryCode: z.string().length(2),
  phone: z.string().max(30).optional(),
});

export type CheckoutState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Prepares order server-side then attempts Stripe Checkout Session.
 * Payment success is never assumed here — only the webhook marks paid.
 */
export async function checkoutAction(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode"),
    countryCode: String(formData.get("countryCode") ?? "US").toUpperCase(),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Please check the form fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Capture line items for Stripe before cart is cleared in prepare
    const { lines } = await getCartLines();

    const order = await prepareOrderFromCart({
      email: parsed.data.email,
      shippingAddress: {
        full_name: parsed.data.fullName,
        line1: parsed.data.line1,
        line2: parsed.data.line2,
        city: parsed.data.city,
        state: parsed.data.state,
        postal_code: parsed.data.postalCode,
        country_code: parsed.data.countryCode,
        phone: parsed.data.phone,
      },
    });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";

    try {
      const session = await createCheckoutSession({
        orderId: order.orderId,
        customerEmail: parsed.data.email,
        lineItems: lines.map((l) => ({
          name: l.product_name,
          unitAmountCents: l.unit_price_cents,
          quantity: l.quantity,
          currency: l.currency,
        })),
        successUrl: `${origin}/order-confirmation/${order.orderId}`,
        cancelUrl: `${origin}/checkout`,
      });

      if (session.url) {
        redirect(session.url);
      }
    } catch (stripeErr) {
      console.error("Stripe checkout session:", stripeErr);
      // Fall through to confirmation; order remains awaiting_payment
    }

    redirect(`/order-confirmation/${order.orderId}`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Checkout failed.",
    };
  }
}
