import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { useKitT } from "../i18n";
import { Icon } from "./Icon";
import { H, W, layout, radius, type LayoutReply, type LayoutRequest, type LayoutSeed, type Point, type Positioned } from "./graphLayout";

export { layout } from "./graphLayout";

/** A node: `group` picks the colour (g-c1…g-c6), `size` the radius. */
export type GraphNode = {
  id: string; label: string; title?: string; group?: number; size?: number;
  /** Not in the data of the product, only referred to: a dashed outline. */
  dashed?: boolean;
  /** Context around the shown set: drawn faded. */
  muted?: boolean;
  /** The label shows only on hover, focus or highlight. */
  hideLabel?: boolean;
  /** With `rows` on the graph: the id of the row of the node and its place in it, ascending left to right. */
  row?: string;
  order?: number;
};
/** A link; `double` draws it as a double line — another layer of links, told apart without colour
 * (FTR.HMR.DEV-0003 R15); it combines with `dashed`. */
export type GraphEdge = { source: string; target: string; weight?: number; directed?: boolean; dashed?: boolean; double?: boolean; title?: string };
export type GraphSelection = { kind: "node"; id: string } | { kind: "edge"; source: string; target: string } | null;
/** A row of the row layout, top to bottom in the order given; the label is drawn at its left. */
export type GraphRow = { id: string; label: string };

type Placed = Positioned<GraphNode>;
type Field = { w: number; h: number };
/** The places of the nodes, the size of the field and, in the row layout, the rows with their middle line. */
type Placement = { placed: Placed[]; field: Field; rows?: { id: string; label: string; y: number; x: number; x2: number }[] };

/** Up to this many nodes the layout runs in the main thread during render: it takes a few milliseconds, the
 * picture is there at once and a static render has it. A larger graph is laid out in a Web Worker
 * (FTR.NAB.MEM-0001 R24, tech §12.1). */
export const SYNC_NODES = 60;

type View = { k: number; x: number; y: number };
/** The view zoomed by `factor`, between 0.5 and 4, keeping the centre of the field in place. */
const zoomed = (v: View, factor: number, f: Field): View => {
  const k = Math.max(0.5, Math.min(4, v.k * factor));
  return { k, x: f.w / 2 - ((f.w / 2 - v.x) / v.k) * k, y: f.h / 2 - ((f.h / 2 - v.y) / v.k) * k };
};

/** Ids within `depth` steps of `from`, edges taken both ways. */
export function neighbours(edges: GraphEdge[], from: string, depth: number): Set<string> {
  return near(adjacency(edges), from, depth);
}

/** The neighbours of every node, built once per data: a hover looks up a node instead of walking every edge. */
function adjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    let s = adj.get(a);
    if (!s) adj.set(a, (s = new Set()));
    s.add(b);
  };
  for (const e of edges) { add(e.source, e.target); add(e.target, e.source); }
  return adj;
}

function near(adj: Map<string, Set<string>>, from: string, depth: number): Set<string> {
  const out = new Set([from]);
  let frontier = [from];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of adj.get(id) ?? []) {
        if (!out.has(other)) { out.add(other); next.push(other); }
      }
    }
    frontier = next;
  }
  return out;
}

const GUTTER = 130; // the labels of the rows
const COL = 104;
const ROW = 76;

/** The row layout (FTR.HMR.DEV-0002 R15, exported for the tests): a row per `rows` entry that has nodes, top to
 * bottom in the given order; in a row the nodes by `order`, then id, left to right. A node whose row is not
 * among `rows` goes to a last row without a label. The block is centred in a field at least as big as that of
 * the force layout. */
export function rowLayout(nodes: GraphNode[], rows: GraphRow[]): Placement {
  const index = new Map(rows.map((r, i) => [r.id, i]));
  const byRow = new Map<number, Placed[]>();
  const placed: Placed[] = nodes.map((n) => ({ ...n, r: radius(n.size) }));
  for (const n of placed) {
    const i = index.get(n.row ?? "") ?? rows.length;
    byRow.set(i, [...(byRow.get(i) ?? []), n]);
  }
  const used = [...byRow.keys()].toSorted((a, b) => a - b);
  const cols = Math.max(1, ...used.map((i) => byRow.get(i)!.length));
  const bw = GUTTER + cols * COL, bh = used.length * ROW;
  const field = { w: Math.max(W, bw + 40), h: Math.max(H, bh + 40) };
  const x0 = (field.w - bw) / 2, y0 = (field.h - bh) / 2;
  const lines = used.map((i, k) => {
    const y = y0 + ROW * (k + 0.5) - 8; // the label under a node takes the lower part of the row
    const inRow = byRow.get(i)!.toSorted((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    inRow.forEach((n, j) => { n.x = x0 + GUTTER + COL * (j + 0.5); n.y = y; });
    return { id: rows[i]?.id ?? "", label: rows[i]?.label ?? "", y, x: x0 + 8, x2: x0 + bw };
  });
  return { placed, field, rows: lines };
}

/** The line of an edge: straight, or in the row layout an arc between two nodes of one row — above when it goes
 * right, below when it goes left, so links both ways do not cover each other. A directed line ends at the
 * circle of the target. */
export function edgeLine(a: Placed, b: Placed, directed: boolean, arcs: boolean): { d?: string; hit?: string; x1: number; y1: number; x2: number; y2: number } {
  const x1 = a.x ?? 0, y1 = a.y ?? 0;
  const bx = b.x ?? 0, by = b.y ?? 0;
  let x2 = bx, y2 = by;
  const arc = arcs && Math.abs(y2 - y1) < 1 && x1 !== x2;
  const cx = (x1 + x2) / 2;
  const cy = y1 - Math.sign(x2 - x1) * Math.min(ROW * 0.8, 14 + Math.abs(x2 - x1) * 0.25);
  if (directed) {
    const fx = arc ? cx : x1, fy = arc ? cy : y1; // the direction at the end: from the control point of the arc
    const dx = x2 - fx, dy = y2 - fy, len = Math.hypot(dx, dy) || 1;
    x2 -= (dx / len) * (b.r + 2);
    y2 -= (dy / len) * (b.r + 2);
  }
  // the line to click runs to the centre of the target, as the straight one does
  return arc ? { d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, hit: `M${x1},${y1} Q${cx},${cy} ${bx},${by}`, x1, y1, x2, y2 } : { x1, y1, x2, y2 };
}

/** The places of a placement by id, with the moved nodes where they were dragged. */
const placesOf = (p: Placement | null, moved: Map<string, Point>): Record<string, Point> => {
  const out: Record<string, Point> = {};
  for (const n of p?.placed ?? []) out[n.id] = moved.get(n.id) ?? { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
};

/** The layout state: the data it was made for, the placement (null until a worker answers) and the seed of the
 * next asynchronous layout. */
type LayoutState = { nodes: GraphNode[]; edges: GraphEdge[]; rows?: GraphRow[]; placement: Placement | null; ready: boolean; seed: LayoutSeed; round: number };

function place(nodes: GraphNode[], edges: GraphEdge[], rows: GraphRow[] | undefined, seed: LayoutSeed): Placement | null {
  if (rows) return rowLayout(nodes, rows);
  if (nodes.length > SYNC_NODES) return null;
  return { placed: layout(nodes, edges, seed), field: { w: W, h: H } };
}

/** A worker of the layout; null where workers are not available (a test, a page whose policy forbids them). */
async function startWorker(): Promise<Worker | null> {
  if (typeof Worker === "undefined") return null;
  try {
    const { default: LayoutWorker } = await import("./graphLayout.worker?worker&inline");
    return new LayoutWorker();
  } catch {
    return null;
  }
}

/** The id of the node an event happened on: the handlers live on the field, not on every node. */
const nodeOf = (target: EventTarget | null) => (target as Element | null)?.closest?.("[data-node]")?.getAttribute("data-node") ?? null;

const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** An edge; memoised, so a hover or a drag redraws only the edges whose look or ends changed. */
const EdgeView = memo(function EdgeView({ e, a, b, arcs, marker, on, onPick }: {
  e: GraphEdge; a: Placed; b: Placed; arcs: boolean; marker?: string; on: boolean; onPick: (e: GraphEdge) => void;
}) {
  const l = edgeLine(a, b, !!e.directed, arcs);
  const width = 1 + (e.weight ?? 1) * 0.5 + (e.double ? 3 : 0);
  return (
    <g className={`g-e${e.dashed ? " dashed" : ""}${e.double ? " double" : ""}${on ? " hl" : ""}`} onClick={() => onPick(e)}>
      {l.d ? (
        <>
          {/* a double line takes the arrow on its inner line: the size of a marker follows the width of the line */}
          <path d={l.d} strokeWidth={width} markerEnd={e.double ? undefined : marker} />
          {e.double && <path className="inner" d={l.d} markerEnd={marker} />}
          <path className="hit" d={l.hit} />
        </>
      ) : (
        <>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={width} markerEnd={e.double ? undefined : marker} />
          {e.double && <line className="inner" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} markerEnd={marker} />}
          <line className="hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        </>
      )}
      {e.title && <title>{e.title}</title>}
    </g>
  );
});

/** A node; its handlers live on the field (one set for all nodes), so the node is memoised by its look alone. */
const NodeView = memo(function NodeView({ n, cls, pinned, label }: { n: Placed; cls: string; pinned: boolean; label: string }) {
  return (
    <g className={cls} tabIndex={0} role="button" aria-pressed={pinned} aria-label={label} data-node={n.id}>
      <circle cx={n.x} cy={n.y} r={n.r} />
      <text x={n.x} y={(n.y ?? 0) + n.r + 14}>{n.label}</text>
      {n.title && <title>{n.title}</title>}
    </g>
  );
});

/** A graph of nodes and links (FTR.NAB.CMN-0003 R19, FTR.HMR.DEV-0002 R15, R16, FTR.NAB.MEM-0001 R21, R24).
 * Hovering highlights the neighbours, a click pins the selection; the wheel zooms,
 * dragging the field moves it. `focus` highlights a node and its neighbours within `depth`
 * steps; `onOpen` is called on a double click or Enter on a node. With `rows` the nodes stand in
 * rows (`GraphNode.row`, `order`) instead of the force layout; with `draggable` a node can be moved
 * and a button puts the moved nodes back. With `keepPositions` (the default) new data starts from the places the
 * nodes had, and moved nodes stay where they were dragged; each new `center` request brings its node to the middle of
 * the field.
 * The kit knows nothing of what the nodes are: labels, rows and the legend come from the product.
 * The layout runs when `nodes`, `edges` or `rows` change identity: keep them stable (useMemo). */
export function Graph({ nodes, edges, ariaLabel, selected, onSelect, focus, depth = 1, onOpen, legend, nodeLabel, rows, draggable, center, keepPositions = true }: {
  nodes: GraphNode[]; edges: GraphEdge[]; ariaLabel: string;
  selected: GraphSelection; onSelect: (s: GraphSelection) => void;
  focus?: string; depth?: 1 | 2;
  onOpen?: (id: string) => void;
  legend?: { group: number; label: string }[];
  nodeLabel?: (n: GraphNode) => string;
  rows?: GraphRow[];
  draggable?: boolean;
  /** A request to centre a node: a new object each time, so choosing the same node again centres it again. */
  center?: { id: string };
  keepPositions?: boolean;
}) {
  const t = useKitT();
  const arrow = `g-arrow-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  // the nodes the user dragged, by id: they outlive a change of the data (FTR.NAB.MEM-0001 R21)
  const [moved, setMoved] = useState<Map<string, Point>>(() => new Map());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const nodeDrag = useRef<{ id: string; x: number; y: number; moved: boolean; at: Point } | null>(null);
  const frame = useRef(0);
  const movedAt = useRef(-Infinity); // the time of the end of the last move: a double click right after it opens nothing
  const svg = useRef<SVGSVGElement>(null);

  // the layout follows the data: computed during render for a small graph, in a worker for a large one
  const [lay, setLay] = useState<LayoutState>(() => {
    const placement = place(nodes, edges, rows, {});
    return { nodes, edges, rows, placement, ready: placement !== null, seed: {}, round: 0 };
  });
  if (lay.nodes !== nodes || lay.edges !== edges || lay.rows !== rows) {
    const seed: LayoutSeed = keepPositions && lay.placement
      ? { start: placesOf(lay.placement, moved), pinned: Object.fromEntries(moved) }
      : {};
    const placement = place(nodes, edges, rows, seed);
    setLay({ nodes, edges, rows, placement: placement ?? lay.placement, ready: placement !== null, seed, round: lay.round + 1 });
    if (!keepPositions && moved.size) setMoved(new Map());
  }

  // a large graph: the worker lays it out; an answer for older data is dropped
  const worker = useRef<{ w: Promise<Worker | null>; round: number } | null>(null);
  useEffect(() => {
    if (lay.ready) return;
    const round = lay.round;
    const req: LayoutRequest = {
      id: round,
      nodes: lay.nodes.map((n) => ({ id: n.id, size: n.size })),
      edges: lay.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
      seed: lay.seed,
    };
    const apply = (got: Record<string, Point>) => setLay((s) => s.round !== round ? s : {
      ...s, ready: true,
      placement: { field: { w: W, h: H }, placed: s.nodes.map((n) => ({ ...n, r: radius(n.size), ...got[n.id] })) },
    });
    // without a worker the layout runs here, after the frame with the indicator is drawn
    const inline = () => setTimeout(() => apply(Object.fromEntries(layout(req.nodes, req.edges, req.seed).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]))), 0);
    worker.current ??= { w: startWorker(), round };
    const mine = worker.current;
    mine.round = round;
    let cancelled = false;
    void mine.w.then((w) => {
      if (cancelled) return;
      if (!w) return inline();
      w.onmessage = (e: MessageEvent<LayoutReply>) => { if (e.data.id === mine.round) apply(e.data.places); };
      w.onerror = () => inline();
      w.postMessage(req);
    });
    return () => { cancelled = true; };
  }, [lay]);
  // the worker ends with the graph; a remount (StrictMode, a fast refresh) starts a new one
  useEffect(() => () => {
    const mine = worker.current;
    worker.current = null;
    void mine?.w.then((w) => w?.terminate());
  }, []);

  const base = lay.placement;
  const field = useMemo(() => base?.field ?? { w: W, h: H }, [base]);
  const shown = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const { placed, byId } = useMemo(() => {
    // while a worker lays out new data, the nodes of the old picture that stay are shown where they were
    const p = (base?.placed ?? []).filter((n) => shown.has(n.id)).map((n) => (moved.has(n.id) ? { ...n, ...moved.get(n.id) } : n));
    return { placed: p, byId: new Map(p.map((n) => [n.id, n])) };
  }, [base, moved, shown]);
  const adj = useMemo(() => adjacency(edges), [edges]);

  const focused = focus !== undefined && byId.has(focus) ? focus : undefined; // a focus outside the data fades nothing
  const active = hover ?? (selected?.kind === "node" ? selected.id : null);
  const lit = useMemo(() => {
    if (selected?.kind === "edge" && !hover) return new Set([selected.source, selected.target]);
    if (active) return near(adj, active, 1);
    if (focused) return near(adj, focused, depth);
    return new Set<string>();
  }, [active, selected, hover, focused, depth, adj]);
  const dimmed = lit.size > 0;
  const edgeOn = (e: GraphEdge) => {
    if (selected?.kind === "edge" && !hover) return selected.source === e.source && selected.target === e.target;
    if (active) return e.source === active || e.target === active;
    return focused !== undefined && lit.has(e.source) && lit.has(e.target);
  };

  // `center`: a request to bring a node to the middle of the field, smoothly unless the user asked for less motion.
  // Each new request object moves the view once, to where the node is drawn; a later layout does not move it again.
  const viewNow = useRef(view);
  const drawnNow = useRef(byId);
  useEffect(() => { viewNow.current = view; drawnNow.current = byId; });
  const target = center && byId.has(center.id) ? center : undefined;
  useEffect(() => {
    const n = target && drawnNow.current.get(target.id);
    if (!n || n.x === undefined || n.y === undefined) return;
    const from = viewNow.current;
    const to = { k: from.k, x: field.w / 2 - n.x * from.k, y: field.h / 2 - n.y * from.k };
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      setView(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 200), k = 1 - (1 - p) ** 3;
      setView({ k: from.k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k });
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, field.w, field.h]);

  const zoom = (factor: number) => setView((v) => zoomed(v, factor, field));
  /** Units of the field per pixel of the screen: the field is fitted into the box keeping its proportions. */
  const unit = (el: Element) => {
    const box = el.getBoundingClientRect();
    return 1 / (Math.min(box.width / field.w, box.height / field.h) || 1);
  };
  const pick = (id: string) => onSelect(selected?.kind === "node" && selected.id === id ? null : { kind: "node", id });
  // the edge handler is stable, so the memoised edges do not redraw on every render
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; });
  const [pickEdge] = useState(() => (e: GraphEdge) => select.current({ kind: "edge", source: e.source, target: e.target }));

  // The wheel zooms and does not scroll the page: React's onWheel is passive.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setView((v) => zoomed(v, e.deltaY < 0 ? 1.15 : 1 / 1.15, field)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [field]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const reset = () => {
    setMoved(new Map());
    // a fresh layout without the places of the last one
    const placement = place(nodes, edges, rows, {});
    setLay((s) => ({ ...s, placement: placement ?? s.placement, ready: placement !== null, seed: {}, round: s.round + 1 }));
  };

  if (!base) {
    return <div className="gwrap loading" aria-busy="true"><span className="spin" />{t("graph.layingOut")}</div>;
  }

  const arcs = !!rows;
  const marker = edges.some((e) => e.directed) ? `url(#${arrow})` : undefined;
  return (
    <div className={draggable ? "gwrap drag" : "gwrap"} aria-busy={lay.ready ? undefined : true}>
      <svg ref={svg} viewBox={`0 0 ${field.w} ${field.h}`} role="group" aria-label={ariaLabel} className={dimmed ? "dimmed" : undefined}
        onPointerOver={(e) => { const id = nodeOf(e.target); if (id) setHover(id); }}
        onPointerOut={(e) => { if (nodeOf(e.target) && nodeOf(e.target) !== nodeOf(e.relatedTarget)) setHover(null); }}
        onFocus={(e) => { const id = nodeOf(e.target); if (id) setHover(id); }}
        onBlur={(e) => { if (nodeOf(e.target)) setHover(null); }}
        onPointerDown={(e) => {
          const id = nodeOf(e.target);
          if (id && draggable && e.button === 0) {
            const n = byId.get(id);
            nodeDrag.current = { id, x: e.clientX, y: e.clientY, moved: false, at: { x: n?.x ?? 0, y: n?.y ?? 0 } };
            // the capture is on the node, so the click that ends a press lands on it; moves bubble to the field
            (e.target as Element).closest("[data-node]")?.setPointerCapture(e.pointerId);
          } else if (e.target === e.currentTarget) {
            drag.current = { x: e.clientX, y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          const d = nodeDrag.current;
          if (d) {
            if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return; // a click is not a move
            const u = unit(e.currentTarget) / view.k;
            d.at = { x: d.at.x + (e.clientX - d.x) * u, y: d.at.y + (e.clientY - d.y) * u };
            d.x = e.clientX;
            d.y = e.clientY;
            d.moved = true;
            // one update per frame: a pointer reports faster than the screen draws
            if (!frame.current) {
              frame.current = requestAnimationFrame(() => {
                frame.current = 0;
                const cur = nodeDrag.current;
                if (cur) setMoved((m) => new Map(m).set(cur.id, cur.at));
              });
            }
            return;
          }
          if (!drag.current) return;
          const u = unit(e.currentTarget);
          const dx = (e.clientX - drag.current.x) * u;
          const dy = (e.clientY - drag.current.y) * u;
          drag.current = { x: e.clientX, y: e.clientY, moved: drag.current.moved || dx !== 0 || dy !== 0 };
          setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        }}
        onPointerUp={(e) => {
          const d = nodeDrag.current;
          if (d?.moved) {
            movedAt.current = e.timeStamp;
            setMoved((m) => new Map(m).set(d.id, d.at));
            // the click that ends a move comes right after: if none comes, the move must not swallow the next one
            setTimeout(() => { if (nodeDrag.current === d) nodeDrag.current = null; }, 0);
          } else if (d) {
            nodeDrag.current = null;
          }
          if (!drag.current?.moved) drag.current = null;
        }}
        onPointerCancel={() => { nodeDrag.current = null; drag.current = null; }}
        onClick={(e) => {
          const id = nodeOf(e.target);
          if (id) {
            const wasMoved = nodeDrag.current?.moved; // a move ends with a click on the node: it neither pins nor opens
            nodeDrag.current = null;
            if (!wasMoved) pick(id);
            return;
          }
          const panned = drag.current?.moved; // a pan ends with a click on the field: it keeps the selection
          drag.current = null;
          if (!panned && e.target === e.currentTarget) onSelect(null);
        }}
        onDoubleClick={(e) => { const id = nodeOf(e.target); if (id && e.timeStamp - movedAt.current > 600) onOpen?.(id); }}
        onKeyDown={(e) => {
          const id = nodeOf(e.target);
          if (!id) return;
          if (e.key === "Enter" && onOpen) { e.preventDefault(); onOpen(id); return; }
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(id); }
        }}>
        {marker && (
          <defs>
            <marker id={arrow} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" />
            </marker>
          </defs>
        )}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {base.rows?.map((r, i) => (
            <g key={`${r.id}\u0000${i}`} className="g-row">
              {i > 0 && <line x1={r.x} x2={r.x2} y1={r.y - ROW / 2 + 8} y2={r.y - ROW / 2 + 8} />}
              <text x={r.x} y={r.y}>{r.label}</text>
            </g>
          ))}
          {edges.map((e, i) => {
            const a = byId.get(e.source), b = byId.get(e.target);
            if (!a || !b) return null;
            return <EdgeView key={`${e.source}\u0000${e.target}\u0000${i}`} e={e} a={a} b={b} arcs={arcs}
              marker={e.directed ? marker : undefined} on={edgeOn(e)} onPick={pickEdge} />;
          })}
          {placed.map((n) => {
            const pinned = selected?.kind === "node" && selected.id === n.id;
            const cls = ["g-n", `g-c${n.group ?? 1}`, n.hideLabel && "small", n.dashed && "dashed", n.muted && "muted",
              lit.has(n.id) && "hl", pinned && "pin", focused === n.id && "focus"].filter(Boolean).join(" ");
            return <NodeView key={n.id} n={n} cls={cls} pinned={pinned} label={nodeLabel ? nodeLabel(n) : n.label} />;
          })}
        </g>
      </svg>
      {!lay.ready && <div className="gbusy"><span className="spin" />{t("graph.layingOut")}</div>}
      {legend && legend.length > 0 && (
        <div className="gleg">{legend.map((l) => <span key={l.group}><i className={`g-c${l.group}`} />{l.label}</span>)}</div>
      )}
      <div className="gzoom">
        <button type="button" onClick={() => zoom(1.3)} aria-label={t("graph.zoomIn")}>+</button>
        <button type="button" onClick={() => zoom(1 / 1.3)} aria-label={t("graph.zoomOut")}>−</button>
        {draggable && moved.size > 0 && [...moved.keys()].some((id) => shown.has(id)) && (
          <button type="button" onClick={reset} aria-label={t("graph.resetLayout")} title={t("graph.resetLayout")}>
            <Icon name="reset" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

