import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const method = z.enum(["qris", "va_bca", "va_bni", "va_bri", "va_mandiri", "gopay", "ovo", "dana", "shopeepay", "card", "manual"]);

export const stay = z.object({ checkIn: day, checkOut: day, units: z.array(z.string().min(1).max(64)).min(1).max(20) });

export const createBookingBody = stay.extend({
  guests: z.number().int().min(1).max(200),
  guest: z.object({ name: z.string().max(120), email: z.string().max(200), phone: z.string().max(40) }),
  notes: z.string().max(2000).optional(),
  method,
  locale: z.enum(["id", "en"]),
  promoCode: z.string().max(40).optional(),
});

export const promoCheckBody = stay.extend({ code: z.string().min(1).max(40) });

export const lookupBody = z.object({ code: z.string().min(1).max(20), email: z.string().min(1).max(200) });
