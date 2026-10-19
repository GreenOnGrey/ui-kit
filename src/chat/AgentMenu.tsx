import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../components/Icon";
import { useOutside } from "../components/ui";
import { useKitT } from "../i18n";

/** One of the ways an agent can look and talk; what it means only the product knows (R7). */
export interface AgentOption { key: string; label: string; icon: IconName }

/** A model the user may choose for the agent (FTR.NAB.CHAT-0001 R16, design §3.3). */
export interface AgentModelOption {
  key: string;
  label: string;
  /** The connection or the default model, grey under the name. */
  sub?: string;
  /** The capabilities: images, reasoning, the window. */
  badges?: { icon?: IconName; text: string }[];
  /** Under the row of the chosen model: the context will be compacted. */
  warn?: ReactNode;
}

/** The block «Model» of the menu: one model is shown without a choice; none — the text of the product. */
export interface AgentModels {
  label: ReactNode;
  options: AgentModelOption[];
  value: string;
  onPick: (key: string) => void;
  empty?: ReactNode;
}

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
export function AgentMenu({ label, name, options, value, optionsLabel, hint, narrow, models, onRename, onPick, onClose }: {
  /** The name of the dialog for a screen reader. */
  label: string;
  name: string;
  options: AgentOption[];
  value: string;
  optionsLabel: ReactNode;
  hint?: ReactNode;
  /** A narrow place — a side panel: the options go in one column. */
  narrow?: boolean;
  /** The choice of the model after the options. */
  models?: AgentModels;
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
      {models && (
        <>
          <div className="lab" style={{ marginTop: 14 }}>{models.label}</div>
          {models.options.length === 0 && <div className="hint">{models.empty}</div>}
          <div className="agentmodels" role="radiogroup">
            {models.options.map((m) => {
              const single = models.options.length === 1;
              const on = single || models.value === m.key;
              return (
                <button key={m.key} type="button" role="radio" aria-checked={on} disabled={single} className={`agentmodel${on ? " on" : ""}`}
                  onClick={() => !on && models.onPick(m.key)}>
                  {!single && <span className={`radio${on ? " on" : ""}`} aria-hidden="true" />}
                  <span className="body">
                    <span className="nm">{m.label}</span>
                    {m.sub && <span className="sub">{m.sub}</span>}
                    {m.badges && m.badges.length > 0 && (
                      <span className="badges">
                        {m.badges.map((b) => <span key={b.text} className="cap">{b.icon && <Icon name={b.icon} size={11} />}{b.text}</span>)}
                      </span>
                    )}
                    {on && m.warn && <span className="warn">{m.warn}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {hint && <div className="hint" style={{ marginTop: 10 }}>{hint}</div>}
    </div>
  );
}
