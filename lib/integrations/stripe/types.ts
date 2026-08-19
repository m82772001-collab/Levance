export interface CreateCheckoutSessionInput {
  orderId: string;
  customerEmail: string;
  lineItems: Array<{
    name: string;
    unitAmountCents: number;
    quantity: number;
    currency: string;
  }>;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResult {
  sessionId: string;
  url: string | null;
}

export type VerifiedPaymentStatus = "paid" | "unpaid" | "no_payment_required";
