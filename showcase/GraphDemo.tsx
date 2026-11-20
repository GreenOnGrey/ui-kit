import { useState } from "react";
import { Combobox, Graph, type GraphEdge, type GraphNode, type GraphRow, type GraphSelection } from "../src";

// Invented data: people and topics as in the memory of Nabu, and features of a
// specification with the links «builds on» and «changes» as in Hammurapi.
const PEOPLE: GraphNode[] = [
  { id: "p1", label: "Anna Petrova", group: 1, size: 14 }, { id: "p2", label: "Ivan Sokolov", group: 1, size: 9 },
  { id: "p3", label: "Maria Lee", group: 1, size: 3, hideLabel: true }, { id: "t1", label: "Release 2.4", group: 2, size: 12 },
  { id: "t2", label: "Budget", group: 2, size: 6 }, { id: "t3", label: "Hiring", group: 2, size: 2, hideLabel: true },
];
const PEOPLE_LINKS: GraphEdge[] = [
  { source: "p1", target: "t1", weight: 6 }, { source: "p2", target: "t1", weight: 3 }, { source: "p1", target: "t2", weight: 2 },
  { source: "p3", target: "t3", weight: 1 }, { source: "p2", target: "t2", weight: 1 }, { source: "p1", target: "p2", weight: 2 },
];

const FEATURES: GraphNode[] = [
  { id: "FTR.HMR.DEV-0002", label: "FTR.HMR.DEV-0002", title: "Links of features", group: 2, size: 4 },
  { id: "FTR.HMR.DEV-0001", label: "FTR.HMR.DEV-0001", title: "The writer of specifications", group: 2, size: 3 },
  { id: "FTR.HMR.CMN-0001", label: "FTR.HMR.CMN-0001", title: "Hammurapi", group: 2, size: 3 },
  { id: "FTR.HMR.CMN-0005", label: "FTR.HMR.CMN-0005", title: "The navigator", group: 2, size: 2 },
  { id: "FTR.NAB.CMN-0005", label: "FTR.NAB.CMN-0005", title: "The UI kit", group: 1, size: 2, muted: true },
  { id: "FTR.HMR.DEV-0003", label: "FTR.HMR.DEV-0003", title: "Not in the default branch", group: 2, dashed: true },
  { id: "FTR.HMR.CMN-0002", label: "FTR.HMR.CMN-0002", title: "The closed cycle", group: 2, size: 1 },
];
const FEATURE_LINKS: GraphEdge[] = [
  { source: "FTR.HMR.DEV-0002", target: "FTR.HMR.DEV-0001", directed: true },
  { source: "FTR.HMR.DEV-0002", target: "FTR.HMR.CMN-0005", directed: true },
  { source: "FTR.HMR.DEV-0002", target: "FTR.HMR.CMN-0001", directed: true, dashed: true, title: "changes R13" },
  { source: "FTR.HMR.DEV-0002", target: "FTR.NAB.CMN-0005", directed: true },
  { source: "FTR.HMR.DEV-0001", target: "FTR.HMR.CMN-0001", directed: true },
  { source: "FTR.HMR.DEV-0003", target: "FTR.HMR.DEV-0002", directed: true },
  { source: "FTR.HMR.DEV-0003", target: "FTR.HMR.DEV-0001", directed: true, double: true, title: "architecture: builds on A3" },
  { source: "FTR.HMR.DEV-0003", target: "FTR.HMR.CMN-0005", directed: true, double: true, dashed: true, title: "architecture: changes A5" },
  { source: "FTR.HMR.CMN-0001", target: "FTR.HMR.CMN-0002", directed: true },
];

/** The people and topics of Nabu: hover, pin, zoom, drag (FTR.NAB.MEM-0001 R21). */
export function PeopleGraph() {
  const [selected, setSelected] = useState<GraphSelection>(null);
  return <Graph nodes={PEOPLE} edges={PEOPLE_LINKS} ariaLabel="The graph of people and topics" selected={selected} onSelect={setSelected}
    draggable legend={[{ group: 1, label: "People" }, { group: 2, label: "Topics" }]} />;
}

/** Features of a specification: a focus with a depth, Enter or a double click opens a node. */
export function FeatureGraph() {
  const [selected, setSelected] = useState<GraphSelection>(null);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [opened, setOpened] = useState("");
  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button type="button" className="btn sm" onClick={() => setDepth(depth === 1 ? 2 : 1)}>Depth: {depth}</button>
        <span className="muted" aria-live="polite">{opened && `Opened: ${opened}`}</span>
      </div>
      <Graph nodes={FEATURES} edges={FEATURE_LINKS} ariaLabel="Links of features" selected={selected} onSelect={setSelected}
        focus="FTR.HMR.DEV-0002" depth={depth} onOpen={setOpened} nodeLabel={(n) => `${n.label}, ${n.title}`} />
    </div>
  );
}

// The features in rows: the key without its prefix is the label, the number of the key the order.
const ROWS: GraphRow[] = [{ id: "HMR.CMN", label: "HMR · CMN" }, { id: "HMR.DEV", label: "HMR · DEV" }, { id: "NAB.CMN", label: "NAB · CMN" }];
const inRows = (n: GraphNode): GraphNode => {
  const [, d, rest] = n.id.split(".");
  const [sys, num] = rest.split("-");
  return { ...n, label: `${sys}-${num}`, row: `${d}.${sys}`, order: Number(num), group: d === "NAB" ? 1 : 2 };
};
const ROW_FEATURES = FEATURES.map(inRows);

/** Features in rows by domain and system, ascending by number; the nodes can be dragged. */
export function RowGraph() {
  const [selected, setSelected] = useState<GraphSelection>(null);
  return <Graph nodes={ROW_FEATURES} edges={FEATURE_LINKS} ariaLabel="Features in rows" selected={selected} onSelect={setSelected}
    rows={ROWS} draggable nodeLabel={(n) => `${n.id}, ${n.title}`} legend={[{ group: 2, label: "HMR" }, { group: 1, label: "NAB" }]} />;
}

// A large set as the memory of Nabu shows it at the limit (FTR.NAB.MEM-0001 R24): 150 nodes and 600 links,
// generated by a fixed rule, so every run draws the same picture. It is laid out in a worker.
const rand = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const LARGE: { nodes: GraphNode[]; edges: GraphEdge[] } = (() => {
  const r = rand(7);
  const nodes: GraphNode[] = Array.from({ length: 150 }, (_, i) => {
    const topic = i % 5 === 0;
    const size = 1 + Math.floor(r() * (topic ? 20 : 12));
    return { id: `n${i}`, label: topic ? `Topic ${i / 5 + 1}` : `Person ${i + 1}`, group: topic ? 2 : 1, size, hideLabel: size < 8 };
  });
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  while (edges.length < 600) {
    // most links stay inside a cluster of ten nodes
    const a = Math.floor(r() * 150), cluster = Math.floor(a / 10) * 10;
    const b = r() < 0.8 ? cluster + Math.floor(r() * 10) : Math.floor(r() * 150);
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (a === b || seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: `n${a}`, target: `n${b}`, weight: 1 + Math.floor(r() * 5) });
  }
  return { nodes, edges };
})();

const findNode = async (q: string) => LARGE.nodes.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  .map((n) => ({ id: n.id, label: n.label, group: n.group === 2 ? "topics" : "people", meta: `${n.size} d.` }));

/** 150 nodes and 600 links: laid out off the main thread, nodes can be dragged, the field finds a node and centres it. */
export function LargeGraph() {
  const [selected, setSelected] = useState<GraphSelection>(null);
  const [center, setCenter] = useState<{ id: string }>();
  return (
    <div>
      <div style={{ marginBottom: 8, maxWidth: 320 }}>
        <Combobox load={findNode} placeholder="Person or topic" ariaLabel="Find a node" groups={[{ id: "people", label: "People" }, { id: "topics", label: "Topics" }]}
          onSelect={(it) => { setCenter({ id: it.id }); setSelected({ kind: "node", id: it.id }); }} />
      </div>
      <Graph nodes={LARGE.nodes} edges={LARGE.edges} ariaLabel="A large graph" selected={selected} onSelect={setSelected}
        draggable center={center} legend={[{ group: 1, label: "People" }, { group: 2, label: "Topics" }]} />
    </div>
  );
}
