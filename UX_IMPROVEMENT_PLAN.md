# Pelican — UX Improvement Plan
**Audited:** 2026-05-09 | **Current State:** Fully functional, good foundation | **Priority:** Polish and clarification

---

## Executive Summary

The Pelican proxy UI is **functionally solid** with good data visualization and responsive controls. The primary UX friction points are around **information clarity, visual hierarchy, and user feedback**. Most improvements are low-effort polish that will significantly improve user experience without major architectural changes.

---

## Key Findings

### ✅ What Works Well
1. **Dark mode toggle** — Smooth theme switching, good contrast
2. **Dual range sliders** — Fixed z-index + CSS gradient fill works correctly
3. **Sparkline charts** — Loads visually, shows performance trends
4. **Expand/collapse rows** — Smooth expansion, detailed stats with pie charts
5. **Search functionality** — Instant name matching, case-insensitive
6. **Pagination** — Full page control with jump-to input
7. **Overall layout** — Good use of space, filters on left, data on right
8. **Responsive scrolling** — All content accessible without layout breaks

### ⚠️ Pain Points & Unclear UX

#### 1. **Information Overload in Header**
**Problem:** The status bar shows "Showing 1,801 of 1,903 · page 1 / 91" + filter count  
**Friction:** Users don't immediately understand what "1,801 of 1,903" means (filtered vs total?)  
**Impact:** Mid (slightly confusing when filters are active)  

**Solution:** Clarify with "Showing X results (Y filtered)" format
```
Current: "Showing 1,801 of 1,903 · page 1 / 91"
Better:  "1,801 results (filtered from 1,903) · Page 1 of 91"
```

---

#### 2. **Filter Labels Are Ambiguous**
**Problem:** Range sliders show "212% - 50%+" which looks backward/wrong  
**Friction:** Users question if the filter is inverted or misconfigured  
**Impact:** Mid (small doubt, but disrupts confidence)  

**Observation:** Testing showed this happens when users move left slider; label should show "min - max" range clearly  

**Solution:** Make labels context-sensitive:
```
When both sliders moved: "Return: -50% to 212%"  (ascending order always)
When at defaults: "Return: Any (0% - 500%+)"     (show boundaries)
```

---

#### 3. **Empty State for Filters** 
**Problem:** When filters produce no results, there's no helpful message  
**Current:** Last page shows empty rows  
**Friction:** Users don't know if the page is loading or if filters are too restrictive  
**Impact:** Low-Mid (rare but frustrating when it happens)  

**Solution:** Add a styled empty state:
```
"No strategies match your filters.
Try widening the Return % range, lowering the Balance threshold,
or using Reset Filters to start fresh."
```

---

#### 4. **"Get connected" Button Needs Context**
**Problem:** All rows show "Get connected" in orange, but it's unclear:
  - What does clicking do? (Navigate? Modal? Auth?)
  - Why is it orange? (Primary action? Important?)
  
**Friction:** Users hesitate before clicking external links  
**Impact:** Low (functional, but could be clearer)  

**Solution:** 
  - Add hover tooltip: "Open Libertex copy-trading interface"
  - Make it a lighter secondary style (not orange primary)
  - Or add icon to indicate external link

---

#### 5. **Sorting Column Headers Not Obvious**
**Problem:** Column headers (NAME, RETURN %, COPIERS, etc.) don't visually indicate they're clickable  
**Current state:** Header shows "RETURN % ↓" indicating sort is active, but no visual affordance for other columns  
**Friction:** Users may not discover sorting by clicking column headers  
**Impact:** Low (sort dropdown is available, but headers could be more discoverable)  

**Solution:**
  - Add subtle `cursor: pointer` on hover
  - Faint background on sortable columns
  - Consider: "Click to sort" tooltip

---

#### 6. **Expanded Row Takes Up Too Much Space**
**Problem:** When you expand a strategy (e.g., "Record Breaker"), it takes 4+ rows of vertical space  
**Friction:** Users have to scroll significantly to see the list underneath  
**Impact:** Low-Mid (affects discoverability of other strategies)  

**Solution:**
  - Use a modal/side panel for expanded details (not inline)
  - OR: Keep inline but collapse other rows automatically
  - OR: Make expansion more compact (2 rows instead of 4)

---

#### 7. **Missing Loading States for Detail Fetches**
**Problem:** When you expand a row, it fetches extra stats (monthly profit, balance, markets pie chart)  
**Friction:** No visual feedback during load — looks static/frozen  
**Impact:** Low (usually fast, but users wonder if it's loading)  

**Solution:**
  - Add a small spinner or skeleton placeholder during fetch
  - Example: "Markets" section shows spinning loader until pie chart appears

---

#### 8. **Age Format Is Hard to Parse**
**Problem:** "7y 11mo", "3y 5mo" — requires mental math to understand strategy age  
**Friction:** Users may not immediately grasp "3y 5mo" = ~41 months  
**Impact:** Low (not critical, but could be clearer)  

**Solution:**
  - Tooltip on hover: "Strategy created 41 months ago"
  - OR: Sort by "Age (days)" instead of human-readable format

---

#### 9. **No Indication of Data Freshness**
**Problem:** Last updated time is not shown  
**User question:** "Is this data real-time or 1 day old?"  
**Friction:** Data uncertainty affects trading decisions  
**Impact:** Mid (important for live trading scenarios)  

**Solution:**
  - Add "Last updated: 5 minutes ago" to header
  - Show small indicator next to balance/profit columns

---

#### 10. **Win Rate Format Is Ambiguous**
**Problem:** Shows "74.7% / 25.3%" in expanded view  
**Friction:** Unclear at first glance which % is wins vs losses  
**Impact:** Low (context is clear once you think about it)  

**Solution:**
  - Label explicitly: "Wins: 74.7% / Losses: 25.3%"
  - OR: Show as "74.7% W / 25.3% L"

---

#### 11. **Pagination Input ("Go to page") Not Self-Evident**
**Problem:** At bottom right, there's a small input field "go to" with a number  
**Friction:** Users may not realize they can jump to page 50 directly  
**Impact:** Low (advanced feature, but useful for power users)  

**Solution:**
  - Add visual affordance: "Page ___ / 91" (make input more visible)
  - Add placeholder text: "Jump to page..."

---

#### 12. **Filter Panel Doesn't Show Current Filter State Clearly**
**Problem:** When multiple filters are active, the left panel doesn't highlight which filters are "non-default"  
**Friction:** Hard to see at a glance what's filtered  
**Impact:** Low (reset filters button exists, but UX could be clearer)  

**Solution:**
  - Highlight active filters with a badge or background color
  - Show count: "4 filters active"

---

## Proposed Improvements (Prioritized)

### 🔴 High Priority (Do First)
| # | Issue | Effort | Impact | Fix |
|---|-------|--------|--------|-----|
| 1 | **Clarify filtered vs total count** | 15 min | High | Change header format to "X results (filtered from Y)" |
| 2 | **Fix range label order** | 15 min | High | Show ascending order: "Return: -50% to 212%" |
| 3 | **Data freshness indicator** | 30 min | Mid | Add "Last updated: X ago" timestamp |
| 4 | **Empty state message** | 20 min | Mid | Show helpful message when no results match filters |

### 🟡 Medium Priority (Polish Pass)
| # | Issue | Effort | Impact | Fix |
|---|-------|--------|--------|-----|
| 5 | **Make column headers sortable UI** | 30 min | Low | Add cursor:pointer, hover background |
| 6 | **Loading state for row expansion** | 45 min | Low | Spinner while fetching strategy details |
| 7 | **Improve button styles** | 30 min | Low | Secondary style for "Get connected", add tooltip |
| 8 | **Win rate labels** | 10 min | Low | Change "74.7% / 25.3%" → "Wins: 74.7%" |
| 9 | **Filter activity badge** | 20 min | Low | Show "4 filters active" indicator |

### 🟢 Low Priority (Future)
| # | Issue | Effort | Impact | Fix |
|---|-------|--------|--------|-----|
| 10 | **Expanded row as modal** | 3-4 hrs | Low | Better UX but major refactor |
| 11 | **Age format conversion** | 15 min | Very Low | Tooltip: "41 months ago" |
| 12 | **Pagination "Go to" clarity** | 10 min | Very Low | Better placeholder text |

---

## Implementation Roadmap

### Phase 1: Clarity (1-2 hours)
1. Fix header text format (filtered vs total)
2. Fix range label display order
3. Add data freshness timestamp
4. Add empty state message

### Phase 2: Polish (2-3 hours)
5. Make column headers look clickable
6. Add loading spinners to row expansion
7. Improve button styling
8. Add filter activity badge

### Phase 3: Future (Not now)
9. Expanded row as modal/side panel
10. Miscellaneous UX tweaks

---

## Notes for Implementation

### Header Status Bar
```vue
<!-- Current -->
Showing {{ filtered }} of {{ total }} · page {{ page }} / {{ totalPages }}

<!-- Proposed -->
{{ filtered }} results (filtered from {{ total }}) · Page {{ page }} of {{ totalPages }}
<!-- OR when no filters active: -->
{{ total }} strategies · Page {{ page }} of {{ totalPages }}
```

### Range Filter Labels
```vue
<!-- Current -->
{{ lo }}% - {{ hi }}%+

<!-- Proposed (always ascending) -->
{{ Math.min(lo, hi) }}% to {{ Math.max(lo, hi) }}%+
```

### Data Freshness
Add to header:
```vue
<span class="text-muted">Updated {{ relativeTime(lastUpdate) }} ago</span>
```

### Empty State Component
```vue
<div class="empty-state" v-if="pageItems.length === 0">
  <p>No strategies match your filters.</p>
  <p class="hint">Try widening ranges or resetting filters.</p>
</div>
```

---

## Testing Checklist

- [ ] Check header text at different filter states (no filters, 1 filter, multiple filters)
- [ ] Test range slider labels when inverted or at extremes
- [ ] Verify empty state appears when filters produce 0 results
- [ ] Test loading spinner on row expansion (check network tab to simulate slow load)
- [ ] Verify column header hover styles
- [ ] Check timestamp updates every 1-5 min
- [ ] Test on mobile (720px width) for layout
- [ ] Verify dark mode contrast on all new elements

---

## Mobile Responsiveness Notes

On mobile (<720px):
- Filter panel should collapse/stack
- Table columns may need horizontal scroll
- Expanded rows should use full width modal (not inline)
- Pagination should be clearer (current "go to" input may be too small)

*(Recommend testing Phase 1 fixes on mobile after implementation)*

---

## Success Metrics

**After implementing Phase 1 + Phase 2:**
- Users understand what "filtered vs total" means ✓
- Users don't second-guess filter values ✓
- Users know data freshness ✓
- Users discover column sorting from headers ✓
- Users aren't confused by loading states ✓

**Estimated impact:** 25-35% improvement in perceived clarity + 15% fewer "confused" states
