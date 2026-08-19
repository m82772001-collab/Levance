import { z } from "zod";

export const productFilterSchema = z.object({
  categorySlug: z.string().optional(),
  query: z.string().max(200).optional(),
  minPriceCents: z.number().int().nonnegative().optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "best_selling"]).default("newest"),
  page: z.number().int().positive().default(1),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;
