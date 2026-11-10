import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { Graph, edgeLine, layout, neighbours, rowLayout, type GraphEdge, type GraphNode } from "./Graph";

const nodes: GraphNode[] = [
  { id: "a", label: "A", group: 1, size: 9 }, { id: "b", label: "B", group: 2 }, { id: "c", label: "C", group: 2 },
  { id: "d", label: "D", group: 3, dashed: true }, { id: "e", label: "E", muted: true, hideLabel: true },
];
const edges: GraphEdge[] = [
  { source: "a", target: "b", directed: true }, { source: "b", target: "c", directed: true, dashed: true, title: "R13" },
  { source: "c", target: "d", directed: true }, { source: "d", target: "e" },
];
const draw = (props: Partial<Parameters<typeof Graph>[0]> = {}) =>
  html(<Graph nodes={nodes} edges={edges} ariaLabel="Links" selected={null} onSelect={() => {}} {...props} />);

describe("Graph (FTR.HMR.DEV-0002 KIT-03)", () => {
  it("neighbours: one step, then two, edges taken both ways", () => {
    expect([...neighbours(edges, "b", 1)].toSorted()).toEqual(["a", "b", "c"]);
    expect([...neighbours(edges, "b", 2)].toSorted()).toEqual(["a", "b", "c", "d"]);
  });

  it("a focus highlights the node and its neighbours and fades the rest", () => {
    const out = draw({ focus: "b", depth: 1 });
    expect(out).toContain('class="dimmed"');
    expect(out).toMatch(/class="g-n g-c2 hl focus"[^>]*aria-label="B"/);
    expect(out).toMatch(/class="g-n g-c3 dashed"[^>]*aria-label="D"/);
    expect(draw({ focus: "b", depth: 2 })).toMatch(/class="g-n g-c3 dashed hl"[^>]*aria-label="D"/);
  });

  it("without a focus, or with one outside the data, nothing is faded", () => {
    expect(draw()).not.toContain('class="dimmed"');
    expect(draw({ focus: "gone" })).not.toContain('class="dimmed"');
  });
});

describe("Graph (FTR.HMR.DEV-0002 KIT-04)", () => {
  it("the same data gives the same places", () => {
    const one = layout(nodes, edges).map((n) => [n.x, n.y]);
    const two = layout(nodes, edges).map((n) => [n.x, n.y]);
    expect(two).toEqual(one);
  });
});

describe("Graph (FTR.HMR.DEV-0002 KIT-02)", () => {
  it("directed edges get the arrow, dashed ones their class, titles a tooltip", () => {
    const out = draw();
    const id = /<marker id="(g-arrow-[^"]+)"/.exec(out)?.[1];
    expect(id).toBeTruthy();
    expect(out).toContain(`marker-end="url(#${id})"`);
    expect(out).toContain('class="g-e dashed"');
    expect(out).toContain("<title>R13</title>");
    expect(out).toMatch(/class="g-n g-c1 small muted"[^>]*aria-label="E"/);
  });

  it("an undirected graph has no arrow; the legend comes from the product", () => {
    const out = html(<Graph nodes={nodes.slice(0, 2)} edges={[{ source: "a", target: "b", weight: 3 }]} ariaLabel="People"
      selected={null} onSelect={() => {}} legend={[{ group: 1, label: "People" }, { group: 2, label: "Topics" }]} />);
    expect(out).not.toContain("g-arrow");
    expect(out).toContain('<i class="g-c1"></i>People');
    expect(out).toContain('stroke-width="2.5"');
    expect(out).toContain('aria-label="Zoom in"');
  });

  it("a node label for screen readers comes from the product", () => {
    expect(draw({ nodeLabel: (n) => `${n.label}, 3 links` })).toContain('aria-label="A, 3 links"');
  });
});

describe("Graph (FTR.HMR.DEV-0002 KIT-07)", () => {
  const rowNodes: GraphNode[] = [
    { id: "x3", label: "X3", row: "x", order: 3 }, { id: "y1", label: "Y1", row: "y", order: 1 },
    { id: "x1", label: "X1", row: "x", order: 1 }, { id: "x2", label: "X2", row: "x", order: 2 }, { id: "z", label: "Z" },
  ];
  const rows = [{ id: "y", label: "Y row" }, { id: "x", label: "X row" }];

  it("rows stand in the given order, a row's nodes ascend left to right, an unknown row comes last", () => {
    const { placed, rows: lines, field } = rowLayout(rowNodes, rows);
    const at = new Map(placed.map((n) => [n.id, n]));
    expect(lines?.map((r) => r.label)).toEqual(["Y row", "X row", ""]);
    expect(at.get("y1")!.y).toBeLessThan(at.get("x1")!.y!);
    expect(new Set(["x1", "x2", "x3"].map((id) => at.get(id)!.y)).size).toBe(1);
    expect(at.get("x1")!.x).toBeLessThan(at.get("x2")!.x!);
    expect(at.get("x2")!.x).toBeLessThan(at.get("x3")!.x!);
    expect(at.get("z")!.y).toBeGreaterThan(at.get("x1")!.y!);
    expect(field.w).toBeGreaterThanOrEqual(760);
  });

  it("the same data gives the same places; the field grows with the longest row", () => {
    expect(rowLayout(rowNodes, rows).placed.map((n) => [n.x, n.y])).toEqual(rowLayout(rowNodes, rows).placed.map((n) => [n.x, n.y]));
    const long = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `N${i}`, row: "x", order: i }));
    expect(rowLayout(long, rows).field.w).toBeGreaterThan(760);
  });

  it("a link inside a row is an arc above when it goes right and below when it goes left", () => {
    const [x1, x2] = [{ id: "a", label: "A", r: 8, x: 100, y: 200 }, { id: "b", label: "B", r: 8, x: 300, y: 200 }];
    const right = edgeLine(x1, x2, true, true), left = edgeLine(x2, x1, true, true);
    expect(right.d).toMatch(/^M100,200 Q200,(\d+(\.\d+)?) /);
    expect(Number(/Q200,([\d.]+)/.exec(right.d!)![1])).toBeLessThan(200);
    expect(Number(/Q200,([\d.]+)/.exec(left.d!)![1])).toBeGreaterThan(200);
    expect(edgeLine(x1, { ...x2, y: 300 }, true, true).d).toBeUndefined();
    expect(edgeLine(x1, x2, true, false).d).toBeUndefined();
    expect(right.hit).toMatch(/ 300,200$/); // the line to click reaches the centre of the target
  });

  it("the rows are drawn with their labels; without rows there are none", () => {
    const out = html(<Graph nodes={rowNodes} edges={[{ source: "x1", target: "x3", directed: true }]} ariaLabel="Rows"
      selected={null} onSelect={() => {}} rows={rows} />);
    expect(out).toContain('class="g-row"');
    expect(out).toContain(">Y row</text>");
    expect(out).toMatch(/<path d="M[^"]+Q[^"]+"[^>]*marker-end/);
    expect(draw()).not.toContain("g-row");
  });

  it("the button that puts nodes back shows only after a move", () => {
    expect(draw({ draggable: true })).not.toContain("Put the nodes back");
  });
});

describe("Graph (FTR.HMR.DEV-0003 R15)", () => {
  it("a double edge gets its class and an inner line; a plain one has none", () => {
    const out = html(<Graph nodes={nodes} edges={[...edges.slice(0, 1).map((e) => ({ ...e, double: true, dashed: true })), edges[1]]}
      ariaLabel="g" selected={null} onSelect={() => {}} />);
    expect(out).toMatch(/class="g-e dashed double"/);
    expect((out.match(/class="inner"/g) ?? []).length).toBe(1);
  });
});
