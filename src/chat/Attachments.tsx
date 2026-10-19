import { useEffect, useState } from "react";
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

export type PreviewKind = "image" | "pdf" | "markdown" | "table" | "text";

/** Loads the content of an attachment: the product fetches it with its session. */
export type LoadAttachment = (a: ChatAttachment) => Promise<Blob>;

// SVG is an image of <img>: there its scripts do not run.
const IMAGES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/;
const TEXT_EXT = /\.(txt|log|json|ya?ml|xml|ini|toml|sql|sh|py|go|js|ts|tsx|java|kt|rb|rs|c|cpp|h|css|html?)$/;

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
  // HTML is shown as its source text, never as a page
  if (type.startsWith("text/") || type === "application/json" || type === "application/xml" || TEXT_EXT.test(name)) return "text";
  return null;
}

const KIND_ICON: Record<PreviewKind, IconName> = { image: "image", pdf: "pdf", markdown: "markdown", table: "table", text: "source" };

/** The label of a tile: the kind of the preview or the extension of the file. */
function label(a: ChatAttachment, kind: PreviewKind | null): string {
  if (kind === "pdf") return "PDF";
  if (kind === "markdown") return "MD";
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
      const typed = mimeType && blob.type !== mimeType ? new Blob([blob], { type: mimeType }) : blob;
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

/** The text of a file, or null when it is not UTF-8. */
type Text = { text: string | null };

/** The preview of an attachment: an image, the browser's PDF viewer, drawn Markdown, a table or text. */
export function AttachmentPreview({ a, load, onClose }: { a: ChatAttachment; load: LoadAttachment; onClose: () => void }) {
  const t = useKitT();
  const { i18n } = useTranslation(UIKIT_NS);
  const kind = previewKind(a);
  const textual = kind === "markdown" || kind === "table" || kind === "text";
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
  else body = <pre className="att-text">{text}</pre>;
  return (
    <Modal wide onClose={onClose}
      title={<span className="att-title"><span className="att-name">{a.fileName}</span>{a.size != null && <span className="muted small">{fileSize(a.size, i18n.language)}</span>}</span>}
      footer={<>
        <a className="btn ghost" href={url ?? a.href} download={a.fileName}><Icon name="download" size={14} /> {t("chat.files.download")}</a>
        <button type="button" className="btn primary" onClick={onClose}>{t("close")}</button>
      </>}>
      <div className={`att-view ${kind ?? ""}`}>{body}</div>
    </Modal>
  );
}
