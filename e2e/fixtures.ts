import { test as base, expect, type JSHandle, type Locator, type Page } from "@playwright/test";

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
export async function openSection(page: Page, id: string, theme: "light" | "dark" = "light", lng: "en" | "ru" = "en") {
  await page.goto(`/?embed=1&theme=${theme}&lng=${lng}#${id}`);
  const section = page.locator(`#${id}`);
  await expect(section).toBeVisible();
  // a large graph is laid out in a worker: the section is ready when nothing in it is busy (FTR.NAB.MEM-0001 R24)
  await expect(section.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  // the pictures are decoded and the layout has settled: a picture that arrives after the snapshot made the same
  // commit pass on one machine and fail on another (FTR.NAB.CMN-0005 qa §1, decision 14). An attachment of the chat
  // comes from a promise of the product, so a second round waits for the pictures it brings.
  for (let round = 0; round < 2; round++) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = () => r(null); }))));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  }
  return section;
}

/** A drag of files from the desktop: the `DataTransfer` a browser builds of them (FTR.NAB.CMN-0005 design §6.5). */
export async function dragFiles(page: Page, files: { name: string; bytes?: number }[]): Promise<JSHandle<DataTransfer>> {
  return page.evaluateHandle((list) => {
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(new File([new Uint8Array(f.bytes ?? 1)], f.name));
    return dt;
  }, files);
}

/** Sends what the composer holds as its user does: Enter on a computer; its button on a touch screen, where Enter
 * breaks the line (FTR.NAB.CHAT-0001 design §3.1, INP-01). */
export async function send(input: Locator) {
  const touch = await input.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches);
  if (!touch) return input.press("Enter");
  await input.locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' composer ')][1]")
    .getByRole("button", { name: "Send", exact: true }).click();
}
