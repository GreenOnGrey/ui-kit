import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { AttachmentList, AttachmentPreview, SheetView, columnName, mergeSpans, fileSize, htmlDocument, parseTable, previewKind, previewType } from "./Attachments";
import type { ChatAttachment } from "./types";

const att = (fileName: string, mimeType?: string, size?: number): ChatAttachment => ({ id: fileName, fileName, href: `/files/${fileName}`, mimeType, size });
const load = () => Promise.resolve(new Blob(["x"]));

describe("attachments", () => {
  it("FTR.NAB.CHAT-0001 ATT-06 chooses the preview by the type and the name", () => {
    expect(previewKind(att("a.png", "image/png"))).toBe("image");
    expect(previewKind(att("photo.JPG"))).toBe("image");
    expect(previewKind(att("logo.svg", "image/svg+xml"))).toBe("image");
    expect(previewKind(att("scan.pdf", "application/octet-stream"))).toBe("pdf");
    expect(previewKind(att("notes.md", "text/markdown; charset=utf-8"))).toBe("markdown");
    expect(previewKind(att("README.markdown", "text/plain"))).toBe("markdown");
    expect(previewKind(att("metrics.csv", "text/csv"))).toBe("table");
    expect(previewKind(att("rows.tsv", "application/octet-stream"))).toBe("table");
    expect(previewKind(att("page.html", "text/html"))).toBe("html");
    expect(previewKind(att("index.HTM"))).toBe("html");
    expect(previewKind(att("data.json", "application/json"))).toBe("text");
    expect(previewKind(att("main.go", "application/octet-stream"))).toBe("text");
    expect(previewKind(att("build.log"))).toBe("text");
    expect(previewKind(att("data.zip", "application/zip"))).toBeNull();
    expect(previewKind(att("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBeNull();
  });

  it("ATT-07 makes every file a download tile when the product does not load them", () => {
    const out = html(<AttachmentList items={[att("scan.pdf", "application/pdf")]} />);
    expect(out).toContain('class="att-tile dl" href="/files/scan.pdf" download="scan.pdf" aria-label="Download scan.pdf"');
    expect(out).not.toContain("<button");
  });

  it("ATT-08 draws an image as a thumbnail, a file with a preview as a tile of its kind, the rest as a download tile", () => {
    const out = html(<AttachmentList items={[att("a.png", "image/png"), att("scan.pdf", "application/pdf", 1536), att("notes.md", "text/markdown"),
      att("m.csv", "text/csv"), att("build.log", "text/plain"), att("data.zip", "application/zip"), att("blob")]} load={load} onOpen={() => {}} />);
    expect(out).toContain('class="att-thumb" aria-label="Open a.png"');
    expect(out).toContain('class="att-tile pdf" aria-label="Open scan.pdf"');
    expect(out).toContain('<span class="att-kl">PDF</span>');
    expect(out).toContain("1.5 kB");
    expect(out).toContain('class="att-tile markdown"');
    expect(out).toContain('<span class="att-kl">MD</span>');
    expect(out).toContain('class="att-tile table"');
    expect(out).toContain('<span class="att-kl">CSV</span>');
    expect(out).toContain('class="att-tile text"');
    expect(out).toContain('<span class="att-kl">LOG</span>');
    expect(out).toContain('class="att-tile dl" href="/files/data.zip"');
    expect(out).toContain('<span class="att-kl">ZIP</span>');
    expect(out).toContain('<span class="att-kl">FILE</span>');
    expect(out.match(/<button/g)).toHaveLength(5);
  });

  it("ATT-09 names the file and its size and offers the download in the preview", () => {
    const out = html(<AttachmentPreview a={att("scan.pdf", "application/pdf", 1536)} load={load} onClose={() => {}} />);
    expect(out).toContain("scan.pdf");
    expect(out).toContain("1.5 kB");
    expect(out).toContain("Download");
    expect(out).toContain('role="dialog"');
  });

  it("SEC-04 shows SVG only as an image; an HTML page runs nothing and loads nothing from outside", () => {
    const out = html(<AttachmentList items={[att("logo.svg", "image/svg+xml"), att("page.html", "text/html")]} load={load} onOpen={() => {}} />);
    expect(out).toContain('class="att-thumb" aria-label="Open logo.svg"');
    expect(out).toContain('class="att-tile html" aria-label="Open page.html"');
    expect(out).toContain('<span class="att-kl">HTML</span>');
    const doc = htmlDocument("<script>alert(1)</script><img src=\"https://x.test/t.png\">");
    expect(doc.startsWith('<meta http-equiv="Content-Security-Policy" content="default-src \'none\';')).toBe(true);
    // the policy allows no scripts and no network: only what is inside the file
    const policy = /content="([^"]*)"/.exec(doc)?.[1] ?? "";
    expect(policy).not.toMatch(/script-src|connect-src|https?:|\*/);
  });

  it("ATT-20 keeps the doctype of a page first: the page stays in its standards mode", () => {
    const doc = htmlDocument("<!DOCTYPE html><title>x</title>");
    expect(doc.startsWith('<!DOCTYPE html><meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(htmlDocument("<p>x</p>").startsWith("<meta")).toBe(true);
  });

  it("ATT-21 draws a file without a type by the type of its extension", () => {
    expect(previewType({ fileName: "logo.svg", mimeType: "application/octet-stream" })).toBe("image/svg+xml");
    expect(previewType({ fileName: "scan.PDF" })).toBe("application/pdf");
    expect(previewType({ fileName: "a.png", mimeType: "image/png; charset=binary" })).toBe("image/png");
    expect(previewType({ fileName: "data.bin" })).toBeUndefined();
  });

  it("ATT-14 reads CSV with quotes and TSV", () => {
    expect(parseTable('a,b\n"x, y","say ""hi"""\r\n3,\n', false)).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["3", ""]]);
    expect(parseTable("a\tb\n1\t2\n", true)).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("formats sizes in the language of the interface", () => {
    expect(fileSize(512, "en")).toBe("512 byte");
    expect(fileSize(3 * 1024 * 1024, "en")).toBe("3 MB");
  });

  it("FTR.NAB.CHAT-0003 PRV-01 previews documents and spreadsheets only when the product can", () => {
    for (const n of ["report.docx", "old.doc", "deck.pptx", "notes.odt", "letter.rtf", "slides.odp"]) {
      expect(previewKind(att(n), true)).toBe("office-doc");
      expect(previewKind(att(n))).toBeNull();
    }
    for (const n of ["data.xlsx", "macro.xlsm", "old.xls", "table.ods"]) expect(previewKind(att(n), true)).toBe("office-sheet");
    expect(previewKind(att("scan.pdf"), true)).toBe("pdf");
    const out = html(<AttachmentList items={[att("report.docx"), att("data.xlsx")]} load={load} onOpen={() => {}} office />);
    expect(out).toContain('class="att-tile office-doc" aria-label="Open report.docx"');
    expect(out).toContain('class="att-tile office-sheet" aria-label="Open data.xlsx"');
    expect(html(<AttachmentList items={[att("report.docx")]} load={load} onOpen={() => {}} />)).toContain('class="att-tile dl"');
  });

  it("PRV-02 waits for the preview of a document", () => {
    const out = html(<AttachmentPreview a={att("report.docx")} load={load} loadPreview={() => new Promise(() => {})} onClose={() => {}} />);
    expect(out).toContain("Preparing the preview");
    expect(out).toContain("Download");
  });

  it("PRV-03 draws a sheet: tabs, column letters, formulas grey with a hint, what is cut", () => {
    const sheets = [
      { name: "Sales", rows: 900, cols: 2, merges: [], cells: [[{ v: "Q1" }, { v: "1 200", n: 1200 }], [{ v: "Sum" }, { f: "=SUM(B1:B1)" }]] },
      { name: "Notes", rows: 1, cols: 1, merges: [], cells: [[{ v: "x" }]] },
    ];
    const out = html(<SheetView sheets={sheets} />);
    expect(out).toContain('role="tab" aria-selected="true" tabindex="0" class="on">Sales');
    expect(out).toContain(">Notes</button>");
    expect(out).toContain("<th>A</th><th>B</th>");
    expect(out).toContain('class="att-num">1 200');
    expect(out).toContain('class="att-formula" title="The value is calculated when opened in Excel"');
    expect(out).toContain("=SUM(B1:B1)");
    expect(out).toContain("Showing 2 of 900 rows");
    expect(html(<SheetView sheets={[sheets[1]]} />)).not.toContain("tablist");
  });

  it("PRV-04 draws merged cells once with their span", () => {
    const { spans, covered } = mergeSpans(["A1:B2", "bad"]);
    expect(spans.get("0:0")).toEqual([2, 2]);
    expect([...covered].toSorted()).toEqual(["0:1", "1:0", "1:1"]);
    const out = html(<SheetView sheets={[{ name: "S", rows: 2, cols: 3, merges: ["A1:B1"], cells: [[{ v: "Title" }, {}, { v: "x" }], [{ v: "a" }, { v: "b" }, { v: "c" }]] }]} />);
    expect(out).toContain('<td colSpan="2">Title</td><td>x</td>');
  });

  it("names columns as spreadsheets do", () => {
    expect([1, 26, 27, 52, 703].map(columnName)).toEqual(["A", "Z", "AA", "AZ", "AAA"]);
  });
});
