import { demo, expect, openSection, send, test } from "./fixtures";

// The behaviour that needs a real browser: focus, the keyboard, scrolling,
// the layout by width (FTR.NAB.CMN-0005 qa §3–4).

test("CMP-01 the modal takes the focus and closes by Escape and by the backdrop", async ({ page }) => {
  const s = await openSection(page, "overlay");
  await s.getByRole("button", { name: "Open a dialog" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByLabel("Topic")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await s.getByRole("button", { name: "Open a dialog" }).click();
  await page.locator(".overlay").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("CMP-02 an error toast is an alert, a toast with actions stays", async ({ page }) => {
  const s = await openSection(page, "toasts");
  await s.getByRole("button", { name: "Error", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toBeVisible();
  await s.getByRole("button", { name: "With actions", exact: true }).click();
  const withActions = page.getByRole("status").filter({ hasText: "A new version is out" });
  await expect(withActions).toBeVisible();
  // without actions a toast leaves in 6 seconds, with them it waits for the choice
  await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toHaveCount(0, { timeout: 8000 });
  await expect(withActions).toBeVisible();
});

test("CMP-04 arrows, Home and End move the chosen tab", async ({ page }) => {
  const s = await openSection(page, "chips");
  const tabs = s.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
});

test("CMP-05 the menu closes by Escape and by a click outside", async ({ page }) => {
  const s = await openSection(page, "overlay");
  const open = s.getByRole("button", { name: "Open the menu" });
  await open.click();
  await expect(page.locator(".menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".menu")).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.click();
  await s.locator("h2").click();
  await expect(page.locator(".menu")).toHaveCount(0);
});

test("KIT-01 the tokens follow the theme and the choice of the system", async ({ page }) => {
  const token = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  await openSection(page, "tokens", "light");
  expect(await token("--bg")).toBe("#eeedf3");
  expect(await token("--violet")).toBe("#6d4aff");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  expect(await token("--bg")).toBe("#0f0d1a");
  expect(await token("--violet")).toBe("#8f74ff");
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await token("--bg")).toBe("#0f0d1a");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await token("--bg")).toBe("#eeedf3");
});

test("CMP-03 the switch changes its state and adds no scrollbar", async ({ page }) => {
  const s = await openSection(page, "forms");
  const sw = s.getByRole("switch", { name: "Voice input" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});

test("CMP-11 the sign-in screen reports the chosen language", async ({ page }) => {
  await page.goto("/?view=login-nabu");
  const ru = page.getByRole("button", { name: "RU" });
  await expect(page.getByRole("button", { name: "EN" })).toHaveClass(/\bon\b/);
  await ru.click();
  await expect(ru).toHaveClass(/\bon\b/);
  await expect(page.getByRole("button", { name: "EN" })).not.toHaveClass(/\bon\b/);
});

test("CMP-12 in the administration the burger of a phone holds its subsections in place of the sections", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "the burger is a phone's");
  const s = await openSection(page, "topbar");
  const demoBox = s.locator(".topbar").nth(2).locator("..");
  const bar = demoBox.locator(".topbar");
  // the side panel of the administration is not on the page of a phone: its sections are behind the burger
  await expect(demoBox.locator(".side.in-burger")).toBeHidden();
  await bar.getByRole("button", { name: "Administration" }).click();
  const menu = bar.locator(".navmenu");
  await expect(menu.locator(".side a .i")).toHaveCount(4);
  await expect(menu.getByRole("navigation", { name: "Administration" })).toBeVisible();
  await expect(menu.getByText("Audit")).toHaveClass(/active/);
  await expect(menu.getByText("Memory")).toHaveCount(0);
  await menu.getByText("Groups").click();
  await expect(menu).toHaveCount(0);
});

test("CMP-07, CMP-08 on a phone the sections live behind the burger, never open with the profile menu", async ({ page }, info) => {
  const s = await openSection(page, "topbar");
  const bar = s.locator(".topbar").first();
  const burger = bar.getByRole("button", { name: "Sections" });
  if (info.project.name === "desktop") {
    await expect(burger).toBeHidden();
    await expect(bar.locator(".nav")).toBeVisible();
    return;
  }
  await expect(bar.locator(".nav")).toBeHidden();
  await burger.click();
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  await expect(bar.locator(".navmenu")).toBeVisible();
  await bar.getByRole("button", { name: "Profile" }).click();
  await expect(bar.locator(".navmenu")).toHaveCount(0);
  await expect(bar.locator(".menu")).toBeVisible();
  await burger.click();
  await expect(bar.locator(".menu")).toHaveCount(0);
  await bar.locator(".navmenu").getByText("Memory").click();
  await expect(bar.locator(".navmenu")).toHaveCount(0);
  await burger.click();
  await page.keyboard.press("Escape");
  await expect(bar.locator(".navmenu")).toHaveCount(0);
});

test.describe("chat", () => {
  test("CHAT-01, CHAT-03 Enter sends (the button on a touch screen), Shift+Enter does not, the list follows the last message", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const input = chat.getByRole("textbox");
    await input.fill("first line");
    await input.press("Shift+Enter");
    await expect(chat.locator(".m.u .bub").last()).not.toHaveText("first line");
    await input.fill("Checking the send");
    await send(input);
    await expect(chat.locator(".m.u .bub").last()).toHaveText("Checking the send");
    await expect(input).toHaveValue("");
    const atBottom = await chat.locator(".msgs").evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
    expect(atBottom).toBeLessThan(2);
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Done.");
  });

  test("CHAT-03 Enter does not send while a word is being composed", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const input = chat.getByRole("textbox");
    const sent = await chat.locator(".m.u").count();
    await input.fill("に");
    await input.dispatchEvent("keydown", { key: "Enter", isComposing: true, bubbles: true });
    await expect(chat.locator(".m.u")).toHaveCount(sent);
    await expect(input).toHaveValue("に");
  });

  test("CHAT-10, VOC-06, VOC-15 a click records, «Stop» puts the transcript into the composer (FTR.NAB.CHAT-0001 R20)", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Record a voice message" }).click();
    await expect(chat.locator(".recbar")).toContainText("/ 5:00");
    await page.waitForTimeout(400);
    await chat.locator(".recbar").getByRole("button", { name: "Stop" }).click();
    const input = chat.getByRole("textbox");
    // VOC-15: while the server recognizes — a wave instead of the microphone, the field and «Send» are off
    await expect(chat.getByRole("status", { name: "Recognizing…" })).toBeVisible();
    await expect(chat.getByRole("button", { name: "Record a voice message" })).toHaveCount(0);
    await expect(input).toBeDisabled();
    await expect(chat.getByRole("button", { name: "Send" })).toBeDisabled();
    await expect(input).toHaveValue(/The transcript of the recording/);
    await expect(chat.getByRole("button", { name: "Record a voice message" })).toBeVisible();
    await send(input);
    await expect(chat.locator(".m.u").last()).toContainText("The transcript of the recording");
    await expect(chat.locator(".m.u .chan").last()).toContainText("by voice");
  });

  test("CHAT-11, VOC-06 «Cancel» drops the recording", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Record a voice message" }).click();
    await expect(chat.locator(".recbar")).toBeVisible();
    await chat.locator(".recbar").getByRole("button", { name: "Cancel" }).click();
    await expect(chat.locator(".recbar")).toHaveCount(0);
    await expect(chat.getByRole("textbox")).toHaveValue("");
  });

  test("CHAT-12, VOC-07 a refused microphone is told under the composer", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Record a voice message" }).click();
    await expect(chat.locator(".err-text").filter({ hasText: "No access to the microphone" })).toBeVisible();
  });

  test("CHAT-12 without MediaRecorder the button is off and says why", async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as { MediaRecorder?: unknown }).MediaRecorder;
    });
    const s = await openSection(page, "chat");
    const mic = demo(s, "history").getByRole("button", { name: "Record a voice message" });
    await expect(mic).toBeDisabled();
    await expect(mic).toHaveAttribute("title", "Voice input is not supported in this browser");
  });

  test("FTR.NAB.CHAT-0001 ATT-08, ATT-09 an image is a thumbnail; PDF, Markdown and a table open in the preview, Escape closes it; the rest downloads", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "files");
    await expect(chat.locator(".att-thumb img")).toBeVisible();
    await chat.getByRole("button", { name: "Open release-notes.md" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Release 1.3" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Download" })).toHaveAttribute("download", "release-notes.md");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await chat.getByRole("button", { name: "Open report.pdf" }).click();
    await expect(page.getByRole("dialog").locator("object[type='application/pdf']")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await chat.getByRole("button", { name: "Open metrics.csv" }).click();
    await expect(page.getByRole("dialog").getByRole("columnheader", { name: "requests" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Showing 500 of 620 rows");
    await page.keyboard.press("Escape");
    await expect(chat.getByRole("link", { name: "Download data.zip" })).toHaveAttribute("download", "data.zip");
  });

  test("FTR.NAB.CHAT-0001 ATT-20, SEC-04 an HTML page is drawn in a frame that runs and loads nothing, scaled to fit; «Code» shows its source", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", (r) => { if (/tracker\.invalid|leak\.png/.test(r.url())) outside.push(r.url()); });
    const s = await openSection(page, "chat");
    await demo(s, "files").getByRole("button", { name: "Open slides.html" }).click();
    const dialog = page.getByRole("dialog");
    const frame = dialog.locator("iframe.att-html");
    // no scripts, forms or popups: only the reading of its width by the chat
    await expect(frame).toHaveAttribute("sandbox", "allow-same-origin");
    // the script of the page did not run
    await expect(dialog.frameLocator("iframe.att-html").getByRole("heading", { name: "Release 1.3" })).toBeVisible();
    // nothing is loaded from outside
    expect(outside).toEqual([]);
    // a slide wider than a desktop is scaled to the modal, not cut: the frame is no wider than its box and the page
    // has no scroll to the side
    await expect.poll(async () => {
      const [frameBox, holder] = [await frame.boundingBox(), await dialog.locator(".att-htmlbox").boundingBox()];
      return !!frameBox && !!holder && frameBox.width <= holder.width + 1;
    }).toBe(true);
    expect(await frame.evaluate((f: HTMLIFrameElement) => {
      const root = f.contentDocument?.documentElement;
      return !!root && root.scrollWidth <= root.clientWidth;
    })).toBe(true);
    await dialog.getByRole("button", { name: "Code" }).click();
    await expect(dialog.locator("pre.att-text")).toContainText("<h1>Release 1.3</h1>");
    await dialog.getByRole("button", { name: "Page" }).click();
    await expect(frame).toBeVisible();
  });

  test("FTR.NAB.CHAT-0001 ATT-19 the preview of wide text and a table stays within the screen; they scroll inside", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the width of a phone");
    const s = await openSection(page, "chat");
    const chat = demo(s, "files");
    for (const file of ["build.log", "metrics.csv"]) {
      await chat.getByRole("button", { name: `Open ${file}` }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(file)).toBeVisible();
      const box = await dialog.boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
      // the content scrolls inside the modal: the table of 500 rows, the log wrapped within its width
      const inner = dialog.locator(file.endsWith(".csv") ? ".att-table" : ".att-text");
      expect(await inner.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 || el.scrollHeight > el.clientHeight)).toBe(true);
      if (file.endsWith(".csv")) expect(await inner.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await page.keyboard.press("Escape");
    }
  });

  test("SKL-01 «/» opens the palette, arrows and Enter pick a skill, Backspace takes it off", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    const input = chat.getByRole("textbox");
    await input.fill("/");
    await expect(chat.locator(".palette")).toContainText("contract-review");
    await input.fill("/contr");
    await expect(chat.locator(".palette-row")).toHaveCount(1);
    await input.press("Enter");
    await expect(chat.locator(".skill-chip")).toContainText("contract-review");
    await input.press("Backspace");
    await expect(chat.locator(".skill-chip")).toHaveCount(0);
    await input.fill("/");
    await input.press("Escape");
    await expect(chat.locator(".palette")).toHaveCount(0);
  });

  test("FTR.NAB.CHAT-0001 CTX-13 the menu of a full context holds the reset and the compaction", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    await chat.locator(".ctxring").click();
    const tip = chat.locator(".ctxtip");
    await expect(tip.getByRole("button", { name: "Compact" })).toBeEnabled();
    await tip.getByRole("button", { name: "Start over" }).click();
    await expect(tip).toHaveCount(0);
    await expect(chat.locator(".evdiv").last()).toContainText("Context reset");
    // while a turn runs both are off, and the reason is said
    await chat.getByRole("textbox").fill("more");
    await send(chat.getByRole("textbox"));
    await chat.locator(".ctxring").click();
    await expect(tip.getByRole("button", { name: "Compact" })).toBeDisabled();
    await expect(tip.getByRole("button", { name: "Start over" })).toBeDisabled();
    await expect(tip).toContainText("Wait for the answer or stop it");
  });

  test("SKL-02 an unknown command is not sent; a known one runs", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    const input = chat.getByRole("textbox");
    const sent = await chat.locator(".m.u").count();
    await input.fill("/foo bar");
    await send(input);
    await expect(chat.locator(".cmd-unknown")).toContainText("Unknown command /foo");
    await expect(chat.locator(".m.u")).toHaveCount(sent);
    await input.fill("/new");
    await input.press("Escape");
    await send(input);
    await expect(chat.locator(".evdiv").last()).toContainText("Context reset");
  });

  test("CTX-10 the ring shows the numbers on a click", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    await chat.locator(".ctxring").click();
    await expect(chat.locator(".ctxtip")).toContainText(/\d[\d.,]*\s?\S* of \d[\d.,]*\s?\S* tokens/);
  });

  test("CHAT-02 earlier messages keep the place of the list", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const list = chat.locator(".msgs");
    // the place of a message inside the list, whatever the page scrolls to
    const offset = (nth: number) => list.evaluate((el, n) => el.querySelectorAll(".m")[n].getBoundingClientRect().top - el.getBoundingClientRect().top, nth);
    await list.evaluate((el) => { el.scrollTop = 0; });
    const before = await offset(0);
    await chat.getByRole("button", { name: "Earlier messages" }).click();
    await expect(chat.locator(".m").first()).toHaveText("An earlier message.");
    expect(Math.abs((await offset(1)) - before)).toBeLessThan(2);
  });

  test("CHAT-04 nothing to send — the button is off", async ({ page }) => {
    const s = await openSection(page, "chat");
    await expect(demo(s, "history").getByRole("button", { name: "Send" })).toBeDisabled();
  });

  test("CHAT-05 the steps unfold and fold", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "3 more steps" }).click();
    await expect(chat.getByText("Tasks: step 1")).toBeVisible();
    await chat.getByRole("button", { name: "Hide steps" }).click();
    await expect(chat.getByText("Tasks: step 1")).toHaveCount(0);
  });

  test("CHAT-08 a retry answers the failed message", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Retry" }).click();
    await expect(chat.locator(".llmerr")).toHaveCount(0);
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Done.");
  });

  test("CHAT-09 a chosen file stands over the composer and can be removed", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.locator('input[type="file"]').setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(chat.locator(".pending-files .chip")).toHaveText(/note\.txt/);
    await expect(chat.getByRole("button", { name: "Send" })).toBeEnabled();
    await chat.locator('input[type="file"]').setInputFiles({ name: "big.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(5_000_001) });
    await expect(page.getByRole("alert").filter({ hasText: "big.bin" })).toBeVisible();
    await expect(chat.locator(".pending-files .chip")).toHaveCount(1);
    await chat.getByRole("button", { name: "Remove" }).click();
    await expect(chat.locator(".pending-files")).toHaveCount(0);
  });

  test("CHAT-13, CHAT-14 cancelling and confirming exist only where the product handles them", async ({ page }) => {
    const s = await openSection(page, "chat");
    const plain = demo(s, "history");
    const full = demo(s, "full");
    await expect(plain.locator(".confirm")).toHaveCount(0);
    await expect(full.locator(".confirm")).toBeVisible();
    await full.getByRole("button", { name: "Execute" }).click();
    await expect(full.locator(".confirm")).toHaveCount(0);
    await expect(full.locator(".sysnote").last()).toHaveText("You approved: sending the letter");
    await plain.getByRole("textbox").fill("one");
    await send(plain.getByRole("textbox"));
    await expect(plain.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);
    await full.getByRole("textbox").fill("two");
    await send(full.getByRole("textbox"));
    await full.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(full.locator(".sysnote").last()).toHaveText("Turn cancelled");
  });

  test("CHAT-17 a read-only conversation has no composer", async ({ page }) => {
    const s = await openSection(page, "chat");
    const ro = demo(s, "readonly");
    await expect(ro.getByRole("textbox")).toHaveCount(0);
    await expect(ro.getByText("The topic is archived")).toBeVisible();
  });

  test("CHAT-18 in a narrow place the list lies over the messages", async ({ page }, info) => {
    const s = await openSection(page, "chat");
    const wide = demo(s, "history");
    const narrow = demo(s, "narrow");
    if (info.project.name === "desktop") {
      await expect(wide.locator(".nb-side")).toBeVisible();
      expect((await wide.locator(".nb-side").boundingBox())!.x).toBeLessThan((await wide.locator(".nb-chat").boundingBox())!.x);
    }
    await expect(narrow.locator(".nb-side")).toBeHidden();
    await narrow.getByRole("button", { name: "Conversations" }).click();
    await expect(narrow.locator(".nb-side")).toBeVisible();
    const side = (await narrow.locator(".nb-side").boundingBox())!;
    const msgs = (await narrow.locator(".nb-chat").boundingBox())!;
    expect(side.x).toBeLessThan(msgs.x + 2);
    // the list covers the left of the scrim: the tap goes beside it
    const scrim = (await narrow.locator(".nb-scrim").boundingBox())!;
    await page.mouse.click(scrim.x + scrim.width - 8, scrim.y + scrim.height / 2);
    await expect(narrow.locator(".nb-side")).toBeHidden();
  });

  test("CHAT-19 a new topic is created by Enter, an empty title is not", async ({ page }) => {
    const s = await openSection(page, "chat");
    const narrow = demo(s, "narrow-list");
    await narrow.getByRole("button", { name: "New topic" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();
    await expect(dialog.getByLabel("Topic")).toHaveAttribute("maxlength", "120");
    await dialog.getByLabel("Topic").fill("New one");
    await dialog.getByLabel("Topic").press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(narrow.locator(".hd")).toContainText("New one");
  });

  test("CHAT-20 the chat makes no request", async ({ page }) => {
    const s = await openSection(page, "chat");
    // what a chat would talk to a server with; pictures of the page do not count
    const requests: string[] = [];
    page.on("request", (r) => ["fetch", "xhr", "websocket", "eventsource"].includes(r.resourceType()) && requests.push(r.url()));
    page.on("websocket", (ws) => requests.push(ws.url()));
    const chat = demo(s, "history");
    await chat.getByRole("textbox").fill("A check");
    await send(chat.getByRole("textbox"));
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Done.");
    expect(requests).toEqual([]);
  });
});

// FTR.NAB.CHAT-0001 design §3.1: the composer of a touch screen
test.describe("chat on a touch screen", () => {
  test.use({ isMobile: true, hasTouch: true });

  test("FTR.NAB.CHAT-0001 INP-01 Enter breaks the line and does not send; the button sends", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "a phone's keyboard");
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const before = await chat.locator(".m.u").count();
    const input = chat.getByRole("textbox");
    await input.click();
    await input.pressSequentially("first");
    await input.press("Enter");
    await input.pressSequentially("second");
    await expect(input).toHaveValue("first\nsecond");
    await expect(chat.locator(".m.u")).toHaveCount(before);
    await chat.getByRole("button", { name: "Send" }).click();
    await expect(chat.locator(".m.u")).toHaveCount(before + 1);
  });
});

test("FTR.NAB.CHAT-0001 INP-02 the field grows with its lines up to three, then scrolls", async ({ page }) => {
  const s = await openSection(page, "chat");
  const input = demo(s, "history").getByRole("textbox");
  const height = async (lines: number) => {
    await input.fill(Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n"));
    return (await input.boundingBox())?.height ?? 0;
  };
  const [one, two, three, five] = [await height(1), await height(2), await height(3), await height(5)];
  expect(two).toBeGreaterThan(one);
  expect(three).toBeGreaterThan(two);
  expect(five).toBe(three);
  expect(await input.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  // the list read to its end stays at its end: the last message is not hidden under the grown field
  const list = demo(s, "history").locator(".msgs");
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  expect(await list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  expect(await height(1)).toBe(one);
  // a list scrolled up stays where it is
  await list.evaluate((el) => { el.scrollTop = 0; });
  await height(3);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(0);
});

test("KIT-05 Graph: Enter opens a node with onOpen; without it Enter pins, as in Nabu (FTR.HMR.DEV-0002)", async ({ page }) => {
  const d = await openSection(page, "graph-directed");
  const directed = d.getByRole("group", { name: "Links of features" });
  await directed.getByRole("button", { name: /^FTR\.HMR\.CMN-0001,/ }).focus();
  await page.keyboard.press("Enter");
  await expect(d.getByText("Opened: FTR.HMR.CMN-0001")).toBeVisible();
  const s = await openSection(page, "graph");
  const people = s.getByRole("group", { name: "The graph of people and topics" });
  const anna = people.getByRole("button", { name: "Anna Petrova" });
  await anna.focus();
  await page.keyboard.press("Enter");
  await expect(anna).toHaveAttribute("aria-pressed", "true");
});

test("KIT-03 Graph: the depth of the focus widens the highlight (FTR.HMR.DEV-0002)", async ({ page }) => {
  const s = await openSection(page, "graph-directed");
  const directed = s.getByRole("group", { name: "Links of features" });
  const far = directed.getByRole("button", { name: /^FTR\.HMR\.CMN-0002,/ });
  await expect(directed.locator(".g-n.hl")).toHaveCount(6);
  await expect(far).not.toHaveClass(/\bhl\b/);
  await s.getByRole("button", { name: "Depth: 1" }).click();
  await expect(directed.locator(".g-n.hl")).toHaveCount(7);
  await expect(far).toHaveClass(/\bhl\b/);
});
