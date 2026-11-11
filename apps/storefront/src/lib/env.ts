import "server-only";
import { z } from "zod";
import { resolveSiteUrl } from "./site-url";

const envSchema = z.object({
  /** Gốc URL backend, không có `/api/v1` (docs/deploy-vercel.md). */
  API_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  /** Gốc URL tuyệt đối của storefront (sitemap, robots, canonical), xem `resolveSiteUrl`. */
  SITE_URL: z.string(),
});

export const env = envSchema.parse({
  API_BASE_URL: process.env.API_BASE_URL,
  SITE_URL: resolveSiteUrl({
    SITE_URL: process.env.SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }),
});
