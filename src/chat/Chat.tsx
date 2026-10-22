import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../components/Icon";
import { useToast } from "../components/ui";
import { useKitT } from "../i18n";
import { CommandPalette, matchCommands } from "./CommandPalette";
import { ContextMeter } from "./ContextMeter";
import { MessageView } from "./MessageView";
import { AttachmentPreview, type LoadAttachment } from "./Attachments";
import { transcribe } from "./transcription";
import type { ChatAttachment, ChatCommand, ChatProps, ChatUpload } from "./types";
import { clock, useRecorder } from "./useRecorder";

/** The conversation: the messages and the composer (FTR.NAB.CMN-0005 R11–R13,
 * design §6; FTR.NAB.CHAT-0001 design §3.1). The behaviour is the one of the
 * chat of Nabu. A control exists only when the product gave its handler: no
 * `onCancel` — no cancel button, no `commands` — no palette. */
export function Chat(props: ChatProps) {
  const t = useKitT();
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ChatUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [skill, setSkill] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [paletteClosed, setPaletteClosed] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  // FTR.NAB.CHAT-0001 R34: the file open in the preview. The product's loader may be a new function on
  // every render; the chat gives the thumbnails one stable function while the product has a loader
  const [viewing, setViewing] = useState<ChatAttachment | null>(null);
  const latestLoader = useRef(props.loadAttachment);
  useEffect(() => {
    latestLoader.current = props.loadAttachment;
  });
  const canLoad = !!props.loadAttachment;
  const loadFile = useMemo<LoadAttachment | undefined>(() => canLoad
    ? (a: ChatAttachment) => latestLoader.current ? latestLoader.current(a) : Promise.reject(new Error("no loader"))
    : undefined, [canLoad]);
  const voice = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const maxSeconds = props.voiceMaxSeconds ?? 300;
  const recorder = useRecorder(maxSeconds, () => void stopAndTranscribe());
  const { messages, busy = false } = props;
  // FTR.NAB.CHAT-0001 R1, R2: the context is reset or compacted between turns, not during one
  const turnRunning = busy || messages.some((m) => m.status === "pending" || m.status === "streaming");
  const onPendingChange = props.onPendingChange;
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);

  const first = messages[0]?.id;
  const tail = messages[messages.length - 1];
  const last = tail?.id;
  const tailText = tail?.text.length;
  const tailSteps = tail?.steps?.length;
  // The ends and the height of the list at the last layout: earlier messages
  // loaded above it keep the place of the list.
  const lastLayout = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  // The list follows new messages and the growth of the last one: the dependencies are the trigger.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const was = lastLayout.current;
    // history is prepended when the start of the list changed and its end did not;
    // another conversation changes both
    const prepended = was.first !== undefined && first !== was.first && last === was.last;
    el.scrollTop = prepended ? el.scrollTop + (el.scrollHeight - was.height) : el.scrollHeight;
    lastLayout.current = { first, last, height: el.scrollHeight };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the length and the growth of the tail only trigger
  }, [messages.length, first, last, tailText, tailSteps]);

  // R4: "/" at the start of the field without a space opens the palette
  const query = props.commands && !skill && text.startsWith("/") && !/\s/.test(text) ? text.slice(1) : null;
  const items = query !== null ? matchCommands(props.commands ?? [], query) : [];
  const paletteOpen = query !== null && !paletteClosed;

  const clear = () => {
    setText("");
    setPending([]);
    setSkill(null);
    setUnknown(null);
    voice.current = false;
  };

  const runCommand = async (name: string, rest: string) => {
    if (!props.onCommand) return;
    try {
      await props.onCommand(name, rest);
      clear();
    } catch {
      // the product has told the user; the text stays
    }
  };

  const send = async (body: string, asText = false) => {
    const msg = body.trim();
    if ((!msg && pending.length === 0 && !skill) || busy || props.readOnly) return;
    // R4: a command typed in full runs; an unknown one waits for «Send as text»
    if (!asText && !skill && props.commands && msg.startsWith("/")) {
      const [word, ...rest] = msg.slice(1).split(/\s+/);
      const cmd = props.commands.find((c) => c.kind === "command" && c.name === word);
      if (cmd) return runCommand(cmd.name, rest.join(" "));
      if (word && !msg.includes("\n")) {
        setUnknown("/" + word);
        return;
      }
    }
    try {
      await props.onSend(msg, pending.map((f) => f.id), voice.current, skill ?? undefined);
      clear();
    } catch {
      // the product has told the user; the text stays in the composer
    }
  };

  const pick = (c: ChatCommand) => {
    setActive(0);
    if (c.kind === "skill") {
      setSkill(c.name);
      setText("");
    } else if (c.takesText) {
      setText("/" + c.name + " ");
    } else {
      void runCommand(c.name, "");
    }
    fieldRef.current?.focus();
  };

  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteOpen && items.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setActive((a) => (a + d + items.length) % items.length);
        return;
      }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        e.preventDefault();
        pick(items[Math.min(active, items.length - 1)]);
        return;
      }
    }
    if (paletteOpen && e.key === "Escape") {
      e.preventDefault();
      setPaletteClosed(true);
      return;
    }
    if (e.key === "Backspace" && skill && text === "") {
      setSkill(null); // design §3.1: Backspace in the empty field takes the skill off
      return;
    }
    // FTR.NAB.CHAT-0001 design §3.1: on a touch screen Enter is a new line, the message goes by its button
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touchKeyboard()) {
      e.preventDefault();
      void send(text);
    }
  };

  // design §3.1: the field grows with its lines up to three, then scrolls (its max-height in CSS); a change of
  // its width (a turned phone, a resized panel) wraps the lines anew
  useLayoutEffect(() => keepListEnd(listRef.current, () => fitField(fieldRef.current)), [text]);
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        keepListEnd(listRef.current, () => fitField(el));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recorder.recording]);

  const attach = async (files: FileList | null) => {
    if (!files?.length || !props.onUpload) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      if (props.upload && f.size > props.upload.maxBytes) {
        toast({ kind: "error", title: t("chat.tooLarge"), text: f.name });
        continue;
      }
      const a = await props.onUpload(f).catch(() => null);
      if (a) setPending((x) => [...x, a]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // R20: the recognized text goes into the field; the user checks and sends it
  async function stopAndTranscribe() {
    const blob = await recorder.stop();
    if (!blob || !props.onTranscribe) return;
    await transcribe(blob, props.onTranscribe, {
      busy: setRecognizing,
      empty: () => toast({ kind: "error", title: t("chat.voice.notRecognized") }),
      // design §3.1: the recording stays until the toast is closed
      failed: (reason, retry) => toast({ kind: "error", title: reason ?? t("chat.voice.failed"), actions: [{ label: t("chat.voice.retry"), primary: true, onClick: retry }] }),
      text: (r) => {
        voice.current = true;
        setText((x) => (x.trim() ? x.trimEnd() + " " + r : r));
        fieldRef.current?.focus();
      },
    });
  }

  const voiceKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && recorder.recording) {
      e.preventDefault();
      recorder.cancel();
    }
  };

  const placeholder = skill ? t("chat.skillPlaceholder") : (props.placeholder ?? t("chat.placeholder", { name: props.agentName }));
  const left = maxSeconds - recorder.seconds;
  return (
    <section className="nb-chat" aria-label={t("chat.title")}>
      {props.header}
      <div className="msgs" ref={listRef} aria-live="polite">
        {props.hasOlder && props.onLoadOlder && (
          <button className="btn ghost sm" style={{ alignSelf: "center" }} disabled={props.loadingOlder} onClick={props.onLoadOlder}>
            {t("chat.loadOlder")}
          </button>
        )}
        {props.historyError && <div className="err-text">{props.historyError}</div>}
        {messages.length === 0 && !props.loading && !props.historyError && (props.empty ??
          <div className="empty"><div className="ic"><Icon name="spark" /></div><b>{t("chat.emptyTitle", { name: props.agentName })}</b>{props.emptyHint}</div>
        )}
        {messages.map((m) => <MessageView key={m.id} m={m} busy={busy} onRetry={props.onRetry && (() => props.onRetry?.(m.id))}
          loadAttachment={loadFile} onOpenAttachment={setViewing} />)}
        {props.onConfirm && (props.confirmations ?? []).map((c) => (
          <div className="confirm" key={c.id} role="group" aria-label={t("chat.confirm.title")}>
            <div className="h"><Icon name="alert" size={16} />{t("chat.confirm.title")}</div>
            <div>{t("chat.confirm.text", { action: c.summary })}</div>
            {c.preview !== undefined && <pre>{c.preview}</pre>}
            <div className="acts">
              {/* never tied to `busy`: the agent asks in the middle of its turn */}
              <button className="btn sm primary" onClick={() => props.onConfirm?.(c.id, true)}>{t("chat.confirm.approve")}</button>
              <button className="btn sm" onClick={() => props.onConfirm?.(c.id, false)}>{t("chat.confirm.reject")}</button>
            </div>
          </div>
        ))}
      </div>

      {props.readOnly ? (
        <div className="composer" style={{ justifyContent: "space-between", alignItems: "center" }}>{props.readOnly}</div>
      ) : (
        <div className="composer-wrap">
          {paletteOpen && <CommandPalette items={items} active={Math.min(active, Math.max(items.length - 1, 0))} onPick={pick} onHover={setActive} />}
          {props.aboveComposer}
          {pending.length > 0 && (
            <div className="pending-files">
              {pending.map((f) => (
                <span key={f.id} className="chip">
                  <Icon name="clip" size={12} />{f.fileName}
                  <button className="iconbtn" style={{ width: 18, height: 18 }} aria-label={t("remove")}
                    onClick={() => setPending((x) => x.filter((y) => y.id !== f.id))}><Icon name="x" size={12} /></button>
                </span>
              ))}
            </div>
          )}
          {unknown && (
            <div className="cmd-unknown" role="status">
              {t("chat.unknownCommand", { name: unknown })}
              <button type="button" className="textbtn" onClick={() => void send(text, true)}>{t("chat.sendAsText")}</button>
            </div>
          )}
          <div className="composer">
            {props.onUpload && !recorder.recording && (
              <>
                <button className="iconbtn" aria-label={t("chat.attach")} disabled={uploading} onClick={() => fileRef.current?.click()}><Icon name="clip" /></button>
                <input ref={fileRef} type="file" multiple hidden accept={props.upload?.accept} onChange={(e) => attach(e.target.files)} />
              </>
            )}
            {recorder.recording ? (
              <div className={`recbar${left <= 15 ? " ending" : ""}`} role="status" aria-label={t("chat.voice.recordingNow")}>
                <span className="dot" aria-hidden="true" />
                <span className="tm">{clock(recorder.seconds)} / {clock(maxSeconds)}</span>
                <span className="lvl" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.04, recorder.level)})` }} /></span>
                <button type="button" className="btn ghost sm" onClick={recorder.cancel}>{t("cancel")}</button>
                <button type="button" className="btn primary sm" onKeyDown={voiceKey} onClick={() => void stopAndTranscribe()}>{t("chat.voice.done")}</button>
              </div>
            ) : (
              <div className={`field${skill ? " with-skill" : ""}${recognizing ? " recognizing" : ""}`} aria-busy={recognizing || undefined}>
                {skill && (
                  <span className="chip skill-chip">
                    <Icon name="spark" size={12} />{skill}
                    <button className="iconbtn" style={{ width: 18, height: 18 }} aria-label={t("remove")} onClick={() => setSkill(null)}><Icon name="x" size={12} /></button>
                  </span>
                )}
                <textarea ref={fieldRef} rows={1} value={text} placeholder={recognizing ? t("chat.voice.recognizing") : placeholder} aria-label={placeholder}
                  disabled={recognizing} aria-expanded={paletteOpen} aria-autocomplete={props.commands ? "list" : undefined}
                  onChange={(e) => { setText(e.target.value); setPaletteClosed(false); setActive(0); setUnknown(null); }}
                  onKeyDown={keys} />
              </div>
            )}
            {props.context && !recorder.recording && <ContextMeter context={props.context} onCompact={props.onCompact} onReset={props.onReset} busy={turnRunning} />}
            {props.onTranscribe && !recorder.recording && (
              <VoiceButton supported={recorder.supported} recognizing={recognizing} onStart={() => void recorder.start()} />
            )}
            {!recorder.recording && (props.onCancel && busy ? (
              <button className="iconbtn fill" aria-label={t("chat.stop")} onClick={props.onCancel}><Icon name="stop" /></button>
            ) : (
              <button className="iconbtn fill" aria-label={t("chat.send")} disabled={(!text.trim() && pending.length === 0 && !skill) || busy || recognizing} onClick={() => send(text)}>
                <Icon name="send" />
              </button>
            ))}
          </div>
          {recorder.error && <div className="err-text" style={{ padding: "0 12px 8px" }}>{t("chat.voice.micDenied")}</div>}
        </div>
      )}
      {viewing && loadFile && <AttachmentPreview a={viewing} load={loadFile} onClose={() => setViewing(null)} />}
    </section>
  );
}

// design §3.1: while the server recognizes a recording the microphone gives way
// to a wave, so the user sees the voice is being processed
export function VoiceButton({ supported, recognizing, onStart }: { supported: boolean; recognizing: boolean; onStart: () => void }) {
  const t = useKitT();
  if (recognizing) {
    return (
      <span className="voicewait" role="status" aria-label={t("chat.voice.recognizing")} title={t("chat.voice.recognizing")}>
        <i /><i /><i /><i /><i />
      </span>
    );
  }
  return (
    <button className="iconbtn" disabled={!supported}
      aria-label={t("chat.voice.start")} title={supported ? t("chat.voice.start") : t("chat.voice.unsupported")}
      onClick={onStart}>
      <Icon name="mic" />
    </button>
  );
}

/** A touch screen without a mouse: its on-screen keyboard has no Shift+Enter, so Enter breaks the line. */
function touchKeyboard(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
}

/** A list scrolled to its end (within the rounding of a pixel). */
const atEnd = (list: HTMLElement) => list.scrollHeight - list.scrollTop - list.clientHeight < 2;

/** FTR.NAB.CHAT-0001 design §3.1: the list of messages gets lower as the field grows; a list read to its end stays at
 * its end, so the last message is not hidden under the field, and a list scrolled up stays where it is. */
function keepListEnd(list: HTMLElement | null, change: () => void) {
  const pinned = !!list && atEnd(list);
  change();
  if (list && pinned) list.scrollTop = list.scrollHeight;
}

/** FTR.NAB.CHAT-0001 design §3.1: sets the height of the field to its lines; the CSS bounds it to three. */
function fitField(el: HTMLTextAreaElement | null) {
  if (!el) return;
  // measured without a scrollbar: a scrollbar that takes room (Windows) would add to the height it is measured by
  el.style.overflowY = "hidden";
  el.style.height = "auto";
  const full = el.scrollHeight + el.offsetHeight - el.clientHeight;
  el.style.height = `${full}px`;
  // the bar appears only past three lines, where the CSS stops the field
  el.style.overflowY = el.offsetHeight < full ? "auto" : "hidden";
}
