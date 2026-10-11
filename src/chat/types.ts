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

export interface ChatAttachment extends ChatUpload { href: string }

export interface ChatStep { id: string; text: string; title?: string; status: "running" | "done" | "error" }

/** The caption over a message: the channel it came from or the context of the product. */
export interface ChatMark { icon: IconName; text: string }

export type ChatWait = { state: "starting" } | { state: "queued"; position: number };

export interface ChatMessage {
  id: string;
  /** `note` is a line of the system without a bubble: the outcome of a confirmation, a cancelled turn. */
  role: "user" | "assistant" | "note";
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
}

export interface ChatConfirmation { id: string; summary: string; preview?: string }

/** Give the chat a `key` of the conversation: its composer and its scroll belong to one conversation. */
export interface ChatProps {
  agentName: string;
  messages: ChatMessage[];
  /** The header of the conversation: the agent, the model, the menus of the product. */
  header?: ReactNode;
  /** The second line of the empty conversation. */
  emptyHint?: ReactNode;
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
  /** Resolves when the message is accepted (the composer is cleared); rejects to keep the text. */
  onSend(text: string, attachmentIds: string[], voice: boolean): Promise<void>;
  onLoadOlder?(): void;
  onRetry?(messageId: string): void;
  onCancel?(): void;
  onConfirm?(id: string, approve: boolean): void;
  /** `null`: the upload failed and the product has told the user. */
  onUpload?(file: File): Promise<ChatUpload | null>;
  /** The text of a recording; `null`: it failed and the product has told the user. */
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
