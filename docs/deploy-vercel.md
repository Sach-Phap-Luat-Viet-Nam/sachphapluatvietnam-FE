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

- Khai báo trong Vercel → Settings → Environment Variables cho Production và Preview, sau đó deploy lại.
- Local: copy `apps/storefront/.env.example` thành `apps/storefront/.env.local`. Chạy backend local thì đổi thành
  `http://localhost:5279`.
- Biến này không có tiền tố `NEXT_PUBLIC_`. Backend chưa bật CORS nên trình duyệt không gọi thẳng được; request từ
  trình duyệt sẽ đi qua proxy `rewrites` của Next.js, còn Server Component gọi trực tiếp tới URL này.
- Biến được đọc và kiểm tra ở `apps/storefront/src/lib/env.ts`. Thiếu biến hoặc sai định dạng URL thì build/render lỗi
  ngay, không chạy tiếp với giá trị rỗng.

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
