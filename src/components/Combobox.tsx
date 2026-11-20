import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useKitT } from "../i18n";
import { Icon, type IconName } from "./Icon";
import { useOutside } from "./ui";

/** A suggestion: `hint` is grey text after the label (an email), `meta` the grey text at the right (a count). */
export type ComboItem = { id: string; label: string; hint?: string; meta?: string; group?: string; icon?: IconName };

/** The text folded for a match: case and «ё» do not matter (FTR.NAB.MEM-0001 R22). */
export const fold = (s: string) => s.toLocaleLowerCase().replaceAll("ё", "е");

/** The label with the part that matches the query in bold. */
export function highlight(label: string, query: string): ReactNode {
  const q = fold(query.trim());
  const i = q ? fold(label).indexOf(q) : -1;
  if (i < 0) return label;
  return <>{label.slice(0, i)}<b>{label.slice(i, i + q.length)}</b>{label.slice(i + q.length)}</>;
}

/** The items in the order they are shown: by the order of `groups`, then those of no known group. */
function ordered(items: ComboItem[], groups?: { id: string; label: string }[]): ComboItem[] {
  if (!groups) return items;
  const known = new Set(groups.map((g) => g.id));
  return [...groups.flatMap((g) => items.filter((it) => it.group === g.id)), ...items.filter((it) => !known.has(it.group ?? ""))];
}

/** `.combo`: a field with suggestions loaded by the product (FTR.NAB.MEM-0001 R22, design §3.4). The suggestions
 * come after `minChars` characters and a pause of `debounceMs`; a new query cancels the last one, and the answer to
 * another query is never shown or chosen. The keyboard of a combobox: the arrows move through the groups, Enter
 * chooses, Escape closes the list, a second Escape clears the field; Escape stops there, so a dialog around the
 * field stays open. `load` may be a new function on every render. */
export function Combobox({ load, onSelect, placeholder, ariaLabel, groups, minChars = 1, debounceMs = 200 }: {
  load: (q: string, signal: AbortSignal) => Promise<ComboItem[]>;
  onSelect: (item: ComboItem) => void;
  placeholder: string; ariaLabel: string;
  groups?: { id: string; label: string }[];
  minChars?: number; debounceMs?: number;
}) {
  const t = useKitT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const loader = useRef(load);
  useEffect(() => { loader.current = load; });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // the last answer and the query it answers: only the answer to the query in the field is shown
  const [answer, setAnswer] = useState<{ q: string; items: ComboItem[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutside<HTMLDivElement>(open, close);

  const query = q.trim();
  const ready = query.length >= minChars;
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      loader.current(query, ctl.signal).then((items) => {
        if (ctl.signal.aborted) return;
        setAnswer({ q: query, items });
        setFailed(null);
        setActive(0);
      }, () => { if (!ctl.signal.aborted) setFailed(query); });
    }, debounceMs);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [query, ready, debounceMs, attempt]);

  const current = answer?.q === query ? ordered(answer.items, groups) : null;
  const phase = failed === query ? "error" : current ? "done" : "loading";
  const shown = open && ready;
  const choose = (it: ComboItem | undefined) => {
    if (!it) return;
    onSelect(it);
    setQ("");
    setAnswer(null);
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (current?.length) setActive((i) => (e.key === "ArrowDown" ? Math.min(current.length - 1, i + 1) : Math.max(0, i - 1)));
    } else if (e.key === "Enter") {
      if (shown && phase === "done" && current?.[active]) { e.preventDefault(); choose(current[active]); }
    } else if (e.key === "Escape" && (shown || q)) {
      e.preventDefault();
      e.stopPropagation();
      if (shown) setOpen(false);
      else setQ("");
    }
  };

  const option = (it: ComboItem, i: number) => (
    <div key={it.id} id={`${id}-${i}`} role="option" aria-selected={i === active} className={`select-opt${i === active ? " active" : ""}`}
      onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(it)}>
      {it.icon && <Icon name={it.icon} size={14} />}
      <span className="select-val">{highlight(it.label, query)}{it.hint && <span className="muted"> {it.hint}</span>}</span>
      {it.meta && <span className="combo-meta">{it.meta}</span>}
    </div>
  );
  const at = (it: ComboItem) => current?.indexOf(it) ?? -1;
  const known = new Set(groups?.map((g) => g.id));

  return (
    <div className="combo" ref={ref}>
      <Icon name="search" size={14} />
      <input ref={input} className="inp" value={q} placeholder={placeholder} aria-label={ariaLabel}
        role="combobox" aria-expanded={shown} aria-autocomplete="list" aria-controls={shown ? `${id}-list` : undefined}
        aria-activedescendant={shown && current?.length ? `${id}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {q && (
        <button type="button" className="combo-clear" aria-label={t("combo.clear")} onClick={() => { setQ(""); input.current?.focus(); }}>
          <Icon name="x" size={14} />
        </button>
      )}
      {shown && (
        <div className="select-list combo-list" id={`${id}-list`} role="listbox" aria-label={ariaLabel} aria-busy={phase === "loading"}>
          {phase === "loading" && <div className="combo-state"><span className="spin" />{t("loading")}</div>}
          {phase === "error" && (
            <div className="combo-state">{t("combo.error")}
              <button type="button" className="linkish" onMouseDown={(e) => e.preventDefault()} onClick={() => { setFailed(null); setAttempt((a) => a + 1); }}>{t("combo.retry")}</button>
            </div>
          )}
          {phase === "done" && !current?.length && <div className="combo-state">{t("combo.none")}</div>}
          {phase === "done" && current && (groups
            ? <>
              {groups.map((g) => {
                const of = current.filter((it) => it.group === g.id);
                return of.length ? (
                  <div key={g.id} role="group" aria-labelledby={`${id}-g-${g.id}`}>
                    <div className="combo-group" id={`${id}-g-${g.id}`}>{g.label}</div>
                    {of.map((it) => option(it, at(it)))}
                  </div>
                ) : null;
              })}
              {current.filter((it) => !known.has(it.group ?? "")).map((it) => option(it, at(it)))}
            </>
            : current.map(option))}
        </div>
      )}
    </div>
  );
}
