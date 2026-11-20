import { useState } from "react";
import { Chart, Combobox, type ChartSeries, type ComboItem } from "../src";

// Invented numbers of a month, as the usage of the memory of Nabu shows them (FTR.NAB.MEM-0001 R26), made by a
// fixed rule so every run draws the same chart.
const DAYS = Array.from({ length: 30 }, (_, i) => String(i + 1));
const wave = (i: number, s: number) => (Math.sin(i * 1.7 + s) + 1) / 2;
const MONDAYS = new Set([3, 10, 17, 24]);
const COST: ChartSeries[] = [
  { id: "collect", label: "Collection", color: 1, kind: "bar", values: DAYS.map((_, i) => +(9 + wave(i, 1) * 6).toFixed(2)) },
  { id: "compact", label: "Compaction", color: 2, kind: "bar", values: DAYS.map((d) => (MONDAYS.has(+d) ? 9.5 : 0.2)) },
];
const VOLUME: ChartSeries[] = [
  { id: "read", label: "Messages read", color: 4, kind: "line", values: DAYS.map((d, i) => (+d % 7 === 1 || +d % 7 === 2 ? 6000 : 22000) + Math.round(wave(i, 2) * 8000)) },
  { id: "created", label: "Records created", color: 3, kind: "line", axis: "right", dashed: true, values: DAYS.map((_, i) => 500 + Math.round(wave(i, 3) * 400)) },
];
/** Two charts of a month: stacked bars; two lines on two axes. */
export function Charts() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Chart x={DAYS} series={COST} stacked height={150} ariaLabel="Cost, $" format={(v) => `$${v}`} />
      <Chart x={DAYS} series={VOLUME} height={150} ariaLabel="Messages and records" />
    </div>
  );
}
export const EmptyChart = () => <Chart x={DAYS} series={[{ ...COST[0], values: DAYS.map(() => 0) }]} height={80} ariaLabel="Cost, $" />;

const TAGS: ComboItem[] = [
  { id: "p1", label: "Maria Petrova", hint: "m.petrova@corp.example", meta: "12 d.", group: "people", icon: "user" },
  { id: "p2", label: "Ilya Petrov", hint: "i.petrov@corp.example", meta: "3 d.", group: "people", icon: "user" },
  { id: "p3", label: "Anna Sokolova", hint: "a.sokolova@corp.example", meta: "9 d.", group: "people", icon: "user" },
  { id: "t1", label: "Petrol station rollout", meta: "7 d.", group: "topics", icon: "tag" },
  { id: "t2", label: "Release 2.4", meta: "19 d.", group: "topics", icon: "tag" },
];
const GROUPS = [{ id: "people", label: "People" }, { id: "topics", label: "Topics" }];
const search = async (q: string) => TAGS.filter((t) => `${t.label} ${t.hint ?? ""}`.toLowerCase().includes(q.toLowerCase()));
const fail = () => Promise.reject(new Error("down"));

/** A field with suggestions: grouped, the match in bold, the choice becomes a chip. */
export function ComboDemo() {
  const [chosen, setChosen] = useState<ComboItem | null>(null);
  return (
    <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ width: 300 }}>
        <Combobox load={search} onSelect={setChosen} placeholder="Person or topic" ariaLabel="Person or topic" groups={GROUPS} />
      </div>
      {chosen && <span className="chip">{chosen.label}</span>}
    </div>
  );
}

/** A source that fails: the error and «Retry» in the list. */
export const FailingCombo = () => (
  <div style={{ width: 300 }}>
    <Combobox load={fail} onSelect={() => {}} placeholder="A source that fails" ariaLabel="A source that fails" />
  </div>
);
