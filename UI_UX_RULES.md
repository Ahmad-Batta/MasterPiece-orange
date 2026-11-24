# UI/UX Design System & Strict Guardrails

You MUST follow every rule in this document across all pages and components. Do NOT improvise colors, spacing, or component styles outside these specifications.

## 1. Strict Color System (Zero Deviation)
- **Primary Brand Color:** `#2B362E` (Deep Forest Charcoal) — Primary buttons, active navigation items, main headings, and key brand elements.
- **Accent Color:** `#A37E5E` (Warm Bronze) — Highlighted keywords, secondary CTAs, progress bars, AI score rings, and active focus borders.
- **Canvas Background:** `#FAF9F5` (Warm Alabaster) — Main background for all pages.
- **Card / Surface Background:** `#FFFFFF` — Elevated cards, modals, dropdowns, and form containers.
- **Border Color:** `#E5E2DC` (1px solid) — Subtle warm divider for cards, inputs, and tables.
- **Text Hierarchy:**
  - Headings: `#1E2620`
  - Body text: `#4A544D`
  - Muted / Captions / Placeholders: `#7A827C`
- **Semantic Status Colors (ONLY for badges/alerts):**
  - Success / Verified / High Match (≥75%): Text `#15803D`, Bg `#F0FDF4`, Border `#BBF7D0`
  - Warning / Pending / Medium Match (50–74%): Text `#8E6B4D`, Bg `#F5EFEA`, Border `#E6D7C8`
  - Error / Rejected / Low Match (<50%): Text `#B91C1C`, Bg `#FEF2F2`, Border `#FECACA`
- **STRICT PROHIBITION:** Never use default Tailwind `blue-*`, `indigo-*`, `purple-*`, or `gray-*` classes. Use the exact hex palette above.

## 2. Layout, Grid & Spacing (8pt Grid System)
- **Spacing Scale:** Every margin, padding, and gap MUST be a multiple of `4px` (`gap-2`, `gap-4`, `gap-6`, `gap-8`, `p-4`, `p-6`, `p-8`). Never use arbitrary pixel values like `mt-[13px]`.
- **Container Width:** Max content width `max-w-7xl mx-auto` with horizontal padding `px-4 sm:px-6 lg:px-8`.
- **Whitespace Rule:** Maintain at least `24px` (`gap-6`) between cards and `32px–48px` (`mb-8` to `mb-12`) between major page sections. Never crowd elements.
- **Card Architecture:** Standardize all cards to `bg-white rounded-xl border border-[#E5E2DC] p-6 shadow-sm`.

## 3. Typography & Visual Hierarchy
- **Font Family:** `Plus Jakarta Sans` or `Inter` (loaded cleanly in `index.html`).
- **Type Scale (Strict):**
  - Page Hero Title: `text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2620]`
  - Section Heading (H2): `text-xl sm:text-2xl font-semibold text-[#1E2620]`
  - Card Title (H3): `text-base sm:text-lg font-semibold text-[#1E2620]`
  - Body Copy: `text-sm sm:text-base leading-relaxed text-[#4A544D]`
  - Metadata / Labels / Badges: `text-xs font-medium tracking-wide`
- **Readability:** Limit paragraph line length to `max-w-prose` (`65ch`) so text blocks never stretch awkwardly across wide screens.

## 4. Interactive Elements & Component States
Every clickable or interactive element MUST define all 4 states:
1. **Default:** Clear visual affordance (`cursor-pointer`, consistent height `h-10` or `h-11` for buttons and inputs).
2. **Hover:** Subtle transition (`transition-colors duration-150`), e.g., Primary button `#2B362E` -> `#1F2822`; Secondary button `#A37E5E` -> `#8E6B4D`.
3. **Focus (Accessibility):** Visible keyboard focus ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2`).
4. **Disabled / Loading:** `disabled:opacity-50 disabled:cursor-not-allowed`, plus an inline spinner icon during async API calls (prevent double submissions).

## 5. Forms & User Input UX
- **Labels:** Always place visible `<label>` elements above inputs (`mb-1.5 text-sm font-medium text-[#1E2620]`). Never rely solely on placeholders as labels.
- **Validation:** Show clear inline error messages directly below the invalid field in `#B91C1C` (`text-xs mt-1`), and highlight the input border in `#B91C1C`.
- **Input Styling:** `w-full h-11 px-3.5 rounded-lg bg-white border border-[#E5E2DC] text-sm text-[#1E2620] focus:border-[#A37E5E]`.

## 6. Feedback, Empty States & Responsiveness
- **Loading States:** Use skeleton placeholders (`animate-pulse bg-[#E5E2DC]/60 rounded-lg`) matching the layout shape instead of blank screens or generic full-page spinners.
- **Empty States:** Every table or list must handle 0 items gracefully with a centered icon, clear explanation, and one primary action button (`bg-[#2B362E] text-white`).
- **Toast Notifications:** Trigger non-intrusive toast feedback for every create, update, delete, or error action.
- **Mobile-First Responsiveness:** Zero horizontal scrolling at `375px` width. Tables must wrap in `overflow-x-auto` or collapse into stacked cards on mobile screens.
- **Iconography:** Use `lucide-react` exclusively with uniform stroke width (`strokeWidth={1.75}`) and consistent sizing (`w-4 h-4` inside buttons, `w-5 h-5` in navigation).
