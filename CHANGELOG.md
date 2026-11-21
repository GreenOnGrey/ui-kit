# Changelog

Versions follow semver. A visible change of the look is at least a minor (FTR.NAB.CMN-0005 R24).
Since `1.0.0` the contract of the kit — class names, tokens, props, icon names, keys of strings — changes only
in a major.

## 1.22.0

Three heights of a control and a row that gives them to every control (FTR.NAB.CMN-0005 R27; design §1, §2;
decisions 13 and 14; tech decisions 33 and 34).

- Three tokens: `--ctl-s: 30px`, `--ctl-m: 36px`, `--ctl-l: 44px`. A control reads its own size from them —
  `.btn` and `.iconbtn` 36, `.btn.sm` 30, `.sel` and `.search` 36, `.mini-seg` 30, `.inp` and the field of `Select`
  44, `.select.sm` 30; `textarea.inp` keeps its own height. Before, every control took its size from its padding:
  the search was 38.5 px, the field 42.5, a native select 33.5 and a segment 28, and in one row they did not match.
- A row of controls, `.ctlrow` (`sm`, `lg`): every field, search, selection, button and segment in it is one height.
  The product puts one class on the container instead of aligning the elements by hand. The search of a row grows
  up to 420 px and takes the whole line on a phone. A product cannot set the tokens (R23), so the size of a row is
  its choice of class.
- The search field looks like a field everywhere, the top bar included: the surface fill and the `border-strong`
  border of `.inp` instead of a grey pill. `.mini-seg` takes the same border.
- The showcase: the section «Fields and forms» shows a row of controls and the three sizes; `CMP-14` measures every
  control of a row — one height, one border colour.

## 1.21.0

A chart, a field with suggestions and a graph for large sets (FTR.NAB.MEM-0001 R21, R22, R24, R26, R28; design §3.3,
§3.4, §3.8).

- `Chart`: bars, stacked bars and lines over time in SVG, without a library. The width follows the box; a hover or the
  arrow keys show the values of a point; the legend hides a series; a line can take the right axis (`axis: "right"`);
  «Show as a table» gives the same numbers to a screen reader. New keys: `chart.empty`, `chart.showTable`,
  `chart.hideTable`.
- `Combobox`: a field with suggestions the product loads (`load(q, signal)`): after a pause of `debounceMs`, an old
  answer is never shown, groups, the match in bold regardless of case and «ё», the arrows, Enter and Escape, a second
  Escape clears. New keys: `combo.clear`, `combo.none`, `combo.error`, `combo.retry`.
- `Graph`: a graph of more than 60 nodes is laid out in a Web Worker (inlined in the package) with an indicator over
  the field, `aria-busy` and the key `graph.layingOut`; a smaller one is laid out during render as before, so its
  picture does not change. New data starts from the places the nodes had (`keepPositions`, on by default); dragged
  nodes stay where they were put across data, and «Put the nodes back» lays the graph out afresh. `center` is a request
  `{ id }`: each new one brings its node to the middle of the field, where it is drawn, smoothly unless reduced motion
  is asked for. The handlers live on the field, nodes
  and edges are memoised and the neighbours come from an adjacency map, so a hover or a drag redraws only what
  changed. A draggable graph marks its field `gwrap drag`: the nodes show a hand.
- The showcase: the sections «Graph: a large set» (150 nodes, 600 links, a field that finds and centres a node),
  «Chart» and «Field with suggestions»; the graph of people and topics can be dragged. Their baselines are made by the
  `update-snapshots` workflow.

## 1.20.0

The field of the chat: the icons on the middle line, the files dragged onto the chat, a file in the composer from the
choice (FTR.NAB.CMN-0005 design §6.5).

- The attach, microphone and send buttons are centred vertically, as the ring of the context already was — with a
  field of one line and of three.
- Files dropped on the chat are attached as the picker attaches them: a dashed hint over the chat while the pointer
  carries files, the same `onUpload` and the same `upload.maxBytes`. A chat without `onUpload` and a read-only one
  take no drops. New key: `chat.dropFiles`.
- A chosen file stands in the composer at once with the share of its upload: `onUpload(file, onProgress)`. The bar
  shows the percentage when the product reports it and a wave before the first report. «Send» waits for every file to
  arrive. A file on its way has no cross: the product has no id to cancel yet. The chip is the new `UploadChip`,
  exported for the showcase as `VoiceButton` is.
- The showcase: the chips of two files on their way, a demo of an upload that never ends, and a snapshot of the drop
  (`chat drop`). Every composer changes, and the baselines of the `chat` section are made by the `update-snapshots`
  workflow.

## 1.19.0

`Modal` keeps the focus where the user types (FTR.NAB.CMN-0005 qa CMP-01). The dialog took the first field of the
form on every render of the component that holds it: a product passes a new `onClose` on each render, the effect
ran again, and the caret jumped from the field being typed in to the first one — a letter of the description of a
group landed in its name. The focus is now set once, when the dialog opens, and no render takes it from the field
the user types in; Escape and the backdrop close with the handler of the latest render.

- The showcase dialog has a form with two fields, and `CMP-01` types into the second one: the focus stays.
- The dialog of the showcase is taller and stays centred, so every row of the four `modal` snapshots changes: the
  baselines are made by the `update-snapshots` workflow.

## 1.18.0

`Select` — the choice of one value from a list drawn by the kit (FTR.NAB.CMN-0005 tech §3.3). The list of a native
`select` is drawn by the browser and does not follow the theme; this one does. Opt-in: nothing changes on the screens
of the products until they use it.

- `Select({ value, options: { value, label }[], onChange, label, small?, className? })`: classes `.select`,
  `.select-btn`, `.select-list`, `.select-opt`, `.select-val`; the field looks like `.inp`, `small` like `.btn.sm`.
- The keyboard of a listbox: arrows, Home and End move, Enter and Space choose, Escape and Tab close; a click outside
  closes; the focus returns to the field.
- The icon `down` — the chevron of a closed list.
- `.sel` (the native `select` of Nabu) stays as it is.

## 1.17.0

Two icons for the cost and the log of a run of an agent (FTR.HMR.DEV-0004 R4, R8). Opt-in: nothing changes on the
screens of the products until they use them.

- `coins` — two stacked coins: the cost of a gate, a service or a feature.
- `terminal` — a window with a prompt: the log of a run.

## 1.16.0

A draft of the product in the composer of `Chat` (FTR.NAB.CMN-0005 tech §3.4). Opt-in: nothing changes on the screen.

- `draft: { text, seq }` puts `text` into the field before what the user has written, once per `seq`, focuses the
  field and puts the cursor at the end. The user finishes the message and sends it: «Ask the agent» on another
  screen no longer sends a half-written message.
- `onDraftTaken()` tells the product the draft is in the field.

## 1.15.0

The double edge of `Graph` (FTR.HMR.DEV-0003 R15): another layer of links, told apart without colour. Opt-in: the
graphs of Nabu and of Hammurapi do not change.

- `GraphEdge.double` draws the link as a double line: the line 3 wider than its weight gives, a line of the colour of
  the field inside it; the arrow is on the inner line, of the usual size.
  It combines with `dashed` (a double dashed line).
- New classes: `.g-e.double`, the inner line `.g-e.double .inner`.

## 1.14.0

The row layout and dragging of `Graph` (FTR.HMR.DEV-0002 R15). Both are opt-in: the graph of Nabu does not change.

- `rows` (the new type `GraphRow`) lays the nodes out in rows instead of the force layout: a row per entry that has
  nodes, top to bottom in the given order, its label at the left; in a row the nodes by `GraphNode.order`, then id,
  left to right. A node of no given row goes to a last row without a label. A link inside a row is an arc: above when
  it goes right, below when it goes left. The field grows with the longest row.
- `draggable` lets the user move a node. A move neither pins nor opens the node. The button
  «Put the nodes back» (the string `graph.resetLayout`) joins «+» and «−» after a move, and new data puts every node
  back in its place.
- Fixed on the way: dragging the field follows the pointer when the box of the graph has other proportions than the
  field.
- New classes: `.g-row` (the label and the line between rows); `.g-e path` takes the look of `.g-e line`.
- The showcase gets the section «Graph: rows».

## 1.13.0

A new component (FTR.HMR.DEV-0002, FTR.NAB.CMN-0003 R19): `Graph`, the graph of the memory of Nabu, moved to the kit.

- `Graph` draws nodes and links with a force layout (`d3-force`, now a dependency of the kit). The same data gives the
  same picture. Hovering highlights the neighbours, a click pins a node or a link, the wheel zooms, dragging moves.
- The look is that of Nabu, and so are the classes `.gwrap`, `.g-n`, `.g-e`, `.gleg`, `.gzoom`. The kinds of nodes
  `.p` and `.t` (the legend `.p`, `.tp`) become the groups `g-c1` and `g-c2` with the same colours; `g-c3`…`g-c6`
  are added. A product drops its own rules of these classes.
- Fixed on the way: the wheel zooms without scrolling the page, a pan keeps the pinned selection, and two graphs on
  one page get their own arrows.
- New for Hammurapi: `GraphEdge.directed` (an arrow), `GraphEdge.dashed`, `GraphNode.dashed` (a node not in the
  data), `GraphNode.muted`, `focus` with `depth` 1 or 2, and `onOpen` on Enter or a double click. Without `onOpen`
  Enter pins the node, as before.
- The product passes the labels, `ariaLabel`, `nodeLabel` and the legend. The kit adds the strings `graph.zoomIn`
  and `graph.zoomOut`.
- The showcase gets the sections «Graph» and «Graph: directed».

## 1.12.0

A visible change of the showcase only: it speaks English. The labels, the invented data and the strings of the
components (the dictionary `en`) are English, and the snapshots of the showcase are taken anew. `?lng=ru` draws the
components with the Russian dictionary: the sections «Chat» and «Top bar» are also taken with it, as its strings are
longer. The kit itself, its styles and its five dictionaries do not change.

## 1.11.1

- Markdown: `_` inside a word is not emphasis, `snake_case` names keep their underscores.

## 1.11.0

A visible change (FTR.NAB.CHAT-0004, FTR.NAB.CMN-0009): the queue of messages, the stop of an answer and the step of
subagents.

- Chat: `ChatProps.allowQueue` — «Send» stays on while the agent answers, the placeholder says the message waits;
  `busy` is then the request only. `ChatMessage.queued` draws a message of the queue with a dashed violet frame, its
  number («In the queue · 2») and «Cancel» (`ChatProps.onCancelQueued`).
- Chat: `ChatProps.onStop` — «Stop» takes the place of «Send» while an answer is written and the field is empty; text,
  a file or a skill in the field turn it back into «Send». After a click the answer says «Stopping…».
- `ChatMessage.status = "stopped"`: the answer keeps its text and gets a grey «Stopped» with «Retry».
- `ChatMessage.retryQueued`: a failed or stopped answer whose retry waits in the queue shows «The retry waits in the
  queue» instead of «Retry». Without `allowQueue` sending waits for the answer being written, as before.
- `ContextMeter` takes `queued`: its actions wait for the queue too, with their own hint.
- `ChatStep.subagents` (`ChatSubagent`): the step «Subagents · N» — open with a row per task while one runs, folded to
  one line when done; a row opens its result. An aborted task without an `error` reads «stopped · the turn was stopped».
  `SubagentStep` is exported. Snapshots `stopping` and `subagents-open`.
- Strings `chat.queuePlaceholder`, `chat.queue.*`, `chat.stopAnswer`, `chat.stopping`, `chat.stopped`,
  `chat.context.waitQueue`, `chat.subagents.*`. Showcase examples «Субагенты» and «Очередь сообщений и «Остановить»».

## 1.10.3

A fix of 1.10.0 (FTR.NAB.CHAT-0003): the preview of a document and a spreadsheet takes the width of the modal.

- `.att-view.office-doc` and `.att-view.office-sheet` are blocks, as `table`, `text` and `html`: a PPTX or DOCX
  preview was a narrow column in the middle of the modal.
- The modal of a document preview is 1100px wide, as of a PDF and an HTML page.
- Snapshots `preview-preparing`, `preview-unavailable` are updated.

## 1.10.0

A visible change (FTR.NAB.CHAT-0003): documents and spreadsheets open in the preview of a file.

- Chat: `ChatProps.loadPreview` — the product makes the preview of a document (DOCX, DOC, PPTX, ODT, RTF, …) and of a
  spreadsheet (XLSX, XLS, ODS); without it these files stay download tiles. `AttachmentList` takes `office`,
  `AttachmentPreview` takes `loadPreview`; `previewKind(a, office)` gives `office-doc` and `office-sheet`.
- A document is the PDF of its first pages with «Preview · converted from DOCX» and how many pages are shown; a
  spreadsheet is its sheets as tabs (`Tabs`), with column letters, row numbers, merged cells, numbers on the right
  and formulas grey with a hint. While it
  is made the preview waits (a `pending` answer is asked again every 2 s, up to 40 s); a reason is shown when there
  is none (`too_large`, `timeout`, `broken`, `busy`).
- The showcase «Файлы агента» has a contract, a budget, a draft being made and an old deck without a preview;
  snapshots `preview-sheet`, `preview-preparing`, `preview-unavailable`.
- Types `OfficePreview`, `Sheet`, `SheetCell`, `LoadOfficePreview`; `columnName(n)`. Strings `chat.files.converted`,
  `pagesShown`, `firstPages`, `cols`, `preparing`, `preparingHint`, `unavailable`, `reasons.*`, `formulaHint`, `sheets`.

## 1.9.0

A visible change (FTR.NAB.CHAT-0002, FTR.HMR.DISC-0001): the showcase of the chat has two more examples.

- Chat: `ChatMessage.variant = "notice"` — a notice of a product in a topic, not words of the agent: on the left with
  the mark of the product, a card with a stripe (`.m.a.notice`), without retry; a text longer than `NOTICE_LINES` (12)
  lines is folded with «Show in full» (strings `chat.notice.more`, `chat.notice.less`). The content of the product
  replaces the text, as in an answer.
- Chat: `ChatProps.empty` replaces the whole empty conversation — the draft of the topic of an issue in Hammurapi
  with its suggestions; `emptyHint` stays for the plain empty conversation.
- Chat: `ChatProps.placeholder` replaces the placeholder of the composer («What to revise in the analysis?»); a picked
  skill keeps its own.

## 1.8.0

A visible change (FTR.HMR.SPEC-0001): the example of the menu of the agent on the showcase takes the strings of the kit.

- Chat: `AgentSettingsMenu` — the menu of the agent of every product: the name, the options of the product in two
  columns, the block «Model» and the hint, with the strings of the kit (namespace `uikit`, keys `agent.*`). The
  product gives its options with icons (the kit knows nothing of what they mean), the models of the agent as
  `AgentModelState` and the handlers; without `models` there is no model block, `hint` replaces the hint of the kit.
  `agentModelOptions` and `agentModelKey` build the block «Model» as Nabu did: «Default» first, the capabilities, a
  warning when the context outgrows the window (FTR.NAB.CHAT-0001 R16, R17). Nabu and Hammurapi move to it from
  their own copies of the menu.

## 1.7.0

A visible change (FTR.HMR.SPEC-0001 R8, design §3.4): the showcase of icons has one more.

- Icons: `chevrons` — a double chevron to the right, for a panel that folds to the right edge (the chat of Hammurapi
  folds into a rail).

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
