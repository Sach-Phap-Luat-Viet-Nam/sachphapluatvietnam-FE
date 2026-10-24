/** Header chỉ proxy được đặt; xóa bản trình duyệt gửi lên để không giả mạo được IP. */
const CLIENT_IP_HEADER = "x-client-ip";
const PROXY_SECRET_HEADER = "x-proxy-secret";

export interface BackendProxyOptions {
  /** Gốc URL backend, không có `/api/v1`. */
  apiBaseUrl: string;
  /** Secret dùng chung với backend để backend tin header `x-client-ip`. Bỏ trống thì không gắn IP. */
  proxySecret?: string;
}

/**
 * URL và header để chuyển tiếp request `/api/v1/*` của trình duyệt sang backend (backend chưa bật CORS). Gắn IP thật
 * của khách để backend giới hạn tần suất theo khách thay vì theo IP của Vercel. Dùng trong `proxy.ts` của từng app.
 *
 * @example
 * const { url, headers } = backendProxyTarget(request, { apiBaseUrl, proxySecret });
 * return NextResponse.rewrite(url, { request: { headers } });
 */
export function backendProxyTarget(
  request: Request,
  { apiBaseUrl, proxySecret }: BackendProxyOptions,
): { url: URL; headers: Headers } {
  const source = new URL(request.url);
  const url = new URL(source.pathname + source.search, apiBaseUrl);
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);

  // Trên Vercel, x-forwarded-for do Vercel ghi đè nên phần tử đầu là IP thật của khách.
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp && proxySecret) {
    headers.set(CLIENT_IP_HEADER, clientIp);
    headers.set(PROXY_SECRET_HEADER, proxySecret);
  }

  return { url, headers };
}
