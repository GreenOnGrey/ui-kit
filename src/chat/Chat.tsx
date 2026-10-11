import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../components/Icon";
import { useToast } from "../components/ui";
import { useKitT } from "../i18n";
import { MessageView } from "./MessageView";
import type { ChatProps, ChatUpload } from "./types";
import { useRecorder } from "./useRecorder";

/** The conversation: the messages and the composer (FTR.NAB.CMN-0005 R11–R13,
 * design §6). The behaviour is the one of the chat of Nabu. A control exists
 * only when the product gave its handler: no `onCancel` — no cancel button. */
export function Chat(props: ChatProps) {
  const t = useKitT();
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ChatUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRecorder();
  const { messages, busy = false } = props;

  const first = messages[0]?.id;
  const tail = messages[messages.length - 1];
  const tailText = tail?.text.length;
  const tailSteps = tail?.steps?.length;
  // The first message and the height of the list at the last layout: earlier
  // messages loaded above it keep the place of the list.
  const lastLayout = useRef<{ first?: string; height: number }>({ height: 0 });
  // The list follows new messages and the growth of the last one: the dependencies are the trigger.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const was = lastLayout.current;
    // history is prepended when the message that was first is still there, lower
    const prepended = was.first !== undefined && first !== was.first && messages.some((m) => m.id === was.first);
    el.scrollTop = prepended ? el.scrollTop + (el.scrollHeight - was.height) : el.scrollHeight;
    lastLayout.current = { first, height: el.scrollHeight };
  }, [messages.length, first, tailText, tailSteps]); // oxlint-disable-line react/exhaustive-effect-dependencies

  const send = async (body: string, voice: boolean) => {
    const msg = body.trim();
    if ((!msg && pending.length === 0) || busy || props.readOnly) return;
    try {
      await props.onSend(msg, pending.map((f) => f.id), voice);
      setText("");
      setPending([]);
      setTranscript(null);
    } catch {
      // the product has told the user; the text stays in the composer
    }
  };

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

  const stopAndTranscribe = async () => {
    const blob = await recorder.stop();
    if (!blob || !props.onTranscribe) return;
    const r = await props.onTranscribe(blob).catch(() => null);
    if (r === null) return;
    if (!r) toast({ kind: "error", title: t("chat.voice.notRecognized") });
    else setTranscript(r);
  };
  // Without a pointer the same button starts and stops the recording (R18).
  const voiceKey = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat) return;
    if (recorder.recording) void stopAndTranscribe();
    else void recorder.start();
  };

  const placeholder = t("chat.placeholder", { name: props.agentName });
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
        {messages.length === 0 && !props.loading && !props.historyError && (
          <div className="empty"><div className="ic"><Icon name="spark" /></div><b>{t("chat.emptyTitle", { name: props.agentName })}</b>{props.emptyHint}</div>
        )}
        {messages.map((m) => <MessageView key={m.id} m={m} busy={busy} onRetry={props.onRetry && (() => props.onRetry?.(m.id))} />)}
        {props.onConfirm && (props.confirmations ?? []).map((c) => (
          <div className="confirm" key={c.id} role="group" aria-label={t("chat.confirm.title")}>
            <div className="h"><Icon name="alert" size={16} />{t("chat.confirm.title")}</div>
            <div>{t("chat.confirm.text", { action: c.summary })}</div>
            {c.preview !== undefined && <pre>{c.preview}</pre>}
            <div className="acts">
              <button className="btn sm primary" disabled={busy} onClick={() => props.onConfirm?.(c.id, true)}>{t("chat.confirm.approve")}</button>
              <button className="btn sm" disabled={busy} onClick={() => props.onConfirm?.(c.id, false)}>{t("chat.confirm.reject")}</button>
            </div>
          </div>
        ))}
      </div>

      {props.readOnly ? (
        <div className="composer" style={{ justifyContent: "space-between", alignItems: "center" }}>{props.readOnly}</div>
      ) : transcript !== null ? (
        <div className="transcript" style={{ margin: 10 }}>
          <div className="small muted" style={{ marginBottom: 4 }}>{t("chat.voice.review")}</div>
          <textarea className="inp" rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} aria-label={t("chat.voice.review")} />
          <div className="row2" style={{ marginTop: 8 }}>
            <button className="btn ghost sm" onClick={() => setTranscript(null)}>{t("delete")}</button>
            <button className="btn primary sm" disabled={!transcript.trim() || busy} onClick={() => send(transcript, true)}>{t("chat.send")}</button>
          </div>
        </div>
      ) : (
        <>
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
          <div className="composer">
            {props.onUpload && (
              <>
                <button className="iconbtn" aria-label={t("chat.attach")} disabled={uploading} onClick={() => fileRef.current?.click()}><Icon name="clip" /></button>
                <input ref={fileRef} type="file" multiple hidden accept={props.upload?.accept} onChange={(e) => attach(e.target.files)} />
              </>
            )}
            {recorder.recording ? (
              <div className="rec-box">{t("chat.voice.recording", { seconds: recorder.seconds })}</div>
            ) : (
              <textarea rows={1} value={text} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(text, false);
                  }
                }} />
            )}
            {props.onTranscribe && (
              <button className={`iconbtn${recorder.recording ? " rec" : ""}`} disabled={!recorder.supported}
                aria-label={recorder.recording ? t("chat.voice.stop") : t("chat.voice.hold")}
                title={recorder.supported ? t("chat.voice.hold") : t("chat.voice.unsupported")}
                onPointerDown={(e) => { e.preventDefault(); if (!recorder.recording) void recorder.start(); }}
                onPointerUp={() => recorder.recording && stopAndTranscribe()}
                onPointerLeave={() => recorder.recording && stopAndTranscribe()}
                onKeyDown={voiceKey}>
                <Icon name="mic" />
              </button>
            )}
            {props.onCancel && busy ? (
              <button className="iconbtn fill" aria-label={t("chat.stop")} onClick={props.onCancel}><Icon name="stop" /></button>
            ) : (
              <button className="iconbtn fill" aria-label={t("chat.send")} disabled={(!text.trim() && pending.length === 0) || busy} onClick={() => send(text, false)}>
                <Icon name="send" />
              </button>
            )}
          </div>
          {recorder.error && <div className="err-text" style={{ padding: "0 12px 8px" }}>{t("chat.voice.micDenied")}</div>}
        </>
      )}
    </section>
  );
}
