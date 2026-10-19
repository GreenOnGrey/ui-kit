import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../components/Icon";
import { useOutside } from "../components/ui";
import { UIKIT_NS, useKitT } from "../i18n";
import type { ChatContext } from "./types";
import { intlLocale } from "./intl";

/** A number of tokens shortly: 42K, 1.2M in the language of the interface. */
export function tokens(n: number, lng: string): string {
  return new Intl.NumberFormat(intlLocale(lng), { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** The fill of the context window by a ring next to the send button
 * (FTR.NAB.CHAT-0001 R3, design §3.1): grey, amber from 70 %, red from 90 %.
 * A click shows the numbers; a full context (from 90 %) offers to compact or to reset, off while the agent answers. */
export function ContextMeter({ context, onCompact, onReset, busy = false }: {
  context: ChatContext; onCompact?: () => void; onReset?: () => void;
  /** A turn is being written: the actions wait for it. */
  busy?: boolean;
}) {
  const t = useKitT();
  const { i18n } = useTranslation(UIKIT_NS);
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const share = context.window > 0 ? Math.min(1, context.tokens / context.window) : 0;
  const pct = Math.round(share * 100);
  const level = share >= 0.9 ? "full" : share >= 0.7 ? "warn" : "";
  const r = 7;
  const c = 2 * Math.PI * r;
  const lng = i18n.language;
  return (
    <div className="ctxmeter" ref={ref}>
      <button type="button" className={`ctxring ${level}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        aria-label={t("chat.context.meter", { used: tokens(context.tokens, lng), total: tokens(context.window, lng), pct })}
        title={t("chat.context.meter", { used: tokens(context.tokens, lng), total: tokens(context.window, lng), pct })}>
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <circle className="bg" cx="9" cy="9" r={r} />
          <circle className="fg" cx="9" cy="9" r={r} strokeDasharray={`${(c * share).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 9 9)" />
        </svg>
      </button>
      {open && (
        <div className="ctxtip" role="dialog">
          <div>{t("chat.context.meter", { used: tokens(context.tokens, lng), total: tokens(context.window, lng), pct })}</div>
          {level === "full" && <div className="small muted" style={{ marginTop: 4 }}>{t("chat.context.full")}</div>}
          {level === "full" && (onCompact || onReset) && (
            <>
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {/* design §3.1: both actions, as buttons with their border */}
                {onCompact && <MeterAction icon="compress" label={t("chat.context.compact")} busy={busy}
                  run={() => { setOpen(false); onCompact(); }} />}
                {onReset && <MeterAction icon="reset" label={t("chat.context.reset")} busy={busy} run={() => { setOpen(false); onReset(); }} />}
              </div>
              {/* the reason is said in words: a disabled button shows no tooltip everywhere and is not read out */}
              {busy && <div id="ctx-wait" className="small muted" style={{ marginTop: 6 }}>{t("chat.context.waitTurn")}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** An action on the context: off while a turn runs, described by the reason under it. */
function MeterAction({ icon, label, busy, run }: { icon: IconName; label: string; busy: boolean; run: () => void }) {
  return (
    <button type="button" className="btn sm" disabled={busy} aria-describedby={busy ? "ctx-wait" : undefined} onClick={run}>
      <Icon name={icon} size={14} />{label}
    </button>
  );
}
