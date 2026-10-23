import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Header chỉ proxy được đặt; xóa bản trình duyệt gửi lên để không giả mạo được IP. */
const CLIENT_IP_HEADER = "x-client-ip";
const PROXY_SECRET_HEADER = "x-proxy-secret";

/**
 * Chuyển tiếp `/api/v1/*` từ trình duyệt sang backend (backend chưa bật CORS) và gắn IP thật của khách để backend
 * giới hạn tần suất theo khách thay vì theo IP của Vercel.
 */
export function proxy(request: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured");
  }

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, apiBaseUrl);
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);

  // Trên Vercel, x-forwarded-for do Vercel ghi đè nên phần tử đầu là IP thật của khách.
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const proxySecret = process.env.PROXY_SECRET;
  if (clientIp && proxySecret) {
    headers.set(CLIENT_IP_HEADER, clientIp);
    headers.set(PROXY_SECRET_HEADER, proxySecret);
  }

  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = { matcher: "/api/v1/:path*" };
