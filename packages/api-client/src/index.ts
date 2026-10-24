import type { components } from "./generated/schema";

export { API_ERROR_CODES, ApiError, isApiError } from "./api-error";
export type { ApiErrorCode } from "./api-error";
export { createApiClient, unwrap } from "./client";
export type { ApiClient, CreateApiClientOptions } from "./client";
export type { CheckoutPreviewBody } from "./pending-paths";
export { backendProxyTarget } from "./proxy";
export type { BackendProxyOptions } from "./proxy";
export type { components, paths } from "./generated/schema";

/** Type của một schema trong OpenAPI, ví dụ `Schema<"BookSummaryResponse">`. */
export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];
