import "server-only";
import { z } from "zod";

const envSchema = z.object({
  /** Gốc URL backend, không có `/api/v1` (docs/deploy-vercel.md). */
  API_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
});

export const env = envSchema.parse({ API_BASE_URL: process.env.API_BASE_URL });
