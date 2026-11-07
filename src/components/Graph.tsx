import { useEffect, useId, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useKitT } from "../i18n";

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
};
export type GraphEdge = { source: string; target: string; weight?: number; directed?: boolean; dashed?: boolean; title?: string };
export type GraphSelection = { kind: "node"; id: string } | { kind: "edge"; source: string; target: string } | null;

/** A node with its place; the fields of d3-force are spelled out, so the types of the kit need no d3 types. */
type Placed = GraphNode & { r: number; index?: number; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null };

const radius = (size = 1) => 7 + Math.sqrt(size) * 3.2;

type View = { k: number; x: number; y: number };
/** The view zoomed by `factor`, between 0.5 and 4, keeping the centre of the field in place. */
const zoomed = (v: View, factor: number): View => {
  const k = Math.max(0.5, Math.min(4, v.k * factor));
  return { k, x: W / 2 - ((W / 2 - v.x) / v.k) * k, y: H / 2 - ((H / 2 - v.y) / v.k) * k };
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

/** A graph of nodes and links (FTR.NAB.CMN-0003 R19, FTR.HMR.DEV-0002 R15, R16).
 * Hovering highlights the neighbours, a click pins the selection; the wheel zooms,
 * dragging moves. `focus` highlights a node and its neighbours within `depth`
 * steps; `onOpen` is called on a double click or Enter on a node. The kit knows
 * nothing of what the nodes are: labels and the legend come from the product.
 * The layout runs when `nodes` or `edges` change identity: keep them stable (useMemo). */
export function Graph({ nodes, edges, ariaLabel, selected, onSelect, focus, depth = 1, onOpen, legend, nodeLabel }: {
  nodes: GraphNode[]; edges: GraphEdge[]; ariaLabel: string;
  selected: GraphSelection; onSelect: (s: GraphSelection) => void;
  focus?: string; depth?: 1 | 2;
  onOpen?: (id: string) => void;
  legend?: { group: number; label: string }[];
  nodeLabel?: (n: GraphNode) => string;
}) {
  const t = useKitT();
  const arrow = `g-arrow-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const { placed, byId } = useMemo(() => {
    const p = layout(nodes, edges);
    return { placed: p, byId: new Map(p.map((n) => [n.id, n])) };
  }, [nodes, edges]);

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

  const zoom = (factor: number) => setView((v) => zoomed(v, factor));
  const pick = (id: string, pinned: boolean) => onSelect(pinned ? null : { kind: "node", id });

  // The wheel zooms and does not scroll the page: React's onWheel is passive.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setView((v) => zoomed(v, e.deltaY < 0 ? 1.15 : 1 / 1.15)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div className="gwrap">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={ariaLabel} className={dimmed ? "dimmed" : undefined}
        onPointerDown={(e) => { if (e.target === e.currentTarget) { drag.current = { x: e.clientX, y: e.clientY, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); } }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const box = e.currentTarget.getBoundingClientRect();
          const dx = ((e.clientX - drag.current.x) / box.width) * W;
          const dy = ((e.clientY - drag.current.y) / box.height) * H;
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
          {edges.map((e, i) => {
            const a = byId.get(e.source), b = byId.get(e.target);
            if (!a || !b) return null;
            let x2 = b.x ?? 0, y2 = b.y ?? 0;
            if (e.directed) { // the arrow ends at the circle of the target
              const dx = x2 - (a.x ?? 0), dy = y2 - (a.y ?? 0), len = Math.hypot(dx, dy) || 1;
              x2 -= (dx / len) * (b.r + 2);
              y2 -= (dy / len) * (b.r + 2);
            }
            return (
              <g key={`${e.source}\u0000${e.target}\u0000${i}`} className={`g-e${e.dashed ? " dashed" : ""}${edgeOn(e) ? " hl" : ""}`}
                onClick={() => onSelect({ kind: "edge", source: e.source, target: e.target })}>
                <line x1={a.x} y1={a.y} x2={x2} y2={y2} strokeWidth={1 + (e.weight ?? 1) * 0.5} markerEnd={e.directed ? `url(#${arrow})` : undefined} />
                <line className="hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
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
                onClick={() => pick(n.id, pinned)}
                onDoubleClick={() => onOpen?.(n.id)}
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
      </div>
    </div>
  );
}
