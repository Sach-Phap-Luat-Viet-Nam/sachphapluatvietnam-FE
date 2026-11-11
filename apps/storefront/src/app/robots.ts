import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { ROBOTS_DISALLOW } from "@/lib/sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ROBOTS_DISALLOW },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
  };
}
