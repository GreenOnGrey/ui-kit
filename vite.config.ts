import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The library: three entries with components and one with the strings. The styles
// are built apart (scripts/build-css.mjs): components do not import CSS, a product
// links styles.css itself (FTR.NAB.CMN-0005 tech §3.1).
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    lib: {
      entry: { index: "src/index.ts", chat: "src/chat/index.ts", login: "src/login/index.ts", locales: "src/locales/index.ts" },
      formats: ["es"],
    },
    rollupOptions: { external: [/^react($|\/)/, /^react-dom($|\/)/, "i18next", "react-i18next"] },
  },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}", "bin/**/*.test.ts"] },
});
