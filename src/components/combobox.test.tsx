import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { html } from "../testing";
import { Combobox, fold, highlight } from "./Combobox";

describe("Combobox (FTR.NAB.MEM-0001 MEM-UK-03)", () => {
  it("a match ignores case and «ё»", () => {
    expect(fold("Ёлка ПЕТРОВА")).toBe("елка петрова");
    expect(renderToStaticMarkup(<>{highlight("Мария Петрова", "петр")}</>)).toBe("Мария <b>Петр</b>ова");
    expect(renderToStaticMarkup(<>{highlight("Ёлка", "елк")}</>)).toBe("<b>Ёлк</b>а");
    expect(highlight("Budget", "zzz")).toBe("Budget");
  });

  it("a closed field: the roles of a combobox, no list, no clear button", () => {
    const out = html(<Combobox load={async () => []} onSelect={() => {}} placeholder="Person or topic" ariaLabel="Person or topic" />);
    expect(out).toContain('role="combobox"');
    expect(out).toContain('aria-expanded="false"');
    expect(out).toContain('placeholder="Person or topic"');
    expect(out).not.toContain('role="listbox"');
    expect(out).not.toContain("combo-clear");
  });
});
