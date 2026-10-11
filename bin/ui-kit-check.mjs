#!/usr/bin/env node
// ui-kit-check: a product does not redefine the kit (FTR.NAB.CMN-0005 R23, tech §3.6).
//   ui-kit-check src/styles.css [more files]
// A violation is
//   1. a declaration of a token of the kit;
//   2. a rule whose target — the rightmost compound of the selector — is an element
//      of the kit: it has a root class of the kit (one the kit styles on its own:
//      .btn, .chip, .t) and no class of the product. Names of parts and states
//      (.on, .hd, .lab) under a class of the product are the product's own;
//   3. a rule whose selector has no class of the product at all: only tags, only
//      classes of the kit or both.
// There are no exceptions and no disabling comments: another look means a class
// of the product or a change of the kit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "postcss";

export const classesOf = (selector) => [...selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);

/** The compounds of a selector, left to right. Brackets and parentheses are kept
 * whole: attribute values and arguments of :is() may hold spaces and combinators. */
export function compounds(selector) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of selector.trim()) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && /[\s>+~]/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** The rightmost compound of a selector: what the rule styles. */
export const target = (selector) => compounds(selector).at(-1) ?? "";

/** A compound without the arguments of its functions: `.a:not(.b)` → `.a:not()`. */
const outer = (compound) => {
  let prev;
  do { prev = compound; compound = compound.replace(/\([^()]*\)/g, "()"); } while (compound !== prev);
  return compound;
};

/** Classes a compound may match through :is() and :where(): `:is(.btn, .chip)` → btn, chip. */
function alternatives(compound) {
  const out = [];
  for (const m of compound.matchAll(/:(?:is|where|matches)\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    for (; i < compound.length && depth > 0; i++) depth += compound[i] === "(" ? 1 : compound[i] === ")" ? -1 : 0;
    // of every alternative only its own target counts
    for (const alt of compound.slice(from, i - 1).split(",")) out.push(...classesOf(outer(target(alt))));
  }
  return out;
}

/** The selectors of a rule with the selectors of the rules it is nested in. */
function resolved(rule) {
  let list = rule.selectors;
  for (let p = rule.parent; p; p = p.parent) {
    if (p.type !== "rule") continue;
    list = p.selectors.flatMap((ps) => list.map((s) => (s.includes("&") ? s.replaceAll("&", ps) : `${ps} ${s}`)));
  }
  return list;
}

/** Root classes of a stylesheet: those it styles on their own, as the single
 * class of the first compound of a selector. */
export function rootsOf(ast) {
  const roots = new Set();
  ast.walkRules((r) => {
    for (const selector of r.selectors) {
      const first = classesOf(compounds(selector)[0] ?? "");
      if (first.length === 1) roots.add(first[0]);
    }
  });
  return roots;
}

/** Violations of one stylesheet: `{ line, selector, rule, text }`. */
export function check(css, manifest, from = "styles.css") {
  const kit = new Set(manifest.classes);
  const roots = new Set(manifest.roots);
  const tokens = new Set(manifest.tokens);
  const out = [];
  const ast = parse(css, { from });
  ast.walkDecls(/^--/, (d) => {
    if (tokens.has(d.prop)) out.push({ line: d.source.start.line, selector: d.parent.selector ?? "", rule: 1, text: `the token ${d.prop} of the kit is redefined` });
  });
  ast.walkRules((r) => {
    if (r.parent.type === "atrule" && r.parent.name.endsWith("keyframes")) return;
    if (!r.nodes.some((n) => n.type === "decl" && !n.prop.startsWith("--"))) return;
    for (const selector of resolved(r)) {
      const own = (list) => list.some((c) => !kit.has(c));
      const all = classesOf(selector);
      // the classes the target has for certain, and those it may have through :is() / :where()
      const sure = classesOf(outer(target(selector)));
      const hit = [...sure, ...alternatives(target(selector))].filter((c) => roots.has(c));
      if (!own(all)) out.push({ line: r.source.start.line, selector, rule: 3, text: "the selector has no class of the product" });
      else if (hit.length > 0 && !own(sure)) out.push({ line: r.source.start.line, selector, rule: 2, text: `the rule restyles ${hit.map((c) => "." + c).join(", ")} of the kit` });
    }
  });
  return out.toSorted((a, b) => a.line - b.line);
}

function main(argv) {
  const files = argv.filter((a) => !a.startsWith("--"));
  if (files.length === 0) {
    console.error("usage: ui-kit-check <stylesheet> [more stylesheets]");
    return 2;
  }
  const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../dist/manifest.json"), "utf8"));
  let bad = 0;
  for (const file of files) {
    for (const v of check(fs.readFileSync(file, "utf8"), manifest, file)) {
      console.error(`${file}:${v.line}  ${v.selector}  — ${v.text} (rule ${v.rule})`);
      bad++;
    }
  }
  if (bad) console.error(`\nui-kit-check: ${bad} redefinition(s) of @green-on-grey/ui-kit ${manifest.version}. Use a class of the product or change the kit.`);
  return bad ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
