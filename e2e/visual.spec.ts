import { SECTIONS } from "../showcase/sections";
import { expect, openSection, test } from "./fixtures";

// KIT-02, CMP-10: every section of the showcase in both themes, at the width of
// a desktop and of a phone (the projects). A changed snapshot is a visible
// change: it needs an entry in CHANGELOG.md and at least a minor version (R24).
// the list is the one of the showcase: a new section gets its snapshot by itself
for (const theme of ["light", "dark"] as const) {
  for (const [id] of SECTIONS) {
    test(`${id} ${theme}`, async ({ page }) => {
      const section = await openSection(page, id, theme);
      await expect(section).toHaveScreenshot(`${id}-${theme}.png`);
    });
  }

  // what a section shows only after a click
  test(`open menu ${theme}`, async ({ page }) => {
    const s = await openSection(page, "overlay", theme);
    await s.getByRole("button", { name: "Открыть меню" }).click();
    await expect(page.locator(".menu")).toHaveScreenshot(`menu-${theme}.png`);
  });

  for (const [name, button] of [["modal", "Открыть окно"], ["modal-wide", "Открыть широкое окно"]]) {
    test(`${name} ${theme}`, async ({ page }) => {
      const s = await openSection(page, "overlay", theme);
      await s.getByRole("button", { name: button, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
    });
  }

  // FTR.NAB.CHAT-0001 R34: the preview of a file sent by the agent (PDF is left out: its viewer is the browser's)
  // the drawn Markdown shifts the headings by two levels: «#» is <h3>
  for (const [name, file, ready] of [["preview-markdown", "release-notes.md", ".att-md :is(h1, h2, h3, h4, h5, h6)"], ["preview-table", "metrics.csv", "table"]]) {
    test(`${name} ${theme}`, async ({ page }) => {
      const s = await openSection(page, "chat", theme);
      await s.locator('[data-demo="files"]').getByRole("button", { name: `Открыть ${file}` }).click();
      await expect(page.getByRole("dialog").locator(ready).first()).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
    });
  }

  test(`shown toasts ${theme}`, async ({ page }) => {
    const s = await openSection(page, "toasts", theme);
    for (const button of ["Успех", "Ошибка", "С действиями"]) await s.getByRole("button", { name: button, exact: true }).click();
    await expect(page.locator(".toast")).toHaveCount(3);
    await expect(page.locator(".toast-wrap")).toHaveScreenshot(`shown-toasts-${theme}.png`);
  });
}

for (const view of ["login-nabu", "login-hammurapi"]) {
  test(`${view}`, async ({ page }) => {
    await page.goto(`/?view=${view}`);
    await expect(page.locator(".login .box")).toBeVisible();
    await expect(page).toHaveScreenshot(`${view}.png`);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`KIT-03 the styles work without scripts, ${theme}`, async ({ page }) => {
    await page.goto("/static.html");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await expect(page.locator("body")).toHaveScreenshot(`static-${theme}.png`);
  });
}
