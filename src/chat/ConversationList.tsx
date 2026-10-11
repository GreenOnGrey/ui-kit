import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { Modal } from "../components/ui";
import { useKitT } from "../i18n";
import type { ChatConversation, ConversationListProps } from "./types";

/** The conversations of the user: the main one, the topics, the archive (design
 * §6.2). In a wide place the list stands left of the messages; on a phone and in
 * a narrow place it lies over them while open and closes by a pick, a tap
 * beside it or Escape. */
export function ConversationList({ conversations, currentId, open, onPick, onClose, onCreate }: ConversationListProps) {
  const t = useKitT();
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const item = (c: ChatConversation) => (
    <button key={c.id} className={`it${c.id === currentId ? " on" : ""}${c.group === "archive" ? " arch" : ""}`}
      onClick={() => onPick(c.id)} aria-current={c.id === currentId}>
      <Icon name={c.icon ?? "msg2"} size={16} />
      <span className="nm">{c.title}</span>
      {!!c.unread && <span className="unread" aria-label={t("chat.unread", { count: c.unread })}>{c.unread}</span>}
      <span className="sub">{c.when}</span>
    </button>
  );
  const inGroup = (g: ChatConversation["group"]) => conversations.filter((c) => c.group === g);
  const topics = inGroup("topic");
  const archive = inGroup("archive");
  return (
    <>
      <nav className={`nb-side${open ? " open" : ""}`} aria-label={t("chat.conversations")}>
        {onCreate && (
          <button className="btn sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} />{t("chat.newTopic")}
          </button>
        )}
        <div className="h">{t("chat.conversation")}</div>
        {inGroup("main").map(item)}
        <div className="h">{t("chat.topics")}</div>
        {topics.length === 0 && <div className="small muted" style={{ padding: "0 10px" }}>{t("chat.noTopics")}</div>}
        {topics.map(item)}
        {archive.length > 0 && <div className="h">{t("chat.archive")}</div>}
        {archive.map(item)}
      </nav>
      {/* over the messages: a tap beside the list closes it */}
      {open && <button type="button" className="nb-scrim" aria-label={t("close")} onClick={onClose} />}
      {creating && onCreate && <NewTopicModal onClose={() => setCreating(false)} onCreate={onCreate} />}
    </>
  );
}

/** The place of a chat: the list of conversations, the conversation and what the
 * product puts beside them. `narrow` is for a side panel: the list lies over the
 * messages as on a phone, whatever the width of the window. */
export function ChatLayout({ narrow, children }: { narrow?: boolean; children: ReactNode }) {
  return <div className={`nb-app${narrow ? " narrow" : ""}`}>{children}</div>;
}

/** The dialog of a new topic: one field, Enter creates. */
export function NewTopicModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string) => Promise<void> }) {
  const t = useKitT();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await onCreate(title.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(false);
    }
  };
  return (
    <Modal title={t("chat.newTopic")} onClose={onClose} footer={<>
      <button className="btn ghost" onClick={onClose}>{t("cancel")}</button>
      <button className="btn primary" disabled={!title.trim() || pending} onClick={create}>{t("create")}</button>
    </>}>
      <div className="field">
        <label htmlFor="topic-title">{t("chat.topicTitle")}</label>
        <input id="topic-title" className="inp" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()} />
        <div className="hint">{t("chat.topicHint")}</div>
      </div>
      {error && <div className="err-text">{error}</div>}
    </Modal>
  );
}
