import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { UIKIT_NS } from "../i18n";
import { AttachmentList, type LoadAttachment } from "./Attachments";
import { intlLocale } from "./intl";
import type { ChatAttachment, ChatMessage, ChatStep } from "./types";


/** The time of a caption: hours and minutes in the language of the interface. */
export function markTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(intlLocale(language), { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** More than three steps are folded to the last two (design §6.4). */
export function visibleSteps(steps: ChatStep[], open: boolean): ChatStep[] {
  return open || steps.length <= 3 ? steps : steps.slice(-2);
}

/** The icon of a step and its colour class by the state of the step. */
const STEP = {
  done: { icon: "check", cls: "ok" },
  error: { icon: "alert", cls: "er" },
  running: { icon: "clock", cls: "run" },
} as const;

/** One message of the conversation (design §6.4). */
export function MessageView({ m, busy, onRetry, loadAttachment, onOpenAttachment }: {
  m: ChatMessage; busy: boolean; onRetry?: () => void;
  /** R34: the preview of the files; without it they are links. */
  loadAttachment?: LoadAttachment; onOpenAttachment?: (a: ChatAttachment) => void;
}) {
  const { t, i18n } = useTranslation(UIKIT_NS);
  const [open, setOpen] = useState(false);
  if (m.role === "note") return <div className="sysnote">{m.text}</div>;
  if (m.role === "event" && m.event) return <EventDivider m={m} />;
  const mark = m.mark && <div className="chan"><Icon name={m.mark.icon} size={12} /> {m.mark.text} · {markTime(m.createdAt, i18n.language)}</div>;
  const atts = m.attachments && m.attachments.length > 0 && (
    <AttachmentList items={m.attachments} load={loadAttachment} onOpen={onOpenAttachment} />
  );
  if (m.role === "user") {
    return (
      <div className="m u">
        {mark}
        {m.content}
        {m.text && <div className="bub">{m.text}</div>}
        {atts}
        {m.wait && (
          <div className={`turnstate${m.wait.state === "queued" ? " q" : ""}`} role="status">
            {m.wait.state === "queued"
              ? <><Icon name="clock" size={12} />{t("chat.wait.queued", { count: m.wait.position })}</>
              : <><span className="spin" aria-hidden="true" />{t("chat.wait.starting")}</>}
          </div>
        )}
      </div>
    );
  }
  const steps = m.steps ?? [];
  const waiting = (m.status === "streaming" || m.status === "pending") && !m.text && !m.content;
  return (
    <div className="m a">
      {mark}
      {steps.length > 3 && (
        <button className="tools-fold" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? t("chat.hideSteps") : t("chat.moreSteps", { count: steps.length - 2 })}
        </button>
      )}
      {visibleSteps(steps, open).map((s) => (
        <div key={s.id} className="tool" title={s.title}>
          <Icon name={STEP[s.status].icon} size={14} className={STEP[s.status].cls} />
          <span className="tx">{s.text}</span>
        </div>
      ))}
      {waiting && <div className="bub"><span className="typing" aria-label={t("chat.typing")}><i /><i /><i /></span></div>}
      {m.content ?? (m.text && <div className="bub" title={m.hint}><Markdown text={m.text} /></div>)}
      {atts}
      {m.error && (
        <div className={`llmerr${m.error.transient ? " amber" : ""}`} role="alert" style={{ marginTop: 6 }}>
          <span>{m.error.text}</span>
          {onRetry && (
            <div className="row">
              <button className="btn sm" disabled={busy} onClick={onRetry}><Icon name="refresh" size={14} />{t("chat.retry")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** An event of the conversation: a line with a chip; the details unfold
 * (FTR.NAB.CHAT-0001 design §3.2). */
function EventDivider({ m }: { m: ChatMessage }) {
  const { t, i18n } = useTranslation(UIKIT_NS);
  const [open, setOpen] = useState(false);
  const ev = m.event!;
  return (
    <div className="evdiv">
      <div className="evline" role="separator">
        <span className="evchip">
          <Icon name={ev.icon} size={12} />
          {ev.text} · {markTime(m.createdAt, i18n.language)}
          {ev.details && (
            <button type="button" className="textbtn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {t("chat.event.details")} {open ? "▴" : "▾"}
            </button>
          )}
        </span>
      </div>
      {open && ev.details && <div className="evdetails">{ev.details}</div>}
    </div>
  );
}
