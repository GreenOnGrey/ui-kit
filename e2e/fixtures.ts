import { test as base, expect, type Locator, type Page } from "@playwright/test";

// The pages of the showcase for tests: web fonts are not loaded, so a snapshot
// does not depend on a font server.
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await run(page);
  },
});
export { expect };

/** A demo of the showcase by its name (`data-demo`), not by its place on the page. */
export const demo = (section: Locator, name: string) => section.locator(`[data-demo="${name}"]`);

/** One section of the showcase without its header and contents. */
export async function openSection(page: Page, id: string, theme: "light" | "dark" = "light") {
  await page.goto(`/?embed=1&theme=${theme}#${id}`);
  const section = page.locator(`#${id}`);
  await expect(section).toBeVisible();
  return section;
}

/** Sends what the composer holds as its user does: Enter on a computer; its button on a touch screen, where Enter
 * breaks the line (FTR.NAB.CHAT-0001 design §3.1, INP-01). */
export async function send(input: Locator) {
  const touch = await input.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches);
  if (!touch) return input.press("Enter");
  await input.locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' composer ')][1]")
    .getByRole("button", { name: "Отправить", exact: true }).click();
}
