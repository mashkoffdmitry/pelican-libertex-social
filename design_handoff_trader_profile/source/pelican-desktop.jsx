/* pelican-desktop.jsx — Leaderboard + Trader Profile (desktop) */

function Avatar({ name, size = 28, seed = 1 }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  // Geometric monochrome — slate of FG mixes
  const tones = ["35%", "55%", "70%", "45%", "60%"];
  const tone = tones[seed % tones.length];
  return (
    <span
      className="av"
      style={{
        width: size, height: size,
        fontSize: size * 0.36,
        background: `color-mix(in oklch, var(--fg) ${tone}, var(--surface))`,
      }}
    >{initials}</span>
  );
}

function Logo({ size = 18 }) {
  // Wordmark + small geometric mark (no real bird drawing)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10.5" stroke="var(--fg)" strokeWidth="1.2" />
        <path d="M7 14 L12 8 L17 14" stroke="var(--fg)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="12" cy="16.2" r="1.2" fill="var(--fg)" />
      </svg>
      <span className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>Pelican</span>
    </div>
  );
}

function TopBar({ active = "Leaders", balance = "€ 24,318.04" }) {
  return (
    <div className="border-b" style={{ display: "flex", alignItems: "center", gap: 28, padding: "16px 28px", background: "var(--surface)" }}>
      <Logo />
      <span className="muted-2" style={{ fontSize: 11, marginLeft: -16, marginTop: 6 }}>Social</span>
      <nav style={{ display: "flex", gap: 22, marginLeft: 16 }}>
        {NAV.map(n => (
          <a key={n} className={`nav-link ${n === active ? "active" : ""}`} href="#">{n}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="hairline" style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px", borderRadius: 8, background: "var(--surface-2)", color: "var(--fg-3)", fontSize: 12, minWidth: 240 }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        <span>Search trader or instrument</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: 10, opacity: .6 }}>⌘K</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="muted-2" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance</span>
        <span className="num" style={{ fontSize: 13, fontWeight: 500 }}>{balance}</span>
      </div>
      <Avatar name="Aleks Norde" size={32} seed={3} />
    </div>
  );
}

function LeaderRow({ t, rank }) {
  const fmt = (n, suf = "%") => `${n > 0 ? "+" : ""}${n.toFixed(1)}${suf}`;
  return (
    <div className="row border-b" style={{ gridTemplateColumns: "44px 1.6fr 0.8fr 0.7fr 0.7fr 0.6fr 0.7fr 0.7fr 130px 110px", fontSize: 13 }}>
      <span className="num muted-2" style={{ fontSize: 12 }}>{String(rank).padStart(2, "0")}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Avatar name={t.name} size={36} seed={t.id} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 500, letterSpacing: "-0.005em" }}>{t.name}</span>
            <span className="muted-2 mono" style={{ fontSize: 11 }}>· {t.country}</span>
          </div>
          <span className="muted" style={{ fontSize: 11 }}>{t.strategy} · {t.age} track</span>
        </div>
      </div>
      <span className={`num ${t.ret30 >= 0 ? "up" : "down"}`} style={{ fontWeight: 500 }}>{fmt(t.ret30)}</span>
      <span className="num">{fmt(t.ret90)}</span>
      <span className="num">{t.win}%</span>
      <span className="num">{t.sharpe.toFixed(2)}</span>
      <span className="num down">{t.dd.toFixed(1)}%</span>
      <span className="num muted">{t.subs.toLocaleString()}</span>
      <Sparkline seed={t.id * 17 + 3} w={120} h={26} trend={t.ret30 / 12} />
      <button className="btn primary sm" style={{ justifySelf: "end" }}>Subscribe</button>
    </div>
  );
}

function LeaderboardScreen() {
  return (
    <div className="pel" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar active="Leaders" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", flex: 1, minHeight: 0 }}>
        {/* Main */}
        <div style={{ padding: "28px 28px 0 28px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div className="muted-2" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Discover · Top Performers</div>
              <h1 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                Leaders of the <span style={{ fontStyle: "italic", color: "var(--fg-2)" }}>last thirty days</span>
              </h1>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 13, maxWidth: 540 }}>
                Subscribe to a portfolio — trades are mirrored into your account at your chosen ratio, with stop-loss in place.
              </p>
            </div>
            <div className="seg">
              <button className="on">30 days</button>
              <button>90 days</button>
              <button>1 year</button>
              <button>All time</button>
            </div>
          </div>

          {/* Filter row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="muted-2" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 6 }}>Filter</span>
            {FILTER_TAGS.map(f => (
              <span key={f.k} className="tag">
                <span className="muted-2">{f.k}</span>
                <span style={{ color: "var(--fg)" }}>{f.v}</span>
                <span className="muted-2" style={{ marginLeft: 2 }}>×</span>
              </span>
            ))}
            <button className="btn ghost sm" style={{ color: "var(--fg-2)" }}>+ Add filter</button>
            <span style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 12 }}>Sort by:</span>
            <button className="btn sm">Return 30D ↓</button>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="row th border-b" style={{ gridTemplateColumns: "44px 1.6fr 0.8fr 0.7fr 0.7fr 0.6fr 0.7fr 0.7fr 130px 110px", background: "var(--surface-2)" }}>
              <span>#</span>
              <span>Trader · strategy</span>
              <span>30D</span>
              <span>90D</span>
              <span>Win</span>
              <span>Sharpe</span>
              <span>Max DD</span>
              <span>Followers</span>
              <span>Trend</span>
              <span></span>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {TRADERS.map((t, i) => <LeaderRow key={t.id} t={t} rank={i + 1} />)}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside style={{ padding: "28px 28px 28px 4px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>My subscriptions</h3>
              <span className="muted-2 mono" style={{ fontSize: 11 }}>3 / 10</span>
            </div>
            <div className="dotted-x" style={{ margin: "12px 0" }} />
            {[TRADERS[0], TRADERS[8], TRADERS[2]].map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "0" }}>
                <Avatar name={t.name} size={32} seed={t.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>Allocated € {(1500 + i * 700).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={`num ${t.ret30 >= 0 ? "up" : "down"}`} style={{ fontSize: 13, fontWeight: 500 }}>+{t.ret30.toFixed(1)}%</div>
                  <Sparkline seed={t.id * 9} w={64} h={16} trend={t.ret30 / 12} />
                </div>
              </div>
            ))}
            <button className="btn ghost sm" style={{ marginTop: 10, width: "100%", justifyContent: "center", color: "var(--fg-2)" }}>Manage portfolio</button>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="muted-2" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Editor's lists</div>
            <div className="dotted-x" style={{ margin: "10px 0" }} />
            {[
              { t: "Low drawdown", s: "12 traders · DD ≤ 5%" },
              { t: "Long-running", s: "8 traders · ≥ 5 years" },
              { t: "FX only", s: "21 traders" },
              { t: "Rookies of the month", s: "5 traders" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "0", fontSize: 13 }}>
                <span>{c.t}</span>
                <span className="muted-2" style={{ fontSize: 11 }}>{c.s}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────── Trader Profile ─────────── */

function StatTile({ label, value, sub, valueClass = "" }) {
  return (
    <div style={{ padding: "14px 16px", borderRight: "1px solid var(--border)" }}>
      <div className="muted-2" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div className={`num ${valueClass}`} style={{ fontSize: 22, fontWeight: 500, marginTop: 4, letterSpacing: "-0.015em" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function TraderProfileScreen() {
  const t = TRADERS[0];
  return (
    <div className="pel" style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <TopBar active="Leaders" />
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Breadcrumb */}
        <div className="muted-2" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span>Leaders</span>
          <span style={{ opacity: .4 }}>/</span>
          <span style={{ color: "var(--fg-2)" }}>FX & Macro</span>
          <span style={{ opacity: .4 }}>/</span>
          <span style={{ color: "var(--fg)" }}>Marcus Halden</span>
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>
          <Avatar name={t.name} size={84} seed={t.id} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="serif" style={{ margin: 0, fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em" }}>Marcus Halden</h1>
              <span className="tag ok">
                <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Verified
              </span>
              <span className="tag">Top 1%</span>
            </div>
            <div className="muted" style={{ fontSize: 13, display: "flex", gap: 14, alignItems: "center" }}>
              <span className="mono">@halden</span>
              <span style={{ opacity: .4 }}>·</span>
              <span>Denmark · København</span>
              <span style={{ opacity: .4 }}>·</span>
              <span>Track record 4 yrs 2 mo</span>
              <span style={{ opacity: .4 }}>·</span>
              <span>3,120 followers</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, maxWidth: 640, color: "var(--fg-2)" }}>
              Mean-reversion on major FX pairs with disciplined risk management. Hold 4–18 hours, average size ≈ 0.3 lot.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
            <button className="btn primary lg" style={{ width: 200, justifyContent: "center" }}>Subscribe · from € 200</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}>Follow</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}>Message</button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", overflow: "hidden" }}>
          <StatTile label="Total" value="+204.7%" sub="over 4 years" valueClass="up" />
          <StatTile label="30 days" value="+8.4%" sub="vs +1.2% bench." valueClass="up" />
          <StatTile label="Sharpe" value="2.31" sub="ratio" />
          <StatTile label="Max DD" value="−6.1%" sub="all-time" valueClass="down" />
          <StatTile label="Win rate" value="71%" sub="of 1,284 trades" />
          <StatTile label="Avg hold" value="08h 14m" sub="per trade" />
          <StatTile label="AUM" value="€ 14.2M" sub="under management" />
        </div>

        {/* Equity + range selector */}
        <div className="card" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div className="muted-2" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Equity curve</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>€ 14,206,840 <span className="up num" style={{ fontSize: 13, marginLeft: 6 }}>+204.7%</span></div>
            </div>
            <div className="seg">
              <button>1M</button>
              <button>3M</button>
              <button>6M</button>
              <button className="on">1Y</button>
              <button>3Y</button>
              <button>All</button>
            </div>
          </div>
          <EquityCurve seed={42} width={1180} height={220} trend={0.85} />
        </div>

        {/* Two-col: composition + recent trades */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Portfolio composition</h3>
              <span className="muted-2" style={{ fontSize: 11 }}>Updated 2 min ago</span>
            </div>
            <AllocationBar items={POSITIONS} />
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
              {POSITIONS.map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 80px 1fr auto auto", alignItems: "center", padding: "8px 0", borderBottom: i < POSITIONS.length - 1 ? "1px solid var(--border)" : "0", fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: p.dir === "cash" ? "var(--surface-3)" : `color-mix(in oklch, var(--fg) ${88 - i * 9}%, var(--surface))` }} />
                  <span className="mono" style={{ fontSize: 12 }}>{p.sym}</span>
                  <span className="muted">{p.name}</span>
                  <span className={p.dir === "long" ? "up mono" : p.dir === "short" ? "down mono" : "muted-2 mono"} style={{ fontSize: 11, textTransform: "uppercase", marginRight: 14 }}>{p.dir}</span>
                  <span className="num" style={{ fontWeight: 500 }}>{p.w}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Recent trades</h3>
              <a href="#" className="muted" style={{ fontSize: 12, textDecoration: "none" }}>All 1,284 →</a>
            </div>
            <div className="row th border-b" style={{ gridTemplateColumns: "0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr", padding: "0 0 8px 0" }}>
              <span>Instrument</span><span>Side</span><span>Size</span><span>Entry</span><span>Exit</span><span>P/L</span><span>When</span>
            </div>
            {TRADES.map((tr, i) => (
              <div key={i} className="row" style={{ gridTemplateColumns: "0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr", padding: "0", minHeight: 36, borderBottom: i < TRADES.length - 1 ? "1px solid var(--border)" : "0", fontSize: 13 }}>
                <span className="mono" style={{ fontWeight: 500, fontSize: 12 }}>{tr.sym}</span>
                <span className={tr.side === "Buy" ? "up" : "down"} style={{ fontSize: 12, fontWeight: 500 }}>{tr.side}</span>
                <span className="muted mono" style={{ fontSize: 12 }}>{tr.size}</span>
                <span className="mono" style={{ fontSize: 12 }}>{tr.entry}</span>
                <span className="mono" style={{ fontSize: 12 }}>{tr.exit}</span>
                <span className={`num ${tr.pnl >= 0 ? "up" : "down"}`} style={{ fontWeight: 500 }}>{tr.pnl > 0 ? "+" : ""}{tr.pnl.toFixed(1)}%</span>
                <span className="muted" style={{ fontSize: 12 }}>{tr.when}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 0 8px 0" }}>
          <div style={{ flex: 1, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, maxWidth: 720 }}>
            Past performance does not guarantee future results. Copy-trading carries risk of capital loss; set a Stop-Loss and never allocate more than you can afford.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="tag">Risk: Medium</span>
            <span className="tag">Regulated · CySEC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LeaderboardScreen, TraderProfileScreen, Avatar, Logo, TopBar });
