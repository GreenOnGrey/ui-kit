import fs from "node:fs";
import path from "node:path";
import { parse } from "postcss";
import { describe, expect, it } from "vitest";
import { check, classesOf, target, type Manifest } from "../bin/ui-kit-check.mjs";

// FTR.NAB.CMN-0005 R23: a product does not redefine the kit.
const manifest: Manifest = {
  version: "0.0.0",
  classes: ["btn", "primary", "menu", "action", "on", "chip", "hd", "nb-chat"],
  roots: ["btn", "menu", "chip", "nb-chat"],
  tokens: ["--violet", "--bg"],
};
const rules = (css: string) => check(css, manifest).map((v) => `${v.rule}:${v.selector}`);

describe("the styles of the kit", () => {
  const dir = path.resolve(import.meta.dirname, "styles");
  const classes = new Set<string>();
  for (const f of fs.readdirSync(dir)) parse(fs.readFileSync(path.join(dir, f), "utf8")).walkRules((r) => classesOf(r.selector).forEach((c) => classes.add(c)));

  // KIT-04: what design §2 leaves to the products is not in the kit
  it("KIT-04 hold no class of a screen of a product", () => {
    const screens = ["mailcard", "digest", "gwrap", "capbar", "mtabs", "tones", "nbtones", "bnav", "tagline", "nbsteps",
      "chat-fab", "gates", "lane", "specdoc", "milkdown", "banner", "concise"];
    expect(screens.filter((c) => classes.has(c))).toEqual([]);
  });

  it("hold the basic elements", () => {
    for (const c of ["btn", "iconbtn", "chip", "inp", "field", "modal", "toast", "avatar", "topbar", "navmenu", "login", "msgs", "composer", "nb-side", "t", "kv", "hintbox"]) {
      expect(classes.has(c), c).toBe(true);
    }
  });
});

describe("ui-kit-check", () => {
  it("CHK-01 a token of the kit is not redefined", () => {
    const v = check(":root {\n  --violet: red;\n  --mine: 1px;\n}", manifest);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ rule: 1, line: 2 });
    expect(v[0].text).toContain("--violet");
  });

  it("CHK-02 restyling an element of the kit is a violation", () => {
    expect(rules(".mailcard .btn { color: red }")).toEqual(["2:.mailcard .btn"]);
    expect(rules(".btn { color: red }")).toEqual(["3:.btn"]);
    expect(rules(".menu a { color: red }")).toEqual(["3:.menu a"]);
    expect(rules("button { color: red }")).toEqual(["3:button"]);
    expect(rules(".mailcard .btn.primary:hover { color: red }")).toEqual(["2:.mailcard .btn.primary:hover"]);
    expect(rules(".nb-chat .hd { color: red }")).toEqual(["3:.nb-chat .hd"]);
  });

  it("CHK-03 own classes are free", () => {
    const css = `
      .mailcard .send { color: red }
      .btn.send-mail { color: red }
      .btn .mine { color: red }
      .mtabs button.on { color: red }
      .tcard .hd { display: flex }
      @media (max-width: 900px) { .mailcard { padding: 0 } }
      @keyframes pulse { from { opacity: 0 } to { opacity: 1 } }
    `;
    expect(rules(css)).toEqual([]);
  });

  it("checks rules inside media queries and every selector of a list", () => {
    expect(rules("@media (max-width: 900px) { .mine, .page .chip { margin: 0 } }")).toEqual(["2:.page .chip"]);
  });

  it("finds the target through combinators, attributes and functions", () => {
    expect(target(".a > .b + .c")).toBe(".c");
    expect(target('.a [data-x="1 2"] .b:not(.c, .d)')).toBe(".b:not(.c, .d)");
    expect(target("button")).toBe("button");
  });

  it("sees an element of the kit through :is() and :where()", () => {
    expect(rules(".mine :is(.btn, .chip) { color: red }")).toEqual(["2:.mine :is(.btn, .chip)"]);
    expect(rules(".mine :where(.menu) a { color: red }")).toEqual([]); // as `.mine .menu a`: a class of the kit left of the target
    expect(rules(".mine :where(.menu .action) { color: red }")).toEqual([]); // .action is a part, not a root
    expect(rules(".mine :is(.own, .btn) { color: red }")).toEqual(["2:.mine :is(.own, .btn)"]);
    expect(rules(".mine .own:is(.btn) { color: red }")).toEqual([]);
    expect(rules(".mine .x:not(.btn) { color: red }")).toEqual([]);
  });

  it("resolves nested rules", () => {
    expect(rules(".mine { .btn { color: red } }")).toEqual(["2:.mine .btn"]);
    expect(rules(".mine { &.wide { color: red } .part { color: red } }")).toEqual([]);
    expect(rules(".btn { &:hover { color: red } }")).toEqual(["3:.btn:hover"]);
  });
});
