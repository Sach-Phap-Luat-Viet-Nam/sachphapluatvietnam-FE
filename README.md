# Sách Pháp Luật Việt Nam Frontend

Monorepo frontend cho hệ thống thương mại điện tử và quản trị nội dung của Sách Pháp Luật Việt Nam.

Dự án gồm hai ứng dụng chính:

- `apps/storefront`: giao diện khách hàng, tìm kiếm, xem chi tiết sách, giỏ hàng, thanh toán, đăng nhập
- `apps/admin`: giao diện quản trị nội dung và vận hành cho nhân viên/quản trị viên
- `packages/*`: shared libraries dùng chung cho cả hai ứng dụng

## Công nghệ sử dụng

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- pnpm workspace
- Vitest + Testing Library cho unit test
- Playwright cho test E2E

## Cấu trúc repo

```text
.
├── apps/
│   ├── admin/
│   │   ├── src/
│   │   ├── e2e/
│   │   ├── package.json
│   │   └── next.config.ts
│   └── storefront/
│       ├── src/
│       ├── e2e/
│       ├── package.json
│       └── next.config.ts
├── packages/
│   ├── api-client/
│   ├── auth/
│   ├── config/
│   ├── ui/
│   └── utils/
├── docs/
│   ├── api_reference.md
│   ├── deploy-vercel.md
│   └── features/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vitest.config.ts
├── vitest.setup.ts
├── README.md
└── SKILL.md
```

## Yêu cầu môi trường

- Node.js >= 24.11.0
- pnpm 12.15.0 (được định nghĩa trong `package.json`)
- Một backend API đang chạy để các app có dữ liệu thực

## Cài đặt

```bash
pnpm install
```

Nếu repo đang dùng `corepack`, bạn có thể chạy:

```bash
corepack enable
pnpm install
```

## Chạy ứng dụng ở local

### 1) Khởi động tất cả app cùng lúc

```bash
pnpm dev
```

Mặc định script này sẽ chạy các app trong workspace theo tiến trình song song. APL hiện tại:

- store front: http://localhost:3000
- admin: http://localhost:3001

### 2) Chạy riêng từng app

```bash
pnpm --filter @slvn/storefront dev
pnpm --filter @slvn/admin dev
```

## Build

```bash
pnpm build
```

## Kiểm tra code

### Lint

```bash
pnpm lint
```

### Type check

```bash
pnpm typecheck
```

### Unit test

```bash
pnpm test
```

### E2E test

```bash
pnpm test:e2e
```

Hoặc chạy riêng từng app:

```bash
pnpm --filter @slvn/storefront test:e2e
pnpm --filter @slvn/admin test:e2e
```

## Cấu hình môi trường

Các app có file `.env.example` tương ứng. Ví dụ với storefront:

```bash
cp apps/storefront/.env.example apps/storefront/.env.local
```

Nội dung cốt lõi cần thiết là:

```env
API_BASE_URL=https://sachphapluatvietnam.onrender.com
PROXY_SECRET=
```

Lưu ý:

- `API_BASE_URL` là URL gốc của backend, không bao gồm `/api/v1`
- `PROXY_SECRET` dùng cho header proxy nếu cần thiết
- Nếu chạy local backend, thường sẽ là địa chỉ như `http://localhost:5279`

## Tài liệu liên quan

Tất cả tài liệu nghiệp vụ và thiết kế được lưu trong thư mục `docs/`:

- `docs/api_reference.md`: tham chiếu API
- `docs/deploy-vercel.md`: triển khai lên Vercel
- `docs/features/`: mô tả chi tiết tính năng theo từng module như home, catalog, cart, auth, ordering, admin shell, popup, v.v.

## Quy trình phát triển

- Chạy app bằng `pnpm dev` hoặc `pnpm --filter ... dev`
- Viết code theo cấu trúc module và shared package đã định nghĩa
- Chạy `pnpm typecheck` và `pnpm test` trước khi mở PR
- Với thay đổi UI/flow quan trọng, kiểm tra lại Playwright E2E tương ứng

## Lưu ý quan trọng

- Repo là monorepo với workspace được quản lý bằng pnpm
- Dự án cần có backend API đồng bộ để render dữ liệu thật
- App storefront và admin có thể chạy song song trên hai cổng khác nhau như đã nêu

## Liên kết nhanh

- Storefront: `apps/storefront`
- Admin: `apps/admin`
- Shared packages: `packages/`
- Tài liệu nghiệp vụ: `docs/`

## License

Dự án hiện chưa khai báo license cụ thể trong repo. Nếu cần, hãy bổ sung file `LICENSE` phù hợp với quy định của team hoặc tổ chức sở hữu dự án.
