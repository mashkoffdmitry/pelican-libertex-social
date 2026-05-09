# Handoff: Pelican Social — Trader Profile (Copy-Trading)

## Overview
This package documents the **Trader Profile** screen for *Pelican Social*, a copy-trading platform where users subscribe to top traders' portfolios and have trades mirrored into their own account at a chosen ratio. The Trader Profile is the main conversion screen: it presents a single trader's track record, holdings, and recent activity, and drives the user to the Subscribe action.

Two viewports are documented:
- **Desktop** — 1280 × 1280 (full page, scrolls vertically)
- **Mobile** — 375 × 812 (sticky bottom CTA)

Both viewports support **Light** and **Dark** themes. The user's preferred direction is **Trader Profile · Dark** — treat that as canonical; the light theme is a recolor of the same layout via CSS custom properties.

## About the Design Files
The files in `source/` are **design references created in HTML** — React + Babel prototypes showing the intended look and behavior. They are **not** production code to copy directly.

Your task is to **recreate these designs in the target codebase** using its existing framework, design system, and component library. If no environment exists yet, choose the most appropriate stack for the project (React + a CSS-in-JS lib or Tailwind, SwiftUI, etc.) and implement there. Treat the HTML as a precise visual + behavioral spec — match the layout, type scale, density, and motion, but route everything through the codebase's primitives (Button, Card, Avatar, Tag, etc.) rather than re-implementing them.

## Fidelity
**Mid-fidelity.** Layout, hierarchy, type, color, spacing, and content are final. Hover/focus/loading/empty/error states are NOT designed — fall back to the host design system's defaults. Charts use seeded fake data; replace with real series.

---

## Design Tokens

### Color (theme-scoped via CSS custom properties)

The light and dark themes share the same token names. Apply a `.theme-light` or `.theme-dark` class on the page root (or per-component if your codebase scopes themes regionally).

| Token        | Light                        | Dark                         | Usage                                |
|--------------|------------------------------|------------------------------|--------------------------------------|
| `--bg`       | `oklch(0.982 0.005 80)`      | `oklch(0.140 0.005 80)`      | Page background                      |
| `--surface`  | `oklch(1.000 0.000 0)`       | `oklch(0.170 0.005 80)`      | Cards                                |
| `--surface-2`| `oklch(0.962 0.005 80)`      | `oklch(0.205 0.005 80)`      | Inset / table headers / segmented bg |
| `--surface-3`| `oklch(0.945 0.006 80)`      | `oklch(0.230 0.005 80)`      | Range-slider track                   |
| `--border`   | `oklch(0.910 0.005 80)`      | `oklch(0.245 0.005 80)`      | Hairlines, card borders              |
| `--border-2` | `oklch(0.870 0.006 80)`      | `oklch(0.300 0.006 80)`      | Drag-handle / grabber                |
| `--fg`       | `oklch(0.180 0.010 80)`      | `oklch(0.965 0.005 80)`      | Primary text                         |
| `--fg-2`     | `oklch(0.420 0.008 80)`      | `oklch(0.745 0.005 80)`      | Secondary text                       |
| `--fg-3`     | `oklch(0.620 0.005 80)`      | `oklch(0.555 0.005 80)`      | Muted labels (uppercase)             |
| `--fg-4`     | `oklch(0.780 0.004 80)`      | `oklch(0.380 0.005 80)`      | Dotted-divider dots                  |
| `--up`       | `oklch(0.580 0.110 150)`     | `oklch(0.720 0.140 150)`     | Positive P/L, Buy, growth            |
| `--down`     | `oklch(0.560 0.140 25)`      | `oklch(0.700 0.150 25)`      | Negative P/L, Sell, drawdown         |

**Aesthetic intent:** warm-paper editorial monochrome. Whites are warm (low chroma at hue 80), blacks are warm graphite — never pure `#fff` / `#000`. Saturation stays under 0.02 outside the up/down semantic colors.

### Accent
Default accent is the foreground (graphite in light / off-white in dark) — i.e. monochrome buttons. The HTML prototype exposes 4 optional accents via Tweaks (Graphite / Amber / Emerald / Cobalt). Pick **one** at integration time and bind it to a single `--accent` token; do not ship the picker.

| Accent   | --accent (used as button bg, equity stroke) | --accent-fg (text on accent) |
|----------|---------------------------------------------|-------------------------------|
| Graphite | `var(--fg)`                                 | `var(--bg)`                   |
| Amber    | `oklch(0.74 0.13 75)`                       | `oklch(0.18 0.02 75)`         |
| Emerald  | `oklch(0.62 0.13 155)`                      | `oklch(0.97 0.01 155)`        |
| Cobalt   | `oklch(0.55 0.16 255)`                      | `oklch(0.98 0.01 255)`        |

### Typography
Three faces, all from Google Fonts:
- **Display (serif):** `Newsreader`, weights 400/500/600, optical size variable. Used for page H1, card headings, large numerics in summary tiles.
- **UI (sans):** `Geist`, weights 300/400/500/600/700. All UI text, buttons, nav.
- **Mono / numeric:** `Geist Mono`, weights 400/500/600. Tabular numerals, prices, tickers, timestamps. Always set `font-variant-numeric: tabular-nums` and a small negative `letter-spacing` (`-0.005em` to `-0.01em`).

| Role                         | Font        | Size | Weight | Letter-spacing |
|------------------------------|-------------|------|--------|----------------|
| Page H1                      | Newsreader  | 32px | 500    | -0.02em        |
| Card heading                 | Newsreader  | 18px | 500    | normal         |
| Stat-tile value (desktop)    | Geist Mono  | 22px | 500    | -0.015em       |
| Body                         | Geist       | 13px | 400    | normal         |
| Table cell                   | Geist       | 13px | 400/500| -0.005em       |
| Uppercase eyebrow / label    | Geist       | 10–11px | 500 | 0.08em–0.10em  |
| Sticky CTA / lg button       | Geist       | 14px | 500    | -0.005em       |

Body line-height: ~1.45–1.55 for paragraphs; ~1.0–1.2 for numerics and table rows.

### Spacing & radius
- Page padding: **24–28px** (desktop), **18px** (mobile)
- Card padding: **18px** desktop, **12–14px** mobile
- Card gap (between cards): **16–20px** desktop, **14px** mobile
- Card radius: **12px**
- Button radius: **8px** (sm: 6px, lg: 10px)
- Tag/pill radius: **999px**
- Hairline border: **1px solid var(--border)**

### Density modes
The prototype supports two density modes via class on the root:
- `.density-comfortable` — `--row-h: 56px; --pad-y: 14px; --pad-x: 18px; --gap: 16px;`
- `.density-compact` — `--row-h: 40px; --pad-y: 8px; --pad-x: 12px; --gap: 10px;`

For initial integration, use **comfortable** unless your product has high-information density elsewhere.

---

## Trader Profile · Desktop

Frame: 1280 × 1280, scrolls vertically. Top nav fixed-height; everything below scrolls.

### Layout (top to bottom)

1. **Top bar** — `var(--surface)` background, 1px bottom border. Height ~64px. Padding `16px 28px`.
   - Wordmark "Pelican" (Newsreader 18/500, -0.01em) + small geometric mark (circle + chevron + dot — see `Logo` in `pelican-desktop.jsx`).
   - Faded "Social" sub-label.
   - Nav links: `Discover`, `Leaders`, `Portfolio`, `Activity`. Active = full `--fg`, 1.5px underline 10px below baseline. Inactive = `--fg-2`, 13/500.
   - Search field (read-only display): pill with magnifier icon, "Search trader or instrument", `⌘K` hint at right. `var(--surface-2)` bg, 1px border, 32px tall, min-width 240px.
   - "BALANCE" eyebrow + monospace amount (e.g. `€ 24,318.04`).
   - Avatar (32px circle, geometric monochrome — initials on a `color-mix` shade of `--fg`, no faces).

2. **Breadcrumb row** — `Leaders / FX & Macro / Marcus Halden`, 12px, 8px gap, slashes at 0.4 opacity.

3. **Header (3-column grid: `auto 1fr auto`, gap 24px, align center)**
   - **Left:** 84px round avatar.
   - **Middle:** stack
     - H1 "Marcus Halden" + `Verified ✓` tag (ok variant) + `Top 1%` tag, gap 10px.
     - Meta line at 13px `--fg-2`: `@halden · Denmark · København · Track record 4 yrs 2 mo · 3,120 followers` (separators are middle-dots at 0.4 opacity, gap 14px).
     - Strategy paragraph, max-width 640px, `--fg-2`.
   - **Right:** stack of CTAs
     - Primary lg button "Subscribe · from € 200", width 200px.
     - Two secondary buttons side-by-side: "Follow", "Message" (each `flex: 1`).

4. **Stats strip** — single `.card` with `display: grid; grid-template-columns: repeat(7, 1fr)`, no inner gaps, vertical 1px dividers between cells (`border-right: 1px solid var(--border)` on each tile except last).
   Each tile: padding `14px 16px`, contains:
   - 10px uppercase eyebrow `--fg-3`, letter-spacing 0.1em
   - Geist Mono 22/500 value, color tinted `up` / `down` where signed
   - 11px `--fg-2` sub-line

   Cells in order: **Total** `+204.7%` / **30 days** `+8.4%` / **Sharpe** `2.31` / **Max DD** `−6.1%` / **Win rate** `71%` / **Avg hold** `08h 14m` / **AUM** `€ 14.2M`.

5. **Equity curve card** — padding `18px 22px`.
   - Top row: left = 11px eyebrow "EQUITY CURVE" + 22px Newsreader headline `€ 14,206,840` with inline `+204.7%` in `up`. Right = segmented control `1M / 3M / 6M / 1Y / 3Y / All`, "1Y" active.
   - SVG line chart, **1180 × 220**:
     - 4 horizontal gridlines (top is solid hairline, others dashed `2 4`), y-axis labels at right edge in Geist Mono 10px `--fg-3`.
     - Line: `var(--accent)` stroke, 1.5px, rounded joins/caps.
     - Area fill below line: `color-mix(in oklch, var(--accent) 14%, transparent)`.
     - X-axis month labels (Jan, Mar, May, Jul, Sep, Nov) in Geist Mono 10px `--fg-3`, centered under their tick.

6. **Two-column row (`grid-template-columns: 1fr 1.4fr`, gap 16px)**

   **6a. Portfolio composition** card (left).
   - Heading row: Newsreader 18/500 "Portfolio composition" + 11px `--fg-2` "Updated 2 min ago".
   - Stacked horizontal bar (height 10px, 999px radius, 1px border): each segment `color-mix(in oklch, var(--fg) {88 - i*9}%, var(--surface))`, cash segment uses `--surface-3`.
   - Position list, one row per holding, grid `16px 80px 1fr auto auto`:
     - 8×8 colored chip (matches bar segment)
     - Mono ticker (12px)
     - Position name in `--fg-2`
     - Direction tag — `LONG` in `up`, `SHORT` in `down`, `CASH` in `--fg-3` — uppercase 11px
     - Weight % in mono 13/500
   - Rows divided by 1px hairlines, no border on last.

   Holdings: EUR/USD 22% long, DAX40 18% long, USD/JPY 14% short, GBP/CHF 11% long, BRENT 9% short, XAU/USD 8% long, AUD/CAD 7% short, CASH 11%.

   **6b. Recent trades** card (right).
   - Heading row: "Recent trades" + link "All 1,284 →" (12px `--fg-2`).
   - Table header row, grid `0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr`, columns: **Instrument | Side | Size | Entry | Exit | P/L | When**. Headers 11px uppercase `--fg-3`, letter-spacing 0.08em.
   - Body rows ~36px tall, hairline separated. Mono in tabular-nums for symbols, prices, P/L. Side colored (Buy=up, Sell=down).
   - Use the 7 trades in `pelican-data.jsx → TRADES`.

7. **Footer note** — flex row, gap 16px, padding `16px 0 8px 0`.
   - Left: 12px `--fg-3`, max-width 720px:
     > "Past performance does not guarantee future results. Copy-trading carries risk of capital loss; set a Stop-Loss and never allocate more than you can afford."
   - Right: two pill tags — `Risk: Medium`, `Regulated · CySEC`.

---

## Trader Profile · Mobile

Frame: 375 × 812, sticky bottom CTA.

### Layout

1. **Status bar** (44px) — host platform should provide the real one; the prototype renders a fake.

2. **Header bar** (small, padding `4px 14px 8px 14px`)
   - Back button "‹ Leaders" (`btn ghost sm`, `--fg-2`)
   - flex spacer
   - "···" overflow

3. **Scroll area** (`flex: 1`, padding `0 18px 100px 18px` — 100px bottom is sticky-CTA clearance)

   **3a. Hero** — column, items center, gap 6px, padding `8px 0 14px 0`.
   - 64px avatar
   - Newsreader 22/500 "Marcus Halden" + `✓` ok-tag (18px tall, 9px font)
   - Mono 11px `@halden · DK · 4y track`
   - 12px centered paragraph, max-width 280px, color `--fg-2`: "Mean-reversion on major FX. Hold 4–18 h."

   **3b. Stat strip** — single card, `grid-template-columns: 1fr 1fr 1fr`.
   - Three tiles: **30 DAYS** `+8.4%` (up) / **SHARPE** `2.31` / **MAX DD** `−6.1%` (down)
   - Tile padding `10px 12px`, eyebrow 9px / value 18/500 mono, vertical hairlines between.

   **3c. Equity curve** card, padding 12.
   - Top row: 10px eyebrow "EQUITY CURVE" + tiny segmented `1M / 1Y* / All` (10px font, 3×8 padding).
   - SVG 306 × 130 chart, same styling as desktop but scaled down.

   **3d. Portfolio composition** card, padding 14.
   - Heading row: Newsreader 15/500 "Portfolio composition" + 10px "upd. 2 min".
   - Same stacked bar.
   - Position list (top 5 only): grid `10px 70px 1fr auto`, 12px font.

   **3e. Recent trades** card, padding 14.
   - "Recent trades" heading, then 4 rows.
   - Each row: grid `auto 1fr auto auto`, gap 10:
     - 28×28 rounded-6 chip with first 3 chars of ticker in 9px mono
     - Stack: 12/500 mono ticker, 10px `--fg-2` "Side · size"
     - 13/500 P/L (up/down)
     - 10px `--fg-3` time, min-width 50, right-aligned

4. **Sticky bottom CTA** — absolute bottom, padding `12px 18px 22px 18px`, bg `color-mix(in oklch, var(--bg) 88%, transparent)` + `backdrop-filter: blur(12px)`, 1px top border.
   - 44px square heart-icon button (favorite)
   - Primary lg "Subscribe · from € 200", `flex: 1`

---

## Component primitives to map onto the host system

| Prototype class | Maps to                                  | Notes                                                          |
|-----------------|------------------------------------------|----------------------------------------------------------------|
| `.card`         | `Card`                                   | 12px radius, `--surface` bg, 1px `--border`                    |
| `.btn`          | `Button` (default variant)               | Size variants: `sm` 28px / default 36px / `lg` 44px            |
| `.btn.primary`  | `Button` primary                         | Bg `--accent`, fg `--accent-fg`                                |
| `.btn.ghost`    | `Button` ghost                           | Transparent bg                                                 |
| `.tag`          | `Tag` / `Badge`                          | 22px tall, pill. Variants: default / `solid` / `ok` / `warn`   |
| `.seg`          | `SegmentedControl`                       | 1px border, 8px radius. Active item gets `--surface` bg + shadow |
| `.av`           | `Avatar`                                 | Round, initials on monochrome `color-mix` background — no photos |
| `.row .th`      | Table header row                         | 11px uppercase, letter-spacing 0.08em, `--fg-3`                |
| `.dotted-x`     | Dotted divider                           | `radial-gradient` repeated dots — editorial detail             |

For the **equity curve**, port the SVG generator in `source/pelican-charts.jsx` (`genSeries`, `points`, `pathFromPoints`, `EquityCurve`) onto your charting lib (Recharts, ECharts, native SwiftUI `Chart`, etc.) — fake data must be replaced with the real time series feed, but the visual treatment (single 1.5px line, 14% area fill, dashed gridlines, mono axis labels) should be preserved.

---

## Interactions & Behavior

- **Subscribe (primary CTA)** opens the **Subscribe sheet** — see `MobileSubscribeScreen` in `source/pelican-mobile.jsx` for the full spec (allocation amount, copy ratio slider 0.10–3.00 step 0.05, stop-loss segmented `−10/15/20/30/50%`, summary card, Confirm button).
- **Follow** is a binary toggle (no commitment of capital).
- **Message** opens a 1:1 chat (out of scope here).
- **Equity range selector** changes the time-window of the chart only — no other state.
- **Breadcrumb** items navigate up the discovery tree.
- **Risk / Regulated tags** in the footer are non-interactive labels.

Hover/focus/loading/empty/error states are not designed — apply the host design system's defaults.

## State Management
- `equityRange: '1M' | '3M' | '6M' | '1Y' | '3Y' | 'All'` — local to the profile screen.
- `following: boolean`
- Subscribe sheet (when opened): `amount: number`, `ratio: number`, `stopLoss: number`.
- Trader data is read-only (server fetch).

## Assets
No external assets ship with this design. Avatars are geometric initials; the wordmark is the inline SVG in `Logo` (`source/pelican-desktop.jsx`). Replace with the host product's actual brand mark — do **not** ship an unbranded clone.

## Files
- `source/index.html` — entry, loads fonts + scripts
- `source/pelican-data.jsx` — fake traders, holdings, trades
- `source/pelican-charts.jsx` — sparkline + equity-curve SVG generators
- `source/pelican-desktop.jsx` — `LeaderboardScreen`, `TraderProfileScreen`, `TopBar`, `Logo`, `Avatar`, `StatTile`
- `source/pelican-mobile.jsx` — `MobileDiscoverScreen`, `MobileProfileScreen`, `MobileSubscribeScreen`
- `source/pelican-app.jsx` — theme + density + accent wiring (canvas + tweaks)
