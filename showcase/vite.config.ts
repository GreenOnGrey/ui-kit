import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// styles.css beside the showcase: the address the mockups of specifications link
// (arch §6) and the stylesheet of static.html, the page without scripts.
const kitStyles = (): Plugin => ({
  name: "kit-styles",
  closeBundle() {
    const dist = path.resolve(import.meta.dirname, "../dist/styles.css");
    if (!fs.existsSync(dist)) throw new Error("dist/styles.css is missing: run `npm run build` before the showcase");
    fs.copyFileSync(dist, path.resolve(import.meta.dirname, "../dist-showcase/styles.css"));
  },
});

// The showcase is built from the sources of the kit, not from the package: what
// it shows is what the next release ships (FTR.NAB.CMN-0005 tech §3.7). The
// relative base lets one build live in /vX.Y.Z/ of GitHub Pages.
export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  plugins: [react(), kitStyles()],
  server: { port: 5180 },
  build: { outDir: "../dist-showcase", emptyOutDir: true },
});
