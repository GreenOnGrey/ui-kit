import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  Avatar, Button, Empty, GitHubIcon, Icon, IconButton, Loading, Markdown, Menu, Modal, Switch, Tabs, TopBar, useToast,
  type LinkComponent,
} from "../src";
import { ICON_NAMES } from "../src/components/Icon";
import tokensCss from "../src/styles/tokens.css?raw";
import { AgentButton, AgentSettingsMenu, CommandPalette, ContextMeter, MessageView, VoiceButton, type AgentModel, type AgentModelChoice, type ChatCommand } from "../src/chat";
import { LoginScreen } from "../src/login";
import pkg from "../package.json";
import { ChatDemo } from "./ChatDemo";
import { Example, Section } from "./Example";
import { FeatureGraph, PeopleGraph } from "./GraphDemo";
import { LNG } from "./i18n";
import { SECTIONS } from "./sections";

type Theme = "light" | "dark" | "system";
const params = new URLSearchParams(location.search);
/** The page inside the frame of phone width: only the sections. */
const EMBED = params.has("embed");

const Link: LinkComponent = ({ href, children, ...rest }) => <a href={href} {...rest} onClick={(e) => { e.preventDefault(); rest.onClick?.(); }}>{children}</a>;

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (params.get("theme") as Theme) || (localStorage.getItem("uikit-theme") as Theme) || "system"; } catch { return "system"; }
  });
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("uikit-theme", theme); } catch { /* a private window */ }
  }, [theme]);
  return [theme, setTheme];
}

export function App() {
  const [theme, setTheme] = useTheme();
  const [phone, setPhone] = useState(false);
  const [toc, setToc] = useState(false);
  const [hash, setHash] = useState(location.hash.slice(1) || "tokens");
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1) || "tokens");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  // the sign-in screen takes the whole window, so the showcase shows it in a frame
  const view = params.get("view");
  if (view === "login-nabu") return <LoginDemo product="nabu" />;
  if (view === "login-hammurapi") return <LoginDemo product="hammurapi" error />;
  if (EMBED) return <div className="sc-main" style={{ height: "100%" }}><Sections /></div>;
  return (
    <div className="sc">
      <div className="topbar">
        <a href="#tokens" className="brand"><img src="./logo.png" alt="" /><span>UI Kit</span></a>
        <span className="chip sc-version">v{pkg.version}</span>
        <div className="top-actions">
          <button className={`btn sm${phone ? " primary" : " ghost"} sc-hide-m`} aria-pressed={phone} onClick={() => setPhone((v) => !v)}>
            <Icon name="grid" size={14} />Phone width
          </button>
          <div className="mini-seg" role="group" aria-label="Theme">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
              </button>
            ))}
          </div>
          <IconButton label="Sections" className="sc-only-m" on={toc} onClick={() => setToc((v) => !v)}><Icon name={toc ? "x" : "menu"} /></IconButton>
        </div>
      </div>
      <div className="sc-body">
        <nav className={`sc-toc${toc ? " sc-open" : ""}`} aria-label="Sections">
          {SECTIONS.map(([id, title]) => <a key={id} href={`#${id}`} className={hash === id ? "sc-on" : undefined} onClick={() => setToc(false)}>{title}</a>)}
        </nav>
        {phone
          // oxlint-disable-next-line react/iframe-missing-sandbox -- the frame shows this very page: its scripts and its storage are its own
          ? <div className="sc-main sc-phone"><iframe title="Phone width" src={`?embed=1&theme=${theme}&lng=${LNG}#${hash}`} key={`${theme}${hash}`} /></div>
          : <div className="sc-main"><Sections /></div>}
      </div>
    </div>
  );
}

function Sections() {
  // the section of the address is shown on opening, also inside the frame of phone width
  useEffect(() => {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);
  return (
    <>
      <Section id="tokens" lead="Colours, radii, shadows and fonts. The values change with the theme. Green and amber are for statuses only.">
        <Tokens />
      </Section>

      <Section id="type" lead="Onest for text, JetBrains Mono for code and identifiers. Tones of text are classes.">
        <Example>
          <div className="stack">
            <div>Body text, 15 px</div>
            <div className="t2">Secondary text: <span className="mono">.t2</span></div>
            <div className="muted">Muted text: <span className="mono">.muted</span></div>
            <div className="small">Small text, 13 px: <span className="mono">.small</span></div>
            <div><span className="mono">FTR.NAB.CMN-0005</span> — <span className="mono">.mono</span></div>
            <div><span className="ok-t">Done</span> · <span className="warn-t">Waiting</span> · <span className="err-t">Error</span></div>
          </div>
        </Example>
      </Section>

      <Section id="buttons" lead="An action. One primary per screen or dialog. Use the classes or the components Button and IconButton.">
        <Example label="Variants">
          <div className="row"><Button variant="primary">Save</Button><Button>Cancel</Button><Button variant="ghost">Later</Button><Button variant="danger">Delete</Button></div>
        </Example>
        <Example label="Small size">
          <div className="row"><Button variant="primary" size="sm"><Icon name="plus" size={14} />Add</Button><Button size="sm">Edit</Button></div>
        </Example>
        <Example label="Disabled">
          <div className="row"><Button variant="primary" disabled>Save</Button><Button disabled>Cancel</Button></div>
        </Example>
        <Example label="Icon button: plain, primary, recording, on, disabled">
          <div className="row">
            <IconButton label="Attach"><Icon name="clip" /></IconButton>
            <IconButton label="Send" fill><Icon name="send" /></IconButton>
            <IconButton label="Stop recording" className="rec"><Icon name="mic" /></IconButton>
            <IconButton label="Sections" on><Icon name="menu" /></IconButton>
            <IconButton label="Unavailable" disabled><Icon name="mic" /></IconButton>
          </div>
        </Example>
        <Example label="A button as a link"><button className="linkish">Show all</button></Example>
      </Section>

      <Section id="forms" lead="The label above a field, a hint or an error below it. A form in two columns folds into one on a phone.">
        <Example>
          <div className="form-grid">
            <div className="field"><label htmlFor="f1">Name</label><input id="f1" className="inp" defaultValue="Release 1.4" /><div className="hint">Up to 120 characters</div></div>
            <div className="field"><label htmlFor="f2">Address</label><input id="f2" className="inp" defaultValue="nabu.example" aria-invalid="true" /><div className="err-text">Give an address with https://</div></div>
            <div className="field"><label htmlFor="f3">Time zone</label><select id="f3" className="inp"><option>Europe/Moscow</option><option>UTC</option></select></div>
            <div className="field"><label htmlFor="f4">Note</label><textarea id="f4" className="inp" rows={2} defaultValue="Text" /></div>
          </div>
        </Example>
        <Example label="Switch"><SwitchDemo /></Example>
        <Example label="Search"><form className="search" role="search" style={{ maxWidth: 320 }}><Icon name="search" /><input placeholder="Search" aria-label="Search" /></form></Example>
      </Section>

      <Section id="chips" lead="A chip is a choice among a few values, or a label. Tabs switch the view; the arrow keys move the choice.">
        <Example label="Chips"><div className="chips"><button className="chip on">EN</button><button className="chip">RU</button><span className="chip"><Icon name="clip" size={12} />plan.pdf</span></div></Example>
        <Example label="Tabs"><TabsDemo /></Example>
        <Example label="Segments"><div className="mini-seg"><button className="on" aria-pressed="true">Day</button><button aria-pressed="false">Week</button><button aria-pressed="false">Month</button></div></Example>
        <Example label="Status: plain and draft"><div className="row"><span className="st">Active</span><span className="st draft">Draft</span></div></Example>
      </Section>

      <Section id="data" lead="A table, numbers, key-value pairs, a panel.">
        <Example label="Numbers"><div className="kpi"><div><b>128</b><span>Requests</span></div><div><b>$4.20</b><span>Cost</span></div><div><b>3 / 8</b><span>Pods</span></div></div></Example>
        <Example label="Table">
          <table className="t">
            <thead><tr><th>User</th><th>Status</th><th>Requests</th></tr></thead>
            <tbody>
              <tr><td>Ada Lovelace</td><td><span className="st">Active</span></td><td className="num">128</td></tr>
              <tr className="sel"><td>Alan Turing</td><td><span className="st draft">Draft</span></td><td className="num">12</td></tr>
            </tbody>
          </table>
        </Example>
        <Example label="Key and value"><dl className="kv"><dt>Model</dt><dd className="mono">sonnet</dd><dt>Created</dt><dd>October 11</dd></dl></Example>
        <Example label="Rows of settings">
          <div className="stack"><div className="kvrow"><span className="muted">Budget</span><b>$10</b></div><div className="kvrow"><span className="muted">Days</span><b>Mon–Fri</b></div></div>
        </Example>
        <Example label="Panel: next to the content, full screen on a phone" source={notePanel}>
          <div className="sc-contain">{notePanel}</div>
        </Example>
      </Section>

      <Section id="messages" lead="A hint, a warning and an error of the model, as blocks in the flow of the page.">
        <Example label="Hint"><div className="hintbox"><Icon name="bulb" /><div>Connect your mail so that the agent sorts your letters.</div></div></Example>
        <Example label="Warning"><div className="hintbox warn"><Icon name="alert" /><div>No free capacity: messages wait in the queue.</div></div></Example>
        <Example label="Error of the model: temporary and permanent">
          <div className="stack">
            <div className="llmerr amber" role="alert"><span>The model is temporarily unavailable. Try again.</span><div className="row"><button className="btn sm"><Icon name="refresh" size={14} />Retry</button></div></div>
            <div className="llmerr" role="alert"><span>The model key was rejected. Contact your administrator.</span></div>
          </div>
        </Example>
        <Example label="Error text under a field"><div className="err-text">Could not save.</div></Example>
      </Section>

      <Section id="overlay" lead="A menu closes on Escape and on a click outside. A modal puts the focus into its first field.">
        <Example label="Menu" source={<div className="menu" role="dialog" aria-label="Profile">{profileSections}</div>}><MenuDemo /></Example>
        <Example label="Modal: plain and wide" source={<Modal title="New topic" onClose={noop} footer={modalFooter(noop)}>{modalBody}</Modal>}><ModalDemo /></Example>
      </Section>

      <Section id="toasts" lead="Without actions it goes after 6 seconds; with actions it stays until a choice.">
        <Example source={
          <div className="toast error" role="alert">
            <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
              <div className="grow"><b>Could not save</b><span className="small t2">The server is unavailable.</span></div>
              <IconButton label="Close" style={{ width: 24, height: 24 }}><Icon name="x" size={14} /></IconButton>
            </div>
          </div>
        }><ToastDemo /></Example>
      </Section>

      <Section id="avatars" lead="A user is a picture or initials. An agent is an icon and a colour variant that the product passes.">
        <Example label="User"><div className="row"><Avatar name="Ada Lovelace" /><Avatar name="Alan" small /></div></Example>
        <Example label="Agent: business, friendly, brief, mentor">
          <div className="row">
            <Avatar name="Ada" agent icon="tBusiness" variant="business" /><Avatar name="Ada" agent icon="tFriendly" variant="friendly" />
            <Avatar name="Ada" agent icon="tBrief" variant="brief" /><Avatar name="Ada" agent icon="tMentor" variant="mentor" />
            <Avatar name="Ada" agent icon="tBusiness" variant="business" small />
          </div>
        </Example>
      </Section>

      <Section id="icons" lead="Stroke icons of both products. A click copies the name.">
        <Icons />
      </Section>

      <Section id="topbar" lead="The logo and the name, sections, actions of the product, the avatar with the profile menu. On a phone the sections go under a burger after the avatar.">
        <Example label="Nabu" box><BarDemo product="nabu" /></Example>
        <Example label="Hammurapi: search and “New issue” are actions of the product" box><BarDemo product="hammurapi" /></Example>
        <Example label="Administration: on a phone the burger holds its subsections, not the sections of the product" box><BarDemo product="nabu" admin /></Example>
      </Section>

      <Section id="login" lead="A dark screen in both themes. The product passes the logo, the name, the motto and the sign-in provider.">
        <Example label="Nabu" box source={<LoginDemo product="nabu" />}><LoginFrame view="login-nabu" /></Example>
        <Example label="Hammurapi, a failed sign-in" box source={<LoginDemo product="hammurapi" error />}><LoginFrame view="login-hammurapi" /></Example>
      </Section>

      <Section id="chat" lead="The data is invented, and the buttons work without a server. Cancelling a turn, confirmation, attachments and voice appear only when the product passes a handler.">
        <Example label="History: marks, steps, attachments, an error with a retry" box><ChatDemo demo="history" /></Example>
        <Example label="Files of the agent: thumbnails, preview tiles by type, a download tile" box><ChatDemo demo="files" files /></Example>
        <Example label="An empty conversation" box><ChatDemo demo="empty" empty /></Example>
        <Example label="The own empty conversation of a product and a hint of the input: a draft topic of an issue" box><ChatDemo demo="draft" draft /></Example>
        <Example label="Notices of a product: a short one and one folded after 12 lines" box><ChatDemo demo="notices" notices /></Example>
        <Example label="The agent is typing: a step runs, no text yet" box><ChatDemo demo="typing" typing /></Example>
        <Example label="The history did not load; earlier messages are loading" box><ChatDemo demo="history-error" historyError /></Example>
        <Example label="The voice button: ready, and recognizing a recording (a wave instead of the microphone)">
          <div className="row" style={{ gap: 12 }}>
            <VoiceButton supported recognizing={false} onStart={() => {}} />
            <VoiceButton supported recognizing onStart={() => {}} />
          </div>
        </Example>
        <Example label="The agent is starting" box><ChatDemo demo="starting" wait="starting" /></Example>
        <Example label="Queued" box><ChatDemo demo="queued" wait="queued" /></Example>
        <Example label="Subagents: a running step and a finished one with an interrupted task" box><ChatDemo demo="subagents" subagents /></Example>
        <Example label="The message queue and “Stop”: an answer is coming, two messages wait, the previous answer was stopped" box><ChatDemo demo="message-queue" queue /></Example>
        <Example label="Cancelling a turn and confirming an action" box><ChatDemo demo="full" full /></Example>
        <Example label="Read only" box><ChatDemo demo="readonly" readOnly /></Example>
        <Example label="The agent button and its menu: the name and the choice of a variant the product sets" box><AgentDemo /></Example>
        <Example label="Voice recording: a bar with a timer, the level, “Cancel” and “Stop”; amber 15 seconds before the end" box>
          <div>
            <div className="composer">
              <div className="recbar"><span className="dot" /><span className="tm">0:12 / 5:00</span><span className="lvl"><i style={{ transform: "scaleX(.6)" }} /></span>
                <button className="btn ghost sm">Cancel</button><button className="btn primary sm">Stop</button></div>
            </div>
            <div className="composer">
              <div className="recbar ending"><span className="dot" /><span className="tm">4:47 / 5:00</span><span className="lvl"><i style={{ transform: "scaleX(.3)" }} /></span>
                <button className="btn ghost sm">Cancel</button><button className="btn primary sm">Stop</button></div>
            </div>
            <div className="err-text" style={{ padding: "0 12px 8px" }}>No access to the microphone</div>
          </div>
        </Example>
        <Example label="The palette of “/”: commands and skills, the chosen row highlighted" box>
          <div style={{ position: "relative", paddingTop: 260 }}>
            <div className="composer-wrap">
              <CommandPalette items={DEMO_COMMANDS} active={2} onPick={() => {}} onHover={() => {}} />
              <div className="composer"><div className="field"><textarea rows={1} defaultValue="/" aria-label="Message" /></div></div>
            </div>
          </div>
        </Example>
        <Example label="A skill in the input, an unknown command, the fill of the context: 4%, 75%, 91%" box>
          <div className="composer-wrap">
            <div className="cmd-unknown">Unknown command /foo<button className="textbtn">Send as text</button></div>
            <div className="composer">
              <div className="field with-skill"><span className="chip skill-chip"><Icon name="spark" size={12} />contract-review</span>
                <textarea rows={1} placeholder="What should the skill do?" aria-label="What should the skill do?" /></div>
              <ContextMeter context={{ tokens: 40_000, window: 1_000_000 }} onCompact={() => {}} onReset={() => {}} />
              <ContextMeter context={{ tokens: 96_000, window: 128_000 }} />
              <ContextMeter context={{ tokens: 950_000, window: 1_000_000 }} onCompact={() => {}} onReset={() => {}} busy />
              <ContextMeter context={{ tokens: 912_000, window: 1_000_000 }} onCompact={() => {}} onReset={() => {}} />
            </div>
          </div>
        </Example>
        <Example label="Events of a conversation: a reset, a compaction with a summary, a change of the model" box>
          <div className="msgs">
            <MessageView busy={false} m={{ id: "e1", role: "event", text: "", createdAt: "2026-10-11T14:02:00", status: "done", event: { icon: "undo", text: "Context reset" } }} />
            <MessageView busy={false} m={{ id: "e2", role: "event", text: "", createdAt: "2026-10-11T14:05:00", status: "done",
              event: { icon: "compress", text: "Context compacted: 182K → 9K tokens · automatically", details: "The user is reviewing the contract with Acme: two risks, edits due by Friday." } }} />
            <MessageView busy={false} m={{ id: "e3", role: "event", text: "", createdAt: "2026-10-11T14:07:00", status: "done", event: { icon: "cpu", text: "Model: GigaChat 2 Max" } }} />
          </div>
        </Example>
        <Example label="Chosen files above the input" box>
          <div className="pending-files">
            <span className="chip"><Icon name="clip" size={12} />plan.pdf<IconButton label="Remove" style={{ width: 18, height: 18 }}><Icon name="x" size={12} /></IconButton></span>
          </div>
        </Example>
        <Example label="A narrow place, such as a side panel: modes above the input, the list of conversations over the feed">
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="sc-stage sc-box"><ChatDemo demo="narrow" narrow modes full /></div>
            <div className="sc-stage sc-box"><ChatDemo demo="narrow-list" narrow listOpen /></div>
          </div>
        </Example>
      </Section>

      <Section id="states" lead="Empty and loading.">
        <Example label="Empty"><Empty icon="files" title="No files yet">They appear when the agent saves the first one.</Empty></Example>
        <Example label="Loading"><Loading /></Example>
        <Example label="Indicator"><div className="turnstate" style={{ justifyContent: "flex-start" }}><span className="spin" aria-hidden="true" />The agent is starting…</div></Example>
      </Section>

      <Section id="markdown" lead="Headings, lists, tables, code, emphasis. Markup from the text is never inserted.">
        <Example><Markdown text={"## Summary\n\n**24** requirements of 26 are covered.\n\n1. `KIT-01`: tokens\n2. `NAB-01`: comparison of screens\n\n| Step | Status |\n|---|---|\n| 1 | done |\n\n```\nnpm run lint\n```"} /></Example>
      </Section>

      <Section id="graph" lead="Nodes and links. Hovering shows the neighbours, a click pins them, the wheel zooms and dragging moves. The product passes the labels, the groups and the legend.">
        <Example label="People and topics" source={<PeopleGraph />}><PeopleGraph /></Example>
      </Section>

      <Section id="graph-directed" lead="Arrows, a dashed link, a faded node and a dashed node that is not in the data. A focus highlights a node and its neighbours within one or two steps; Enter or a double click opens a node when the product passes onOpen.">
        <Example label="Features of a specification, focus on FTR.HMR.DEV-0002" source={<FeatureGraph />}><FeatureGraph /></Example>
      </Section>
    </>
  );
}

/** The declarations of the first rule with this selector in tokens.css. */
function tokensOf(selector: string): Record<string, string> {
  const from = tokensCss.indexOf(`${selector} {`);
  const body = tokensCss.slice(tokensCss.indexOf("{", from) + 1, tokensCss.indexOf("}", from));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].replace(/\s+/g, " ").trim()]));
}
const LIGHT = tokensOf(":root");
const DARK = tokensOf(':root[data-theme="dark"]');
const isColor = (v: string) => /^#|^rgba?\(/.test(v);

/** What a value of a token looks like: a colour, a radius, a shadow, a font. */
const sample = (name: string, value: string): ReactNode =>
  isColor(value) ? <span style={{ background: value }} />
    : name.startsWith("--r-") ? <span style={{ borderRadius: value, background: "var(--violet-soft)" }} />
    : name === "--shadow" ? <span style={{ boxShadow: value, background: "var(--surface)" }} />
    : <span style={{ display: "grid", placeItems: "center", fontFamily: name === "--font" || name === "--mono" ? value : undefined }}>Aa</span>;

/** Every token with its value in the light and in the dark theme, read from tokens.css. */
function Tokens() {
  const names = Object.keys(LIGHT);
  return (
    <table className="t">
      <thead><tr><th>Token</th><th>Light theme</th><th>Dark theme</th></tr></thead>
      <tbody>
        {names.map((n) => (
          <tr key={n}>
            <td className="mono">{n}</td>
            <td><div className="sc-sw">{sample(n, LIGHT[n])}<code>{LIGHT[n]}</code></div></td>
            <td>{DARK[n] ? <div className="sc-sw">{sample(n, DARK[n])}<code>{DARK[n]}</code></div> : <span className="muted">as in the light theme</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Icons() {
  const [copied, setCopied] = useState("");
  return (
    <div className="sc-icons">
      {ICON_NAMES.map((n) => (
        <button key={n} title={n} onClick={() => { void navigator.clipboard?.writeText(n); setCopied(n); }}>
          <Icon name={n} size={20} />{copied === n ? "copied" : n}
        </button>
      ))}
    </div>
  );
}

function SwitchDemo() {
  const [on, setOn] = useState(true);
  return <div className="row"><Switch on={on} onChange={setOn} label="Voice input" /><Switch on={false} onChange={() => {}} label="Unavailable" disabled /></div>;
}

function TabsDemo() {
  const [tab, setTab] = useState("table");
  return <Tabs label="View" value={tab} onChange={setTab} items={[{ key: "table", label: "Table" }, { key: "graph", label: "Graph" }, { key: "tasks", label: "Tasks" }]} />;
}

const noop = () => {};
const notePanel: ReactNode = (
  <aside className="panel"><div className="panel-h"><b className="grow">Note</b><IconButton label="Close"><Icon name="x" size={16} /></IconButton></div><div className="small t2">The content of the panel.</div></aside>
);
const profileSections: ReactNode = (
  <>
    <div className="sec"><div className="row"><Avatar name="Ada Lovelace" /><div><b>Ada Lovelace</b><div className="small muted">ada@example.com</div></div></div></div>
    <div className="sec"><div className="line"><span>Theme</span><div className="mini-seg"><button className="on">Light</button><button>Dark</button></div></div></div>
    <div className="sec"><button className="action"><Icon name="plug" />Connections</button><button className="action danger"><Icon name="out" />Sign out</button></div>
  </>
);
const modalBody: ReactNode = <div className="field"><label htmlFor="m1">Topic</label><input id="m1" className="inp" /><div className="hint">A topic has a history of its own.</div></div>;
const modalFooter = (close: () => void): ReactNode => <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" onClick={close}>Create</Button></>;

function MenuDemo() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div style={{ position: "relative", height: open ? 190 : "auto" }}>
      <Button onMouseDown={(e) => open && e.stopPropagation()} onClick={() => setOpen((v) => !v)} aria-expanded={open}>Open the menu</Button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 372, height: 0 }}>
          <Menu onClose={close} label="Profile">{profileSections}</Menu>
        </div>
      )}
    </div>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState<"" | "plain" | "wide">("");
  const close = useCallback(() => setOpen(""), []);
  return (
    <div className="row">
      <Button onClick={() => setOpen("plain")}>Open a dialog</Button>
      <Button onClick={() => setOpen("wide")}>Open a wide dialog</Button>
      {open && (
        <Modal title="New topic" wide={open === "wide"} onClose={close} footer={modalFooter(close)}>{modalBody}</Modal>
      )}
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="row">
      <Button onClick={() => toast({ kind: "ok", title: "Saved" })}>Success</Button>
      <Button onClick={() => toast({ kind: "error", title: "Could not save", text: "The server is unavailable." })}>Error</Button>
      <Button onClick={() => toast({ title: "A new version is out", actions: [{ label: "Update", primary: true, onClick: () => {} }, { label: "Later", onClick: () => {} }] })}>With actions</Button>
    </div>
  );
}

const profile = (close: () => void): ReactNode => <Menu onClose={close} label="Profile">{profileSections}</Menu>;

const ADMIN_DEMO = [["users", "Users", "users"], ["groups", "Groups", "lock"], ["models", "Model connections", "cpu"], ["audit", "Audit", "shield"]] as const;

/** The navigation of the administration: the side panel on a desktop (`inBurger`: hidden on a phone), the burger
 * on a phone. */
function AdminNav({ on, onPick, inBurger }: { on: string; onPick?: () => void; inBurger?: boolean }) {
  return (
    <nav className={inBurger ? "side in-burger" : "side"} aria-label="Administration">
      <div className="lab">Administration</div>
      {ADMIN_DEMO.map(([k, l, icon]) => (
        <a key={k} href="#topbar" className={k === on ? "active" : undefined} onClick={onPick}><Icon name={icon} />{l}</a>
      ))}
    </nav>
  );
}

const adminMenu = { label: "Administration", render: (close: () => void): ReactNode => <AdminNav on="audit" onPick={close} /> };

function BarDemo({ product, admin }: { product: "nabu" | "hammurapi"; admin?: boolean }) {
  const nabu = product === "nabu";
  const names = nabu ? ["Chat", "Memory", "Space", "Tasks"] : ["General", "Specification", "Discovery", "Development", "Delivery"];
  const [on, setOn] = useState(0);
  // the links of the showcase lead nowhere: a click only marks the section
  const pick = (e: MouseEvent) => {
    const i = names.indexOf((e.target as HTMLElement).closest("a")?.textContent ?? "");
    if (i >= 0) setOn(i);
  };
  return (
    <div style={{ minHeight: 230 }} onClick={pick}>
      <TopBar logo={nabu ? "./nabu.jpg" : "./hammurapi.png"} name={nabu ? "Nabu" : "Hammurapi"} Link={Link} avatar={<Avatar name="Ada Lovelace" />} profileMenu={profile}
        sections={names.map((label, i) => ({ key: String(i), label, href: "#topbar", active: i === on }))}
        center={nabu ? undefined : <form className="search" role="search"><Icon name="search" /><input placeholder="Search" aria-label="Search" /></form>}
        actions={nabu ? undefined : <button className="btn primary sm"><Icon name="plus" /><span className="hide-m">New issue</span></button>}
        menu={admin ? adminMenu : undefined} />
      {admin && (
        <div className="admin">
          <AdminNav inBurger on="audit" />
          <main className="main"><h2 style={{ margin: 0 }}>Audit</h2></main>
        </div>
      )}
    </div>
  );
}

const AGENT_OPTIONS = [
  { key: "business", label: "Business", icon: "tBusiness" }, { key: "friendly", label: "Friendly", icon: "tFriendly" },
  { key: "brief", label: "Brief", icon: "tBrief" }, { key: "mentor", label: "Mentor", icon: "tMentor" },
] as const;

const DEMO_COMMANDS: ChatCommand[] = [
  { kind: "command", name: "new", description: "Start with a clean context" },
  { kind: "command", name: "compact", description: "Compact the context · you can say what to focus on", takesText: true },
  { kind: "skill", name: "contract-review", description: "Review a contract by the checklist of the lawyers", source: "Lawyers" },
  { kind: "skill", name: "weekly-report", description: "A weekly report by the template", source: "Reports" },
];

const AGENT_MODELS: AgentModel[] = [
  { connectionId: "deepseek", model: "flash", name: "DeepSeek V4.1 Flash", connection: "DeepSeek", caps: { image: true, reasoning: true, contextWindow: 1_000_000 } },
  { connectionId: "giga", model: "max", name: "GigaChat 2 Max", connection: "GigaChat", caps: { image: true, reasoning: false, contextWindow: 131_072 } },
];

function AgentDemo() {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("Ada");
  const [value, setValue] = useState("business");
  const [choice, setChoice] = useState<AgentModelChoice>({ connectionId: "giga", model: "max" });
  const close = useCallback(() => setOpen(false), []);
  return (
    <div style={{ position: "relative", height: 560, padding: 12 }} data-demo="agent">
      <div className="row">
        <AgentButton icon={AGENT_OPTIONS.find((o) => o.key === value)!.icon} label="Agent" expanded={open} onClick={() => setOpen((v) => !v)} />
        <b>{name}</b>
      </div>
      {open && (
        // FTR.HMR.SPEC-0001: the menu of the agent of every product — its strings and the block «Model» are the kit's
        <AgentSettingsMenu name={name} value={value} options={[...AGENT_OPTIONS]} onRename={setName} onPick={setValue} onClose={close}
          onModel={setChoice}
          models={{ available: AGENT_MODELS, defaultModel: AGENT_MODELS[0], contextTokens: 120_000, chosen: choice !== null,
            model: choice ? (AGENT_MODELS.find((m) => m.connectionId === choice.connectionId && m.model === choice.model) ?? null) : AGENT_MODELS[0] }} />
      )}
    </div>
  );
}

function LoginFrame({ view }: { view: string }) {
  // oxlint-disable-next-line react/iframe-missing-sandbox -- the frame shows this very page: its scripts and its storage are its own
  return <iframe className="sc-login" title={view} src={`?view=${view}`} />;
}

function LoginDemo({ product, error }: { product: "nabu" | "hammurapi"; error?: boolean }) {
  const nabu = product === "nabu";
  const [lang, setLang] = useState("en");
  return (
    <LoginScreen logo={nabu ? "./nabu.jpg" : "./hammurapi.png"} logoAlt={nabu ? "The logo of Nabu" : "The logo of Hammurapi"}
      name={nabu ? "NABU" : "HAMMURAPI"} tagline={nabu ? "Building AI future together" : "The specification is the source of truth"}
      signIn={{ href: "#login", label: "Sign in with GitHub", icon: <GitHubIcon /> }} note="Only for members of the organization GreenOnGrey"
      error={error ? "Could not sign in. Try again." : undefined}
      languages={["en", "ru", "de", "es", "zh"].map((code) => ({ code, label: code.toUpperCase(), active: code === lang }))} onLanguage={setLang} />
  );
}
