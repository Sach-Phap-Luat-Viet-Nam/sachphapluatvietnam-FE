/** Rule dùng chung cho cả app Next.js và package thư viện (xem CLAUDE.md mục 3, 4). */
export const sharedRules = {
  "no-console": ["error", { allow: ["warn", "error"] }],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
  "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
  "import/no-default-export": "error",
};

/** File mà Next.js / công cụ bắt buộc export default. */
export const defaultExportAllowed = [
  "**/app/**/{page,layout,loading,error,global-error,not-found,template,default,sitemap,robots,manifest,icon,opengraph-image}.tsx",
  "**/app/**/{sitemap,robots,manifest}.ts",
  "**/*.config.{js,mjs,ts,mts}",
  "**/eslint.config.js",
];
