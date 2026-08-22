import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.d.ts", ".worktrees/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/src/**/*.{ts,tsx}", "packages/shared/src/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.es2022 } },
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["**/*.mjs", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.es2022 } },
  },
);
