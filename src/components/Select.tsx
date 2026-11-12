import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useOutside } from "./ui";

export type SelectOption<V extends string> = { value: V; label: ReactNode };

/** `.select`: the choice of one value from a list drawn by the kit, not by the browser — the list follows the
 * theme (FTR.NAB.CMN-0005 tech §3.3). The keyboard of a listbox: arrows, Home and End move, Enter and
 * Space choose, Escape and Tab close; a click outside closes. `label` names the list for a screen reader; the field
 * is read as the label and the chosen value. The list is placed fixed by the field, so a scrolling panel does not cut
 * it; without room below it opens upwards. */
export function Select<V extends string>({ value, options, onChange, label, small, className }: {
  value: V; options: SelectOption<V>[]; onChange: (value: V) => void; label: string; small?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutside<HTMLDivElement>(open, close);
  const current = Math.max(0, options.findIndex((o) => o.value === value));
  const [place, setPlace] = useState<CSSProperties>({});

  // the place of the list by the field; a scroll or a resize of the window closes it, as a native select does
  const measure = () => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 200 && above > below;
    setPlace({ position: "fixed", left: r.left, minWidth: r.width, maxHeight: Math.min(280, Math.max(up ? above : below, 120)),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    const resize = () => setOpen(false);
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("scroll", away, true); window.removeEventListener("resize", resize); };
  }, [open]);

  const show = () => {
    measure();
    setActive(current);
    setOpen(true);
    requestAnimationFrame(() => list.current?.focus());
  };
  const pick = (i: number) => {
    setOpen(false);
    button.current?.focus();
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };
  const move = (i: number) => {
    setActive(i);
    list.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${i}`)}`)?.scrollIntoView({ block: "nearest" });
  };
  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const to = e.key === "ArrowDown" ? Math.min(active + 1, last) : e.key === "ArrowUp" ? Math.max(active - 1, 0)
      : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to >= 0) {
      e.preventDefault();
      move(to);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={`select${small ? " sm" : ""}${className ? ` ${className}` : ""}`} ref={ref}>
      <span id={`${id}-label`} hidden>{label}</span>
      <button type="button" className="select-btn" ref={button} aria-haspopup="listbox" aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`} aria-controls={open ? `${id}-list` : undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onButtonKey}>
        <span className="select-val" id={`${id}-value`}>{options[current]?.label}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div className="select-list" id={`${id}-list`} role="listbox" aria-label={label} tabIndex={-1} ref={list} onKeyDown={onListKey} style={place}
          aria-activedescendant={`${id}-${active}`}>
          {options.map((o, i) => (
            <div key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value}
              className={`select-opt${i === active ? " active" : ""}`} onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)}>
              <span className="select-val">{o.label}</span>
              {o.value === value && <Icon name="check" size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
