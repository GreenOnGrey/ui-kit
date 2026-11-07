// The sections of the showcase: the one list the contents, the page and the
// snapshots (e2e/visual.spec.ts) are built from, so a section cannot be left
// without a snapshot.
export const SECTIONS = [
  ["tokens", "Tokens"], ["type", "Typography"], ["buttons", "Buttons"], ["forms", "Fields and forms"], ["chips", "Chips and tabs"],
  ["data", "Data"], ["messages", "Messages"], ["overlay", "Menus and modals"], ["toasts", "Toasts"], ["avatars", "Avatars"],
  ["icons", "Icons"], ["topbar", "Top bar"], ["login", "Sign-in"], ["chat", "Chat"], ["states", "States"], ["markdown", "Markdown"], ["graph", "Graph"], ["graph-directed", "Graph: directed"], ["graph-rows", "Graph: rows"],
] as const;

export type SectionId = (typeof SECTIONS)[number][0];
export const SECTION_TITLE = Object.fromEntries(SECTIONS) as Record<SectionId, string>;
