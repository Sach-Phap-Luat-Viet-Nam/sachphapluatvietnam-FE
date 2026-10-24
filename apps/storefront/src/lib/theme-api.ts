import { browserApi } from "@slvn/auth";
import { unwrap } from "@slvn/api-client";
import type { Theme } from "./theme";

/** Lưu giao diện vào tài khoản để nhớ giữa các thiết bị (`PUT /me/preferences`). */
export async function saveThemePreference(theme: Theme): Promise<void> {
  // OpenAPI mô tả enum là số trong khi JSON thật là chuỗi `dark`/`light` (như `displayFrequency` ở admin).
  await unwrap(browserApi().PUT("/api/v1/me/preferences", { body: { theme: theme as unknown as number } }));
}
