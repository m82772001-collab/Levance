import "server-only";

/**
 * Server-side LÉVANCE pricing from supplier cost.
 * Never expose supplier cost to the client as the selling price.
 */

export type MarkupStrategy =
  | { type: "percent"; percent: number }
  | { type: "fixed"; cents: number }
  | { type: "percent_plus_fixed"; percent: number; cents: number };

export function getDefaultMarkup(): MarkupStrategy {
  const percent = Number(process.env.CJ_MARKUP_PERCENT ?? 40);
  const fixed = Number(process.env.CJ_MARKUP_FIXED_CENTS ?? 0);
  if (fixed > 0 && percent > 0) {
    return { type: "percent_plus_fixed", percent, cents: fixed };
  }
  if (fixed > 0) return { type: "fixed", cents: fixed };
  return { type: "percent", percent: Number.isFinite(percent) ? percent : 40 };
}

/**
 * @param supplierPriceCents - cost from CJ (converted to cents)
 * @param shippingCents - optional estimated shipping absorbed or passed through
 */
export function calculateSellPriceCents(
  supplierPriceCents: number,
  strategy: MarkupStrategy = getDefaultMarkup(),
  shippingCents = 0
): number {
  const base = Math.max(0, Math.round(supplierPriceCents));
  let sell = base;
  switch (strategy.type) {
    case "percent":
      sell = Math.round(base * (1 + strategy.percent / 100));
      break;
    case "fixed":
      sell = base + strategy.cents;
      break;
    case "percent_plus_fixed":
      sell = Math.round(base * (1 + strategy.percent / 100)) + strategy.cents;
      break;
  }
  // Optionally fold shipping into retail (configurable)
  if (process.env.CJ_INCLUDE_SHIPPING_IN_PRICE === "1") {
    sell += Math.max(0, shippingCents);
  }
  return Math.max(sell, base); // never sell below cost
}

export function parseCjPriceToCents(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    // CJ docs often use USD dollars
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  return 0;
}
