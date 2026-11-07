import { useEffect, useId, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useKitT } from "../i18n";
import { Icon } from "./Icon";

const W = 760;
const H = 500;

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
export type GraphEdge = { source: string; target: string; weight?: number; directed?: boolean; dashed?: boolean; title?: string };
export type GraphSelection = { kind: "node"; id: string } | { kind: "edge"; source: string; target: string } | null;
/** A row of the row layout, top to bottom in the order given; the label is drawn at its left. */
export type GraphRow = { id: string; label: string };

/** A node with its place; the fields of d3-force are spelled out, so the types of the kit need no d3 types. */
type Placed = GraphNode & { r: number; index?: number; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null };
type Field = { w: number; h: number };
/** The places of the nodes, the size of the field and, in the row layout, the rows with their middle line. */
type Placement = { placed: Placed[]; field: Field; rows?: { id: string; label: string; y: number; x: number; x2: number }[] };
type Point = { x: number; y: number };

const radius = (size = 1) => 7 + Math.sqrt(size) * 3.2;

type View = { k: number; x: number; y: number };
/** The view zoomed by `factor`, between 0.5 and 4, keeping the centre of the field in place. */
const zoomed = (v: View, factor: number, f: Field): View => {
  const k = Math.max(0.5, Math.min(4, v.k * factor));
  return { k, x: f.w / 2 - ((f.w / 2 - v.x) / v.k) * k, y: f.h / 2 - ((f.h / 2 - v.y) / v.k) * k };
};

/** Ids within `depth` steps of `from`, edges taken both ways. */
export function neighbours(edges: GraphEdge[], from: string, depth: number): Set<string> {
  const near = new Set([from]);
  let frontier = [from];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of edges) {
        const other = e.source === id ? e.target : e.target === id ? e.source : null;
        if (other && !near.has(other)) { near.add(other); next.push(other); }
      }
    }
    frontier = next;
  }
  return near;
}

/** Positions of the nodes (exported for the tests): a force layout computed once per data. The start of
 * d3-force is deterministic, so the same data gives the same picture. */
export function layout(nodes: GraphNode[], edges: GraphEdge[]): Placed[] {
  const placed: Placed[] = nodes.map((n) => ({ ...n, r: radius(n.size) }));
  const ids = new Set(placed.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ source: e.source, target: e.target, weight: e.weight ?? 1 }));
  const sim = forceSimulation(placed)
    .force("link", forceLink<Placed, (typeof links)[number]>(links).id((d) => d.id).distance(90).strength((l) => Math.min(1, 0.2 + l.weight * 0.08)))
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(W / 2, H / 2))
    .force("collide", forceCollide<Placed>().radius((d) => d.r + 14))
    .stop();
  for (let i = 0; i < 260; i++) sim.tick();
  for (const n of placed) { // keep the labels inside the field
    n.x = Math.max(n.r + 30, Math.min(W - n.r - 30, n.x ?? W / 2));
    n.y = Math.max(n.r + 10, Math.min(H - n.r - 24, n.y ?? H / 2));
  }
  return placed;
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

/** A graph of nodes and links (FTR.NAB.CMN-0003 R19, FTR.HMR.DEV-0002 R15, R16).
 * Hovering highlights the neighbours, a click pins the selection; the wheel zooms,
 * dragging the field moves it. `focus` highlights a node and its neighbours within `depth`
 * steps; `onOpen` is called on a double click or Enter on a node. With `rows` the nodes stand in
 * rows (`GraphNode.row`, `order`) instead of the force layout; with `draggable` a node can be moved
 * and a button puts the moved nodes back. The kit knows nothing of what the nodes are: labels,
 * rows and the legend come from the product.
 * The layout runs when `nodes`, `edges` or `rows` change identity: keep them stable (useMemo). */
export function Graph({ nodes, edges, ariaLabel, selected, onSelect, focus, depth = 1, onOpen, legend, nodeLabel, rows, draggable }: {
  nodes: GraphNode[]; edges: GraphEdge[]; ariaLabel: string;
  selected: GraphSelection; onSelect: (s: GraphSelection) => void;
  focus?: string; depth?: 1 | 2;
  onOpen?: (id: string) => void;
  legend?: { group: number; label: string }[];
  nodeLabel?: (n: GraphNode) => string;
  rows?: GraphRow[];
  draggable?: boolean;
}) {
  const t = useKitT();
  const arrow = `g-arrow-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const nodeDrag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const movedAt = useRef(-Infinity); // the time of the end of the last move: a double click right after it opens nothing
  const svg = useRef<SVGSVGElement>(null);

  const layoutEdges = rows ? undefined : edges; // the rows do not depend on the edges: new edges keep the moved nodes
  const base = useMemo<Placement>(() => (rows ? rowLayout(nodes, rows) : { placed: layout(nodes, layoutEdges ?? []), field: { w: W, h: H } }), [nodes, layoutEdges, rows]);
  const { field } = base;
  // the moved nodes belong to one layout: new data puts every node back in its place
  const [moved, setMoved] = useState<{ of: Placement; at: Map<string, Point> } | null>(null);
  const at = moved?.of === base ? moved.at : undefined;
  const { placed, byId } = useMemo(() => {
    const p = at ? base.placed.map((n) => (at.has(n.id) ? { ...n, ...at.get(n.id) } : n)) : base.placed;
    return { placed: p, byId: new Map(p.map((n) => [n.id, n])) };
  }, [base, at]);

  const focused = focus !== undefined && byId.has(focus) ? focus : undefined; // a focus outside the data fades nothing
  const active = hover ?? (selected?.kind === "node" ? selected.id : null);
  const near = useMemo(() => {
    if (selected?.kind === "edge" && !hover) return new Set([selected.source, selected.target]);
    if (active) return neighbours(edges, active, 1);
    if (focused) return neighbours(edges, focused, depth);
    return new Set<string>();
  }, [active, selected, hover, focused, depth, edges]);
  const dimmed = near.size > 0;
  const edgeOn = (e: GraphEdge) => {
    if (selected?.kind === "edge" && !hover) return selected.source === e.source && selected.target === e.target;
    if (active) return e.source === active || e.target === active;
    return focused !== undefined && near.has(e.source) && near.has(e.target);
  };

  const zoom = (factor: number) => setView((v) => zoomed(v, factor, field));
  const pick = (id: string, pinned: boolean) => onSelect(pinned ? null : { kind: "node", id });
  /** Units of the field per pixel of the screen: the field is fitted into the box keeping its proportions. */
  const unit = (el: Element) => {
    const box = el.getBoundingClientRect();
    return 1 / (Math.min(box.width / field.w, box.height / field.h) || 1);
  };

  // The wheel zooms and does not scroll the page: React's onWheel is passive.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setView((v) => zoomed(v, e.deltaY < 0 ? 1.15 : 1 / 1.15, field)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [field]);

  return (
    <div className="gwrap">
      <svg ref={svg} viewBox={`0 0 ${field.w} ${field.h}`} role="group" aria-label={ariaLabel} className={dimmed ? "dimmed" : undefined}
        onPointerDown={(e) => { if (e.target === e.currentTarget) { drag.current = { x: e.clientX, y: e.clientY, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); } }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const u = unit(e.currentTarget);
          const dx = (e.clientX - drag.current.x) * u;
          const dy = (e.clientY - drag.current.y) * u;
          drag.current = { x: e.clientX, y: e.clientY, moved: drag.current.moved || dx !== 0 || dy !== 0 };
          setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        }}
        onPointerUp={() => { if (!drag.current?.moved) drag.current = null; }}
        onClick={(e) => {
          const panned = drag.current?.moved; // a pan ends with a click on the field: it keeps the selection
          drag.current = null;
          if (!panned && e.target === e.currentTarget) onSelect(null);
        }}>
        {edges.some((e) => e.directed) && (
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
            const l = edgeLine(a, b, !!e.directed, !!rows);
            const marker = e.directed ? `url(#${arrow})` : undefined;
            return (
              <g key={`${e.source}\u0000${e.target}\u0000${i}`} className={`g-e${e.dashed ? " dashed" : ""}${edgeOn(e) ? " hl" : ""}`}
                onClick={() => onSelect({ kind: "edge", source: e.source, target: e.target })}>
                {l.d ? (
                  <>
                    <path d={l.d} strokeWidth={1 + (e.weight ?? 1) * 0.5} markerEnd={marker} />
                    <path className="hit" d={l.hit} />
                  </>
                ) : (
                  <>
                    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={1 + (e.weight ?? 1) * 0.5} markerEnd={marker} />
                    <line className="hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  </>
                )}
                {e.title && <title>{e.title}</title>}
              </g>
            );
          })}
          {placed.map((n) => {
            const pinned = selected?.kind === "node" && selected.id === n.id;
            const cls = ["g-n", `g-c${n.group ?? 1}`, n.hideLabel && "small", n.dashed && "dashed", n.muted && "muted",
              near.has(n.id) && "hl", pinned && "pin", focused === n.id && "focus"].filter(Boolean).join(" ");
            return (
              <g key={n.id} className={cls}
                tabIndex={0} role="button" aria-pressed={pinned} aria-label={nodeLabel ? nodeLabel(n) : n.label}
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
                onPointerDown={draggable ? (e) => {
                  if (e.button !== 0) return;
                  nodeDrag.current = { id: n.id, x: e.clientX, y: e.clientY, moved: false };
                  e.currentTarget.setPointerCapture(e.pointerId);
                } : undefined}
                onPointerMove={draggable ? (e) => {
                  const d = nodeDrag.current;
                  if (!d || d.id !== n.id) return;
                  if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return; // a click is not a move
                  const u = svg.current ? unit(svg.current) / view.k : 1;
                  const dx = (e.clientX - d.x) * u, dy = (e.clientY - d.y) * u;
                  nodeDrag.current = { id: n.id, x: e.clientX, y: e.clientY, moved: true };
                  setMoved((m) => {
                    const next = new Map(m?.of === base ? m.at : []);
                    const p = next.get(n.id) ?? { x: n.x ?? 0, y: n.y ?? 0 };
                    next.set(n.id, { x: p.x + dx, y: p.y + dy });
                    return { of: base, at: next };
                  });
                } : undefined}
                onPointerUp={draggable ? (e) => {
                  if (!nodeDrag.current?.moved) return;
                  movedAt.current = e.timeStamp;
                  // the click that ends a move comes right after: if none comes, the move must not swallow the next one
                  setTimeout(() => { nodeDrag.current = null; }, 0);
                } : undefined}
                onPointerCancel={draggable ? () => { nodeDrag.current = null; } : undefined}
                onClick={() => {
                  const wasMoved = nodeDrag.current?.moved; // a move ends with a click on the node: it neither pins nor opens
                  nodeDrag.current = null;
                  if (!wasMoved) pick(n.id, pinned);
                }}
                onDoubleClick={(e) => { if (e.timeStamp - movedAt.current > 600) onOpen?.(n.id); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onOpen) { e.preventDefault(); onOpen(n.id); return; }
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(n.id, pinned); }
                }}>
                <circle cx={n.x} cy={n.y} r={n.r} />
                <text x={n.x} y={(n.y ?? 0) + n.r + 14}>{n.label}</text>
                {n.title && <title>{n.title}</title>}
              </g>
            );
          })}
        </g>
      </svg>
      {legend && legend.length > 0 && (
        <div className="gleg">{legend.map((l) => <span key={l.group}><i className={`g-c${l.group}`} />{l.label}</span>)}</div>
      )}
      <div className="gzoom">
        <button type="button" onClick={() => zoom(1.3)} aria-label={t("graph.zoomIn")}>+</button>
        <button type="button" onClick={() => zoom(1 / 1.3)} aria-label={t("graph.zoomOut")}>−</button>
        {at && at.size > 0 && (
          <button type="button" onClick={() => setMoved(null)} aria-label={t("graph.resetLayout")} title={t("graph.resetLayout")}>
            <Icon name="reset" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
