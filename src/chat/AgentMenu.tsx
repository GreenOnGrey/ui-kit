import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../components/Icon";
import { useOutside } from "../components/ui";
import { useKitT } from "../i18n";

/** One of the ways an agent can look and talk; what it means only the product knows (R7). */
export interface AgentOption { key: string; label: string; icon: IconName }

/** The round button of the agent: its icon, and the menu behind it. */
export function AgentButton({ icon, label, title, expanded, small, disabled, onClick }: {
  icon: IconName; label: string; title?: string; expanded?: boolean; small?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" className={`agentbtn${small ? " s" : ""}`} disabled={disabled} aria-label={label} aria-expanded={expanded} title={title}
      // the menu closes on an outside mousedown; keep this click a toggle
      onMouseDown={(e) => expanded && e.stopPropagation()} onClick={onClick}>
      <Icon name={icon} size={small ? 15 : 18} />
    </button>
  );
}

/** The menu of the agent (FTR.NAB.CMN-0005 R15, design §6.6): its name and a
 * choice among the options of the product, as tiles with icons. The name is
 * saved on Enter and on leaving the field; a pick is saved at once. */
export function AgentMenu({ label, name, options, value, optionsLabel, hint, narrow, onRename, onPick, onClose }: {
  /** The name of the dialog for a screen reader. */
  label: string;
  name: string;
  options: AgentOption[];
  value: string;
  optionsLabel: ReactNode;
  hint?: ReactNode;
  /** A narrow place — a side panel: the options go in one column. */
  narrow?: boolean;
  onRename: (name: string) => void;
  onPick: (key: string) => void;
  /** Must keep its identity between renders. */
  onClose: () => void;
}) {
  const t = useKitT();
  const [draft, setDraft] = useState(name);
  const ref = useOutside<HTMLDivElement>(true, onClose);
  const save = () => {
    const next = draft.trim();
    if (next && next !== name) onRename(next);
  };
  return (
    <div className={`agentmenu${narrow ? " narrow" : ""}`} ref={ref} role="dialog" aria-label={label}>
      <div className="lab">{t("agentName")}</div>
      <input className="inp" value={draft} maxLength={40} autoFocus aria-label={t("agentName")}
        onChange={(e) => setDraft(e.target.value)} onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      <div className="lab" style={{ marginTop: 14 }}>{optionsLabel}</div>
      <div className="agentoptions">
        {options.map((o) => (
          <button key={o.key} type="button" className={`agentoption${value === o.key ? " on" : ""}`} aria-pressed={value === o.key} onClick={() => onPick(o.key)}>
            <span className="ic"><Icon name={o.icon} size={15} /></span>
            {o.label}
          </button>
        ))}
      </div>
      {hint && <div className="hint" style={{ marginTop: 10 }}>{hint}</div>}
    </div>
  );
}
