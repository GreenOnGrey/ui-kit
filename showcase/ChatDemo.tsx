import { useRef, useState, type ReactNode } from "react";
import { Avatar, Icon } from "../src";
import { Chat, ChatLayout, ConversationList, type ChatMessage } from "../src/chat";
import { confirmations as fixtureConfirmations, conversations, history } from "./fixtures";

/** The chat of the showcase on invented data: the buttons work without a server
 * (design §3). `full` turns on what not every chat has — cancelling a turn and
 * confirming an action; `narrow` is the side panel of Hammurapi. */
export function ChatDemo({ narrow, full, empty, readOnly, wait, typing, historyError, listOpen = false, modes }: {
  narrow?: boolean; full?: boolean; empty?: boolean; readOnly?: boolean; wait?: "starting" | "queued"; typing?: boolean; historyError?: boolean;
  listOpen?: boolean; modes?: boolean;
}) {
  const initial: ChatMessage[] = empty ? [] : typing
    ? [...history.slice(0, 1), { id: "t", role: "assistant", text: "", createdAt: "2026-10-11T14:02:00", status: "streaming",
        steps: [{ id: "s", text: "Спецификации: чтение FTR.NAB.CMN-0005", status: "running" }] }]
    : wait
    ? [...history.slice(0, 2), { id: "w", role: "user", text: "Собери перечень изменений", createdAt: "2026-10-11T14:12:00", status: "done",
        wait: wait === "queued" ? { state: "queued", position: 2 } : { state: "starting" } }]
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
  const onSend = async (text: string, attachmentIds: string[], voice: boolean) => {
    const id = `m${n.current++}`;
    setBusy(true);
    setMessages((ms) => [...ms,
      { id: `u${id}`, role: "user", text, createdAt: new Date().toISOString(), status: "done",
        mark: voice ? { icon: "mic", text: "голосом" } : undefined,
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
    <div className={`sc-chat${narrow ? " sc-narrow" : ""}`}>
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
          onTranscribe={async () => "Расшифровка записи: проверьте перед отправкой."}
          historyError={historyError ? "Не удалось загрузить историю. Проверьте соединение." : undefined} loadingOlder={historyError}
          hasOlder={!empty} onLoadOlder={() => setMessages((ms) => [{ id: `o${n.current++}`, role: "assistant", text: "Более раннее сообщение.", createdAt: "2026-10-10T09:00:00", status: "done" }, ...ms])}
          confirmations={confirmations}
          onConfirm={full ? (id, approve) => { setConfirmations((c) => c.filter((x) => x.id !== id)); setMessages((ms) => [...ms, note(approve ? "Вы подтвердили: отправка письма" : "Вы отклонили: отправка письма")]); } : undefined}
          onCancel={full ? onCancel : undefined} />
      </ChatLayout>
    </div>
  );
}
