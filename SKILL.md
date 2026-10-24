# CLAUDE.md

## 0. Tổng quan dự án

- **Dự án**: Website thương mại điện tử bán trực tiếp (D2C) sách pháp luật do Sách Luật Việt Nam
  tự biên soạn và in (mã `SLVN-WEB`). Đặc tả đầy đủ: `docs/project_overview.md`.
- **Repo này**: **Frontend**, gồm 2 app trong một monorepo:
  - `storefront`: trang khách hàng, **SSR/SSG để làm SEO** (NFR-30..32), mobile-first.
  - `admin`: trang quản trị (Admin CMS), chỉ dành cho nhân viên, bắt buộc đăng nhập.
- **Backend**: repo riêng, ASP.NET Core .NET 10. FE chỉ giao tiếp qua HTTP API (mục 6).

### Công nghệ và phiên bản

Chọn bản **LTS / ổn định mới nhất**, kiểm tra ngày **23/10/2026**. Ghim **major** trong `package.json`,
bản patch cụ thể do `pnpm-lock.yaml` quyết định.

| Hạng mục              | Lựa chọn                                    | Major      | Ghi chú                                                                                                              |
| --------------------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Runtime               | Node.js                                     | **24 LTS** | Ghim trong `.nvmrc` và `engines`. Node 26 lên LTS cuối 10/2026, sẽ nâng sau                                          |
| Package manager       | pnpm (workspace)                            | 12         | Ghim qua field `packageManager`                                                                                      |
| Framework             | Next.js (App Router)                        | **16**     | 16.x là **Active LTS** theo support policy của Next.js                                                               |
| UI library            | React                                       | 19         | Theo bản Next.js hỗ trợ                                                                                              |
| Ngôn ngữ              | TypeScript                                  | **6.0**    | **Chưa lên 7.0**: `typescript-eslint` 8.x mới hỗ trợ `<6.1`                                                          |
| CSS                   | Tailwind CSS                                | 4          | Cấu hình kiểu CSS-first (`@theme` trong file CSS)                                                                    |
| Lint                  | ESLint (flat config) + `eslint-config-next` | **9** / 16 | **Chưa lên 10**: `eslint-plugin-react`, `-import`, `-jsx-a11y` (đi kèm `eslint-config-next`) mới hỗ trợ tới ESLint 9 |
| Format                | Prettier + `prettier-plugin-tailwindcss`    | 3          | Tự sắp xếp class Tailwind                                                                                            |
| Gọi API               | `openapi-typescript` + `openapi-fetch`      | 7 / 0.x    | Type sinh từ OpenAPI của backend                                                                                     |
| Server state (client) | TanStack Query                              | 5          | Chủ yếu dùng ở `admin`                                                                                               |
| Form + validate       | React Hook Form + Zod                       | 7 / 4      | Schema Zod dùng chung cho form và env                                                                                |
| Unit/component test   | Vitest + Testing Library + MSW              | 5 / 16 / 3 | Thay cho Jest ghi trong đặc tả mục 14.1                                                                              |
| E2E test              | Playwright                                  | 1.x        | Luồng chính: tìm sách, giỏ, đặt hàng, đăng nhập admin                                                                |

- Khi nâng major của một thư viện: kiểm tra peer dependency trước (ví dụ TypeScript 7 và `typescript-eslint`),
  nêu rõ lý do và cập nhật bảng trên.

### Cấu trúc thư mục

```
apps/
  storefront/                 # Next.js, cổng 3000
    src/
      app/                    # App Router: route, layout, metadata, sitemap.ts, robots.ts
      features/<ten>/         # Theo tính năng: components/, hooks/, api.ts, schemas.ts
      components/             # Component dùng chung trong app
      lib/                    # env.ts, helper riêng của app
    e2e/                      # Playwright
  admin/                      # Next.js, cổng 3001, cấu trúc giống storefront
packages/
  api-client/                 # Client openapi-fetch, type sinh tự động (src/generated/), xử lý ProblemDetails
  auth/                       # Phiên đăng nhập phía trình duyệt, login/2FA, thông báo lỗi auth (dùng chung 2 app)
  ui/                         # Component giao diện dùng chung, theme Tailwind (màu, font)
  utils/                      # Hàm thuần: định dạng tiền VNĐ, ngày giờ, slug, ...
  config/                     # tsconfig, eslint, prettier dùng chung
docs/
  setup.md
  features/                   # Mỗi tính năng một file .md (mục 9)
```

- Tên package nội bộ: `@slvn/<ten>` (ví dụ `@slvn/api-client`, `@slvn/ui`).
- `apps/*` được import `packages/*`; **không** import chéo giữa `storefront` và `admin`.
  Code cần dùng chung thì chuyển vào `packages/`.
- Trong một app, `features/<a>` không import nội bộ của `features/<b>`; dùng chung thì đưa lên
  `components/` hoặc `packages/`.

### Lệnh thường dùng

> Các script dưới đây là quy ước, sẽ khai báo trong `package.json` khi dựng repo. Nếu script chưa tồn tại thì
> báo lại, không tự đoán lệnh khác.

```bash
nvm use                                 # Node 24 theo .nvmrc
pnpm install
pnpm dev                                # chạy tất cả app
pnpm --filter storefront dev            # chỉ chạy storefront
pnpm --filter admin dev
pnpm api:generate                       # sinh type từ OpenAPI của backend vào packages/api-client
pnpm lint
pnpm typecheck
pnpm test                               # Vitest
pnpm test:e2e                           # Playwright
pnpm format                             # Prettier ghi đè
pnpm format:check
pnpm build
```

### Định nghĩa "xong việc"

Một thay đổi chỉ được báo là xong khi:

1. `pnpm typecheck` và `pnpm lint` không lỗi, không thêm warning mới.
2. `pnpm test` pass toàn bộ; luồng chính bị ảnh hưởng thì chạy thêm `pnpm test:e2e`.
3. `pnpm format:check` sạch.
4. `pnpm build` thành công với app bị ảnh hưởng.
5. Đã viết test cho logic mới và cập nhật `docs/` nếu là tính năng (mục 9).

---

## 1. Giao tiếp

- Gọi người dùng là **"Anh"**, tự xưng **"Em"**, lịch sự, tự nhiên.
- Câu trả lời đầu tiên của mỗi phiên: giới thiệu tên model **nếu biết chắc**;
  nếu không chắc thì nói rõ là không chắc, không tự đoán phiên bản.
- Trình bày ngắn gọn, dùng bullet và **in đậm** từ khóa quan trọng.
- Giữ nguyên văn tiếng Anh với error log, tên biến, tên API, tài liệu gốc.

## 2. Xử lý thông tin và ra quyết định

- **Không bịa**: không tự tạo component, hook, API endpoint, package npm, option cấu hình
  hay đường link không tồn tại. Không biết thì nói "Em không biết / Em chưa kiểm tra được".
  Endpoint và kiểu dữ liệu backend lấy từ OpenAPI / `docs/project_overview.md`, không tự đặt.
- **Khi thiếu thông tin**, phân theo mức ảnh hưởng:
  - **Ảnh hưởng lớn hoặc khó quay lại** (kiến trúc, cấu trúc route/URL đã public, cơ chế xác thực,
    xóa/ghi đè nhiều file, đổi cách gọi API): dừng lại, hỏi dạng trắc nghiệm A/B/C,
    mỗi lựa chọn kèm ưu/nhược điểm và đề xuất của Em.
  - **Việc nhỏ, dễ sửa lại**: chọn phương án hợp lý nhất, **ghi rõ giả định**
    trong câu trả lời rồi làm tiếp.
- **Trước khi thực hiện** thay đổi kiến trúc, xóa/ghi đè nhiều file, nâng major dependency:
  trình bày kế hoạch ngắn và chờ Anh đồng ý.
- **Debug**: đọc kỹ error log (terminal, console trình duyệt, Network), tìm nguyên nhân gốc rễ
  trước, rồi mới sửa. Nêu nguyên nhân trong 1–3 câu trước khi đưa ra cách sửa.
- Với việc nhiều bước: liệt kê các bước logic dạng gạch đầu dòng trước khi code.

## 3. Quy chuẩn code TypeScript / React

### Định dạng

- Tuân theo Prettier và ESLint của repo; chạy `pnpm format` sau khi sửa.
- Dòng tối đa **120 ký tự**.
- `tsconfig` bật `strict` và `noUncheckedIndexedAccess`.
- **Không** dùng `any`; dữ liệu chưa rõ kiểu dùng `unknown` rồi thu hẹp (narrow) hoặc parse bằng Zod.
- **Không** dùng `!` (non-null assertion) hay `as` để lấp lỗi type nếu chưa chắc giá trị đúng.
- **Không** dùng `// @ts-ignore`; bắt buộc thì dùng `// @ts-expect-error` kèm lý do.
- Dùng ES module, `import type` cho import chỉ có type. Không dùng `export default`, trừ file
  Next.js bắt buộc (`page.tsx`, `layout.tsx`, `error.tsx`, ...).

### Đặt tên

| Thành phần                | Quy tắc                                   | Ví dụ                             |
| ------------------------- | ----------------------------------------- | --------------------------------- |
| Component                 | PascalCase, file cùng tên                 | `BookCard` trong `BookCard.tsx`   |
| Hook                      | `use` + PascalCase                        | `useCart`, `useBookFilters`       |
| Biến, hàm, tham số        | camelCase                                 | `orderId`, `formatPrice`          |
| Type, interface           | PascalCase, **không** tiền tố `I`         | `BookSummary`, `CartItem`         |
| Props của component       | `<Component>Props`                        | `BookCardProps`                   |
| Hằng số module            | UPPER_SNAKE_CASE                          | `MAX_CART_QUANTITY`               |
| File không phải component | kebab-case                                | `format-price.ts`, `api-error.ts` |
| Thư mục route             | kebab-case, theo URL tiếng Việt không dấu | `app/sach/[slug]/page.tsx`        |
| Schema Zod                | camelCase + `Schema`                      | `checkoutFormSchema`              |

### Thiết kế React / Next.js

- **Server Component là mặc định.** Chỉ thêm `"use client"` khi cần state, effect, event handler
  hoặc API trình duyệt; đặt ở component lá, nhỏ nhất có thể.
- Code chỉ chạy phía server (gọi API có cookie, đọc biến môi trường bí mật) import `server-only`.
- **Storefront**: lấy dữ liệu trong Server Component qua `@slvn/api-client`, dùng cơ chế cache/revalidate
  của Next.js. Trang sách/danh mục phải có nội dung trong HTML trả về (không render trống rồi mới fetch).
- **Admin**: dữ liệu phía client dùng TanStack Query; mutation xong thì invalidate query liên quan.
- **Không** gọi `fetch` tới backend rải rác trong component; mọi lời gọi đi qua `@slvn/api-client`.
- **Form**: React Hook Form + Zod. Lỗi validation từ backend (`errors` trong ProblemDetails) map về
  đúng field của form.
- Component chỉ lo hiển thị; logic nghiệp vụ phía client (tính tạm tính, lọc, chuẩn hóa dữ liệu) để
  trong hàm thuần ở `features/<ten>/` hoặc `packages/utils` để dễ test.
- Không sao chép state từ props/server vào `useState` khi không cần; tránh `useEffect` để tính dữ liệu
  suy ra được trực tiếp khi render.
- Mỗi route có `loading.tsx` / `error.tsx` / `not-found.tsx` khi phù hợp.
- **Styling**: chỉ dùng Tailwind class; không dùng inline `style` trừ giá trị động. Màu, font, khoảng cách
  lấy từ theme ở `packages/ui` (đặc tả mục 8.3), không hardcode mã màu.
- **Ảnh**: dùng `next/image`, có `alt` mô tả, khai báo kích thước để tránh CLS. Ảnh bìa tỷ lệ 3:4.

### Quy tắc nghiệp vụ hiển thị

- **Tiền**: backend trả số nguyên VNĐ. Định dạng bằng hàm chung trong `packages/utils`
  (`Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`). **Không** tính giá cuối
  phía client để gửi lên; giá, khuyến mãi, phí ship luôn lấy từ backend.
- **Ngày giờ**: hiển thị theo múi giờ `Asia/Ho_Chi_Minh`.
- **Đặt hàng / thanh toán**: gửi header `Idempotency-Key` (đặc tả mục 11.1); chặn bấm gửi nhiều lần.
- Chuỗi hiển thị là tiếng Việt, nhưng gom vào một chỗ theo tính năng để sau này có thể làm i18n (NFR-60).

### SEO và hiệu năng (storefront)

- URL theo NFR-30: `/sach/<slug>`, `/danh-muc/<slug>`. Không đổi URL đã public khi chưa có redirect 301.
- Mỗi trang có `generateMetadata` (title, description, canonical, Open Graph).
- Trang sách có JSON-LD schema.org `Book` / `Product` / `Offer` / `BreadcrumbList` (NFR-31).
- Có `sitemap.ts`, `robots.ts` sinh tự động.
- Mục tiêu Core Web Vitals trên mobile 4G: **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** (NFR-01, 02).
  Hạn chế `"use client"` ở cấp cao và thư viện nặng phía client.

### Khả năng truy cập (NFR-42, WCAG 2.1 AA)

- Dùng thẻ HTML đúng nghĩa (`button`, `a`, `nav`, `main`, `label`); không gắn `onClick` lên `div`.
- Điều hướng được bằng bàn phím, có focus hiển thị rõ; cỡ chữ nội dung tối thiểu 16px.
- Không tắt rule `jsx-a11y` nếu không có lý do ghi rõ.

### Comment

- Comment giải thích **tại sao** (edge case, workaround của thư viện, quyết định đặc biệt)
  được phép để trong code, ngắn gọn.
- Dùng JSDoc (`/** */`) cho hàm/component export từ `packages/*`.
- Mô tả **tính năng** (mục đích, cách dùng, luồng) không để trong code,
  mà viết vào `docs/` (mục 9).

### Khi trình bày code trong chat

- Chỉ đưa phần thay đổi, kèm tên file và vị trí. Không in lại cả file nếu chỉ
  sửa vài dòng, trừ khi Anh yêu cầu.
- (Khi sửa file trực tiếp trong repo thì không áp dụng quy tắc này.)

## 4. Logging và xử lý lỗi

- **Không commit** `console.log`; ESLint chặn `no-console` (cho phép `console.error` / `console.warn`
  ở tầng biên). Lỗi production gửi qua công cụ giám sát (Sentry, khi đã chốt).
- **Không log** password, token, OTP, số điện thoại, địa chỉ, dữ liệu cá nhân của khách.
- Lỗi từ backend luôn chuẩn hóa ở `@slvn/api-client` thành một kiểu lỗi chung (có `status`, `code`,
  `title`, `errors`, `traceId`). UI rẽ nhánh theo **`code`**, không theo chuỗi `title`.
- Hiển thị cho người dùng: dùng `title` tiếng Việt của backend, hoặc thông báo map theo `code`.
  **Không** hiện stack trace hay chi tiết kỹ thuật; lỗi 500 hiện thông báo chung kèm `traceId` để tra cứu.
- Bắt lỗi cụ thể; không nuốt lỗi bằng `catch {}` rỗng. Chỉ bắt lỗi chung ở **tầng biên**
  (`error.tsx`, `global-error.tsx`, error boundary, `onError` của TanStack Query).

## 5. Cấu hình, bảo mật và package

- **Không hardcode** URL backend, API key, token trong code. Dùng biến môi trường:
  - Local: `.env.local` (không commit). Khi thêm biến mới, cập nhật `.env.example` (giá trị giả).
  - Server: biến môi trường của nền tảng deploy / secret manager.
  - Đọc biến môi trường qua `lib/env.ts` (parse bằng Zod), không đọc `process.env` rải rác.
- Tiền tố `NEXT_PUBLIC_` sẽ lộ ra trình duyệt: **chỉ** dùng cho giá trị công khai, không bao giờ cho secret.
- **Xác thực**: theo đặc tả mục 11, access/refresh token nằm trong **cookie HttpOnly** do backend đặt.
  **Không** lưu token vào `localStorage` / `sessionStorage`. Chi tiết luồng đăng nhập chờ chốt với backend.
- **Không** dùng `dangerouslySetInnerHTML`, trừ JSON-LD (dữ liệu tự sinh qua `JSON.stringify`) hoặc nội dung
  bài viết đã được sanitize. Không ghép URL/HTML từ input người dùng.
- Script theo dõi (GA4, Pixel) chỉ chạy sau khi khách đồng ý cookie (đặc tả mục 13.3).
- Thêm package bằng `pnpm add <ten> --filter <app|package>`; nêu rõ package mới và lý do.
  Ưu tiên package chính thức, đang được bảo trì, kiểm tra license và dung lượng bundle.
  Luôn commit `pnpm-lock.yaml` cùng thay đổi.

## 6. Làm việc với backend API

- Tiền tố `api/v1` (khách hàng) và `api/v1/admin` (quản trị); phân trang `?page=&limit=`, trả `meta`.
- Lỗi theo **ProblemDetails (RFC 9457)** kèm `code` và `traceId`; danh sách mã lỗi ở đặc tả mục 16.2.
- Type của request/response **sinh tự động** từ OpenAPI của backend (`pnpm api:generate`,
  ở local là `/openapi/v1.json` của API). Không tự viết tay type trùng với type sinh ra.
- Backend chưa có endpoint cần dùng: **không** tự bịa endpoint. Mock bằng MSW trong test/dev, ghi rõ
  trong `docs/features/<ten>.md` mục "Hạn chế / việc còn lại", và báo Anh để thống nhất với backend.

## 7. Test

- **Vitest + Testing Library**: test hàm thuần (giá, định dạng, map lỗi) và component có logic.
  Test theo hành vi người dùng (`getByRole`, `userEvent`), không test chi tiết cài đặt.
- **MSW** để giả lập API; không gọi backend thật trong unit test.
- **Playwright** cho luồng chính; selector ưu tiên role/label, tránh selector CSS dễ vỡ.
- Mục tiêu bao phủ ≥ 70% phần nghiệp vụ (NFR-51).
- File test đặt cạnh file nguồn: `format-price.test.ts`, `BookCard.test.tsx`.

## 8. Git và vùng không được tự ý sửa

### Git

- **Không tự `commit` hoặc `push`** khi Anh chưa yêu cầu.
- Commit message theo Conventional Commits: `feat:`, `fix:`, `refactor:`,
  `docs:`, `test:`, `chore:`; có scope theo app/package khi cần (`feat(storefront): ...`).
- Không `force push`, không sửa lịch sử nhánh `main`.

### Không tự ý sửa

- File secret và cấu hình môi trường thật (`.env`, `.env.local`, `.env.production`).
- File sinh tự động: `packages/api-client/src/generated/`, `next-env.d.ts`; thư mục `.next/`,
  `node_modules/`, `coverage/`, `playwright-report/`. Muốn đổi type API thì chạy lại `pnpm api:generate`.
- `pnpm-lock.yaml` chỉ thay đổi qua lệnh `pnpm`, không sửa tay.
- Pipeline CI/CD, cấu hình dùng chung trong `packages/config` ngoài phạm vi việc đang làm
  (trừ khi cần và đã nêu rõ).

## 9. Tài liệu (docs)

- **Khi nào viết**: mỗi tính năng mới, hoặc thay đổi làm khác hành vi/màn hình/URL của
  tính năng cũ. Bug fix nhỏ không cần file riêng.
- **Vị trí và tên file**: `docs/features/<ten-tinh-nang>.md` (kebab-case,
  ví dụ `docs/features/checkout.md`). Sửa tính năng cũ thì cập nhật file có sẵn, không tạo file mới.
- **Template**:

```markdown
# <Tên tính năng>

## Mục đích

## Luồng xử lý (màn hình, route, app storefront/admin)

## API backend sử dụng (method, route, mã lỗi được xử lý)

## Cấu hình cần thiết (biến môi trường)

## Hạn chế / việc còn lại
```
