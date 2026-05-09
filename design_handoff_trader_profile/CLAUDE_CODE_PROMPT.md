# Claude Code prompt — Trader Profile

Open Claude Code in the **target codebase** (the React/Vue/SwiftUI app you want to ship this in), then paste the prompt below. Attach the whole `design_handoff_trader_profile/` folder to the conversation when you do.

---

## Prompt

> I'm shipping a **Trader Profile** screen for a copy-trading app called *Pelican Social*. I'm attaching `design_handoff_trader_profile/` — read `README.md` first, end-to-end, before writing any code.
>
> The HTML files in `source/` are **design references**, not production code. **Do not** copy the JSX as-is. Recreate the design in this codebase using its existing components, design tokens, and routing patterns. If a primitive I need (Card, Button, Avatar, Tag, SegmentedControl) already exists here, extend it; only add a new primitive if there is no equivalent.
>
> Scope of this task:
> 1. Add the **Trader Profile** route/page (desktop + mobile responsive — desktop layout per README §"Trader Profile · Desktop", mobile per §"Trader Profile · Mobile").
> 2. Wire the **dark theme** first (the user's preferred direction); confirm the light theme falls out automatically through the token map in §"Design Tokens".
> 3. The page reads from a `Trader` model. Stub the data feed with the same shape as `source/pelican-data.jsx` if no real endpoint exists — clearly mark TODOs where the real API is needed.
> 4. The equity curve must be rendered via the codebase's chart lib (NOT by porting the inline SVG generator). Match the visual treatment: single 1.5px stroke, 14% area fill, dashed gridlines, mono tabular-nums axis labels, no markers.
> 5. The "Subscribe · from € 200" button opens a sheet/modal — implement the sheet per `MobileSubscribeScreen` in `source/pelican-mobile.jsx` (allocation amount with quick presets, copy-ratio slider 0.10–3.00, stop-loss segmented control, summary card, confirm button). Wire it to a stubbed `subscribe(traderId, params)` call.
>
> Out of scope: Discover/Leaderboard, Portfolio, Activity, Chat — only the Trader Profile + Subscribe sheet for now.
>
> Before you start coding:
> - Run `ls` / browse the repo to find the existing design system (tokens file, component library entry, theme provider).
> - Tell me which existing primitives you'll reuse and which you'll need to add.
> - Tell me how you'll thread the OKLCH tokens through the existing theme provider (or whether to convert them to whatever color format the codebase uses).
> - Then propose a small file diff plan and wait for me to approve before writing files.
>
> Keep state minimal: equity range, following toggle, and (when sheet open) amount / ratio / stopLoss. No global state needed for this screen.

---

## Tips for getting good output

- **Open Claude Code at the repo root.** It needs to see the existing design system to reuse it.
- **Resist the urge to skip the planning step.** The prompt asks Claude Code to *propose* a diff plan first — review it before letting it write files. This is where mismatches with your existing primitives get caught cheaply.
- **Iterate on one section at a time.** If the first attempt at the Stats strip doesn't match the spec, paste the screenshot from `index.html` (Trader profile · Dark) back into the conversation and ask for a delta.
- **Don't ship the OKLCH tokens unchanged** if your design system is in HEX/RGB. Ask Claude Code to convert them once, commit the converted values into your tokens file, and reference those — not the raw OKLCH literals.
- **Replace the avatars and wordmark.** The prototype uses geometric initials and an inline SVG mark as placeholders. Wire your actual brand mark and real avatar URLs.
