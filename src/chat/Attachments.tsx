import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { Modal } from "../components/ui";
import { UIKIT_NS, useKitT } from "../i18n";
import { intlLocale } from "./intl";
import type { ChatAttachment } from "./types";

// The files of a message and their preview (FTR.NAB.CHAT-0001 R34, design §3.6):
// images as thumbnails, the files with a preview as tiles with the icon of the
// preview, the rest as tiles that download.

export type PreviewKind = "image" | "pdf" | "markdown" | "table" | "html" | "text";

/** Loads the content of an attachment: the product fetches it with its session. */
export type LoadAttachment = (a: ChatAttachment) => Promise<Blob>;

// SVG is an image of <img>: there its scripts do not run.
const IMAGES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/;
const TEXT_EXT = /\.(txt|log|json|ya?ml|xml|ini|toml|sql|sh|py|go|js|ts|tsx|java|kt|rb|rs|c|cpp|h|css)$/;

/** Text, tables and Markdown larger than this are downloaded, not drawn. */
export const TEXT_PREVIEW_MAX = 1 << 20;
/** The rows of a table shown in the preview. */
export const TABLE_ROWS = 500;

/** How an attachment is previewed, or null when it is only downloaded. */
export function previewKind(a: Pick<ChatAttachment, "fileName" | "mimeType">): PreviewKind | null {
  const type = (a.mimeType ?? "").toLowerCase().split(";")[0].trim();
  const name = a.fileName.toLowerCase();
  if (IMAGES.has(type) || ((!type || type === "application/octet-stream") && IMAGE_EXT.test(name))) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type === "text/markdown" || /\.(md|markdown)$/.test(name)) return "markdown";
  if (type === "text/csv" || type === "text/tab-separated-values" || /\.(csv|tsv)$/.test(name)) return "table";
  if (type === "text/html" || /\.html?$/.test(name)) return "html";
  if (type.startsWith("text/") || type === "application/json" || type === "application/xml" || TEXT_EXT.test(name)) return "text";
  return null;
}

const KIND_ICON: Record<PreviewKind, IconName> = { image: "image", pdf: "pdf", markdown: "markdown", table: "table", html: "globe", text: "source" };

/** The icon of a kind of preview: the tiles of the chat and the products' own lists of files show it. */
export const previewIcon = (kind: PreviewKind): IconName => KIND_ICON[kind];

/** The label of a tile: the kind of the preview or the extension of the file. */
function label(a: ChatAttachment, kind: PreviewKind | null): string {
  if (kind === "pdf") return "PDF";
  if (kind === "markdown") return "MD";
  if (kind === "html") return "HTML";
  const ext = /\.([a-z0-9]{1,5})$/i.exec(a.fileName)?.[1]?.toUpperCase();
  return ext ?? (kind ? "TXT" : "FILE");
}

/** The size of a file in the units of the language. */
export function fileSize(bytes: number, language: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return new Intl.NumberFormat(intlLocale(language), {
    style: "unit", unit: units[i], unitDisplay: "short", maximumFractionDigits: i === 0 ? 0 : 1,
  }).format(v);
}

/** The policy put into a previewed HTML page: nothing is loaded from outside and nothing runs; images and
 * fonts inside the file and its own styles stay. */
const HTML_POLICY = "default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline' data:";

/** The document of a previewed HTML page. In a browser the page is parsed inert (a DOMParser loads nothing) and
 * cleaned of everything that would load or lead anywhere: scripts, frames, plug-ins, links of the head, its own
 * `http-equiv` (a refresh), and every address that is not `data:`, `blob:` or an anchor — a relative one would go to
 * the site with the session. The policy is put first into the head, after the doctype of the file, so the page keeps
 * its mode. The policy alone is not enough: a browser may fetch a picture before it applies a policy of a meta. */
export function htmlDocument(text: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${HTML_POLICY}">`;
  const doctype = /^\s*<!doctype[^>]*>/i.exec(text)?.[0] ?? "";
  if (typeof DOMParser === "undefined") return doctype + meta + text.slice(doctype.length);
  const doc = new DOMParser().parseFromString(text, "text/html");
  doc.querySelectorAll("script, noscript, iframe, frame, frameset, object, embed, applet, base, link, meta[http-equiv], portal").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    // a copy: attributes are removed while they are walked
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if (URL_ATTRS.has(name) && !SAFE_URL.test(attr.value)) el.removeAttribute(attr.name);
      else if (name === "srcset" && attr.value.split(",").some((c) => !SAFE_URL.test(c))) el.removeAttribute(attr.name);
      else if (name === "style") el.setAttribute("style", cleanCss(attr.value));
    }
  });
  doc.querySelectorAll("style").forEach((el) => { el.textContent = cleanCss(el.textContent ?? ""); });
  const policy = doc.createElement("meta");
  policy.setAttribute("http-equiv", "Content-Security-Policy");
  policy.setAttribute("content", HTML_POLICY);
  doc.head.prepend(policy);
  return (doctype ? "<!doctype html>" : "") + doc.documentElement.outerHTML;
}

// The attributes that load a resource or lead to an address.
const URL_ATTRS = new Set(["src", "href", "xlink:href", "action", "formaction", "poster", "background", "data", "ping", "lowsrc", "dynsrc", "manifest", "cite", "longdesc", "codebase", "archive", "usemap"]);
const SAFE_URL = /^\s*(data:|blob:|#|$)/i;

/** CSS without what loads from outside: `@import` and any `url()` that is not `data:` or `blob:`. */
function cleanCss(css: string): string {
  return css.replace(/@import[^;]*;?/gi, "").replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, _q: string, u: string) => (SAFE_URL.test(u) && u.trim() !== "" ? m : "none"));
}

// The types of the previews by the extension: a file whose type is unknown (a file of a space comes as
// application/octet-stream) is drawn by the type of its name.
const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  pdf: "application/pdf", md: "text/markdown", markdown: "text/markdown", csv: "text/csv", tsv: "text/tab-separated-values",
  html: "text/html", htm: "text/html",
};

/** The type a preview draws a file with: its own, else the one of its extension. */
export function previewType(a: Pick<ChatAttachment, "fileName" | "mimeType">): string | undefined {
  const own = (a.mimeType ?? "").split(";")[0].trim().toLowerCase();
  if (own && own !== "application/octet-stream") return own;
  return TYPE_BY_EXT[/\.([a-z0-9]+)$/i.exec(a.fileName)?.[1]?.toLowerCase() ?? ""] ?? (own || undefined);
}

/** The rows of CSV (quotes by RFC 4180) or TSV. */
export function parseTable(text: string, tab: boolean): string[][] {
  if (tab) return text.replace(/\r?\n$/, "").split(/\r?\n/).map((l) => l.split("\t"));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** An object URL of the loaded attachment, revoked when it is no longer shown. */
function useBlob(a: ChatAttachment, load: LoadAttachment, enabled = true) {
  const [state, setState] = useState<{ url?: string; blob?: Blob; failed?: boolean }>({});
  // the adapter builds new objects on every render: the file is loaded once per file, not per object
  const { id, href, fileName, mimeType, size } = a;
  useEffect(() => {
    if (!enabled) return;
    let url: string | undefined;
    let live = true;
    load({ id, href, fileName, mimeType, size }).then((blob) => {
      if (!live) return;
      // the type of the product's metadata: a blob of a download is often untyped
      const type = previewType({ fileName, mimeType });
      const typed = type && blob.type !== type ? new Blob([blob], { type }) : blob;
      url = URL.createObjectURL(typed);
      setState({ url, blob: typed });
    }, () => live && setState({ failed: true }));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [enabled, load, id, href, fileName, mimeType, size]);
  return state;
}

function Thumb({ a, load, onOpen }: { a: ChatAttachment; load: LoadAttachment; onOpen: () => void }) {
  const t = useKitT();
  const { url, failed } = useBlob(a, load);
  if (failed) return <Tile a={a} kind="image" onOpen={onOpen} />;
  return (
    <button type="button" className="att-thumb" onClick={onOpen} aria-label={t("chat.files.open", { name: a.fileName })} title={a.fileName}>
      {url ? <img src={url} alt="" /> : <span className="spin" aria-hidden="true" />}
      <span className="att-cap">{a.fileName}</span>
    </button>
  );
}

/** A file as a tile: the icon of its preview, or of the download, its name and size. */
function Tile({ a, kind, onOpen }: { a: ChatAttachment; kind: PreviewKind | null; onOpen?: () => void }) {
  const t = useKitT();
  const { i18n } = useTranslation(UIKIT_NS);
  const preview = kind !== null && onOpen !== undefined;
  const body = (
    <>
      <span className="att-ic">
        <Icon name={preview && kind ? KIND_ICON[kind] : "download"} size={24} />
        <span className="att-kl">{label(a, kind)}</span>
      </span>
      <span className="att-name">{a.fileName}</span>
      {a.size != null && <span className="att-size">{fileSize(a.size, i18n.language)}</span>}
    </>
  );
  if (preview) {
    return <button type="button" className={`att-tile ${kind}`} onClick={onOpen} aria-label={t("chat.files.open", { name: a.fileName })} title={a.fileName}>{body}</button>;
  }
  return <a className="att-tile dl" href={a.href} download={a.fileName} aria-label={t("chat.files.save", { name: a.fileName })} title={a.fileName}>{body}</a>;
}

/** The files of a message: thumbnails of images and tiles; without `load` every file downloads. */
export function AttachmentList({ items, load, onOpen }: { items: ChatAttachment[]; load?: LoadAttachment; onOpen?: (a: ChatAttachment) => void }) {
  return (
    <div className="atts">
      {items.map((a) => {
        const open = load && onOpen ? () => onOpen(a) : undefined;
        const kind = previewKind(a);
        return load && open && kind === "image"
          ? <Thumb key={a.id} a={a} load={load} onOpen={open} />
          : <Tile key={a.id} a={a} kind={kind} onOpen={open} />;
      })}
    </div>
  );
}

function TableView({ text, tab }: { text: string; tab: boolean }) {
  const t = useKitT();
  const [head, ...body] = parseTable(text, tab);
  const shown = body.slice(0, TABLE_ROWS);
  return (
    <div className="att-table">
      <table>
        {head && <thead><tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>}
        <tbody>{shown.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
      {body.length > shown.length && <div className="att-more">{t("chat.files.rows", { shown: shown.length, total: body.length })}</div>}
    </div>
  );
}

/** The width a previewed page is laid out at: the one of a desktop. A narrower frame shows it scaled down, so a
 * page made for a screen (a deck of slides) is seen whole instead of cut. */
export const PAGE_WIDTH = 1280;

/** A previewed HTML page: a frame with no permissions — no scripts, forms or access to the site — and nothing
 * from outside, laid out at PAGE_WIDTH and scaled to the width of the preview. */
function HtmlPage({ text, title }: { text: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / PAGE_WIDTH));
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const doc = useMemo(() => htmlDocument(text), [text]);
  return (
    <div className="att-htmlbox" ref={box}>
      <iframe className="att-html" sandbox="" srcDoc={doc} title={title} referrerPolicy="no-referrer"
        style={{ width: PAGE_WIDTH, height: `${100 / scale}%`, transform: `scale(${scale})` }} />
    </div>
  );
}

/** The text of a file, or null when it is not UTF-8. */
type Text = { text: string | null };

/** The preview of an attachment: an image, the browser's PDF viewer, drawn Markdown, a table or text. */
export function AttachmentPreview({ a, load, onClose }: { a: ChatAttachment; load: LoadAttachment; onClose: () => void }) {
  const t = useKitT();
  const { i18n } = useTranslation(UIKIT_NS);
  const kind = previewKind(a);
  const textual = kind === "markdown" || kind === "table" || kind === "html" || kind === "text";
  const [source, setSource] = useState(false);
  // a known size over the limit is not loaded at all
  const knownTooLarge = textual && (a.size ?? 0) > TEXT_PREVIEW_MAX;
  const { url, blob, failed } = useBlob(a, load, !knownTooLarge);
  const [content, setContent] = useState<Text | null>(null);
  const tooLarge = knownTooLarge || (textual && (blob?.size ?? 0) > TEXT_PREVIEW_MAX);
  useEffect(() => {
    if (!textual || !blob || tooLarge) return;
    void blob.arrayBuffer().then((buf) => {
      try {
        setContent({ text: new TextDecoder("utf-8", { fatal: true }).decode(buf) });
      } catch {
        setContent({ text: null });
      }
    }, () => setContent({ text: null }));
  }, [textual, blob, tooLarge]);
  const text = content?.text;
  let body;
  if (failed) body = <div className="att-msg err-text">{t("chat.files.failed")}</div>;
  else if (tooLarge) body = <div className="att-msg">{t("chat.files.tooLarge")}</div>;
  else if (content && text === null) body = <div className="att-msg">{t("chat.files.notUtf8")}</div>;
  else if (!url || (textual && text == null)) body = <div className="att-msg"><span className="spin" aria-hidden="true" /> {t("loading")}</div>;
  else if (kind === "image") body = <img className="att-img" src={url} alt={a.fileName} />;
  // the browser's own viewer; an <object> because a sandboxed frame shows no PDF
  else if (kind === "pdf") body = <object className="att-pdf" data={url} type="application/pdf" aria-label={a.fileName}><div className="att-msg">{t("chat.files.failed")}</div></object>;
  else if (kind === "markdown") body = <div className="att-md"><Markdown text={text ?? ""} /></div>;
  else if (kind === "table") body = <TableView text={text ?? ""} tab={/\.tsv$/i.test(a.fileName) || a.mimeType === "text/tab-separated-values"} />;
  // a page: a frame with no permissions — no scripts, forms or access to the site — and no loads from outside
  else if (kind === "html" && !source) body = <HtmlPage text={text ?? ""} title={a.fileName} />;
  else body = <pre className="att-text">{text}</pre>;
  return (
    <Modal wide onClose={onClose}
      title={<span className="att-title"><span className="att-name">{a.fileName}</span>{a.size != null && <span className="muted small">{fileSize(a.size, i18n.language)}</span>}</span>}
      footer={<>
        {kind === "html" && (
          <button type="button" className="btn ghost" onClick={() => setSource((v) => !v)}>
            <Icon name={source ? "globe" : "code"} size={14} /> {t(source ? "chat.files.page" : "chat.files.source")}
          </button>
        )}
        <a className="btn ghost" href={url ?? a.href} download={a.fileName}><Icon name="download" size={14} /> {t("chat.files.download")}</a>
        <button type="button" className="btn primary" onClick={onClose}>{t("close")}</button>
      </>}>
      <div className={`att-view ${kind ?? ""}`}>{body}</div>
    </Modal>
  );
}
