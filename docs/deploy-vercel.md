# Deploy storefront lên Vercel

## Cấu hình project

Project Vercel của website khách hàng sử dụng các giá trị sau:

| Thiết lập                                                  | Giá trị                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Root Directory                                             | `apps/storefront`                                                                     |
| Framework Preset                                           | Next.js                                                                               |
| Include files outside the root directory in the Build Step | Bật, để dùng `packages/*`                                                             |
| Build Command                                              | Được ghim trong `apps/storefront/vercel.json`: `pnpm --filter @slvn/storefront build` |
| Output Directory                                           | Mặc định của Next.js; tắt Override                                                    |
| Install Command                                            | Mặc định theo pnpm workspace                                                          |

Root Directory là thiết lập trên dashboard, không được đặt qua `vercel.json`.
Lưu cả phần Framework Settings và Root Directory trước khi deploy lại.
Deploy commit mới nhất có bản sửa; redeploy commit cũ không lấy thay đổi source mới.

## Biến môi trường

| Biến           | Giá trị                                    | Ghi chú                                                           |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `API_BASE_URL` | `https://sachphapluatvietnam.onrender.com` | Gốc URL backend, không có `/api/v1`. Chỉ dùng phía server Next.js |
| `PROXY_SECRET` | Secret do backend cấp (không ghi vào repo) | Giống hệt giá trị cấu hình trên Render. Local để trống            |

- Khai báo trong Vercel → Settings → Environment Variables cho Production và Preview, sau đó deploy lại.
- Local: copy `apps/storefront/.env.example` thành `apps/storefront/.env.local`. Chạy backend local thì đổi thành
  `http://localhost:5279`.
- Hai biến đều không có tiền tố `NEXT_PUBLIC_`. `API_BASE_URL` được đọc và kiểm tra ở `apps/storefront/src/lib/env.ts`;
  thiếu biến hoặc sai định dạng URL thì build/render lỗi ngay.

## Proxy `/api/v1`

Backend chưa bật CORS nên trình duyệt không gọi thẳng được. Server Component gọi trực tiếp `API_BASE_URL`; còn request
từ trình duyệt gọi `/api/v1/*` trên chính domain storefront, được `apps/storefront/src/proxy.ts` (file convention
`proxy` của Next.js 16, trước đây là `middleware`) chuyển tiếp sang backend, giữ nguyên method, body, query và cookie.

- Proxy xóa `x-client-ip`, `x-proxy-secret` do trình duyệt gửi, rồi gắn lại từ `x-forwarded-for` (Vercel ghi đè header
  này bằng IP thật của khách) cùng `PROXY_SECRET`. Backend chỉ tin `x-client-ip` khi secret khớp, nhờ đó giới hạn
  10 request/phút/IP của `/auth/*` và `/orders/lookup` tính theo từng khách, không theo IP của Vercel.
- Thiếu `PROXY_SECRET` thì proxy không gắn hai header, backend dùng IP kết nối (là IP của Vercel khi deploy).
- Cookie HttpOnly của backend (`sl_refresh`, `sl_cart`) được đặt trên domain storefront. Backend không được đặt thuộc
  tính `Domain` cho cookie, nếu không trình duyệt sẽ bỏ cookie.

## Lỗi admin làm dừng deploy storefront

Log ngày 23/10/2026 cho thấy Vercel gọi script build tại repo root, script này từng build cả hai app.
`apps/admin` chưa có `app` hoặc `pages`, nên clean build trả lỗi:

```text
Couldn't find any `pages` or `app` directory. Please create one under the project root
```

Storefront sau đó bị hủy bằng SIGKILL do pnpm dừng cả nhóm build, không phải lỗi compile của storefront.
Script `pnpm build` tại repo root hiện chỉ build `@slvn/storefront` cho đến khi admin được triển khai.
Khi có admin, cấu hình một project Vercel riêng với Root Directory tương ứng và kiểm tra lại script build toàn repo.

## Kiểm tra deployment

1. Build Logs phải chạy `@slvn/storefront`, không còn `apps/admin build`.
2. Route output có `/`, `/sach`, `/dang-nhap`.
3. Deployment mới nhất có trạng thái Ready và được gán domain production.
4. `/` chuyển đến `/sach`; `/sach` và `/dang-nhap` trả HTTP 200.

Build local chỉ xác nhận source build được; không xác nhận dashboard hay domain đã được cập nhật.
