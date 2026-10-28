import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { backendProxyTarget } from "@slvn/api-client";

/** Chuyển tiếp `/api/v1/*` từ trình duyệt sang backend (backend chưa bật CORS), xem docs/deploy-vercel.md. */
export function proxy(request: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured");
  }

  const { url, headers } = backendProxyTarget(request, {
    apiBaseUrl,
    proxySecret: process.env.PROXY_SECRET,
    clientIpHeader: process.env.CLIENT_IP_HEADER || undefined,
  });
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: "/api/v1/:path*" };
