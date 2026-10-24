import type { ReactNode } from "react";
import type { IconName } from "../components/Icon";

// The view types of the chat (FTR.NAB.CMN-0005 arch §5). The component never
// talks to a server: an adapter of the product turns the answers of its API and
// its events into these types and handles the actions of the user.

export interface ChatConversation {
  id: string;
  group: "main" | "topic" | "archive";
  title: string;
  /** The time of the last message, already worded by the product. */
  when?: string;
  unread?: number;
  icon?: IconName;
}

/** A file the user has attached to the message being written. */
export interface ChatUpload { id: string; fileName: string }

/** A file of a message: `href` downloads it; the type and the size choose and caption its preview
 * (FTR.NAB.CHAT-0001 R34). */
export interface ChatAttachment extends ChatUpload { href: string; mimeType?: string; size?: number }

export interface ChatStep { id: string; text: string; title?: string; status: "running" | "done" | "error" }

/** The caption over a message: the channel it came from or the context of the product. */
export interface ChatMark { icon: IconName; text: string }

export type ChatWait = { state: "starting" } | { state: "queued"; position: number };

/** An event of the conversation shown as a divider (FTR.NAB.CHAT-0001 design §3.2):
 * a reset of the context, a compaction, a change of the model. */
export interface ChatEvent {
  icon: IconName;
  text: string;
  /** Unfolded by a click: the summary of a compaction. */
  details?: string;
}

export interface ChatMessage {
  id: string;
  /** `note` is a line of the system without a bubble: the outcome of a confirmation, a cancelled turn.
   * `event` is a divider of the conversation (`event` is set). */
  role: "user" | "assistant" | "note" | "event";
  event?: ChatEvent;
  text: string;
  /** ISO time. */
  createdAt: string;
  status: "pending" | "streaming" | "done" | "failed";
  mark?: ChatMark;
  attachments?: ChatAttachment[];
  steps?: ChatStep[];
  wait?: ChatWait;
  error?: { text: string; transient: boolean };
  /** The content of the product inside the message: a mail card, a digest. */
  content?: ReactNode;
  /** `notice`: an answer that is a notice of a product, not words of the agent (FTR.NAB.CHAT-0002 R2):
   * a card with a stripe, without the actions of an answer, folded past `NOTICE_LINES` lines. */
  variant?: "notice";
  /** The tooltip of the bubble: the model of an answer (FTR.NAB.CHAT-0001 R18). */
  hint?: string;
}

export interface ChatConfirmation { id: string; summary: string; preview?: string }

/** An item of the palette of commands (FTR.NAB.CHAT-0001 R4): a command of the
 * conversation or a skill. */
export interface ChatCommand {
  kind: "command" | "skill";
  /** What is typed after "/": `new`, `compact`; the name of a skill. */
  name: string;
  description?: string;
  /** The source of a skill: the item of the catalog. */
  source?: string;
  /** A command that takes a text after it (`/compact <what to keep>`). */
  takesText?: boolean;
}

/** The fill of the context window of the conversation (R3). */
export interface ChatContext { tokens: number; window: number }

/** Give the chat a `key` of the conversation: its composer and its scroll belong to one conversation. */
export interface ChatProps {
  agentName: string;
  messages: ChatMessage[];
  /** The header of the conversation: the agent, the model, the menus of the product. */
  header?: ReactNode;
  /** The second line of the empty conversation. */
  emptyHint?: ReactNode;
  /** Replaces the whole empty conversation: the draft of a topic with its suggestions
   * (FTR.HMR.DISC-0001 design §3.2). `emptyHint` is then not used. */
  empty?: ReactNode;
  /** The placeholder of the composer instead of «Message to <agent>»; a picked skill keeps its own. */
  placeholder?: string;
  loading?: boolean;
  historyError?: ReactNode;
  hasOlder?: boolean;
  loadingOlder?: boolean;
  /** A turn is being sent or answered: sending and retrying wait. */
  busy?: boolean;
  /** Shown instead of the composer: why one cannot write here and what to do. */
  readOnly?: ReactNode;
  confirmations?: ChatConfirmation[];
  /** Over the composer: the modes of the chat of Hammurapi. */
  aboveComposer?: ReactNode;
  upload?: { maxBytes: number; accept?: string };
  /** The palette of "/": commands and skills; without it "/" is plain text. */
  commands?: ChatCommand[];
  /** Runs a command of the palette or one typed in full; rejects to keep the text. */
  onCommand?(name: string, text: string): Promise<void>;
  /** The fill of the context; with `onCompact` and `onReset` a full context offers them. */
  context?: ChatContext;
  onCompact?(): void;
  onReset?(): void;
  /** The longest recording in seconds (the recording stops by itself). */
  voiceMaxSeconds?: number;
  /** Resolves when the message is accepted (the composer is cleared); rejects to keep the text.
   * `skill` is the skill the user picked in the palette. */
  onSend(text: string, attachmentIds: string[], voice: boolean, skill?: string): Promise<void>;
  onLoadOlder?(): void;
  onRetry?(messageId: string): void;
  onCancel?(): void;
  onConfirm?(id: string, approve: boolean): void;
  /** `null`: the upload failed and the product has told the user. */
  onUpload?(file: File): Promise<ChatUpload | null>;
  /** Loads a file of a message for its preview (R34): images, PDF and Markdown open in the chat. Without it files are links. */
  loadAttachment?(attachment: ChatAttachment): Promise<Blob>;
  /** FTR.NAB.CHAT-0003 R13–R16: the preview of a document (PDF of its first pages) or of a spreadsheet (sheets).
   * Without it documents and spreadsheets download, as before. */
  loadPreview?(attachment: ChatAttachment): Promise<OfficePreview>;
  /** The files attached to the message being written, after every change. */
  onPendingChange?(uploads: ChatUpload[]): void;
  /** The text of a recording; `null`: it failed and the product has told the user. A rejection
   * with an `Error` is shown by the kit with its message and «Retry» on the same recording. */
  onTranscribe?(recording: Blob): Promise<string | null>;
}

export interface ConversationListProps {
  conversations: ChatConversation[];
  currentId?: string;
  /** In a narrow place and on a phone the list lies over the messages while open. */
  open: boolean;
  onPick(id: string): void;
  onClose(): void;
  /** Rejects with an Error whose message is shown in the dialog. */
  onCreate?(title: string): Promise<void>;
}

/** A cell of a sheet: the value as shown (`v`), its number (`n`) or a formula without a value (`f`). */
export interface SheetCell { v?: string; n?: number; f?: string }
/** A sheet of a spreadsheet in the preview (FTR.NAB.CHAT-0003 R14). */
export interface Sheet { name: string; rows: number; cols: number; cells: SheetCell[][]; merges: string[] }
/** The answer of a preview of an office file (FTR.NAB.CHAT-0003 tech §8.1). */
export type OfficePreview =
  | { state: "pending" }
  | { state: "error"; reason: "too_large" | "timeout" | "broken" | "busy"; limitMb?: number }
  | { state: "doc"; blob: Blob; shown: number; total: number | null; from: string }
  | { state: "sheet"; sheets: Sheet[] };
