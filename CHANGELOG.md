# Changelog

Versions follow semver. A visible change of the look is at least a minor (FTR.NAB.CMN-0005 R24).
Until `1.0.0` — the version on which Nabu shows no visible difference — the contract may change in a minor.

## 0.1.1

Nothing changes for a product: the package is the one of 0.1.0. The release of 0.1.0 did not
pass its checks and was not published.

- Showcase: the example of a panel stays inside its frame on a phone (it covered the whole page);
  the page no longer scrolls smoothly to a section.
- Tests: the demos of the chat are found by name, the place of a message is measured inside the
  list, pictures of the page do not count as requests of the chat.

## 0.1.0

Tagged, not published.

The first release: the kit taken from `nabu-web`.

- Styles: tokens, the light and the dark theme, base, the frame of an application, controls, forms,
  tables, the chat, the sign-in screen — `styles.css`, `tokens.css`.
- Components: `Icon` (the icons of both products), `Markdown`, `Button`, `IconButton`, `Tabs`, `Menu`,
  `TopBar`, `Modal`, `ToastProvider`, `Avatar`, `Switch`, `Empty`, `Loading`, `useOutside`.
- Chat: `Chat`, `ChatLayout`, `ConversationList`, `NewTopicModal`, `MessageView`, `useRecorder` and the view types.
- `LoginScreen`.
- Strings in en, ru, de, es, zh under the namespace `uikit`.
- `ui-kit-check` and `manifest.json`.
- The showcase.
