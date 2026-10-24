// Route backend đã chạy nhưng chưa có trong `openapi/v1.json` (chưa sinh lại được vì OpenAPI chỉ bật ở Development).
// Response để `unknown`, nơi gọi parse bằng Zod theo docs. Sau khi `pnpm api:fetch && pnpm api:generate` có route
// này thì xóa khai báo tương ứng ở đây.

type NoParameters = { query?: never; header?: never; path?: never; cookie?: never };
type UnknownJson = { headers: { [name: string]: unknown }; content: { "application/json": unknown } };
type NoContent = { headers: { [name: string]: unknown }; content?: never };

/** Route chờ sinh type từ OpenAPI, gộp vào `paths` của client. */
export interface PendingPaths {
  /** Popup quảng cáo đang chạy (docs/features/popup.md): 200 `PopupResponse` hoặc 204. */
  "/api/v1/popups/active": {
    parameters: NoParameters;
    get: { parameters: NoParameters; requestBody?: never; responses: { 200: UnknownJson; 204: NoContent } };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
