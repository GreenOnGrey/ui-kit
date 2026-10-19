import { demo, expect, openSection, test } from "./fixtures";

// The behaviour that needs a real browser: focus, the keyboard, scrolling,
// the layout by width (FTR.NAB.CMN-0005 qa §3–4).

test("CMP-01 the modal takes the focus and closes by Escape and by the backdrop", async ({ page }) => {
  const s = await openSection(page, "overlay");
  await s.getByRole("button", { name: "Открыть окно" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByLabel("Тема")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await s.getByRole("button", { name: "Открыть окно" }).click();
  await page.locator(".overlay").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("CMP-02 an error toast is an alert, a toast with actions stays", async ({ page }) => {
  const s = await openSection(page, "toasts");
  await s.getByRole("button", { name: "Ошибка" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось сохранить" })).toBeVisible();
  await s.getByRole("button", { name: "С действиями" }).click();
  const withActions = page.getByRole("status").filter({ hasText: "Вышла новая версия" });
  await expect(withActions).toBeVisible();
  // without actions a toast leaves in 6 seconds, with them it waits for the choice
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось сохранить" })).toHaveCount(0, { timeout: 8000 });
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
  const open = s.getByRole("button", { name: "Открыть меню" });
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
  const sw = s.getByRole("switch", { name: "Голосовой ввод" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});

test("CMP-11 the sign-in screen reports the chosen language", async ({ page }) => {
  await page.goto("/?view=login-nabu");
  const en = page.getByRole("button", { name: "EN" });
  await expect(page.getByRole("button", { name: "RU" })).toHaveClass(/\bon\b/);
  await en.click();
  await expect(en).toHaveClass(/\bon\b/);
  await expect(page.getByRole("button", { name: "RU" })).not.toHaveClass(/\bon\b/);
});

test("CMP-07, CMP-08 on a phone the sections live behind the burger, never open with the profile menu", async ({ page }, info) => {
  const s = await openSection(page, "topbar");
  const bar = s.locator(".topbar").first();
  const burger = bar.getByRole("button", { name: "Разделы" });
  if (info.project.name === "desktop") {
    await expect(burger).toBeHidden();
    await expect(bar.locator(".nav")).toBeVisible();
    return;
  }
  await expect(bar.locator(".nav")).toBeHidden();
  await burger.click();
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  await expect(bar.locator(".navmenu")).toBeVisible();
  await bar.getByRole("button", { name: "Профиль" }).click();
  await expect(bar.locator(".navmenu")).toHaveCount(0);
  await expect(bar.locator(".menu")).toBeVisible();
  await burger.click();
  await expect(bar.locator(".menu")).toHaveCount(0);
  await bar.locator(".navmenu").getByText("Память").click();
  await expect(bar.locator(".navmenu")).toHaveCount(0);
  await burger.click();
  await page.keyboard.press("Escape");
  await expect(bar.locator(".navmenu")).toHaveCount(0);
});

test.describe("chat", () => {
  test("CHAT-01, CHAT-03 Enter sends, Shift+Enter does not, the list follows the last message", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const input = chat.getByRole("textbox");
    await input.fill("первая строка");
    await input.press("Shift+Enter");
    await expect(chat.locator(".m.u .bub").last()).not.toHaveText("первая строка");
    await input.fill("Проверка отправки");
    await input.press("Enter");
    await expect(chat.locator(".m.u .bub").last()).toHaveText("Проверка отправки");
    await expect(input).toHaveValue("");
    const atBottom = await chat.locator(".msgs").evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
    expect(atBottom).toBeLessThan(2);
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Готово.");
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
    await chat.getByRole("button", { name: "Записать голосом" }).click();
    await expect(chat.locator(".recbar")).toContainText("/ 5:00");
    await page.waitForTimeout(400);
    await chat.locator(".recbar").getByRole("button", { name: "Стоп" }).click();
    const input = chat.getByRole("textbox");
    // VOC-15: while the server recognizes — a wave instead of the microphone, the field and «Send» are off
    await expect(chat.getByRole("status", { name: "Распознаём…" })).toBeVisible();
    await expect(chat.getByRole("button", { name: "Записать голосом" })).toHaveCount(0);
    await expect(input).toBeDisabled();
    await expect(chat.getByRole("button", { name: "Отправить" })).toBeDisabled();
    await expect(input).toHaveValue(/Расшифровка записи/);
    await expect(chat.getByRole("button", { name: "Записать голосом" })).toBeVisible();
    await input.press("Enter");
    await expect(chat.locator(".m.u").last()).toContainText("Расшифровка записи");
    await expect(chat.locator(".m.u .chan").last()).toContainText("голосом");
  });

  test("CHAT-11, VOC-06 «Cancel» drops the recording", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Записать голосом" }).click();
    await expect(chat.locator(".recbar")).toBeVisible();
    await chat.locator(".recbar").getByRole("button", { name: "Отмена" }).click();
    await expect(chat.locator(".recbar")).toHaveCount(0);
    await expect(chat.getByRole("textbox")).toHaveValue("");
  });

  test("CHAT-12, VOC-07 a refused microphone is told under the composer", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Записать голосом" }).click();
    await expect(chat.locator(".err-text").filter({ hasText: "Нет доступа к микрофону" })).toBeVisible();
  });

  test("CHAT-12 without MediaRecorder the button is off and says why", async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as { MediaRecorder?: unknown }).MediaRecorder;
    });
    const s = await openSection(page, "chat");
    const mic = demo(s, "history").getByRole("button", { name: "Записать голосом" });
    await expect(mic).toBeDisabled();
    await expect(mic).toHaveAttribute("title", "Голосовой ввод не поддерживается этим браузером");
  });

  test("FTR.NAB.CHAT-0001 ATT-08, ATT-09 an image is a thumbnail; PDF, Markdown and a table open in the preview, Escape closes it; the rest downloads", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "files");
    await expect(chat.locator(".att-thumb img")).toBeVisible();
    await chat.getByRole("button", { name: "Открыть release-notes.md" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Релиз 1.3" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Скачать" })).toHaveAttribute("download", "release-notes.md");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await chat.getByRole("button", { name: "Открыть report.pdf" }).click();
    await expect(page.getByRole("dialog").locator("object[type='application/pdf']")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Закрыть" }).click();
    await chat.getByRole("button", { name: "Открыть metrics.csv" }).click();
    await expect(page.getByRole("dialog").getByRole("columnheader", { name: "requests" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Показаны 500 из 620 строк");
    await page.keyboard.press("Escape");
    await expect(chat.getByRole("link", { name: "Скачать data.zip" })).toHaveAttribute("download", "data.zip");
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

  test("SKL-02 an unknown command is not sent; a known one runs", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    const input = chat.getByRole("textbox");
    const sent = await chat.locator(".m.u").count();
    await input.fill("/foo bar");
    await input.press("Enter");
    await expect(chat.locator(".cmd-unknown")).toContainText("Неизвестная команда /foo");
    await expect(chat.locator(".m.u")).toHaveCount(sent);
    await input.fill("/new");
    await input.press("Escape");
    await input.press("Enter");
    await expect(chat.locator(".evdiv").last()).toContainText("Контекст сброшен");
  });

  test("CTX-10 the ring shows the numbers on a click", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "full");
    await chat.locator(".ctxring").click();
    await expect(chat.locator(".ctxtip")).toContainText("из");
  });

  test("CHAT-02 earlier messages keep the place of the list", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    const list = chat.locator(".msgs");
    // the place of a message inside the list, whatever the page scrolls to
    const offset = (nth: number) => list.evaluate((el, n) => el.querySelectorAll(".m")[n].getBoundingClientRect().top - el.getBoundingClientRect().top, nth);
    await list.evaluate((el) => { el.scrollTop = 0; });
    const before = await offset(0);
    await chat.getByRole("button", { name: "Более ранние сообщения" }).click();
    await expect(chat.locator(".m").first()).toHaveText("Более раннее сообщение.");
    expect(Math.abs((await offset(1)) - before)).toBeLessThan(2);
  });

  test("CHAT-04 nothing to send — the button is off", async ({ page }) => {
    const s = await openSection(page, "chat");
    await expect(demo(s, "history").getByRole("button", { name: "Отправить" })).toBeDisabled();
  });

  test("CHAT-05 the steps unfold and fold", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "ещё 3 шага" }).click();
    await expect(chat.getByText("Задания: шаг 1")).toBeVisible();
    await chat.getByRole("button", { name: "Скрыть шаги" }).click();
    await expect(chat.getByText("Задания: шаг 1")).toHaveCount(0);
  });

  test("CHAT-08 a retry answers the failed message", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.getByRole("button", { name: "Повторить" }).click();
    await expect(chat.locator(".llmerr")).toHaveCount(0);
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Готово.");
  });

  test("CHAT-09 a chosen file stands over the composer and can be removed", async ({ page }) => {
    const s = await openSection(page, "chat");
    const chat = demo(s, "history");
    await chat.locator('input[type="file"]').setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(chat.locator(".pending-files .chip")).toHaveText(/note\.txt/);
    await expect(chat.getByRole("button", { name: "Отправить" })).toBeEnabled();
    await chat.locator('input[type="file"]').setInputFiles({ name: "big.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(5_000_001) });
    await expect(page.getByRole("alert").filter({ hasText: "big.bin" })).toBeVisible();
    await expect(chat.locator(".pending-files .chip")).toHaveCount(1);
    await chat.getByRole("button", { name: "Убрать" }).click();
    await expect(chat.locator(".pending-files")).toHaveCount(0);
  });

  test("CHAT-13, CHAT-14 cancelling and confirming exist only where the product handles them", async ({ page }) => {
    const s = await openSection(page, "chat");
    const plain = demo(s, "history");
    const full = demo(s, "full");
    await expect(plain.locator(".confirm")).toHaveCount(0);
    await expect(full.locator(".confirm")).toBeVisible();
    await full.getByRole("button", { name: "Выполнить" }).click();
    await expect(full.locator(".confirm")).toHaveCount(0);
    await expect(full.locator(".sysnote").last()).toHaveText("Вы подтвердили: отправка письма");
    await plain.getByRole("textbox").fill("раз");
    await plain.getByRole("textbox").press("Enter");
    await expect(plain.getByRole("button", { name: "Остановить", exact: true })).toHaveCount(0);
    await full.getByRole("textbox").fill("два");
    await full.getByRole("textbox").press("Enter");
    await full.getByRole("button", { name: "Остановить", exact: true }).click();
    await expect(full.locator(".sysnote").last()).toHaveText("Ход отменён");
  });

  test("CHAT-17 a read-only conversation has no composer", async ({ page }) => {
    const s = await openSection(page, "chat");
    const ro = demo(s, "readonly");
    await expect(ro.getByRole("textbox")).toHaveCount(0);
    await expect(ro.getByText("Тема в архиве")).toBeVisible();
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
    await narrow.getByRole("button", { name: "Разговоры" }).click();
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
    await narrow.getByRole("button", { name: "Новая тема" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Создать" })).toBeDisabled();
    await expect(dialog.getByLabel("Тема")).toHaveAttribute("maxlength", "120");
    await dialog.getByLabel("Тема").fill("Новая");
    await dialog.getByLabel("Тема").press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(narrow.locator(".hd")).toContainText("Новая");
  });

  test("CHAT-20 the chat makes no request", async ({ page }) => {
    const s = await openSection(page, "chat");
    // what a chat would talk to a server with; pictures of the page do not count
    const requests: string[] = [];
    page.on("request", (r) => ["fetch", "xhr", "websocket", "eventsource"].includes(r.resourceType()) && requests.push(r.url()));
    page.on("websocket", (ws) => requests.push(ws.url()));
    const chat = demo(s, "history");
    await chat.getByRole("textbox").fill("Проверка");
    await chat.getByRole("textbox").press("Enter");
    await expect(chat.locator(".m.a .bub").last()).toHaveText("Готово.");
    expect(requests).toEqual([]);
  });
});
