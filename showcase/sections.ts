// The sections of the showcase: the one list the contents, the page and the
// snapshots (e2e/visual.spec.ts) are built from, so a section cannot be left
// without a snapshot.
export const SECTIONS = [
  ["tokens", "Токены"], ["type", "Типографика"], ["buttons", "Кнопки"], ["forms", "Поля и формы"], ["chips", "Чипы и вкладки"],
  ["data", "Данные"], ["messages", "Сообщения"], ["overlay", "Меню и модальные окна"], ["toasts", "Уведомления"], ["avatars", "Аватары"],
  ["icons", "Иконки"], ["topbar", "Верхняя панель"], ["login", "Вход"], ["chat", "Чат"], ["states", "Состояния"], ["markdown", "Markdown"],
] as const;

export type SectionId = (typeof SECTIONS)[number][0];
export const SECTION_TITLE = Object.fromEntries(SECTIONS) as Record<SectionId, string>;
