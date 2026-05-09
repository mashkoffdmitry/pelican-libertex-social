/* pelican-app.jsx — main: Tweaks + DesignCanvas wiring */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "fontPair": "editorial",
  "accent": "ink"
}/*EDITMODE-END*/;

const ACCENTS = {
  ink:     { fg: "var(--fg)",                       bg: "var(--bg)" },
  amber:   { fg: "oklch(0.74 0.13 75)",             bg: "oklch(0.18 0.02 75)" },
  emerald: { fg: "oklch(0.62 0.13 155)",            bg: "oklch(0.97 0.01 155)" },
  cobalt:  { fg: "oklch(0.55 0.16 255)",            bg: "oklch(0.98 0.01 255)" },
};
const ACCENT_LABEL = { ink: "Graphite", amber: "Amber", emerald: "Emerald", cobalt: "Cobalt" };
const ACCENT_SWATCH = {
  ink:     ["#1a1a1a", "#fafaf7"],
  amber:   ["#c89028", "#1a1410"],
  emerald: ["#2f8a5e", "#f4faf6"],
  cobalt:  ["#3a6df0", "#f4f6fa"],
};

function Frame({ theme = "light", density, fontPair, accent, children }) {
  const a = ACCENTS[accent] || ACCENTS.ink;
  return (
    <div
      className={`theme-${theme} font-${fontPair} density-${density}`}
      style={{
        width: "100%", height: "100%",
        // accent maps onto buttons / equity stroke
        "--accent": a.fg,
        "--accent-fg": a.bg,
      }}
    >
      {children}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const common = { density: t.density, fontPair: t.fontPair, accent: t.accent };

  // Bezel for mobile artboards
  const Phone = ({ children }) => (
    <div className="bezel" style={{ width: 375, height: 812, margin: "0 auto" }}>
      <div className="bezel-inner">{children}</div>
    </div>
  );

  return (
    <DesignCanvas>
      <DCSection id="desktop" title="Desktop · 1280 × 880">
        <DCArtboard id="d-leaders-light" label="Discover · Leaderboard · Light" width={1280} height={880}>
          <Frame theme="light" {...common}><LeaderboardScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="d-leaders-dark" label="Discover · Leaderboard · Dark" width={1280} height={880}>
          <Frame theme="dark" {...common}><LeaderboardScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="d-profile-light" label="Trader profile · Light" width={1280} height={1280}>
          <Frame theme="light" {...common}><TraderProfileScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="d-profile-dark" label="Trader profile · Dark" width={1280} height={1280}>
          <Frame theme="dark" {...common}><TraderProfileScreen /></Frame>
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobile · iPhone 13 Pro · 375 × 812">
        <DCArtboard id="m-discover-light" label="Discover · Light" width={420} height={860}>
          <Frame theme="light" {...common}><Phone><MobileDiscoverScreen /></Phone></Frame>
        </DCArtboard>
        <DCArtboard id="m-profile-light" label="Trader profile · Light" width={420} height={860}>
          <Frame theme="light" {...common}><Phone><MobileProfileScreen /></Phone></Frame>
        </DCArtboard>
        <DCArtboard id="m-subscribe-light" label="Subscribe sheet · Light" width={420} height={860}>
          <Frame theme="light" {...common}><Phone><MobileSubscribeScreen /></Phone></Frame>
        </DCArtboard>
        <DCArtboard id="m-discover-dark" label="Discover · Dark" width={420} height={860}>
          <Frame theme="dark" {...common}><Phone><MobileDiscoverScreen /></Phone></Frame>
        </DCArtboard>
        <DCArtboard id="m-profile-dark" label="Trader profile · Dark" width={420} height={860}>
          <Frame theme="dark" {...common}><Phone><MobileProfileScreen /></Phone></Frame>
        </DCArtboard>
        <DCArtboard id="m-subscribe-dark" label="Subscribe sheet · Dark" width={420} height={860}>
          <Frame theme="dark" {...common}><Phone><MobileSubscribeScreen /></Phone></Frame>
        </DCArtboard>
      </DCSection>

      <TweaksPanel title="Pelican · Tweaks">
        <TweakSection label="Density" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact", "comfortable"]}
          onChange={v => setTweak("density", v)}
        />
        <TweakSection label="Font pair" />
        <TweakSelect
          label="Pair"
          value={t.fontPair}
          options={[
            { value: "editorial", label: "Editorial — Newsreader + Geist" },
            { value: "modern",    label: "Modern — Geist + Geist Mono" },
            { value: "classical", label: "Classical — Instrument + Inter Tight" },
          ]}
          onChange={v => setTweak("fontPair", v)}
        />
        <TweakSection label="Accent" />
        <TweakColor
          label={ACCENT_LABEL[t.accent] || "Accent"}
          value={ACCENT_SWATCH[t.accent]}
          options={[ACCENT_SWATCH.ink, ACCENT_SWATCH.amber, ACCENT_SWATCH.emerald, ACCENT_SWATCH.cobalt]}
          onChange={(v) => {
            const key = Object.keys(ACCENT_SWATCH).find(k => ACCENT_SWATCH[k][0] === v[0]) || "ink";
            setTweak("accent", key);
          }}
        />
      </TweaksPanel>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
