import { backendProxyTarget } from "./proxy";

const API = "https://api.test";

function browserRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://admin.test${path}`, { method: "POST", headers });
}

describe("backendProxyTarget", () => {
  it("giữ nguyên path, query và header Authorization", () => {
    const { url, headers } = backendProxyTarget(
      browserRequest("/api/v1/admin/users?page=2&limit=20", { Authorization: "Bearer t1" }),
      { apiBaseUrl: API },
    );

    expect(url.href).toBe("https://api.test/api/v1/admin/users?page=2&limit=20");
    expect(headers.get("authorization")).toBe("Bearer t1");
  });

  it("gắn IP thật của khách cùng secret khi có PROXY_SECRET", () => {
    const { headers } = backendProxyTarget(
      browserRequest("/api/v1/auth/login", { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
      { apiBaseUrl: API, proxySecret: "s3cret" },
    );

    expect(headers.get("x-client-ip")).toBe("203.0.113.9");
    expect(headers.get("x-proxy-secret")).toBe("s3cret");
  });

  it("xóa header giả mạo do trình duyệt gửi", () => {
    const { headers } = backendProxyTarget(
      browserRequest("/api/v1/auth/login", { "x-client-ip": "1.1.1.1", "x-proxy-secret": "doan-mo" }),
      { apiBaseUrl: API },
    );

    expect(headers.has("x-client-ip")).toBe(false);
    expect(headers.has("x-proxy-secret")).toBe(false);
  });
});
