import type { ChatConfirmation, ChatConversation, ChatMessage } from "../src/chat";

// Invented data of the showcase: the chat and the sign-in work without a server.

export const conversations: ChatConversation[] = [
  { id: "main", group: "main", title: "Основной", when: "сейчас" },
  { id: "release", group: "topic", title: "Релиз 1.4", unread: 2, when: "5 мин" },
  { id: "mail", group: "topic", title: "Письмо от поставщика", icon: "mail", when: "вчера" },
  { id: "old", group: "archive", title: "Переезд на поды", when: "3 окт." },
];

const at = (hm: string) => `2026-10-11T${hm}:00`;

export const history: ChatMessage[] = [
  { id: "u1", role: "user", text: "Какие требования ещё не покрыты тестами?", createdAt: at("14:02"), status: "done",
    mark: { icon: "files", text: "о спецификации FTR.NAB.CMN-0005" } },
  { id: "a1", role: "assistant", createdAt: at("14:02"), status: "done",
    steps: [
      { id: "s1", text: "Спецификации: чтение FTR.NAB.CMN-0005", status: "done" },
      { id: "s2", text: "Спецификации: поиск по тестовой спецификации", status: "done" },
    ],
    text: "Без тестов остаются три требования:\n\n- **R17** — перечень изменений\n- **R23** — запрет переопределений\n- **R26** — отставание версии\n\n| Требование | Тест |\n|---|---|\n| R17 | `HMR-01` |\n| R23 | `CHK-01` |" },
  { id: "u2", role: "user", text: "Напомни завтра в 10 про ревью", createdAt: at("14:10"), status: "done",
    mark: { icon: "tg", text: "Telegram" }, attachments: [{ id: "f1", fileName: "план.pdf", href: "#" }] },
  { id: "a2", role: "assistant", createdAt: at("14:10"), status: "done",
    steps: [1, 2, 3, 4, 5].map((n) => ({ id: `t${n}`, text: `Задания: шаг ${n}`, status: n === 4 ? "error" as const : "done" as const })),
    text: "Готово: напомню завтра в 10:00." },
  { id: "n1", role: "note", text: "Вы подтвердили: отправка письма", createdAt: at("14:11"), status: "done" },
  { id: "u3", role: "user", text: "Собери перечень изменений", createdAt: at("14:12"), status: "done" },
  { id: "a3", role: "assistant", text: "", createdAt: at("14:12"), status: "failed",
    error: { text: "Модель временно недоступна. Повторите запрос.", transient: true } },
];

export const confirmations: ChatConfirmation[] = [
  { id: "c1", summary: "отправить письмо поставщику", preview: '{ "to": "sales@example.com", "subject": "Счёт" }' },
];
