import type { ChatConfirmation, ChatConversation, ChatMessage } from "../src/chat";

// Invented data of the showcase: the chat and the sign-in work without a server.

export const conversations: ChatConversation[] = [
  { id: "main", group: "main", title: "Main", when: "now" },
  { id: "release", group: "topic", title: "Release 1.4", unread: 2, when: "5 min" },
  { id: "mail", group: "topic", title: "A letter from a supplier", icon: "mail", when: "yesterday" },
  { id: "old", group: "archive", title: "Moving to pods", when: "Oct 3" },
];

const at = (hm: string) => `2026-10-11T${hm}:00`;

export const history: ChatMessage[] = [
  { id: "u1", role: "user", text: "Which requirements are not covered by tests yet?", createdAt: at("14:02"), status: "done",
    mark: { icon: "files", text: "about the specification FTR.NAB.CMN-0005" } },
  { id: "a1", role: "assistant", createdAt: at("14:02"), status: "done",
    steps: [
      { id: "s1", text: "Specifications: reading FTR.NAB.CMN-0005", status: "done" },
      { id: "s2", text: "Specifications: searching the test specification", status: "done" },
    ],
    text: "Three requirements have no tests yet:\n\n- **R17**: the list of changes\n- **R23**: no overrides\n- **R26**: a version lagging behind\n\n| Requirement | Test |\n|---|---|\n| R17 | `HMR-01` |\n| R23 | `CHK-01` |" },
  { id: "u2", role: "user", text: "Remind me about the review tomorrow at 10", createdAt: at("14:10"), status: "done",
    mark: { icon: "tg", text: "Telegram" }, attachments: [{ id: "f1", fileName: "plan.pdf", href: "#" }] },
  { id: "a2", role: "assistant", createdAt: at("14:10"), status: "done", mark: { icon: "tg", text: "Telegram" },
    steps: [1, 2, 3, 4, 5].map((n) => ({ id: `t${n}`, text: `Tasks: step ${n}`, status: n === 4 ? "error" as const : "done" as const })),
    text: "Done: I will remind you tomorrow at 10:00." },
  { id: "n1", role: "note", text: "You approved: sending the letter", createdAt: at("14:11"), status: "done" },
  { id: "u3", role: "user", text: "Collect a list of the changes", createdAt: at("14:12"), status: "done" },
  { id: "a3", role: "assistant", text: "", createdAt: at("14:12"), status: "failed",
    error: { text: "The model is temporarily unavailable. Try again.", transient: true } },
];

export const confirmations: ChatConfirmation[] = [
  { id: "c1", summary: "send a letter to the supplier", preview: '{ "to": "sales@example.com", "subject": "Invoice" }' },
];
