// Builds dist/styles.css (all the styles in one file, R8), dist/tokens.css and
// dist/manifest.json — the classes and the tokens of the kit that ui-kit-check
// protects from redefinition in a product (FTR.NAB.CMN-0005 tech §3.6).
import fs from "node:fs";
import path from "node:path";
import { parse } from "postcss";
import { classesOf, rootsOf } from "../bin/ui-kit-check.mjs";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src/styles");
const index = fs.readFileSync(path.join(src, "index.css"), "utf8");
const files = [...index.matchAll(/@import "\.\/(.+?)";/g)].map((m) => m[1]);
const css = files.map((f) => fs.readFileSync(path.join(src, f), "utf8").trim()).join("\n\n") + "\n";
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;

const classes = new Set();
const tokens = new Set();
const ast = parse(css);
ast.walkRules((r) => classesOf(r.selector).forEach((c) => classes.add(c)));
ast.walkDecls(/^--/, (d) => tokens.add(d.prop));

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/styles.css"), css);
fs.writeFileSync(path.join(root, "dist/tokens.css"), fs.readFileSync(path.join(src, "tokens.css"), "utf8"));
fs.writeFileSync(path.join(root, "dist/manifest.json"),
  JSON.stringify({ version, classes: [...classes].toSorted(), roots: [...rootsOf(ast)].toSorted(), tokens: [...tokens].toSorted() }, null, 2) + "\n");
console.log(`styles.css ${css.split("\n").length} lines, ${classes.size} classes, ${tokens.size} tokens`);
