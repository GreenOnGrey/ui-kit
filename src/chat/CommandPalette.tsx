import { Icon } from "../components/Icon";
import { useKitT } from "../i18n";
import type { ChatCommand } from "./types";

/** The items of the palette that match what is typed after "/". */
export function matchCommands(commands: ChatCommand[], query: string): ChatCommand[] {
  const q = query.toLowerCase();
  return commands.filter((c) => c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
}

/** The palette of commands and skills over the composer (FTR.NAB.CHAT-0001 R4,
 * design §3.1). The composer owns the keys: arrows move `active`, Enter and Tab
 * pick it, Esc closes. */
export function CommandPalette({ items, active, onPick, onHover }: {
  items: ChatCommand[];
  active: number;
  onPick: (c: ChatCommand) => void;
  onHover: (i: number) => void;
}) {
  const t = useKitT();
  const commands = items.filter((c) => c.kind === "command");
  const skills = items.filter((c) => c.kind === "skill");
  const row = (c: ChatCommand, i: number) => (
    <button key={c.kind + c.name} type="button" role="option" aria-selected={i === active} className={`palette-row${i === active ? " on" : ""}`}
      // the field keeps the focus: the pick happens before the blur
      onMouseDown={(e) => { e.preventDefault(); onPick(c); }} onMouseEnter={() => onHover(i)}>
      {c.kind === "skill" ? <Icon name="spark" size={14} /> : <span className="slash">/</span>}
      <span className="nm">{c.kind === "command" ? "/" + c.name : c.name}</span>
      <span className="ds">{c.description}</span>
      {c.source && <span className="src">{c.source}</span>}
    </button>
  );
  return (
    <div className="palette" role="listbox" aria-label={t("chat.palette.title")}>
      {items.length === 0 && <div className="palette-empty">{t("chat.palette.empty")}</div>}
      {commands.length > 0 && <div className="palette-h">{t("chat.palette.commands")}</div>}
      {commands.map((c) => row(c, items.indexOf(c)))}
      {items.length > 0 && <div className="palette-h">{t("chat.palette.skills")}</div>}
      {skills.length === 0 && items.length > 0 && <div className="palette-empty">{t("chat.palette.noSkills")}</div>}
      {skills.map((c) => row(c, items.indexOf(c)))}
    </div>
  );
}
