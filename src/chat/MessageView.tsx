import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { UIKIT_NS } from "../i18n";
import { AttachmentList, type LoadAttachment, type LoadOfficePreview } from "./Attachments";
import { intlLocale } from "./intl";
import type { ChatAttachment, ChatMessage, ChatStep, ChatSubagent } from "./types";


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
export function MessageView({ m, busy, onRetry, loadAttachment, loadPreview, onOpenAttachment, queuePosition, onCancelQueued, stopping }: {
  m: ChatMessage; busy: boolean; onRetry?: () => void;
  /** FTR.NAB.CHAT-0004 R1, R3: the number of a queued message and its cancellation. */
  queuePosition?: number; onCancelQueued?: () => void;
  /** R8: the user asked to stop this answer; it ends within seconds. */
  stopping?: boolean;
  /** R34: the preview of the files; without it they are links. */
  loadAttachment?: LoadAttachment; onOpenAttachment?: (a: ChatAttachment) => void;
  /** FTR.NAB.CHAT-0003: documents and spreadsheets open in the preview too. */
  loadPreview?: LoadOfficePreview;
}) {
  const { t, i18n } = useTranslation(UIKIT_NS);
  const [open, setOpen] = useState(false);
  if (m.role === "note") return <div className="sysnote">{m.text}</div>;
  if (m.role === "event" && m.event) return <EventDivider m={m} />;
  const mark = m.mark && <div className="chan"><Icon name={m.mark.icon} size={12} /> {m.mark.text} · {markTime(m.createdAt, i18n.language)}</div>;
  const atts = m.attachments && m.attachments.length > 0 && (
    <AttachmentList items={m.attachments} load={loadAttachment} office={!!loadPreview} onOpen={onOpenAttachment} />
  );
  if (m.role === "user") {
    return (
      <div className={`m u${m.queued ? " queued" : ""}`}>
        {mark}
        {m.content}
        {m.text && <div className="bub">{m.text}</div>}
        {atts}
        {m.queued && (
          <div className="qmark">
            <Icon name="clock" size={12} />{t("chat.queue.position", { n: queuePosition ?? 1 })}
            {onCancelQueued && (
              <button type="button" className="textbtn" onClick={onCancelQueued}><Icon name="x" size={12} />{t("chat.queue.cancel")}</button>
            )}
          </div>
        )}
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
  if (m.variant === "notice") return <NoticeView m={m} mark={mark} atts={atts} />;
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
      {visibleSteps(steps, open).map((s) => s.subagents && s.subagents.length > 0 ? <SubagentStep key={s.id} tasks={s.subagents} /> : (
        <div key={s.id} className="tool" title={s.title}>
          <Icon name={STEP[s.status].icon} size={14} className={STEP[s.status].cls} />
          <span className="tx">{s.text}</span>
        </div>
      ))}
      {waiting && !stopping && <div className="bub"><span className="typing" aria-label={t("chat.typing")}><i /><i /><i /></span></div>}
      {stopping && (m.status === "streaming" || m.status === "pending") && <div className="stopmark" role="status">{t("chat.stopping")}</div>}
      {m.content ?? (m.text && <div className="bub" title={m.hint}><Markdown text={m.text} /></div>)}
      {atts}
      {m.status === "stopped" && (
        <div className="stopmark">
          <Icon name="stop" size={12} />{t("chat.stopped")}
          {m.retryQueued
            ? <span className="qmark-inline"><Icon name="clock" size={12} />{t("chat.retryQueued")}</span>
            : onRetry && <button type="button" className="textbtn" disabled={busy} onClick={onRetry}>{t("chat.retry")}</button>}
        </div>
      )}
      {m.error && (
        <div className={`llmerr${m.error.transient ? " amber" : ""}`} role="alert" style={{ marginTop: 6 }}>
          <span>{m.error.text}</span>
          {m.retryQueued ? (
            <div className="row qmark-inline"><Icon name="clock" size={12} />{t("chat.retryQueued")}</div>
          ) : onRetry && (
            <div className="row">
              <button className="btn sm" disabled={busy} onClick={onRetry}><Icon name="refresh" size={14} />{t("chat.retry")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The icon and its colour class of a task of a subagent (FTR.NAB.CMN-0009 design §1). */
const TASK = {
  done: { icon: "check", cls: "ok" },
  failed: { icon: "x", cls: "er" },
  timeout: { icon: "stop", cls: "off" },
  aborted: { icon: "stop", cls: "off" },
} as const;

/** The step «Subagents · N» (FTR.NAB.CMN-0009 design §3): open while a task runs, then one line with the outcome;
 * a click opens the rows, a click on a row its result. */
export function SubagentStep({ tasks }: { tasks: ChatSubagent[] }) {
  const { t } = useTranslation(UIKIT_NS);
  const running = tasks.some((x) => x.state === "running");
  const [open, setOpen] = useState<boolean | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const unfolded = open ?? running;
  const failed = tasks.filter((x) => x.state !== "done" && x.state !== "running").length;
  return (
    <div className={`tool subagents${unfolded ? " open" : ""}`}>
      <button type="button" className="sa-head" aria-expanded={unfolded} onClick={() => setOpen(!unfolded)}>
        {running ? <span className="spin" aria-hidden="true" /> : <Icon name={failed ? "alert" : "check"} size={14} className={failed ? "er" : "ok"} />}
        <Icon name="users" size={14} />
        <span className="tx">
          {t("chat.subagents.title", { count: tasks.length })}
          {!running && <> — {failed ? t("chat.subagents.failed", { count: failed }) : t("chat.subagents.done")}</>}
        </span>
      </button>
      {unfolded && tasks.map((x) => (
        <div key={x.task} className="sa-task">
          <button type="button" className="sa-row" aria-expanded={shown === x.task} disabled={!x.result}
            onClick={() => setShown(shown === x.task ? null : x.task)}>
            {x.state === "running" ? <span className="spin" aria-hidden="true" /> : <Icon name={TASK[x.state].icon} size={12} className={TASK[x.state].cls} />}
            <span className="sa-desc">{x.description}</span>
            <span className="sa-meta">{t("chat.subagents.tools", { count: x.tools })} · <span className={`sa-state ${x.state}`}>{t(`chat.subagents.state.${x.state === "aborted" && !x.error ? "turnStopped" : x.state}`)}</span></span>
          </button>
          {x.error && x.state !== "running" && <div className="sa-err">{x.error}</div>}
          {shown === x.task && x.result && <div className="sa-result"><Markdown text={x.result} /></div>}
        </div>
      ))}
    </div>
  );
}

/** A notice longer than this many lines is folded (FTR.NAB.CHAT-0002 design §3.1). */
export const NOTICE_LINES = 12;

/** A notice of a product (FTR.NAB.CHAT-0002 design §3.1): on the left as an answer, a card with a
 * stripe, no retry, a long text folded. The content of the product, if any, replaces the text. */
function NoticeView({ m, mark, atts }: { m: ChatMessage; mark: ReactNode; atts: ReactNode }) {
  const { t } = useTranslation(UIKIT_NS);
  const [open, setOpen] = useState(false);
  const long = !m.content && m.text.split("\n").length > NOTICE_LINES;
  return (
    <div className="m a notice">
      {mark}
      {m.content ?? (
        <div className={`bub${long && !open ? " folded" : ""}`}>
          <Markdown text={m.text} />
          {long && (
            <button type="button" className="textbtn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {t(open ? "chat.notice.less" : "chat.notice.more")}
            </button>
          )}
        </div>
      )}
      {atts}
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
