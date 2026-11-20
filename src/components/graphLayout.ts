import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";

// The force layout of the graph, without React: the component runs it in the main thread for a small graph
// and in a Web Worker for a large one (FTR.NAB.MEM-0001 tech §12.1). The same input gives the same places in both.

export const W = 760;
export const H = 500;

/** The data of a node the layout needs; the component passes its nodes, the worker gets them as JSON. */
export type LayoutNode = { id: string; size?: number };
export type LayoutEdge = { source: string; target: string; weight?: number };
export type Point = { x: number; y: number };
/** Where the layout starts: `start` — places the nodes had in the last layout, `pinned` — places the user dragged
 * them to (FTR.NAB.MEM-0001 R21). */
export type LayoutSeed = { start?: Record<string, Point>; pinned?: Record<string, Point> };

/** A node with its place; the fields of d3-force are spelled out, so the types of the kit need no d3 types. */
export type Positioned<N> = N & { r: number; index?: number; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null };

export const radius = (size = 1) => 7 + Math.sqrt(size) * 3.2;

/** A node new to the layout starts at the middle of its neighbours that have a place, so it appears next to them
 * and the picture converges from where it was. Without such neighbours d3 places it. */
function seed<N extends LayoutNode>(placed: Positioned<N>[], edges: LayoutEdge[], { start, pinned }: LayoutSeed) {
  if (!start && !pinned) return;
  const known = (id: string) => pinned?.[id] ?? start?.[id];
  const all = Object.values({ ...start, ...pinned });
  const middle = all.length ? { x: all.reduce((t, p) => t + p.x, 0) / all.length, y: all.reduce((t, p) => t + p.y, 0) / all.length } : null;
  for (const n of placed) {
    const p = known(n.id);
    if (p) {
      n.x = p.x;
      n.y = p.y;
      continue;
    }
    let sx = 0, sy = 0, k = 0;
    for (const e of edges) {
      const other = e.source === n.id ? e.target : e.target === n.id ? e.source : null;
      const q = other ? known(other) : undefined;
      if (q) { sx += q.x; sy += q.y; k++; }
    }
    // a small offset by the index keeps two new nodes apart; a node without placed neighbours starts at the middle
    // of the known picture, not in the corner where d3 would put it
    const a = placed.indexOf(n) * 2.39996;
    const c = k ? { x: sx / k, y: sy / k } : middle;
    if (c) {
      n.x = c.x + Math.cos(a) * 24;
      n.y = c.y + Math.sin(a) * 24;
    }
  }
  for (const n of placed) {
    const p = pinned?.[n.id];
    if (p) { n.fx = p.x; n.fy = p.y; }
  }
}

/** Positions of the nodes: a force layout computed once per data. The start of d3-force is deterministic, so the
 * same data and the same seed give the same picture. */
export function layout<N extends LayoutNode>(nodes: N[], edges: LayoutEdge[], from: LayoutSeed = {}): Positioned<N>[] {
  const placed: Positioned<N>[] = nodes.map((n) => ({ ...n, r: radius(n.size) }));
  const ids = new Set(placed.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ source: e.source, target: e.target, weight: e.weight ?? 1 }));
  seed(placed, links, from);
  const sim = forceSimulation(placed)
    .force("link", forceLink<Positioned<N>, (typeof links)[number]>(links).id((d) => d.id).distance(90).strength((l) => Math.min(1, 0.2 + l.weight * 0.08)))
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(W / 2, H / 2))
    .force("collide", forceCollide<Positioned<N>>().radius((d) => d.r + 14))
    .stop();
  // a layout that starts from the last one is a warm start: less energy and fewer steps, so the picture settles
  // where it was instead of exploding and converging again
  const warm = !!from.start && Object.keys(from.start).length > 0;
  if (warm) sim.alpha(0.3);
  const steps = warm ? 120 : 260;
  for (let i = 0; i < steps; i++) sim.tick();
  for (const n of placed) { // keep the labels inside the field
    n.x = Math.max(n.r + 30, Math.min(W - n.r - 30, n.x ?? W / 2));
    n.y = Math.max(n.r + 10, Math.min(H - n.r - 24, n.y ?? H / 2));
  }
  return placed;
}

/** The message of the worker: the places by id. */
export type LayoutRequest = { id: number; nodes: LayoutNode[]; edges: LayoutEdge[]; seed: LayoutSeed };
export type LayoutReply = { id: number; places: Record<string, Point> };

export function places(nodes: LayoutNode[], edges: LayoutEdge[], from: LayoutSeed): Record<string, Point> {
  const out: Record<string, Point> = {};
  for (const n of layout(nodes, edges, from)) out[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
}
