# Changelog

Versions follow semver. A visible change of the look is at least a minor (FTR.NAB.CMN-0005 R24).
Until `1.0.0` — the version on which Nabu shows no visible difference — the contract may change in a minor.

## 0.2.0

A visible change.

- `.page` scrolls across the whole width: on a wide screen its scrollbar stands at the edge of the
  window, not at the edge of the column of the content. The content keeps its place and its width
  (1180px, 1320px for `.page.wide`).

## 0.1.4

Nothing changes for a product: the package is the one of 0.1.3.

- Showcase: the logo of Green on Grey in the header and as the icon of the page.

## 0.1.3

Nothing visible changes.

- Chat: the buttons of a confirmation no longer wait for the end of the turn. The agent asks in
  the middle of its turn, so buttons tied to `busy` could never be pressed.

## 0.1.2

Nothing visible changes.

- Chat: earlier messages are recognised by the ends of the list — its start changed and its end
  did not — so the list goes to the bottom when another conversation is shown.
- Release: publishing skips a version that is already in the registry, so a rerun still delivers
  the showcase.
- No lint warnings.

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
