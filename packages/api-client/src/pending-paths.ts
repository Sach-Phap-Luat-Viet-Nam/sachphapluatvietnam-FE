// Route backend đã chạy nhưng chưa có trong `openapi/v1.json` (chưa sinh lại được vì OpenAPI chỉ bật ở Development).
// Khai báo tạm ở đây với response `unknown`, nơi gọi parse bằng Zod theo docs. Sau khi
// `pnpm api:fetch && pnpm api:generate` có route này thì xóa khai báo tương ứng. Hiện mọi route đã có trong OpenAPI.

/** Route chờ sinh type từ OpenAPI, gộp vào `paths` của client. */
export type PendingPaths = Record<never, never>;
