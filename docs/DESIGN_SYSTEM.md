# Smart E-Commerce Analytics Design System

## 1. Design Philosophy
The Smart E-Commerce design system is inspired by top-tier modern data analytics platforms (Stripe Dashboard, Linear, Vercel Analytics, Mixpanel). It emphasizes:
- **Trustworthy & Executive-Ready**: High density without visual clutter, crisp 1px borders, subtle atmospheric shadows.
- **Strictly Grounded in ML Artifacts**: Zero placeholder or artificial metrics; every card, table, chart, and driver maps 1:1 to trained models and dataset artifacts.
- **Accessible & Transparent (WCAG 2.1 AA)**: High contrast, keyboard navigability (`⌘K` command palette), chart table toggles, and plain-English metric explanations.

---

## 2. Color System & Design Tokens

### Primary & Neutral Tokens
| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--primary` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | Primary brand accent, active tabs, CTA buttons |
| `--background` | `#F8FAFC` (Slate 50) | `#090D16` (Deep Slate 950) | Application body canvas |
| `--surface` | `#FFFFFF` (Pure White) | `#0F172A` (Slate 900) | Elevated cards, tables, modals |
| `--border` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | Dividers, card strokes, subtle grids |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Primary headers, high-emphasis text |
| `--text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Metadata, metric captions, tooltips |

### Semantic Feedback Tokens
- **Positive / Purchase Conversion**: `#10B981` (Emerald 500), Background: `#ECFDF5` / `#064E3B`
- **Warning / Moderate Intent**: `#F59E0B` (Amber 500), Background: `#FFFBEB` / `#78350F`
- **Negative / Bounce Friction**: `#EF4444` (Red 500), Background: `#FEF2F2` / `#7F1D1D`

### Categorical & Segmentation Palette (Colorblind-Safe)
A consistent 5-color palette applied across all charts, models, and segments:
1. `#2563EB` (Cobalt Blue) — Segment 0 / Primary Model
2. `#0D9488` (Teal) — Segment 1 / Challenger Model
3. `#D97706` (Amber) — Segment 2 / Secondary Metric
4. `#7C3AED` (Violet) — Segment 3
5. `#DB2777` (Rose/Pink) — Segment 4

---

## 3. Typography & Spacing Scale

### Typography
- **UI & Display**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Numerical Data & Code**: `JetBrains Mono` with `font-variant-numeric: tabular-nums`
- **Scale**:
  - Display: `36px` - `48px`, Weight: `800`
  - H1: `24px` (`text-2xl`), Weight: `800`
  - H2: `18px` (`text-lg`), Weight: `700`
  - Body: `14px` (`text-sm`), Weight: `400 / 500`
  - Caption / Metadata: `11px` - `12px` (`text-xs`), Weight: `600`

### Spacing & Elevation
- **Grid Scale**: 8px baseline (`0.5rem = 8px`, `1rem = 16px`, `1.5rem = 24px`)
- **Border Radius**: Cards: `16px` (`rounded-2xl`), Buttons/Badges: `8px` (`rounded-lg`)
- **Shadows**: Soft atmospheric drop shadow `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`

---

## 4. Component Inventory
1. **`AppShell`**: Collapsible responsive navigation sidebar, mobile sheet drawer, top header with backend health status pill, theme switcher, and command palette (`⌘K`).
2. **`KpiStatCard`**: Quantitative metric summary card with count-up animation on first load, comparative delta pill, and Recharts micro-sparkline.
3. **`Gauge`**: Animated radial probability gauge with calibrated risk tiers (0–35% Bounce Risk, 35–70% Moderate, 70–100% High Intent).
4. **`ChartCard`**: Chart container with title, subtitle, "how to read this" educational tooltip, accessible "View as Table" toggle, and CSV export.
5. **`DataTable`**: Generic high-throughput table with sorting, search filter, pagination, and one-click CSV export.
6. **`CommandPalette`**: Modal quick-search for jumping to any route, running presets, or changing themes via keyboard.
7. **`ErrorState` & `EmptyState`**: Non-blocking friendly states with retry triggers and actionable guidance.
