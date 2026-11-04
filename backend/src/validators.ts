import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(2000).default("");
const web = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v)),
  ])
  .default("");
export const register = z
  .object({
    name: text,
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(72),
    role: z.enum(["DONOR", "INSTITUTION"]).default("DONOR"),
  })
  .strict();
export const pointInput = z
  .object({
    name: text,
    description: z.string().min(10).max(4000),
    state: z.string().length(2),
    city: text,
    neighborhood: text,
    street: text,
    number: text,
    complement: optional,
    zip: optional,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    restrictions: optional,
    instructions: optional,
    phone: optional,
    email: z.union([z.literal(""), z.string().email()]).default(""),
    website: web,
    source: web,
    verifiedAt: z.string().datetime().nullable().default(null),
    isDemo: z.boolean().default(false),
    categories: z.array(z.string()).min(1).max(8),
    hours: z
      .array(
        z
          .object({
            day: z.number().int().min(0).max(6),
            opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          })
          .refine(
            (v) => v.opens < v.closes,
            "Fechamento deve ser posterior à abertura",
          ),
      )
      .max(7)
      .refine(
        (v) => new Set(v.map((x) => x.day)).size === v.length,
        "Dias duplicados",
      ),
  })
  .strict();
export const campaignInput = z
  .object({
    title: text,
    description: z.string().min(10).max(4000),
    items: text,
    instructions: optional,
    pointId: text,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.enum(["PENDING", "CLOSED"]).default("PENDING"),
  })
  .strict()
  .refine((v) => v.startDate <= v.endDate, "Datas inválidas");
export const reviewInput = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(3).max(2000),
  })
  .strict();
