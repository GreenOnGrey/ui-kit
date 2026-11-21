import { defineConfig, devices } from "@playwright/test";

// The behaviour of the components and the snapshots of the showcase
// (FTR.NAB.CMN-0005 qa §1). The snapshots are compared with zero tolerance; their
// baselines are made in CI (update-snapshots.yml), never on a developer machine.
// A fake microphone: the recording of the chat works without a device and a prompt.
// Repeatable rendering: without the last two flags a page differs from itself by
// 1–25 pixels on a few shots of every run — gradients, pictures and icons under
// a translucent layer — and a zero tolerance cannot hold (FTR.NAB.CMN-0005 qa, decision 12).
const microphone = {
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-partial-raster", "--disable-skia-runtime-opts"] },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A run of the suite on a shared runner is not free of races: a picture or a layout of the showcase can arrive
  // between the check and the screenshot of a section, and the same commit then passes on one run and fails on
  // another (FTR.NAB.CMN-0005 qa §1, decision 14). A retry hides that noise; a real change of the look fails twice.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}-{projectName}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixels: 0, animations: "disabled", caret: "hide" } },
  use: { baseURL: "http://localhost:5181", locale: "ru-RU", timezoneId: "Europe/Moscow" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, ...microphone } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, ...microphone } },
  ],
  webServer: {
    command: "npm run build:showcase && npx vite preview --config showcase/vite.config.ts --port 5181 --strictPort",
    url: "http://localhost:5181",
    reuseExistingServer: !process.env.CI,
  },
});
