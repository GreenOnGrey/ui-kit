import { SECTIONS } from "../showcase/sections";
import { demo, dragFiles, expect, openSection, test } from "./fixtures";

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
  // FTR.HMR.DEV-0002: a pinned node of the graph and its neighbours
  test(`graph pinned ${theme}`, async ({ page }) => {
    const s = await openSection(page, "graph", theme);
    await s.getByRole("button", { name: "Anna Petrova" }).click();
    await page.mouse.move(0, 0);
    await expect(s.locator(".gwrap")).toHaveScreenshot(`graph-pinned-${theme}.png`);
  });

  // FTR.HMR.DEV-0002 R15: a moved node and the button that puts it back
  test(`graph-rows moved ${theme}`, async ({ page }, info) => {
    test.skip(info.project.name === "phone", "the buttons of the graph are a computer's");
    const s = await openSection(page, "graph-rows", theme);
    const box = (await s.getByRole("button", { name: /^FTR\.HMR\.CMN-0005,/ }).locator("circle").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect(s.locator(".gwrap")).toHaveScreenshot(`graph-rows-moved-${theme}.png`);
  });

  // FTR.NAB.CMN-0005 qa CMP-13: the list of a select is drawn by the kit and follows the theme
  test(`open select ${theme}`, async ({ page }) => {
    const s = await openSection(page, "forms", theme);
    await s.getByRole("button", { name: "Run" }).click();
    await expect(s.getByRole("listbox", { name: "Run" })).toBeVisible();
    await expect(s.locator(".select-demo")).toHaveScreenshot(`select-${theme}.png`);
  });

  // FTR.NAB.MEM-0001 design §3.4: the suggestions by groups with the match in bold, and the error with a retry
  test(`open combobox ${theme}`, async ({ page }) => {
    const s = await openSection(page, "combobox", theme);
    await s.getByRole("combobox", { name: "Person or topic" }).fill("petr");
    await expect(s.getByRole("option")).toHaveCount(3);
    await expect(s.getByRole("listbox", { name: "Person or topic" })).toHaveScreenshot(`combobox-open-${theme}.png`);
    await s.getByRole("combobox", { name: "A source that fails" }).fill("a");
    await expect(s.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(s.getByRole("listbox", { name: "A source that fails" })).toHaveScreenshot(`combobox-error-${theme}.png`);
  });

  // FTR.NAB.MEM-0001 design §3.8: the values of a day under the pointer, and the table
  test(`chart tip ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chart", theme);
    const chart = s.getByRole("img", { name: "Cost, $" });
    await chart.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
    await expect(s.locator(".chart-tip")).toBeVisible();
    await expect(s.locator(".chart").first()).toHaveScreenshot(`chart-tip-${theme}.png`);
  });

  // FTR.NAB.CMN-0005 design §6.5: the files dragged over the chat
  test(`chat drop ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chat", theme);
    const chat = demo(s, "history");
    const dataTransfer = await dragFiles(page, [{ name: "plan.pdf" }]);
    await chat.locator(".nb-chat").dispatchEvent("dragenter", { dataTransfer, bubbles: true, cancelable: true });
    await expect(chat.locator(".dropzone")).toBeVisible();
    await expect(chat).toHaveScreenshot(`chat-drop-${theme}.png`);
  });

  test(`open menu ${theme}`, async ({ page }) => {
    const s = await openSection(page, "overlay", theme);
    await s.getByRole("button", { name: "Open the menu" }).click();
    await expect(page.locator(".menu")).toHaveScreenshot(`menu-${theme}.png`);
  });

  for (const [name, button] of [["modal", "Open a dialog"], ["modal-wide", "Open a wide dialog"]]) {
    test(`${name} ${theme}`, async ({ page }) => {
      const s = await openSection(page, "overlay", theme);
      await s.getByRole("button", { name: button, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
    });
  }

  // FTR.NAB.CHAT-0001 R34: the preview of a file sent by the agent (PDF is left out: its viewer is the browser's)
  // the drawn Markdown shifts the headings by two levels: «#» is <h3>
  for (const [name, file, ready] of [["preview-markdown", "release-notes.md", ".att-md :is(h1, h2, h3, h4, h5, h6)"], ["preview-table", "metrics.csv", "table"],
    ["preview-html", "slides.html", "iframe.att-html"],
    // FTR.NAB.CHAT-0003: a spreadsheet, a document being made, a document without a preview (a converted document is a PDF)
    ["preview-sheet", "budget.xlsx", ".att-sheet table"], ["preview-preparing", "draft.docx", ".att-wait .spin"],
    ["preview-unavailable", "old.ppt", ".att-wait .err-text, .att-wait b"]]) {
    test(`${name} ${theme}`, async ({ page }) => {
      const s = await openSection(page, "chat", theme);
      await s.locator('[data-demo="files"]').getByRole("button", { name: `Open ${file}` }).click();
      await expect(page.getByRole("dialog").locator(ready).first()).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
    });
  }

  // FTR.NAB.CMN-0005 R5: the burger of a phone in the administration
  test(`admin burger ${theme}`, async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the burger is a phone's");
    const s = await openSection(page, "topbar", theme);
    await s.getByRole("button", { name: "Administration" }).click();
    await expect(page.locator(".navmenu .side")).toHaveScreenshot(`admin-burger-${theme}.png`);
  });

  // FTR.NAB.CHAT-0004 design §3 p. 7: «Stopping…» after a click on «Stop»
  test(`stopping ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chat", theme);
    const queue = s.locator('[data-demo="message-queue"]');
    await queue.getByRole("button", { name: "Stop the answer" }).click();
    await expect(queue.locator(".stopmark").last()).toHaveScreenshot(`stopping-${theme}.png`);
  });

  // FTR.NAB.CMN-0009 design §3 p. 2: a finished step of subagents opened, with the result of a task
  test(`subagents open ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chat", theme);
    const step = s.locator('[data-demo="subagents"] .tool.subagents').first();
    await step.locator(".sa-head").click();
    await step.locator(".sa-row").first().click();
    await expect(step.locator(".sa-result")).toBeVisible();
    await expect(step).toHaveScreenshot(`subagents-open-${theme}.png`);
  });

  // FTR.NAB.CHAT-0001 design §3.1: the menu of the context meter and the focus of the composer
  test(`context menu ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chat", theme);
    await s.locator('[data-demo="full"] .ctxring').click();
    await expect(s.locator('[data-demo="full"] .ctxtip')).toHaveScreenshot(`context-menu-${theme}.png`);
  });

  test(`composer focus ${theme}`, async ({ page }) => {
    const s = await openSection(page, "chat", theme);
    const composer = s.locator('[data-demo="history"] .composer');
    await composer.getByRole("textbox").fill("first line\nsecond line");
    await composer.getByRole("textbox").focus();
    await expect(composer).toHaveScreenshot(`composer-focus-${theme}.png`);
  });

  test(`shown toasts ${theme}`, async ({ page }) => {
    const s = await openSection(page, "toasts", theme);
    for (const button of ["Success", "Error", "With actions"]) await s.getByRole("button", { name: button, exact: true }).click();
    await expect(page.locator(".toast")).toHaveCount(3);
    await expect(page.locator(".toast-wrap")).toHaveScreenshot(`shown-toasts-${theme}.png`);
  });
}

// The Russian dictionary of the kit: its strings are longer than the English ones, so the sections full of
// them are taken with it too.
for (const id of ["chat", "topbar"] as const) {
  test(`${id} ru`, async ({ page }) => {
    const section = await openSection(page, id, "light", "ru");
    await expect(section).toHaveScreenshot(`${id}-ru.png`);
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
