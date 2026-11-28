# CAREERhub UI/UX Design System

These rules are mandatory across every frontend page and component. Keep the public app warm, editorial, accessible, and consistent in both English (LTR) and Arabic (RTL). Do not invent additional palettes, spacing scales, or component styles.

## 1. Surface and Color Discipline

Use the 60-30-10 balance: warm ivory canvas `#FAF9F5` for the page (60%), white surfaces `#FFFFFF` with a subtle `1px solid #E5E2D9` border (30%), and Deep Forest `#2B362E` for the brand, headings, navigation, and primary actions. Body ink is `#1C221E`.

Warm Bronze `#A37E5E` is the final accent (no more than 10% of a view), reserved for AI highlights, Pro badges, small emphasis, and active focus rings. Use semantic muted tones only inside status pills: success/verified `#15803D` on `#F0FDF4` with `#BBF7D0` border; pending/warning `#8E6B4D` on `#F5EFEA` with `#E6D7C8` border; rejected/error `#B91C1C` on `#FEF2F2` with `#FECACA` border.

For secondary copy and placeholders, use the body ink at reduced opacity rather than introducing new hex colors.

Never use default Tailwind `blue-*`, `indigo-*`, `purple-*`, or `gray-*` classes. Do not use purple/blue SaaS gradients or heavy shadows. Cards use `bg-white rounded-xl border border-[#E5E2D9] p-6 shadow-sm`; `shadow-sm` is the maximum shadow strength. Prefer color, border, and whitespace over elevation.

## 2. Type, Numbers, and Reading Width

Load Google Fonts in `index.html`: English uses Playfair Display for display headings, Inter for the landing hero headline, and Plus Jakarta Sans for interface/body text; Arabic uses Cairo for display headings and IBM Plex Sans Arabic for interface/body text and the landing hero. Switch font families with the document language.

- Hero heading: `text-4xl sm:text-5xl font-semibold tracking-tight`.
- Section heading: `text-xl sm:text-2xl font-semibold`.
- Card title: `text-base sm:text-lg font-semibold`.
- Body copy: `text-sm sm:text-base leading-relaxed`.
- Arabic body copy must use at least `line-height: 1.75`.
- Long paragraphs use `max-w-prose` (65–75ch); avoid wide, hard-to-scan text blocks.
- Salaries, percentages, counts, and all dashboard metrics use `tabular-nums`.

## 3. Layout and Spacing

Follow the 8pt rhythm. Use Tailwind spacing utilities in multiples of 4px, favoring `gap-4`, `gap-6`, `gap-8`, `p-6`, and `p-8`. Cards must have at least `p-6`; card grids use at least `gap-6`. Keep `mb-8` to `mb-12` between major sections. Never use arbitrary spacing values.

Content containers use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Job cards show at most four scannable data points: title; company and verified badge when the API confirms verification; location/category; salary or match. Keep card copy concise.

## 4. Shape and Interaction States

Use `rounded-xl` for cards, `rounded-lg` for buttons and inputs, and `rounded-full` for pills. Standard buttons and navigation actions use `h-10` (40px); primary hero CTAs may use `h-11` (44px). Use `px-4` to `px-5` and `text-sm font-medium` for compact actions. Inputs use `h-10` (40px). Keep focus indicators visible and preserve comfortable clickable link areas. Every interactive element defines default, hover, keyboard focus, and disabled/loading states.

For the global navbar, use a compact `h-16` bar with `h-8` navigation and sign-in/sign-up controls, `text-xs` labels, and tight spacing. The language control is a small two-position slider labeled `EN` and `عربي`, with a moving thumb that reflects the active language.

- Hover uses `transition-colors duration-150`; primary hover may use `#1F2822`.
- Focus uses `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2`.
- Disabled controls use `disabled:opacity-50 disabled:cursor-not-allowed`.
- Async buttons show an inline lucide spinner and prevent duplicate submissions.
- Buttons and badges use `whitespace-nowrap` so Arabic labels stay intact.

## 5. Forms and Feedback

Place visible labels above every input. Inputs use `w-full h-10 px-4 rounded-lg bg-white border border-[#E5E2D9] text-sm text-[#1C221E] focus:border-[#A37E5E]`. Auth form cards use `max-w-md p-6`; stack fields with `space-y-3.5`. Show inline validation messages directly below invalid fields and set `aria-invalid`; never rely on placeholders as labels. Validation must use clear text and an accent/error border while preserving the palette rules.

Use layout-matched skeletons (`animate-pulse bg-[#E5E2D9]/60 rounded-lg`) while loading. Lists need a designed empty state with a centered lucide icon, concise explanation, and one primary CTA. Show non-intrusive toast feedback for successful auth/form actions and errors. Do not use generic full-page spinners.

## 6. Bilingual RTL/LTR Rules

The active language is `en` or `ar`. Set `<html lang>` and `<html dir>` to match it. All UI copy, labels, placeholders, validation text, role names, accessibility labels, toasts, and empty/loading states must come from the i18next dictionaries; do not hardcode visible UI strings in components.

Use Tailwind logical utilities only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, and `text-start`. Never use `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, or `text-right`. Flip directional icons in RTL with `rtl:rotate-180`. Use `dir="auto"` for user-entered names, emails, URLs, and other mixed-direction values.

## 7. Responsive Behavior and Icons

Design mobile-first and verify at 375px with no horizontal page scrolling. Collapse multi-column layouts into a single column on small screens. Any table must use `overflow-x-auto` or become stacked cards.

Use `lucide-react` exclusively for interface icons, with `strokeWidth={1.75}`. Use `w-4 h-4` inside buttons and `w-5 h-5` in navigation; larger illustration icons may use a consistent larger square size. Decorative icons are hidden from assistive technology; functional icons have translated accessible labels.

## 8. Atmospheric Photography and Dark Overlays

Use full-bleed professional workplace photography for the landing hero and split-screen authentication visual panel. For the landing hero, use `https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=85`; for authentication, use `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=85`. Always provide a Deep Forest fallback background so the layout and contrast remain usable if an image request fails.

For the landing hero, use this lighter Deep Forest overlay above photography and below text: `linear-gradient(135deg, rgba(22, 29, 25, 0.68) 0%, rgba(43, 54, 46, 0.52) 55%, rgba(22, 29, 25, 0.66) 100%)`. Keep the hero photo full-viewport so it remains the dominant visual. Authentication photography may retain the darker overlay. Ivory `#FAF9F5` headlines and Warm Bronze `#A37E5E` accents may sit on the dark overlay. Translucent highlights may use `bg-white/10 backdrop-blur-md border-white/15`; keep them restrained, readable, and separated from the background. This photo treatment is a deliberate exception to the standard white-card surface rule and must not introduce blue or purple gradients.

## 9. Motion and GSAP Boundaries

Install and use `motion` from `motion/react` for floating hero badges, card hover elevation, modal/alert transitions with `AnimatePresence`, and tactile button tap/hover feedback. Keep these effects subtle and use vertical (`y`) and opacity movement so layouts mirror naturally in RTL.

Use `gsap` with `ScrollTrigger` for the hero photo's slow scale/parallax drift, the staggered hero text/CTA entrance, scroll-triggered section reveals, and numeric counters. Put GSAP setup inside `useEffect`, scope it with `gsap.context()` to a page root ref, and call `context.revert()` during cleanup. Do not let Motion and GSAP animate the same DOM node: assign a node to one animation system only.

Respect `prefers-reduced-motion`: disable or simplify non-essential movement, while preserving content visibility, focus indicators, and usable controls. Avoid horizontal motion and layout shifts; keep all animation labels and status copy translated in both dictionaries.

## 10. Expressive Iconography, Restrained Color Accents & Custom Uploads (Seeker & Company Standard)

- **Large tinted icon containers in moderation.** Use a single focal `w-12 h-12` or `w-14 h-14 rounded-2xl` badge per onboarding choice, feature highlight, KPI card, or empty state. Use `w-6 h-6` to `w-7 h-7` Lucide icons at stroke width 1.75. Prefer bronze (`bg-[#A37E5E]/[0.12] text-[#A37E5E]`) or olive (`bg-[#2B362E]/10 text-[#2B362E]`). Restrained emerald or amber tints are reserved for semantic status badges. Keep compact action and navigation icons at their existing sizes.
- **Custom upload controls.** Hide the native file input behind a keyboard-operable dashed dropzone. Include a large upload badge, a bilingual prompt and format/size hint, and a selected-file chip with a labelled remove button. Keep validation feedback next to the control and preserve the existing upload limits and submit behavior.
- **Balanced cards.** Use `flex flex-col justify-between` on equal-height choice or feature cards so actions align at the bottom. Use quiet category or AI pills where they help users distinguish paths, and subtle border or `shadow-sm` hover transitions.
