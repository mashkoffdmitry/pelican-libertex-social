/* pelican-charts.jsx — equity curves, sparklines, allocation bars */

function seededRandom(seed) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function genSeries(seed, n, trend = 0.6, vol = 1.0) {
  const rnd = seededRandom(seed);
  const out = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.46) * vol + trend * (1 + rnd() * 0.4);
    out.push(v);
  }
  return out;
}

function points(series, w, h, padTop = 4, padBot = 4) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const usable = h - padTop - padBot;
  return series.map((p, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = padTop + (1 - (p - min) / range) * usable;
    return [x, y];
  });
}

function pathFromPoints(pts) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
}

function Sparkline({ seed, w = 96, h = 28, trend = 0.6, color }) {
  const series = React.useMemo(() => genSeries(seed, 32, trend, 1.4), [seed, trend]);
  const pts = points(series, w, h, 3, 3);
  const last = pts[pts.length - 1];
  const stroke = color || (trend >= 0 ? "var(--up)" : "var(--down)");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={pathFromPoints(pts)} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={stroke} />
    </svg>
  );
}

function EquityCurve({ seed = 7, width = 800, height = 240, trend = 0.7, accent }) {
  const series = React.useMemo(() => genSeries(seed, 180, trend, 1.6), [seed, trend]);
  const pts = points(series, width, height, 12, 22);
  const path = pathFromPoints(pts);
  const area = `${path} L ${width.toFixed(2)},${(height - 1).toFixed(2)} L 0,${(height - 1).toFixed(2)} Z`;
  const stroke = accent || "var(--fg)";
  const fill = `color-mix(in oklch, ${stroke} 14%, transparent)`;
  // y-axis labels (4 lines)
  const min = Math.min(...series);
  const max = Math.max(...series);
  const ticks = [0, 1, 2, 3].map(i => {
    const v = max - (i / 3) * (max - min);
    const y = 12 + (i / 3) * (height - 34);
    return { v: v.toFixed(0), y };
  });
  // x-axis date labels
  const xLabels = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {/* gridlines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1="0" x2={width} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 ? "" : "2 4"} />
          <text x={width - 4} y={t.y - 4} textAnchor="end" fontSize="10" fontFamily="var(--f-mono)" fill="var(--fg-3)">{t.v}</text>
        </g>
      ))}
      {/* area + line */}
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* x labels */}
      {xLabels.map((l, i) => {
        const x = (i / (xLabels.length - 1)) * (width - 24) + 12;
        return <text key={l} x={x} y={height - 4} fontSize="10" fontFamily="var(--f-mono)" fill="var(--fg-3)" textAnchor="middle">{l}</text>;
      })}
    </svg>
  );
}

function AllocationBar({ items, height = 10 }) {
  // Stacked horizontal bar, monochrome by lightness
  const total = items.reduce((s, it) => s + it.w, 0);
  let acc = 0;
  return (
    <div style={{ display: "flex", width: "100%", height, borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)" }}>
      {items.map((it, i) => {
        const wPct = (it.w / total) * 100;
        const shade = it.dir === "cash"
          ? "var(--surface-3)"
          : `color-mix(in oklch, var(--fg) ${88 - i * 9}%, var(--surface))`;
        acc += wPct;
        return <div key={i} style={{ width: `${wPct}%`, background: shade }} title={`${it.sym} ${it.w}%`} />;
      })}
    </div>
  );
}

function MiniBar({ values = [3,5,7,4,6,8,5,7,9,6,4,8], w = 120, h = 36 }) {
  const max = Math.max(...values);
  const bw = w / values.length - 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {values.map((v, i) => {
        const bh = (v / max) * (h - 4);
        return <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} rx="1" fill="color-mix(in oklch, var(--fg) 40%, var(--surface))" />;
      })}
    </svg>
  );
}

Object.assign(window, { Sparkline, EquityCurve, AllocationBar, MiniBar, genSeries, points, pathFromPoints });
