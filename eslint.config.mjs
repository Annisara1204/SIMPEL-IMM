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
      // Baseline hutang yang diketahui; dikembalikan ke "error" setelah fase
      // refactor tipe dan pemakaian <img> untuk foto privat selesai.
      // (`no-explicit-any` sudah kembali ke aturan default = error sejak
      // refactor tipe 12 Nov 2026.)
      // Foto privat Supabase memakai signed URL yang kedaluwarsa; <img> dipakai
      // dengan sengaja. Tinjau lagi bila optimasi gambar ditambahkan.
      "@next/next/no-img-element": "warn",
      // Sel autosave/konflik offline memakai pola setState di dalam effect yang
      // masih fungsional. Refactor ke pola lazy/event yang lolos rule ini
      // dilakukan pada fase refactor komponen, dengan uji browser, lalu rule
      // dikembalikan ke "error".
      "react-hooks/set-state-in-effect": "warn",
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
