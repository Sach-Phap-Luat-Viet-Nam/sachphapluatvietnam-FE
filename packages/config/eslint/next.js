import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { defaultExportAllowed, sharedRules } from "./rules.js";

/** Cấu hình ESLint cho app Next.js trong `apps/*`. */
export const nextConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: sharedRules },
  { files: defaultExportAllowed, rules: { "import/no-default-export": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
