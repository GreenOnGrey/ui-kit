# Changelog

Versions follow semver. A visible change of the look is at least a minor (FTR.NAB.CMN-0005 R24).
Since `1.0.0` the contract of the kit — class names, tokens, props, icon names, keys of strings — changes only
in a major.

## 1.6.0

A visible change (FTR.NAB.CHAT-0001 design §3.1).

- Chat: in the menu of a full context (from 90 %) «Compact» and «Reset» are both buttons with their border, «Reset»
  with the new icon `reset` (a circular arrow, as in the mockup); they are off while a turn runs (`busy` of
  `ContextMeter`, string `chat.context.waitTurn`). The products drop their own menu of the conversation with the same
  actions.
- Chat: the field of the composer is measured without a scrollbar, so where a scrollbar takes room (Windows) the field
  is not higher than its lines; the bar appears only past three lines.
- Chat: the menu of the context meter says why its actions are off («Wait for the answer or stop it») in words under
  them, not only in a tooltip a disabled button may not show.
- Chat: the focus of the composer keeps a transparent outline, which the forced colours of Windows draw, so the focus
  stays seen there.
- Chat: the preview of an HTML page is laid out at the width of its content when it is wider than a desktop (a deck of
  wide slides) and scaled to the modal, so it has no scroll to the side. For that the frame has `allow-same-origin`
  (never `allow-scripts`); a page may no longer use `blob:` addresses, which would reach the files of the site.

## 1.5.0

A visible change (FTR.NAB.CHAT-0001 R34, design §3.6).

- Chat: the preview of an HTML page lays it out at the width of a desktop (1280 px) and scales it to
  the width of the modal, so a page made for a screen — a deck of slides — is seen whole instead of cut; the modal of
  an HTML page or a PDF is 1100 px wide (within the screen).
- Chat: a growing field of the composer keeps the list of messages at its end, so the last message is not hidden;
  the focus of the field is its own violet border instead of a ring around it, which read as a second frame.

## 1.4.0

A visible change (FTR.NAB.CHAT-0001 R34, design §3.6).

- Chat: an HTML file is previewed as a page: a frame with no permissions (`sandbox=""` — no scripts, forms or access
  to the site) whose document starts with a policy that loads nothing from outside; «Code» shows its source. The tile
  has the `globe` icon and the label HTML. Strings `chat.files.source`, `chat.files.page`; `previewKind` gains `html`;
  a file without a type is drawn by the type of its extension; new export `previewIcon` (the icon of a kind of preview,
  for the products' lists of files).
- Chat: the field of the composer grows with its lines up to three, then scrolls; on a touch screen (`hover: none`,
  `pointer: coarse`) Enter breaks the line and the message goes by its button (FTR.NAB.CHAT-0001 design §3.1).
- Top bar: `menu` (`{ label, render(close) }`) puts the navigation of a part of the product (the administration) behind the burger of a phone in
  place of the sections; a side panel marked `.side.in-burger` is hidden on a phone, and `.side` inside the burger is
  a column with its title (FTR.NAB.CMN-0005 design §4).
- Modals stay within the screen: the column of `.overlay` is `minmax(0, 1fr)`, so wide content — the preview of code
  or of a table — scrolls inside the modal instead of pushing it past the edges of a phone.

## 1.3.0

A visible change (FTR.NAB.CHAT-0001 design §3.1).

- Chat: while a recording is recognized the microphone gives way to a wave (`.voicewait`, `role="status"`), the field
  is dimmed and «Send» is off — the recording cannot be recognized twice and the text cannot be sent half-made.
- Chat: the files of a message are previewed (FTR.NAB.CHAT-0001 R34) when the product gives `loadAttachment`:
  images and SVG as thumbnails; PDF (the browser's viewer), Markdown, CSV/TSV (a table, 500 rows) and text or code
  (HTML as its source) as tiles with the icon of the preview; the rest as tiles that download. The preview names the
  file and its size and offers «Download». `ChatAttachment` gains `mimeType` and `size`; new exports
  `AttachmentList`, `AttachmentPreview`, `previewKind`, `parseTable`, `fileSize`; icons `pdf`, `markdown`, `source`;
  strings `chat.files.*`. Without `loadAttachment` every file is a download tile.

## 1.2.0

A visible change (FTR.NAB.CHAT-0001 design §3.1).

- Chat: the field of the composer stands on the line of its buttons; the margin of `.field` of the forms lifted it by
  14 px.
- Chat: the palette shows a command once — «/new»; the extra «/» in the column of the icon is gone.
- Chat: a failed recognition of a recording — `onTranscribe` rejects with an `Error` — is a toast with its message and
  «Retry»; the recording stays with the toast until it is closed. A `null` still means the product has told the user.
  Strings `chat.voice.failed`, `chat.voice.retry`.

## 1.1.0

A visible change (FTR.NAB.CHAT-0001 design §3).

- Chat: «N more steps» of an answer stands on its own line under the channel mark; it used to follow the mark on
  the same line («Telegram · 22:08 8 more steps»).
- Chat: the palette of «/» over the composer — `commands` (commands of the conversation and skills) with
  `onCommand`; a picked skill is a chip in the composer and comes to `onSend` as its fourth argument; a command
  the product does not know offers «Send as text».
- Chat: the fill of the context next to the send button — `context`, with `onCompact` and `onReset` offered when
  the context is full (`ContextMeter`).
- Chat: events of the conversation — a message with `role: "event"` and `event` is a divider with its time; its
  `details` unfold.
- Chat: voice input is started and stopped by a click, not held: a bar with the timer, the level of the voice,
  «Cancel» and «Stop»; the recording stops by itself at `voiceMaxSeconds` (300), the last 15 seconds are amber.
  The recognized text goes into the composer; the separate review of the transcript is gone (its strings stay).
- `AgentMenu`: the block of the model after the options — `models`.
- Chat: `ChatMessage.hint` is the tooltip of the bubble of an answer (the model); `onPendingChange` reports the files
  attached to the message being written.
- Icons: `image`, `compress`.

## 1.0.1

The first published version of the stable contract: the package is the one described under 1.0.0.
The tag `v1.0.0` was put on an earlier commit and was not published.

## 1.0.0

The contract is stable.

On this version both products are accepted: 118 screens of Nabu are identical to a pixel before the
move to the kit and after it; Hammurapi differs only as listed in the design of FTR.NAB.CMN-0005.

- Chat: `AgentButton` and `AgentMenu` — the round button of the agent and its menu: the name and a choice among the
  options of the product, as tiles with icons. The look is the one of Nabu. A product that had its own
  `.agentbtn` / `.agentmenu` styles removes them.
- Tests: the browser of the snapshots renders repeatably; the baselines are shot again.

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
