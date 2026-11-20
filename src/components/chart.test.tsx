import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { Chart, axisMax, ticks, type ChartSeries } from "./Chart";

const days = ["1", "2", "3"];
const cost: ChartSeries[] = [
  { id: "collect", label: "Collection", color: 1, kind: "bar", values: [3, 4, 5] },
  { id: "compact", label: "Compaction", color: 2, kind: "bar", values: [0, 6, 0.5] },
];

describe("Chart (FTR.NAB.MEM-0001 MEM-UK-01)", () => {
  it("ticks: four even steps from zero that cover the largest value", () => {
    expect(ticks(10)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(ticks(11)).toEqual([0, 5, 10, 15, 20]);
    expect(ticks(23410)).toEqual([0, 10000, 20000, 30000, 40000]);
    expect(ticks(0)).toEqual([0, 1, 2, 3, 4]);
  });

  it("the axis of stacked bars covers their sum; of separate ones, the largest", () => {
    expect(axisMax(cost, true, 3)).toBe(10);
    expect(axisMax(cost, false, 3)).toBe(6);
  });

  it("stacked bars, a line on the right axis, the legend and the button of the table", () => {
    const out = html(<Chart x={days} stacked ariaLabel="Cost" series={[...cost,
      { id: "created", label: "Records", color: 3, kind: "line", axis: "right", dashed: true, values: [100, 200, null] }]} />);
    expect(out).toContain('role="img" aria-label="Cost"');
    expect((out.match(/class="chart-bar g-c1"/g) ?? []).length).toBe(3);
    expect((out.match(/class="chart-bar g-c2"/g) ?? []).length).toBe(2); // a zero is not drawn
    expect(out).toContain('class="chart-line g-c3 dashed"');
    expect(out).toContain(">Collection</button>");
    expect(out).toContain("Show as a table");
  });

  it("without data: the text instead of the axes", () => {
    const out = html(<Chart x={days} ariaLabel="Cost" series={[{ ...cost[0], values: [0, 0, null] }]} />);
    expect(out).toContain("No data");
    expect(out).not.toContain("<svg");
    expect(html(<Chart x={days} ariaLabel="Cost" series={[]} empty="Nothing this month" />)).toContain("Nothing this month");
  });
});
