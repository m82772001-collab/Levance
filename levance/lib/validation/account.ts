import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(120),
});

export const addressSchema = z.object({
  fullName: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().min(1).max(30),
  countryCode: z.string().length(2),
  phone: z.string().max(30).optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
});
