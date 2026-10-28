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
- Header lấy IP chọn bằng `CLIENT_IP_HEADER` (trống là `x-forwarded-for`). Tự host sau Cloudflare đặt
  `cf-connecting-ip`, xem `docs/deploy-self-host.md`.
- Cookie HttpOnly của backend (`sl_refresh`, `sl_cart`) được đặt trên domain storefront. Backend không được đặt thuộc
  tính `Domain` cho cookie, nếu không trình duyệt sẽ bỏ cookie.

## Deploy admin (project Vercel riêng)

Admin là một project Vercel **riêng**, import cùng repo này. Cấu hình giống storefront, chỉ khác Root Directory:

| Thiết lập                                                  | Giá trị                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Root Directory                                             | `apps/admin`                                                                |
| Framework Preset                                           | Next.js                                                                     |
| Include files outside the root directory in the Build Step | Bật, để dùng `packages/*`                                                   |
| Build Command                                              | Được ghim trong `apps/admin/vercel.json`: `pnpm --filter @slvn/admin build` |
| Biến môi trường                                            | `API_BASE_URL`, `PROXY_SECRET` giống storefront (`apps/admin/.env.example`) |

Các bước: Vercel → **Add New → Project** → chọn repo → đặt Root Directory `apps/admin` → khai báo 2 biến → Deploy.

### Gắn domain / subdomain

- Chưa có tên miền riêng: đổi tên project (Settings → General) để có địa chỉ dạng `<ten-project>.vercel.app`, ví dụ
  `sachphapluatvietnam-admin.vercel.app`.
- Có tên miền riêng: vào project admin → **Domains** → thêm `admin.<ten-mien>`, rồi tạo bản ghi **CNAME** `admin` ở nhà
  cung cấp DNS với đúng giá trị Vercel hiển thị. SSL do Vercel tự cấp.
- Cookie `sl_refresh` là host-only nên phiên admin và storefront tách riêng theo domain. `vercel.app` nằm trong Public
  Suffix List nên hai project `*.vercel.app` cũng không dùng chung cookie.

### Ghi chú lịch sử: lỗi admin làm dừng deploy storefront

Log ngày 23/10/2026: Vercel gọi script build ở repo root, lúc đó build cả hai app trong khi `apps/admin` chưa có `app/`
(`Couldn't find any pages or app directory`), pnpm dừng cả nhóm nên storefront bị SIGKILL. Từ đó mỗi project ghim
Build Command trong `vercel.json` của app mình. Script `pnpm build` ở root nay build cả hai app (admin đã có trang).

## Kiểm tra deployment

1. Build Logs của từng project chỉ chạy đúng app của project đó (`@slvn/storefront` hoặc `@slvn/admin`).
2. Route output có `/`, `/sach`, `/dang-nhap`.
3. Deployment mới nhất có trạng thái Ready và được gán domain production.
4. Storefront: `/` chuyển đến `/sach`; `/sach` và `/dang-nhap` trả HTTP 200.
5. Admin: `/dang-nhap` và `/robots.txt` trả HTTP 200; mở `/` khi chưa đăng nhập thì chuyển về `/dang-nhap`.

Build local chỉ xác nhận source build được; không xác nhận dashboard hay domain đã được cập nhật.
