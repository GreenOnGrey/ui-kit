import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useKitT } from "../i18n";

/** A series of a chart: `color` is a colour of the graph (g-c1…g-c6); a line can take the right axis, a scale of
 * its own (FTR.NAB.MEM-0001 tech §12.2) — bars always stand on the left one. `null` or a missing value — no value
 * on that point. */
export type ChartSeries = {
  id: string; label: string; color: 1 | 2 | 3 | 4 | 5 | 6; kind: "bar" | "line";
  axis?: "left" | "right"; dashed?: boolean; values: (number | null)[];
};

const PAD = { l: 44, r: 44, t: 10, b: 22 };

/** Four even steps from zero that cover `max`: 1, 2, 2.5 or 5 times a power of ten. */
export function ticks(max: number): number[] {
  if (!(max > 0)) return [0, 1, 2, 3, 4];
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  return [0, 1, 2, 3, 4].map((i) => +(i * step).toPrecision(12));
}

/** The largest value an axis shows: the sum of the stacked bars on a point, or the largest single value. */
export function axisMax(series: ChartSeries[], stacked: boolean, count: number): number {
  let max = 0;
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (const s of series) {
      const v = s.values[i] ?? 0;
      if (stacked && s.kind === "bar") sum += v;
      else max = Math.max(max, v);
    }
    max = Math.max(max, sum);
  }
  return max;
}

const plain = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** A chart over time (FTR.NAB.MEM-0001 R26, R28, design §3.8): bars, stacked bars and lines in SVG, without a library.
 * The width follows the box; a hover or the arrow keys show the values of a point; the legend hides a series; a
 * button shows the same numbers as a table for a screen reader. */
export function Chart({ x, series, stacked, height = 200, format = plain, ariaLabel, empty }: {
  x: string[]; series: ChartSeries[]; stacked?: boolean; height?: number;
  format?: (v: number) => string; ariaLabel: string; empty?: string;
}) {
  const t = useKitT();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [at, setAt] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = series.filter((s) => !hidden.has(s.id));
  const onRight = (s: ChartSeries) => s.kind === "line" && s.axis === "right";
  const left = visible.filter((s) => !onRight(s));
  const right = visible.filter(onRight);
  const n = x.length;
  const hasData = series.some((s) => s.values.some((v) => v != null && v !== 0));
  const lt = ticks(axisMax(left, !!stacked, n));
  const rt = right.length ? ticks(axisMax(right, false, n)) : null;
  const w = width, h = height;
  const iw = w - PAD.l - (rt ? PAD.r : 8), ih = h - PAD.t - PAD.b;
  const bw = n ? iw / n : iw;
  const X = (i: number) => PAD.l + bw * i + bw / 2;
  const Y = (v: number, scale: number[]) => PAD.t + ih * (1 - v / (scale[4] || 1));
  // the labels of the days thin out with the width: about one per 48 pixels
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 48))));

  const bars = visible.filter((s) => s.kind === "bar");
  const lines = visible.filter((s) => s.kind === "line");
  const move = (e: KeyboardEvent) => {
    if (!n) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setAt((i) => Math.min(n - 1, (i ?? -1) + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setAt((i) => Math.max(0, (i ?? n) - 1)); }
    else if (e.key === "Escape") setAt(null);
  };
  const tipLeft = at === null ? 0 : Math.min(Math.max(X(at) + 12, 0), w - 180);

  return (
    <div className="chart">
      <div className="chart-leg">
        {series.map((s) => (
          <button key={s.id} type="button" className={`chart-key${hidden.has(s.id) ? " off" : ""}`} aria-pressed={!hidden.has(s.id)}
            onClick={() => setHidden((hs) => { const next = new Set(hs); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}>
            <i className={`g-c${s.color}${s.kind === "line" ? " line" : ""}${s.dashed ? " dashed" : ""}`} />{s.label}
          </button>
        ))}
      </div>
      <div className="chart-box" ref={box}>
        {!hasData ? (
          <div className="chart-empty" style={{ height: h }}>{empty ?? t("chart.empty")}</div>
        ) : (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} tabIndex={0}
            aria-describedby={at !== null ? `${id}-tip` : undefined} onKeyDown={move} onBlur={() => setAt(null)}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.floor((e.clientX - r.left - PAD.l) / bw);
              setAt(i >= 0 && i < n ? i : null);
            }}
            onPointerLeave={() => setAt(null)}>
            {lt.map((v) => (
              <g key={`l${v}`}>
                <line className="chart-grid" x1={PAD.l} x2={PAD.l + iw} y1={Y(v, lt)} y2={Y(v, lt)} />
                <text className="chart-ax" x={PAD.l - 6} y={Y(v, lt) + 3} textAnchor="end">{format(v)}</text>
              </g>
            ))}
            {rt?.slice(1).map((v) => (
              <text key={`r${v}`} className="chart-ax" x={PAD.l + iw + 6} y={Y(v, rt) + 3}>{format(v)}</text>
            ))}
            {x.map((label, i) => i % every === 0 && (
              <text key={`x${i}`} className="chart-ax" x={X(i)} y={h - 6} textAnchor="middle">{label}</text>
            ))}
            {at !== null && <line className="chart-cursor" x1={X(at)} x2={X(at)} y1={PAD.t} y2={PAD.t + ih} />}
            {x.map((_, i) => {
              let acc = 0;
              return bars.map((s, j) => {
                const v = s.values[i] ?? 0;
                const share = stacked ? 1 : 1 / bars.length;
                const bx = PAD.l + bw * i + 2 + (stacked ? 0 : j * (bw - 4) * share);
                const y0 = Y(stacked ? acc : 0, lt), y1 = Y((stacked ? acc : 0) + v, lt);
                if (stacked) acc += v;
                return v > 0 ? <rect key={`${s.id}${i}`} className={`chart-bar g-c${s.color}`} x={bx} y={y1} width={Math.max(1, (bw - 4) * share)} height={Math.max(0, y0 - y1)} rx={1} /> : null;
              });
            })}
            {lines.map((s) => {
              const scale = onRight(s) && rt ? rt : lt;
              const pts = s.values.map((v, i) => (v == null ? null : `${X(i)},${Y(v, scale)}`)).filter(Boolean).join(" ");
              return <polyline key={s.id} className={`chart-line g-c${s.color}${s.dashed ? " dashed" : ""}`} points={pts} />;
            })}
          </svg>
        )}
        {at !== null && hasData && (
          <div className="chart-tip" id={`${id}-tip`} role="status" style={{ left: tipLeft }}>
            <b>{x[at]}</b>
            {visible.map((s) => (
              <div key={s.id}><i className={`g-c${s.color}`} />{s.label}: {s.values[at] == null ? "—" : format(s.values[at]!)}</div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="linkish chart-toggle" aria-expanded={table} onClick={() => setTable(!table)}>
        {table ? t("chart.hideTable") : t("chart.showTable")}
      </button>
      {table && (
        <div className="chart-table">
          <table>
            <caption className="sr-only">{ariaLabel}</caption>
            <thead><tr><th scope="col" />{series.map((s) => <th key={s.id} scope="col">{s.label}</th>)}</tr></thead>
            <tbody>
              {x.map((label, i) => (
                <tr key={label + i}><th scope="row">{label}</th>{series.map((s) => <td key={s.id}>{s.values[i] == null ? "—" : format(s.values[i]!)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
