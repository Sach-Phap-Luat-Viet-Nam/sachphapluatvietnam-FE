// Route backend đã chạy nhưng chưa có trong `openapi/v1.json` (chưa sinh lại được vì OpenAPI chỉ bật ở Development).
// Response để `unknown`, nơi gọi parse bằng Zod theo docs. Sau khi `pnpm api:fetch && pnpm api:generate` có route
// này thì xóa khai báo tương ứng ở đây.

type NoParameters = { query?: never; header?: never; path?: never; cookie?: never };
type IdParameters = { query?: never; header?: never; path: { id: number }; cookie?: never };
type PageParameters = {
  query?: { page?: number; limit?: number };
  header?: never;
  path?: never;
  cookie?: never;
};
type UnknownJson = { headers: { [name: string]: unknown }; content: { "application/json": unknown } };
type NoContent = { headers: { [name: string]: unknown }; content?: never };
type JsonBody = { content: { "application/json": unknown } };

type Operation<Parameters, Responses> = { parameters: Parameters; requestBody?: never; responses: Responses };
type OperationWithBody<Parameters, Responses> = { parameters: Parameters; requestBody: JsonBody; responses: Responses };

type NoMethods = {
  get?: never;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

/** Một route của `paths`: method khai báo trong `Methods`, các method còn lại là `never`. */
type PathItem<Parameters, Methods> = { parameters: Parameters } & Omit<NoMethods, keyof Methods> & Methods;

/** Chữ ký upload ảnh lên Cloudinary (docs/features/catalog.md, mục Ảnh bìa). */
type UploadSignaturePath = PathItem<NoParameters, { post: Operation<NoParameters, { 200: UnknownJson }> }>;

/** Route chờ sinh type từ OpenAPI, gộp vào `paths` của client. */
export interface PendingPaths {
  /** Popup quảng cáo đang chạy (docs/features/popup.md): 200 `PopupResponse` hoặc 204. */
  "/api/v1/popups/active": PathItem<
    NoParameters,
    { get: Operation<NoParameters, { 200: UnknownJson; 204: NoContent }> }
  >;
  /** Danh sách popup (`AdminPopupResponse`, phân trang) và tạo popup (`UpsertPopupRequest`). */
  "/api/v1/admin/popups": PathItem<
    NoParameters,
    {
      get: Operation<PageParameters, { 200: UnknownJson }>;
      post: OperationWithBody<NoParameters, { 201: UnknownJson }>;
    }
  >;
  /** Xem, sửa, xóa mềm một popup. */
  "/api/v1/admin/popups/{id}": PathItem<
    NoParameters,
    {
      get: Operation<IdParameters, { 200: UnknownJson }>;
      put: OperationWithBody<IdParameters, { 200: UnknownJson }>;
      delete: Operation<IdParameters, { 204: NoContent }>;
    }
  >;
  "/api/v1/admin/uploads/popup-signature": UploadSignaturePath;
  "/api/v1/admin/uploads/cover-signature": UploadSignaturePath;
}
