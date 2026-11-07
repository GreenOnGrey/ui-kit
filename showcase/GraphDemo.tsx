import { useState } from "react";
import { Graph, type GraphEdge, type GraphNode, type GraphRow, type GraphSelection } from "../src";

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
  { source: "FTR.HMR.CMN-0001", target: "FTR.HMR.CMN-0002", directed: true },
];

/** The people and topics of Nabu: hover, pin, zoom. */
export function PeopleGraph() {
  const [selected, setSelected] = useState<GraphSelection>(null);
  return <Graph nodes={PEOPLE} edges={PEOPLE_LINKS} ariaLabel="The graph of people and topics" selected={selected} onSelect={setSelected}
    legend={[{ group: 1, label: "People" }, { group: 2, label: "Topics" }]} />;
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
