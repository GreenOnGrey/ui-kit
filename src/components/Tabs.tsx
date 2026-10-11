import { useRef, type KeyboardEvent, type ReactNode } from "react";

/** `.tabs` with the keyboard of a tab list: arrows, Home and End move the choice. */
export function Tabs<K extends string>({ items, value, onChange, label }: {
  items: { key: K; label: ReactNode }[]; value: K; onChange: (key: K) => void; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((it) => it.key === value);
    const to = e.key === "ArrowRight" ? (i + 1) % items.length
      : e.key === "ArrowLeft" ? (i - 1 + items.length) % items.length
      : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(items[to].key);
    ref.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} ref={ref} onKeyDown={onKey}>
      {items.map((it) => (
        <button key={it.key} type="button" role="tab" aria-selected={it.key === value} tabIndex={it.key === value ? 0 : -1}
          className={it.key === value ? "on" : undefined} onClick={() => onChange(it.key)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
