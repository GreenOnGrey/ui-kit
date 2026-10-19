import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { AttachmentList, AttachmentPreview, fileSize, parseTable, previewKind } from "./Attachments";
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
    expect(previewKind(att("page.html", "text/html"))).toBe("text");
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

  it("SEC-04 shows SVG only as an image and HTML only as text", () => {
    const out = html(<AttachmentList items={[att("logo.svg", "image/svg+xml"), att("page.html", "text/html")]} load={load} onOpen={() => {}} />);
    expect(out).toContain('class="att-thumb" aria-label="Open logo.svg"');
    expect(out).toContain('class="att-tile text" aria-label="Open page.html"');
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<object");
  });

  it("ATT-14 reads CSV with quotes and TSV", () => {
    expect(parseTable('a,b\n"x, y","say ""hi"""\r\n3,\n', false)).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["3", ""]]);
    expect(parseTable("a\tb\n1\t2\n", true)).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("formats sizes in the language of the interface", () => {
    expect(fileSize(512, "en")).toBe("512 byte");
    expect(fileSize(3 * 1024 * 1024, "en")).toBe("3 MB");
  });
});
