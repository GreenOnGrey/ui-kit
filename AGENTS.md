# AGENTS.md — ui-kit

Guide for coding agents and developers working in this repository.

## Workspace

The kit is used by `nabu-web` and `hammurapi-web`, checked out next to it. The specification is
`hammurapi-specs/specs/NAB/CMN/FTR.NAB.CMN-0005/` (product, design, arch, tech, qa).

- Every change implements the specification; refer to it in comments as `FTR.NAB.CMN-0005 R23`, `design §6`.
- Deviations from a spec are written into the spec in the same piece of work.
- Do not commit, tag or push unless asked.

## Stack

React 19, TypeScript, Vite (library mode), i18next with ICU, vitest, Playwright. Node 24.

```sh
npm ci
npm run dev        # the showcase, http://localhost:5180
npm test           # vitest
npm run test:e2e   # Playwright on the showcase
npm run lint       # oxlint + tsc (warnings are tolerated, errors are not)
npm run build      # the package
```

## Layout

```text
src/styles/       the styles; index.css lists the files in the order of the cascade
src/components/   Icon, Markdown, Button, Tabs, Menu, TopBar, ui (Modal, toasts, Avatar, Switch, …)
src/chat/         Chat, MessageView, ConversationList, AgentMenu, useRecorder, types.ts — the contract with adapters
src/login/        LoginScreen
src/locales/      en, ru, de, es, zh — the namespace `uikit`
bin/              ui-kit-check
scripts/          build-css (styles.css, manifest.json), visible-change, publish-pages
showcase/         the showcase: every element in every state, on invented data
e2e/              Playwright: behaviour.spec.ts, visual.spec.ts and the baselines
```

## Rules

- **The kit repeats Nabu.** A visible change is a decision, not a side effect: it changes a
  snapshot, needs an entry in `CHANGELOG.md` and at least a minor version (R24).
- **Class names are the contract.** No CSS modules, no CSS-in-JS libraries, no renaming. Inline `style` that
  came with the markup of Nabu stays as it is (moving it into classes would be a visible risk for no gain); a new
  look goes into a class. The order of the
  files in `src/styles/index.css` is the order of the cascade — do not sort it.
- **What goes in:** an element both products need, or a basic one not tied to the subject of a
  screen (R10). Screens stay in the products. An icon is always added here.
- **The kit knows nothing of the products:** no tones of the agent, no routes, no API, no
  TanStack Query. The chat gets data and handlers from an adapter of the product (R12); a control
  without a handler is not drawn (R13).
- **Five locales, identical keys** (`src/locales/locales.test.ts`); messages are ICU; no product
  name in a string — the name of the agent comes as a parameter.
- **Components do not import CSS**; a product links `styles.css` itself.
- **Every element is on the showcase** in all its states; a new state gets an example and a snapshot. The
  sections are listed once, in `showcase/sections.ts`: the page and `e2e/visual.spec.ts` are built from it. A state
  that appears only after a click (an open menu, a dialog, toasts) gets its own snapshot in `visual.spec.ts`.
- Baselines of snapshots are updated by the `update-snapshots` workflow only.
- No `Date.now()` or other impure calls during render (oxlint purity rules).
