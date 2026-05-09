/* pelican-mobile.jsx — Discover, Trader Profile, Subscribe sheet (mobile) */

function StatusBar() {
  return (
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px 0 26px", fontFamily: "var(--f-ui)", color: "var(--fg)", fontSize: 14, fontWeight: 600 }}>
      <span>9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><path d="M1 8h2M5 6h2M9 4h2M13 2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 3a6.5 6.5 0 015.6 3.2L7.5 11 1.9 6.2A6.5 6.5 0 017.5 3z" fill="currentColor" opacity=".9"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke="currentColor" fill="none"/><rect x="2" y="2" width="14" height="7" rx="1.4" fill="currentColor"/><rect x="21.5" y="3.5" width="1.5" height="4" rx=".7" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

function MobileNav({ active = "Discover" }) {
  const items = [
    { k: "Discover", icon: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" /> },
    { k: "Leaders",  icon: <><path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></> },
    { k: "Wallet",   icon: <><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" fill="none"/><circle cx="17" cy="14.5" r="1" fill="currentColor"/></> },
    { k: "Activity", icon: <><path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></> },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "8px 0 22px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
      {items.map(it => (
        <div key={it.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: it.k === active ? "var(--fg)" : "var(--fg-3)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={it.k === "Discover" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
            {it.icon}
          </svg>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.01em" }}>{it.k}</span>
        </div>
      ))}
    </div>
  );
}

function TraderCardCompact({ t, rank }) {
  return (
    <div className="card" style={{ padding: "14px 14px 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="num muted-2" style={{ width: 18, fontSize: 11, textAlign: "right" }}>{String(rank).padStart(2, "0")}</span>
        <Avatar name={t.name} size={40} seed={t.id} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</span>
            {t.id === 1 && <span className="tag ok" style={{ height: 18, fontSize: 9, padding: "0 5px" }}>Top 1%</span>}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{t.strategy} · {t.country}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className={`num ${t.ret30 >= 0 ? "up" : "down"}`} style={{ fontSize: 15, fontWeight: 500 }}>+{t.ret30.toFixed(1)}%</div>
          <div className="muted-2" style={{ fontSize: 10 }}>30 days</div>
        </div>
      </div>
      <Sparkline seed={t.id * 11} w={310} h={36} trend={t.ret30 / 12} />
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <div><div className="muted-2" style={{ fontSize: 10 }}>SHARPE</div><div className="num" style={{ fontSize: 12 }}>{t.sharpe.toFixed(2)}</div></div>
        <div><div className="muted-2" style={{ fontSize: 10 }}>WIN</div><div className="num" style={{ fontSize: 12 }}>{t.win}%</div></div>
        <div><div className="muted-2" style={{ fontSize: 10 }}>MAX DD</div><div className="num down" style={{ fontSize: 12 }}>{t.dd.toFixed(1)}%</div></div>
        <div><div className="muted-2" style={{ fontSize: 10 }}>FOLLOW.</div><div className="num" style={{ fontSize: 12 }}>{(t.subs / 1000).toFixed(1)}k</div></div>
      </div>
    </div>
  );
}

function MobileDiscoverScreen() {
  return (
    <div className="pel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <StatusBar />
      <div style={{ padding: "8px 18px 14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={16} />
        <Avatar name="Aleks Norde" size={28} seed={3} />
      </div>
      <div style={{ padding: "0 18px 12px 18px" }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Leaders of the <span style={{ fontStyle: "italic", color: "var(--fg-2)" }}>last 30 days</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0 0", fontSize: 12 }}>Subscribe — trades are mirrored automatically.</p>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 18px 12px 18px", overflowX: "auto" }}>
        {["All", "FX", "Indices", "Crypto", "Commodities", "Low risk"].map((c, i) => (
          <span key={c} className="tag" style={i === 0 ? { background: "var(--fg)", color: "var(--bg)", borderColor: "var(--fg)" } : {}}>{c}</span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 90px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {TRADERS.slice(0, 6).map((t, i) => <TraderCardCompact key={t.id} t={t} rank={i + 1} />)}
      </div>

      <MobileNav active="Discover" />
    </div>
  );
}

function MobileProfileScreen() {
  const t = TRADERS[0];
  return (
    <div className="pel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <StatusBar />
      <div style={{ padding: "4px 14px 8px 14px", display: "flex", alignItems: "center", gap: 4 }}>
        <button className="btn ghost sm" style={{ padding: "0 6px", color: "var(--fg-2)" }}>‹ Leaders</button>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" style={{ padding: "0 6px", color: "var(--fg-2)" }}>···</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 100px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 0 14px 0" }}>
          <Avatar name={t.name} size={64} seed={t.id} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="serif" style={{ fontSize: 22, fontWeight: 500 }}>Marcus Halden</span>
            <span className="tag ok" style={{ height: 18, fontSize: 9, padding: "0 6px" }}>✓</span>
          </div>
          <div className="muted mono" style={{ fontSize: 11 }}>@halden · DK · 4y track</div>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, textAlign: "center", color: "var(--fg-2)", maxWidth: 280, lineHeight: 1.5 }}>
            Mean-reversion on major FX. Hold 4–18 h.
          </p>
        </div>

        {/* Stat strip */}
        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border)" }}>
            <div className="muted-2" style={{ fontSize: 9, letterSpacing: "0.08em" }}>30 DAYS</div>
            <div className="num up" style={{ fontSize: 18, fontWeight: 500 }}>+8.4%</div>
          </div>
          <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border)" }}>
            <div className="muted-2" style={{ fontSize: 9, letterSpacing: "0.08em" }}>SHARPE</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 500 }}>2.31</div>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <div className="muted-2" style={{ fontSize: 9, letterSpacing: "0.08em" }}>MAX DD</div>
            <div className="num down" style={{ fontSize: 18, fontWeight: 500 }}>−6.1%</div>
          </div>
        </div>

        {/* Equity */}
        <div className="card" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span className="muted-2" style={{ fontSize: 10, letterSpacing: "0.08em" }}>EQUITY CURVE</span>
            <div className="seg" style={{ padding: 2 }}>
              <button style={{ padding: "3px 8px", fontSize: 10 }}>1M</button>
              <button className="on" style={{ padding: "3px 8px", fontSize: 10 }}>1Y</button>
              <button style={{ padding: "3px 8px", fontSize: 10 }}>All</button>
            </div>
          </div>
          <EquityCurve seed={42} width={306} height={130} trend={0.85} />
        </div>

        {/* Composition */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="serif" style={{ fontSize: 15, fontWeight: 500 }}>Portfolio composition</span>
            <span className="muted-2" style={{ fontSize: 10 }}>upd. 2 min</span>
          </div>
          <AllocationBar items={POSITIONS} />
          <div style={{ marginTop: 10 }}>
            {POSITIONS.slice(0, 5).map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "10px 70px 1fr auto", alignItems: "center", padding: "7px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "0", fontSize: 12, gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: p.dir === "cash" ? "var(--surface-3)" : `color-mix(in oklch, var(--fg) ${88 - i * 9}%, var(--surface))` }} />
                <span className="mono" style={{ fontSize: 11 }}>{p.sym}</span>
                <span className={p.dir === "long" ? "up" : p.dir === "short" ? "down" : "muted-2"} style={{ fontSize: 10, textTransform: "uppercase" }}>{p.dir}</span>
                <span className="num" style={{ fontWeight: 500 }}>{p.w}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent trades */}
        <div className="card" style={{ padding: 14 }}>
          <div className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Recent trades</div>
          {TRADES.slice(0, 4).map((tr, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "0" }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: "var(--f-mono)", color: "var(--fg-2)" }}>{tr.sym.slice(0, 3)}</span>
              <div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{tr.sym}</div>
                <div className="muted" style={{ fontSize: 10 }}>{tr.side} · {tr.size}</div>
              </div>
              <div className={`num ${tr.pnl >= 0 ? "up" : "down"}`} style={{ fontSize: 13, fontWeight: 500 }}>{tr.pnl > 0 ? "+" : ""}{tr.pnl.toFixed(1)}%</div>
              <div className="muted-2" style={{ fontSize: 10, minWidth: 50, textAlign: "right" }}>{tr.when.split(" ").slice(0, 2).join(" ")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 18px 22px 18px", background: "color-mix(in oklch, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
        <button className="btn lg" style={{ flex: "0 0 auto", width: 44, padding: 0, justifyContent: "center" }}>♥</button>
        <button className="btn primary lg" style={{ flex: 1, justifyContent: "center" }}>Subscribe · from € 200</button>
      </div>
    </div>
  );
}

function MobileSubscribeScreen() {
  const t = TRADERS[0];
  const [amount, setAmount] = React.useState(750);
  const [ratio, setRatio] = React.useState(1.0);
  const [stopLoss, setStopLoss] = React.useState(20);
  return (
    <div className="pel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: "color-mix(in oklch, var(--fg) 30%, transparent)" }}>
      {/* Background scrim representing the underlying profile */}
      <div style={{ position: "absolute", inset: 0, background: "var(--bg)", opacity: 0.55 }} />

      {/* Sheet */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 80, background: "var(--surface)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -12px 40px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* grabber */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-2)" }} />
        </div>

        <div style={{ padding: "8px 22px 0 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={t.name} size={42} seed={t.id} />
          <div style={{ flex: 1 }}>
            <div className="muted-2" style={{ fontSize: 10, letterSpacing: "0.08em" }}>SUBSCRIPTION</div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 500 }}>Marcus Halden</div>
          </div>
          <button className="btn ghost sm" style={{ padding: "0 8px", fontSize: 18, color: "var(--fg-2)" }}>×</button>
        </div>

        <div className="dotted-x" style={{ margin: "14px 22px" }} />

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 16px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Amount */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted-2" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Allocation amount</span>
              <span className="muted" style={{ fontSize: 11 }}>Available € 24,318</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
              <span className="serif" style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em" }}>€</span>
              <input
                value={amount}
                onChange={e => setAmount(Number(e.target.value) || 0)}
                style={{ border: 0, outline: 0, background: "transparent", color: "var(--fg)", fontFamily: "var(--f-display)", fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em", width: 160, padding: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[200, 500, 1000, 2500].map(v => (
                <button key={v} className="btn sm" onClick={() => setAmount(v)} style={ amount === v ? { background: "var(--fg)", color: "var(--bg)", borderColor: "var(--fg)" } : {}}>€ {v}</button>
              ))}
            </div>
          </div>

          {/* Copy ratio */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted-2" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Copy ratio</span>
              <span className="num" style={{ fontSize: 14, fontWeight: 500 }}>×{ratio.toFixed(2)}</span>
            </div>
            <input type="range" min="0.1" max="3" step="0.05" value={ratio} onChange={e => setRatio(Number(e.target.value))} style={{ marginTop: 10 }} />
            <div className="muted-2 mono" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span>×0.10</span><span>×1.00</span><span>×3.00</span>
            </div>
            <p className="muted" style={{ fontSize: 11, margin: "6px 0 0 0", lineHeight: 1.5 }}>
              At ×1 your trade size mirrors the trader's portfolio proportionally.
            </p>
          </div>

          {/* Stop loss */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted-2" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Subscription stop</span>
              <span className="num down" style={{ fontSize: 13, fontWeight: 500 }}>−{stopLoss}%</span>
            </div>
            <div className="seg" style={{ marginTop: 8, width: "100%" }}>
              {[10, 15, 20, 30, 50].map(v => (
                <button key={v} className={stopLoss === v ? "on" : ""} onClick={() => setStopLoss(v)} style={{ flex: 1 }}>−{v}%</button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11, margin: "6px 0 0 0", lineHeight: 1.5 }}>
              Subscription stops automatically if cumulative loss reaches the threshold.
            </p>
          </div>

          {/* Summary */}
          <div className="card" style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span className="muted">Allocated</span>
              <span className="num">€ {amount.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span className="muted">Performance fee</span>
              <span className="num">15% of profit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span className="muted">Drawdown stop (est.)</span>
              <span className="num down">−€ {Math.round(amount * stopLoss / 100).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "12px 22px 26px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <button className="btn lg" style={{ flex: 0.5, justifyContent: "center" }}>Cancel</button>
          <button className="btn primary lg" style={{ flex: 1, justifyContent: "center" }}>Confirm — € {amount.toLocaleString()}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileDiscoverScreen, MobileProfileScreen, MobileSubscribeScreen, StatusBar, MobileNav, TraderCardCompact });
