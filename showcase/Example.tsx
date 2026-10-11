import { useState, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { Icon } from "../src";
import { i18n } from "./i18n";
import { SECTION_TITLE, type SectionId } from "./sections";

/** Markup of an element with one tag on a line, for the snippet under an example. */
const pretty = (html: string) => html.replace(/></g, ">\n<");

/** An example of the showcase: the element and its markup. The snippet is the
 * markup of the very JSX that is drawn, so the two cannot differ (tech §3.7). */
export function Example({ label, children, box, source }: {
  label?: string; children: ReactNode; box?: boolean;
  /** What the snippet shows when the example is a demo around the element: a button that opens a dialog, a frame. */
  source?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const markup = pretty(renderToStaticMarkup(<I18nextProvider i18n={i18n}>{source ?? children}</I18nextProvider>));
  const copy = () => {
    void navigator.clipboard?.writeText(markup);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="sc-example">
      {label && <div className="sc-label">{label}</div>}
      <div className={`sc-stage${box ? " sc-box" : ""}`}>{children}</div>
      <div className="sc-code">
        <pre>{markup}</pre>
        <button className="btn sm ghost" onClick={copy}><Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Скопировано" : "Копировать"}</button>
      </div>
    </div>
  );
}

export function Section({ id, lead, children }: { id: SectionId; lead: string; children: ReactNode }) {
  return (
    <section className="sc-section" id={id}>
      <h2>{SECTION_TITLE[id]}</h2>
      <p className="sc-lead">{lead}</p>
      {children}
    </section>
  );
}
