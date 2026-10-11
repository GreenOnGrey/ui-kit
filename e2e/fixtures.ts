import { test as base, expect, type Page } from "@playwright/test";

// The pages of the showcase for tests: web fonts are not loaded, so a snapshot
// does not depend on a font server.
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await run(page);
  },
});
export { expect };

/** One section of the showcase without its header and contents. */
export async function openSection(page: Page, id: string, theme: "light" | "dark" = "light") {
  await page.goto(`/?embed=1&theme=${theme}#${id}`);
  const section = page.locator(`#${id}`);
  await expect(section).toBeVisible();
  return section;
}
