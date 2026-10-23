import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { defaultExportAllowed, sharedRules } from "./rules.js";

/**
 * Cấu hình ESLint cho package trong `packages/*`. Dùng lại preset của Next để có sẵn rule React Hooks,
 * jsx-a11y, import, TypeScript giống hệt các app.
 */
export const libraryConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Package không cài React (utils, api-client) thì "detect" báo warning; khai báo cố định theo major đang dùng.
    settings: { react: { version: "19.3" } },
    rules: { ...sharedRules, "@next/next/no-html-link-for-pages": "off" },
  },
  { files: defaultExportAllowed, rules: { "import/no-default-export": "off" } },
  globalIgnores(["dist/**", "coverage/**", "src/generated/**"]),
]);
