# ui-kit

`@green-on-grey/ui-kit` — the UI kit of the Nabu and Hammurapi products: design tokens, styles,
React components, icons, the chat and the sign-in screen. The look is the one of Nabu.

Specification: `hammurapi-specs/specs/NAB/CMN/FTR.NAB.CMN-0005/`.
Showcase: <https://greenongrey.github.io/ui-kit/> (every release also lives in `/vX.Y.Z/`).

## Use in a product

```sh
npm install --save-exact @green-on-grey/ui-kit
```

```ts
// main.tsx — the styles of the kit come before the styles of the product
import "@green-on-grey/ui-kit/styles.css";
import "./styles.css";

// i18n — the strings of the components live in the namespace `uikit`
import { resources as kit } from "@green-on-grey/ui-kit/locales";
const resources = { en: { translation: en, uikit: kit.en }, ru: { translation: ru, uikit: kit.ru } /* … */ };
```

```tsx
import { Avatar, Icon, Modal, ToastProvider, TopBar, useToast } from "@green-on-grey/ui-kit";
import { Chat, ChatLayout, ConversationList } from "@green-on-grey/ui-kit/chat";
import { LoginScreen } from "@green-on-grey/ui-kit/login";
```

| Entry | What |
|---|---|
| `@green-on-grey/ui-kit` | Components, icons, hooks |
| `@green-on-grey/ui-kit/chat` | The chat and its view types. It never talks to a server: the product adapts its API to the types |
| `@green-on-grey/ui-kit/login` | The sign-in screen |
| `@green-on-grey/ui-kit/locales` | Strings in en, ru, de, es, zh |
| `@green-on-grey/ui-kit/styles.css` | All the styles in one file; works without React |
| `@green-on-grey/ui-kit/tokens.css` | Tokens and themes only |
| `ui-kit-check` | Fails when a stylesheet of the product redefines the kit |

`index.html` of a product links the fonts and applies the saved theme before the first paint:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<script>
  try { var t = localStorage.getItem("<product>-theme"); if (t && t !== "system") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
</script>
```

A product does not redefine classes and tokens of the kit; `npm run lint` of a product runs
`ui-kit-check src/styles.css`.

## Develop

```sh
npm ci
npm run dev             # the showcase on http://localhost:5180, built from src/
npm test                # vitest
npm run test:e2e        # Playwright on the showcase: behaviour and snapshots
npm run lint            # oxlint + tsc
npm run build           # dist/: ESM, types, styles.css, tokens.css, manifest.json
```

To try a change in a product before a release, start the product with `UI_KIT_SRC=../ui-kit`.

## Release

1. Raise `version` in `package.json` and describe the release in `CHANGELOG.md` (`## X.Y.Z`).
   A visible change of the look is at least a minor.
2. Tag `vX.Y.Z` and push the tag: CI publishes the package to npm (trusted publishing) and the
   showcase to GitHub Pages.

Snapshots of the showcase are compared with zero tolerance; their baselines are made by the
`update-snapshots` workflow, never on a developer machine.
