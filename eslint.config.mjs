import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Foto privat Supabase memakai signed URL yang kedaluwarsa; <img> dipakai
      // dengan sengaja. Pengecualian ada di 6 titik yang diberi eslint-disable
      // dengan alasan spesifik; semua pemakaian lain wajib lolos rule ini.
      "@next/next/no-img-element": "error",
      // Sel autosave/konflik offline memakai lazy initializer/dispatch event;
      // rule ini sudah kembali ke "error" sejak refactor 12 Nov 2026.
      "react-hooks/set-state-in-effect": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated and non-source files:
    "node_modules/**",
    "package-lock.json",
    "supabase/**",
  ]),
]);

export default eslintConfig;
