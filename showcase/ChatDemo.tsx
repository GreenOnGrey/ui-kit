import { useRef, useState, type ReactNode } from "react";
import { Avatar, Icon } from "../src";
import { Chat, ChatLayout, ConversationList, type ChatMessage } from "../src/chat";
import { confirmations as fixtureConfirmations, conversations, history } from "./fixtures";

/** The chat of the showcase on invented data: the buttons work without a server
 * (design §3). `full` turns on what not every chat has — cancelling a turn and
 * confirming an action; `narrow` is the side panel of Hammurapi. */
export function ChatDemo({ demo, narrow, full, empty, readOnly, wait, typing, historyError, listOpen = false, modes, files }: {
  /** The name of the example: tests find the demo by it, not by its place on the page. */
  demo: string;
  narrow?: boolean; full?: boolean; empty?: boolean; readOnly?: boolean; wait?: "starting" | "queued"; typing?: boolean; historyError?: boolean;
  listOpen?: boolean; modes?: boolean;
  /** The agent has sent files: a chart, a PDF and Markdown with their preview (FTR.NAB.CHAT-0001 R34). */
  files?: boolean;
}) {
  const initial: ChatMessage[] = empty ? [] : typing
    ? [...history.slice(0, 1), { id: "t", role: "assistant", text: "", createdAt: "2026-10-11T14:02:00", status: "streaming",
        steps: [{ id: "s", text: "Спецификации: чтение FTR.NAB.CMN-0005", status: "running" }] }]
    : wait
    ? [...history.slice(0, 2), { id: "w", role: "user", text: "Собери перечень изменений", createdAt: "2026-10-11T14:12:00", status: "done",
        wait: wait === "queued" ? { state: "queued", position: 2 } : { state: "starting" } }]
    : files
    ? [...history.slice(0, 1), { id: "f", role: "assistant", text: "Готово: график, отчёт и заметки к релизу — во вложениях.", createdAt: "2026-10-11T14:03:00",
        status: "done", attachments: demoFiles }]
    : history;
  const [messages, setMessages] = useState(initial);
  const [confirmations, setConfirmations] = useState(full ? fixtureConfirmations : []);
  const [busy, setBusy] = useState(!!typing);
  const [current, setCurrent] = useState("main");
  const [open, setOpen] = useState(listOpen);
  const [mode, setMode] = useState("spec");
  const [list, setList] = useState(conversations);
  const timer = useRef<number | undefined>(undefined);
  const n = useRef(0);
  const note = (text: string): ChatMessage => ({ id: `n${n.current++}`, role: "note", text, createdAt: new Date().toISOString(), status: "done" });

  const answer = (id: string) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, status: "streaming", error: undefined, steps: [{ id: "s", text: "Спецификации: чтение", status: "running" }] } : m)));
    timer.current = window.setTimeout(() => {
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, status: "done", text: "Готово.", steps: [{ id: "s", text: "Спецификации: чтение", status: "done" }] } : m)));
      setBusy(false);
    }, 1500);
  };
  const onSend = async (text: string, attachmentIds: string[], voice: boolean, skill?: string) => {
    const id = `m${n.current++}`;
    setBusy(true);
    setMessages((ms) => [...ms,
      { id: `u${id}`, role: "user", text, createdAt: new Date().toISOString(), status: "done",
        mark: skill ? { icon: "spark", text: skill } : voice ? { icon: "mic", text: "голосом" } : undefined,
        attachments: attachmentIds.map((a) => ({ id: a, fileName: a, href: "#" })) },
      { id, role: "assistant", text: "", createdAt: new Date().toISOString(), status: "pending" }]);
    answer(id);
  };
  const onRetry = (id: string) => { setBusy(true); answer(id); };
  const onCancel = () => {
    window.clearTimeout(timer.current);
    setBusy(false);
    setMessages((ms) => [...ms.filter((m) => m.status === "done" || m.status === "failed"), note("Ход отменён")]);
  };

  const header: ReactNode = (
    <div className="hd">
      <button className="iconbtn" onClick={() => setOpen((v) => !v)} aria-label="Разговоры"><Icon name="msg2" /></button>
      <Avatar name="Ада" agent icon="tBusiness" variant="business" />
      <div style={{ minWidth: 0 }}><b>Ада</b><div className="small muted">{list.find((c) => c.id === current)?.title}</div></div>
    </div>
  );
  return (
    <div className={`sc-chat${narrow ? " sc-narrow" : ""}`} data-demo={demo}>
      <ChatLayout narrow={narrow}>
        <ConversationList conversations={list} currentId={current} open={open} onClose={() => setOpen(false)}
          onPick={(id) => { setCurrent(id); setOpen(false); }}
          onCreate={async (title) => { const id = `t${n.current++}`; setList((l) => [...l, { id, group: "topic", title, when: "сейчас" }]); setCurrent(id); }} />
        <Chat agentName="Ада" messages={messages} header={header} busy={busy} emptyHint="Спросите о спецификации или попросите напомнить позже."
          readOnly={readOnly ? <><span className="small muted">Тема в архиве</span><button className="btn sm">Вернуть из архива</button></> : undefined}
          aboveComposer={modes ? (
            <div style={{ padding: "10px 10px 0" }}>
              <div className="mini-seg">
                {[["spec", "Спецификация"], ["general", "Общий"]].map(([k, l]) => (
                  <button key={k} className={mode === k ? "on" : ""} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>
                ))}
              </div>
            </div>
          ) : undefined}
          upload={{ maxBytes: 5_000_000 }} onSend={onSend} onRetry={onRetry}
          onUpload={async (f) => ({ id: f.name, fileName: f.name })}
          onTranscribe={async () => {
            // the server takes a moment: the wave of FTR.NAB.CHAT-0001 design §3.1 is seen
            await new Promise((ok) => window.setTimeout(ok, 1200));
            return "Расшифровка записи: проверьте перед отправкой.";
          }}
          loadAttachment={files ? loadDemoFile : undefined}
          historyError={historyError ? "Не удалось загрузить историю. Проверьте соединение." : undefined} loadingOlder={historyError}
          hasOlder={!empty} onLoadOlder={() => setMessages((ms) => [{ id: `o${n.current++}`, role: "assistant", text: "Более раннее сообщение.", createdAt: "2026-10-10T09:00:00", status: "done" }, ...ms])}
          confirmations={confirmations}
          onConfirm={full ? (id, approve) => { setConfirmations((c) => c.filter((x) => x.id !== id)); setMessages((ms) => [...ms, note(approve ? "Вы подтвердили: отправка письма" : "Вы отклонили: отправка письма")]); } : undefined}
          onCancel={full ? onCancel : undefined}
          commands={full ? [
            { kind: "command", name: "new", description: "Начать с чистого контекста" },
            { kind: "command", name: "compact", description: "Сжать контекст", takesText: true },
            { kind: "skill", name: "contract-review", description: "Проверка договора", source: "Юристы" },
          ] : undefined}
          onCommand={full ? async (name) => {
            setMessages((ms) => [...ms, { id: `e${n.current++}`, role: "event", text: "", createdAt: new Date().toISOString(), status: "done",
              event: name === "new" ? { icon: "undo", text: "Контекст сброшен" } : { icon: "compress", text: "Контекст сжат: 42 тыс. → 3 тыс. токенов", details: "Изложение разговора." } }]);
          } : undefined}
          context={full ? { tokens: 42_000, window: 1_000_000 } : undefined} />
      </ChatLayout>
    </div>
  );
}

const demoFiles = [
  { id: "chart", fileName: "chart.png", href: "#", mimeType: "image/png", size: 48_210 },
  { id: "report", fileName: "report.pdf", href: "#", mimeType: "application/pdf", size: 612 },
  { id: "notes", fileName: "release-notes.md", href: "#", mimeType: "text/markdown", size: 220 },
  { id: "metrics", fileName: "metrics.csv", href: "#", mimeType: "text/csv", size: 14_200 },
  { id: "log", fileName: "build.log", href: "#", mimeType: "text/plain", size: 3_280 },
  { id: "page", fileName: "slides.html", href: "#", mimeType: "text/html", size: 520 },
  { id: "logo", fileName: "logo.svg", href: "#", mimeType: "image/svg+xml", size: 410 },
  { id: "data", fileName: "data.zip", href: "#", mimeType: "application/zip", size: 1_204_000 },
];

const MINI_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 18 Tf 24 60 Td (Release report) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

/** The files of the showcase, made in the browser. */
async function loadDemoFile(a: { id: string }): Promise<Blob> {
  if (a.id === "report") return new Blob([MINI_PDF], { type: "application/pdf" });
  if (a.id === "metrics") {
    const rows = Array.from({ length: 620 }, (_, i) => `2026-10-${String((i % 28) + 1).padStart(2, "0")},${1200 + i},${(i % 9) / 10}`);
    return new Blob([["date,requests,errors", ...rows].join("\n")], { type: "text/csv" });
  }
  if (a.id === "log") {
    // a long line without spaces: the preview wraps it within the screen
    return new Blob(["$ npm run build\n> vite build\n✓ 412 modules transformed.\ndist/assets/index-" + "a1b2c3d4".repeat(24) + ".js\n✓ built in 1.61s\n"], { type: "text/plain" });
  }
  if (a.id === "page") {
    return new Blob(['<!doctype html><title>Каркас презентации</title><style>body{font:16px system-ui;margin:24px;color:#1d1d2c}h1{color:#7c5cff}' +
      '.card{border:1px solid #ddd;border-radius:12px;padding:16px}</style><h1>Релиз 1.3</h1><div class="card">Файлы агента и их просмотр</div>' +
      // an outside picture, a relative one (it would go to the site) and a refresh: the preview loads none of them
      '<img src="https://tracker.invalid/pixel.png" alt=""><img src="leak.png" alt="">' +
      '<meta http-equiv="refresh" content="0;url=https://tracker.invalid/">' +
      '<script>document.body.innerHTML = "скрипт выполнился"</script>'], { type: "text/html" });
  }
  if (a.id === "logo") {
    return new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7c5cff"/><circle cx="32" cy="32" r="14" fill="#fff"/></svg>'], { type: "image/svg+xml" });
  }
  if (a.id === "notes") return new Blob(["# Релиз 1.3\n\n- волна вместо микрофона\n- **предпросмотр** файлов\n"], { type: "text/markdown" });
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#f6f5fa";
    g.fillRect(0, 0, 320, 200);
    [60, 110, 80, 150, 130].forEach((h, i) => {
      g.fillStyle = "#7c5cff";
      g.fillRect(30 + i * 56, 180 - h, 36, h);
    });
  }
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("canvas"))), "image/png"));
}
