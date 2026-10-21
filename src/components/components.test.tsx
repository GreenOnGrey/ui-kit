import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { ICON_NAMES } from "./Icon";
import { Markdown } from "./Markdown";
import { Avatar, Loading, Switch, initials } from "./ui";
import { Button, IconButton } from "./Button";
import { Tabs } from "./Tabs";
import { TopBar, type LinkComponent } from "./TopBar";
import { LoginScreen } from "../login";

const Link: LinkComponent = ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>;

const bar = (actions?: boolean) => html(
  <TopBar logo="/logo.png" name="Nabu" Link={Link} avatar={<Avatar name="Ada" />} profileMenu={() => null}
    sections={[{ key: "chat", label: "Chat", href: "/", active: true }, { key: "tasks", label: "Tasks", href: "/tasks", active: false }]}
    actions={actions ? <button className="btn primary sm">New</button> : undefined} />,
);

const screen = (error?: string) => html(
  <LoginScreen logo="/logo.png" logoAlt="Logo" name="NABU" tagline="Motto" signIn={{ href: "/auth/login", label: "Sign in", icon: null }}
    note="Members only" error={error} languages={[{ code: "en", label: "EN", active: true }, { code: "ru", label: "RU", active: false }]} onLanguage={() => {}} />,
);

describe("icons (KIT-05)", () => {
  it("holds the icons of both products and the tone drawings", () => {
    for (const n of ["key", "link", "menu", "x", "tBusiness", "tFriendly", "tBrief", "tMentor", "tg", "mail", "stop", "refresh", "chevrons"]) {
      expect(ICON_NAMES, n).toContain(n);
    }
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });
});

describe("Markdown (KIT-07)", () => {
  it("renders headings, lists, tables, code and emphasis", () => {
    const out = html(<Markdown text={"# Title\n\n- **a**\n- `b`\n\n| h |\n|---|\n| c |\n\n```\ncode\n```"} />);
    expect(out).toContain("<h3>Title</h3>");
    expect(out).toContain("<li><b>a</b></li>");
    expect(out).toContain('<table class="cov">');
    expect(out).toContain("<pre><code>code</code></pre>");
  });

  it("never inserts markup from the text", () => {
    const out = html(<Markdown text={'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">'} />);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("Avatar (KIT-06)", () => {
  it("draws the icon and the variant the product gave", () => {
    const out = html(<Avatar name="Ada" agent icon="tBrief" variant="brief" small />);
    expect(out).toContain('class="avatar s agent brief"');
    expect(out).toContain("<svg");
  });

  it("shows initials of a user", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("ada")).toBe("AD");
    expect(initials(" ")).toBe("?");
    expect(html(<Avatar name="Ada Lovelace" />)).toContain(">AL<");
  });

  it("the components of the kit know nothing of tones", () => {
    const dir = path.resolve(import.meta.dirname, "..");
    const files = fs.readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.|Icon\.tsx$|testing\.tsx$/.test(f) && !f.startsWith("locales"));
    for (const f of files) expect(fs.readFileSync(path.join(dir, f), "utf8"), f).not.toMatch(/\btones?\b|business|concise/i);
  });
});

describe("controls", () => {
  it("Button and IconButton render the classes of the kit", () => {
    expect(html(<Button variant="primary" size="sm">Save</Button>)).toBe('<button type="button" class="btn primary sm">Save</button>');
    expect(html(<IconButton label="Send" fill />)).toBe('<button type="button" class="iconbtn fill" aria-label="Send"></button>');
  });

  it("CMP-06 IconButton requires a label", () => {
    // @ts-expect-error a button with an icon only must be named
    expect(html(<IconButton />)).not.toContain("aria-label");
  });

  it("CMP-03 Switch is a switch with its state", () => {
    expect(html(<Switch on onChange={() => {}} label="Voice" />)).toContain('role="switch" aria-checked="true"');
  });

  it("CMP-04 Tabs mark the chosen tab", () => {
    const out = html(<Tabs items={[{ key: "a", label: "A" }, { key: "b", label: "B" }]} value="b" onChange={() => {}} label="Views" />);
    expect(out).toContain('role="tablist" aria-label="Views"');
    expect(out).toContain('role="tab" aria-selected="true" tabindex="0" class="on"');
    expect(out).toContain('role="tab" aria-selected="false" tabindex="-1"');
  });

  it("Loading takes its text from the strings of the kit", () => {
    expect(html(<Loading />, "ru")).toBe('<div class="loading">Загрузка…</div>');
  });
});

describe("TopBar (CMP-07, CMP-09)", () => {
  it("shows the sections, the active one marked, and a closed burger", () => {
    const out = bar();
    expect(out).toContain('<a href="/" class="on" aria-current="page">Chat</a>');
    expect(out).toContain('<a href="/tasks">Tasks</a>');
    expect(out).toContain('aria-label="Sections" aria-expanded="false"');
    expect(out).not.toContain("navmenu");
  });

  it("puts the actions of the product before the avatar", () => {
    const out = bar(true);
    expect(out.indexOf(">New<")).toBeGreaterThan(out.indexOf("top-actions"));
    expect(out.indexOf(">New<")).toBeLessThan(out.indexOf('aria-label="Profile"'));
  });
});

describe("LoginScreen (CMP-10)", () => {
  it("shows the logo, the name, the motto, the button and the languages", () => {
    const out = screen();
    expect(out).toContain('<div class="login"><div class="box"><img src="/logo.png" alt="Logo"/><h1>NABU</h1><div class="tag">Motto</div>');
    expect(out).toContain('<a class="btn primary" href="/auth/login">Sign in</a>');
    expect(out).toContain('<button lang="en" class="chip on">EN</button>');
    expect(out).not.toContain('role="alert"');
  });

  it("announces the error", () => {
    expect(screen("Failed")).toContain('<div class="err-text" role="alert">Failed</div>');
  });
});
