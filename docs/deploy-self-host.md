# Tự host storefront và admin (Docker)

## Mục đích

Chạy 2 app Next.js trên máy chủ tự quản lý thay cho Vercel, cùng máy với backend. Toàn bộ quy trình cài đặt máy chủ,
Cloudflare Tunnel, backup nằm ở `docs/deploy-linux.md` của **repo backend**; file này chỉ mô tả phần của repo FE.

## Luồng xử lý

- `Dockerfile` ở gốc repo build **một** app theo build arg `APP` (`storefront` hoặc `admin`): cài pnpm đúng bản trong
  `packageManager`, `pnpm install --frozen-lockfile`, rồi `pnpm --filter @slvn/<APP> build` với `NEXT_OUTPUT=standalone`.
- `next.config.ts` của từng app chỉ bật `output: "standalone"` (kèm `outputFileTracingRoot` là gốc monorepo) khi có
  `NEXT_OUTPUT=standalone`, nên build trên Vercel giữ nguyên output mặc định.
- Image chạy `node server.js` của bản standalone, cổng `3000`, user `node`. `public/` và `.next/static/` được copy vào
  image vì `server.js` không tự copy.
- Lúc build, Next.js render trước trang tĩnh/ISR bằng dữ liệu gọi từ backend, nên backend phải gọi được qua build arg
  `API_BASE_URL`. Lúc chạy, `API_BASE_URL` là biến môi trường của container (có thể khác URL lúc build).
- Proxy `/api/v1` (`src/proxy.ts`) lấy IP khách từ header trong `CLIENT_IP_HEADER`. Sau Cloudflare phải đặt
  `cf-connecting-ip`: Cloudflare chỉ nối thêm IP vào `x-forwarded-for` khách tự gửi, nên phần tử đầu giả được.

## API backend sử dụng

Không đổi. Proxy vẫn chuyển tiếp `/api/v1/*` như `docs/deploy-vercel.md`.

## Cấu hình cần thiết (biến môi trường)

Build arg (gắn vào image lúc build):

| Build arg                    | App    | Ghi chú                                                        |
| ---------------------------- | ------ | -------------------------------------------------------------- |
| `APP`                        | cả hai | Bắt buộc: `storefront` hoặc `admin`                            |
| `API_BASE_URL`               | cả hai | Backend gọi được **lúc build** (render trước trang tĩnh/ISR)   |
| `NEXT_PUBLIC_PUSHER_KEY`     | cả hai | Gắn vào JavaScript phía trình duyệt; để trống thì tắt realtime |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | cả hai |                                                                |
| `NEXT_PUBLIC_STOREFRONT_URL` | admin  | Gốc URL storefront cho nút đăng nhập hộ khách                  |

Biến môi trường lúc chạy:

| Biến               | Ghi chú                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `API_BASE_URL`     | Gốc URL backend, không có `/api/v1`. Cùng máy chủ: `http://api:8080` (mạng compose)           |
| `PROXY_SECRET`     | Trùng `TrustedProxy:Secret` của backend                                                       |
| `CLIENT_IP_HEADER` | Header chứa IP khách. Trống là `x-forwarded-for` (Vercel); sau Cloudflare: `cf-connecting-ip` |
| `PORT`, `HOSTNAME` | Image đặt sẵn `3000`, `0.0.0.0`                                                               |

Build tay để thử (backend chạy ở `localhost:5279`):

```bash
docker build --network host --build-arg APP=storefront --build-arg API_BASE_URL=http://localhost:5279 \
  -t sachluat-storefront .
docker run --rm --network host -e API_BASE_URL=http://localhost:5279 sachluat-storefront
```

## Hạn chế / việc còn lại

- Thêm package mới trong `packages/` thì thêm dòng `COPY packages/<ten>/package.json` vào `Dockerfile`, nếu không
  `pnpm install --frozen-lockfile` lỗi vì thiếu workspace.
- Cache ISR nằm trong container (`.next/cache`), mất khi thay container; trang được render lại ở request đầu tiên.
- Không có preview deploy theo PR như Vercel.
