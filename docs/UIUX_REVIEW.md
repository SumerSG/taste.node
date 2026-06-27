# taste.node — Frontend UI/UX Review

**Date:** 2026-06-27
**Scope:** `web/src/` — React 19 + Vite + Tailwind v3 SPA
**Method:** Static source review + interaction flow tracing; no live user testing.

---

## Executive Summary

The frontend is visually cohesive and well-branded. The Tailwind token system (`sienna`, `olive`, `cream`, `ink`) is thoughtfully extended and applied consistently. Component-level craft is high — inputs have focus rings, cards have meaningful hover states, and the chat concierge has personality.

However, there are **structural UX gaps** that will compound as real users onboard: navigation traps when deep-linked into venues/profiles, missing affordances for undo and error recovery, accessibility holes in keyboard navigation and screen-reader support, and several mobile breakpoints that will frustrate thumb-reachers. The vibe-coding is visible in duplicated logic, inconsistent empty-state depth, and unchecked assumptions about user context.

Severity key: 🔴 = Fix before any public link, 🟡 = Fix before beta, 🟢 = Polish

---

## 1. Navigation & Information Architecture

### 1.1 No wayfinding breadcrumbs or back-stack memory
**Evidence:** `App.tsx` lines 104–148. The app uses tab-state (`feed` | `search` | `profile` | `ranking`) plus two overlay states (`selectedVenue`, `viewingProfileUserId`). Back navigation is either `setSelectedVenue(null)` or `setViewingProfileUserId(null)`, which always returns to the *current tab*, not the previous view.

**Impact:** If a user is on Feed → clicks a post author → clicks a venue inside that profile → hits Back, they land on Feed, not the author's profile. The mental model breaks.

**Recommendation:** Replace the two booleans with a lightweight history stack, or at minimum add a `previousView` field so Back returns to the logical parent.

### 1.2 Tab label inconsistency
**Evidence:** `Layout.tsx` line 46: tabs are labeled "Feed", "Search", "Profile", "My Ranking". But the "Search" tab contains both a chat concierge *and* a results grid. "Profile" is actually a library/settings view, not a social profile.

**Impact:** New users will hunt for "Library" or "Discover"; "Search" under-describes the AI concierge.

**Recommendation:** Rename "Search" → "Discover" or split into "Chat" and "Browse". Rename "Profile" → "Library" to match its actual content.

### 1.3 Global search bar is orphaned from Search tab
**Evidence:** `Layout.tsx` lines 143–160. The sticky header has a persistent "Describe what you're craving…" input. Submitting it switches to the Search tab and seeds the chat. But there is no visual connection between this bar and the tab — they look unrelated.

**Impact:** Users may type into the global bar expecting a traditional text search, then be surprised when a chat panel opens.

**Recommendation:** Give the global search bar a concierge avatar or "taste" label, or merge it into the Search tab header so the relationship is spatial.

### 1.4 Cluster banner dismissal is permanent per session
**Evidence:** `Layout.tsx` lines 165–178. The cluster banner uses `useState(true)`; dismissing it is lost on refresh, but within a session there is no way to restore it.

**Impact:** Users who dismiss the banner early lose the primary social proof mechanism.

**Recommendation:** Persist `showCluster` to `localStorage`, or add a small "Show cluster" trigger in the header after dismissal.

---

## 2. Visual Design & Consistency

### 2.1 Overuse of `shadow-elevated` and `shadow-card`
**Evidence:** Nearly every container — FAB menu items, composer, filter drawer, cards, modals — uses a shadow. `index.css` defines three shadow tiers, but in practice almost everything is `card` or `elevated`.

**Impact:** Visual hierarchy flattens; nothing feels specially important because everything lifts.

**Recommendation:** Reserve `shadow-elevated` for true overlays (modals, drawers, FAB). Use flat or `shadow-card` only for primary content cards. The filter sidebar on desktop, for instance, should be flat against the page edge.

### 2.2 Border radius fatigue
**Evidence:** `tailwind.config.js` lines 77–79. Radii are aggressively rounded (`xl: 1rem`, `2xl: 1.25rem`, `3xl: 1.5rem`). Combined with the cream background, the UI can feel "marshmallow" — soft to the point of lacking precision.

**Impact:** Reduced scannability; sharp edges help the eye land. The current design reads as very friendly but slightly unserious.

**Recommendation:** Tighten corners on data-dense elements (table rows, list items in RankingView) to `rounded-lg` or `rounded-xl`. Reserve `rounded-3xl` for hero images and feature cards only.

### 2.3 `chip` vs `chip-active` usage is inconsistent
**Evidence:** `VenueCard.tsx` lines 66–75 uses inline badge styling for price tiers (`tierBadge()`) instead of the established `chip` / `chip-active` utilities. `LibraryView.tsx` line 195 uses an inline `bg-cream` badge for status instead of `chip`.

**Impact:** Minor, but it means a design-system refactor later requires hunting inline classes across components.

**Recommendation:** Centralize all badge/label styling into the `chip`/`chip-active` component layer. VenueCard price tiers should use `chip-active`.

### 2.4 Text size hierarchy bottoms out too small
**Evidence:** Multiple files use `text-[10px]` and `text-[11px]` for labels (`FilterPanel.tsx` headings, `Layout.tsx` cluster pill, `LibraryView.tsx` stat labels). At 11px on a mobile screen, this is near the legibility floor for many users.

**Impact:** Accessibility and readability for anyone over 35 or with vision correction.

**Recommendation:** Establish a minimum body/font size of `text-xs` (`0.75rem` / 12px). Use uppercase + letter-spacing for visual distinction, not size reduction.

---

## 3. Interaction & Feedback

### 3.1 No confirmation on destructive actions
**Evidence:** `LibraryView.tsx` line 180 — the Trash icon on each card calls `handleRemove(item.venue.id)` immediately. `RankingView.tsx` line 116 — same for `onRemove`. `FeedView.tsx` line 150 — post deletion is immediate.

**Impact:** Accidental taps on mobile (thumb-reacher zone) permanently delete user data.

**Recommendation:** Add an `Undo` toast, or a two-step "Hold to delete" pattern, or at minimum an `alert()` confirmation for the first week of user testing. For RankingView, which supports drag-to-reorder, the remove button is dangerously close to the drag handle.

### 3.2 Toast/snackbar system is missing
**Evidence:** The codebase has zero toast infrastructure. Successful follows, venue additions, context creation, and post submissions all happen silently.

**Impact:** Users receive no confirmation that their action worked. This is especially bad for "Add to My Ranking" — the modal closes, but did it save?

**Recommendation:** Add a lightweight toast utility (even `window.alert()` as MVP) for: venue added, post published, context created, follow/unfollow toggled.

### 3.3 Loading states are coarse
**Evidence:** `App.tsx` lines 72–83 — a single fullscreen spinner covers the entire app during boot. `ChatPanel.tsx` lines 95–105 — three bouncing dots for AI typing. No skeleton placeholders anywhere.

**Impact:** The app feels slow on first paint. Images pop in without placeholders (`VenueCard.tsx` line 36 — `loading="lazy"` but no `aspect-ratio` fallback background).

**Recommendation:** Add CSS skeleton loaders for images (shimmer over `bg-cream-dark`). Use `aspect-ratio` containers so layout doesn't shift when images arrive.

### 3.4 Drag-and-drop affordance is weak
**Evidence:** `RankingView.tsx` `SortableRow` (lines 31–121). The drag handle is the entire card. The cursor changes to `cursor-grab`, but there is no visual up/down insertion indicator during drag.

**Impact:** Users may not realize the list is reorderable. On mobile, accidental drags happen frequently because the hit target is the full card.

**Recommendation:** Add a dedicated drag handle icon (six dots) on the left side of each row, and show a hairline drop indicator between rows during drag.

---

## 4. Accessibility

### 4.1 Icon-only buttons lack `aria-label`
**Evidence:** `Layout.tsx` line 122–129 (logout button has `title` but no `aria-label`). `FeedView.tsx` line 150 (delete post — no label). `RankingView.tsx` line 111–112 (reorder chevrons). `VenuePage.tsx` line 80 (external link).

**Impact:** Screen-reader users hear "button" with no context.

**Recommendation:** Audit every icon-only `<button>` for `aria-label`. The `title` attribute is not sufficient — many screen readers ignore it, and touch users never see it.

### 4.2 Modal focus trapping is absent
**Evidence:** `VenueDetailModal.tsx`, `AuthModal.tsx`, and `FabOverlay.tsx` (composer) do not implement focus trapping. The ESC key closes the composer (`FabOverlay.tsx` line 30), but not the detail modal or auth modal.

**Impact:** Keyboard users can tab behind the modal into the main app. Screen-reader users may lose context.

**Recommendation:** Add `useEffect` focus trapping to all modals. Wire `Escape` to close for `VenueDetailModal` and `AuthModal`.

### 4.3 Form label associations are weak
**Evidence:** `VenueDetailModal.tsx` lines 186–193 — the checkbox for "Classic" has a `<label>` but the label text wraps an icon and text without an explicit `htmlFor`. The `radio` / `button` groups for status and occasion lack `role="radiogroup"` and `aria-checked`.

**Impact:** Screen readers may not announce which status is selected in the grid of buttons.

**Recommendation:** Add `role="radiogroup"` and `aria-checked={status === s}` to the status grid. Ensure every input has an associated `<label>` with `htmlFor`.

### 4.4 Color contrast on cluster banner
**Evidence:** `Layout.tsx` lines 166–177 uses `bg-olive-50` (`#f7f5ed`) with `text-olive-600` (`#6e632f`). WCAG contrast ratio is approximately **2.8:1**, below the 4.5:1 threshold for small text.

**Impact:** Low-vision users may not read the cluster label.

**Recommendation:** Darken the text to `olive-700` (`#51481f`) or switch the background to white.

---

## 5. Content & Copy

### 5.1 Chat personality is strong but occasionally vague
**Evidence:** `useChatEngine.ts` lines 23–76. The concierge uses phrases like "Changes the math" and "throw my best recent hits at you." This is charming but may confuse non-native speakers.

**Impact:** The app is targeting Tokyo venues (evidence: Japanese cuisine names in `venues.json` and `mockData.ts`). Many users may be English-as-second-language.

**Recommendation:** Keep personality, but add one explicit sentence per response that states the action taken: *"I found 4 Italian spots under ¥3,000 nearby."*

### 5.2 Empty-state copy is uneven
**Evidence:** `FeedView.tsx` lines 80–103 has rich, contextual empty states per mode. `RankingView.tsx` lines 224–230 has a good empty state. But `LibraryView.tsx` lines 153–158 is generic: "Your library is empty" / "Search for restaurants and save them."

**Impact:** The Library empty state doesn't tell the user *how* to search (which tab? what button?).

**Recommendation:** Add a direct CTA button in the Library empty state: `<button onClick={() => setTab('search')}>Browse restaurants</button>`.

### 5.3 "Classic" feature is unexplained
**Evidence:** `VenueDetailModal.tsx` line 191 — the checkbox label says "Classic" with a `Tag` icon. `index.css` and docs don't explain what "Classic" means. It bypasses time-decay in the similarity engine, but users have no way to know that.

**Impact:** Users will check it because it sounds good, without understanding the data consequence.

**Recommendation:** Add a tooltip or subtitle: *"Classics never decay in your taste cluster."*

---

## 6. Mobile Experience

### 6.1 Thumb-reacher delete buttons
**Evidence:** `RankingView.tsx` line 116 — the trash button is at the far right of each row, directly in the thumb zone for right-handed users. There is no confirmation.

**Impact:** High accidental-delete rate on mobile.

**Recommendation:** Move delete to a swipe action, or add a "Hold to remove" pattern, or require confirmation.

### 6.2 Filter drawer covers results
**Evidence:** `FilterPanel.tsx` lines 452–476. On mobile (`lg:hidden`), the filter drawer slides in from the right at full height and covers the results grid. Users cannot see live filter effects.

**Impact:** Trial-and-error filtering is tedious — open drawer, tap filter, close drawer, check results, reopen.

**Recommendation:** On mobile, collapse the filter into a bottom sheet that shows the top 3 result count, or use a horizontal scrollable chip bar above the grid for the most-used filters (cuisine, price, diet).

### 6.3 Venue card tap targets are small
**Evidence:** `VenueCard.tsx` line 56 — the compact mode uses `onClick` on the whole card. The full mode has a separate `onAdd` button. But in the grid view, cards are dense. `text-xs` badges inside the card are not tappable.

**Impact:** Mis-taps on mobile.

**Recommendation:** Ensure every card has at least `44×44dp` tappable regions. Increase padding on the "Add to My Ranking" button.

---

## 7. Form UX

### 7.1 Venue detail modal allows step-skipping
**Evidence:** `VenueDetailModal.tsx` lines 63–73. The step indicator is clickable — users can jump from "Preview" to "Tell us more" without setting a status or rating. The final `handleAdd()` defaults status to `"want_to_try"` but doesn't surface that default visually.

**Impact:** Users may accidentally save with a status they didn't intend.

**Recommendation:** Disable forward-step clicks until the current step is valid, or default the status visually in Step 2 so users see what they're saving.

### 7.2 Date picker defaults to today
**Evidence:** `VenueDetailModal.tsx` line 19: `const [visited, setVisited] = useState(new Date().toISOString().slice(0, 10));`. If a user is adding a venue they visited last month, they must manually navigate the date picker back.

**Impact:** Data quality suffers because users will skip changing the date.

**Recommendation:** For the MVP, this is acceptable, but add a quick-pick row: "Today", "Yesterday", "Last week", "Custom".

---

## 8. Performance Perception

### 8.1 Image loading without placeholders
**Evidence:** `VenueCard.tsx` lines 36–39, `LibraryView.tsx` line 173, `UserProfileView.tsx`. Images use `loading="lazy"` with no `aspect-ratio` enforced via CSS, and no background-color placeholder.

**Impact:** Cumulative Layout Shift (CLS) as images pop in. This hurts Core Web Vitals.

**Recommendation:** Wrap every `<img>` in a container with `aspect-ratio` and `bg-cream-dark`. Add `object-fit: cover` but ensure the container holds space before load.

### 8.2 `key` prop uses array index in UserProfileView
**Evidence:** `UserProfileView.tsx` (lines with `.map((item, idx) => (`). Using `idx` as `key` when the list is reorderable or filterable is an anti-pattern.

**Impact:** React reconciliation bugs on reorders.

**Recommendation:** Use `item.venue.id` as key.

---

## Prioritized Recommendations

| Priority | Fix | Effort | Evidence |
|---|---|---|---|
| 🔴 **1** | Add `aria-label` to all icon-only buttons | 30 min | `Layout.tsx`, `FeedView.tsx`, `RankingView.tsx` |
| 🔴 **2** | Prevent accidental deletes — add confirmation or undo | 1 hr | `LibraryView.tsx:180`, `RankingView.tsx:116`, `FeedView.tsx:150` |
| 🔴 **3** | Implement focus trapping + ESC-to-close on all modals | 1 hr | `VenueDetailModal.tsx`, `AuthModal.tsx` |
| 🔴 **4** | Fix cluster banner color contrast (`olive-600` on `olive-50`) | 5 min | `Layout.tsx:169` |
| 🟡 **5** | Add toast/snackbar for success actions (add, follow, post) | 2 hrs | Missing globally |
| 🟡 **6** | Add image aspect-ratio containers + placeholder bg | 1 hr | `VenueCard.tsx`, `LibraryView.tsx` |
| 🟡 **7** | Rename "Search" → "Discover" and "Profile" → "Library" | 15 min | `Layout.tsx:44–49` |
| 🟡 **8** | Improve mobile filter UX (bottom sheet or chip bar) | 3 hrs | `FilterPanel.tsx:452–476` |
| 🟡 **9** | Add history-aware Back navigation for venue/profile drill-down | 2 hrs | `App.tsx:94–148` |
| 🟡 **10** | Add quick-pick date shortcuts in venue modal | 45 min | `VenueDetailModal.tsx:19` |
| 🟢 **11** | Consolidate inline badge styling into `chip` utilities | 1 hr | `VenueCard.tsx:66–75` |
| 🟢 **12** | Reduce shadow usage on non-primary surfaces | 30 min | Global |
| 🟢 **13** | Add "How to add" CTA in Library empty state | 15 min | `LibraryView.tsx:154` |
| 🟢 **14** | Explain "Classic" with a tooltip in modal | 15 min | `VenueDetailModal.tsx:191` |
| 🟢 **15** | Tighten border-radius on list items vs cards | 30 min | `RankingView.tsx`, `LibraryView.tsx` |

---

## What I did *not* flag (intentional design choices that work)

- **The cream-on-paper palette** — high warmth, good distinction, brand-appropriate.
- **Chat concierge personality** — distinct, memorable, on-brand.
- **3-step venue capture modal** — excellent progressive disclosure; reduces form anxiety.
- **Card hover animation** (`taste-card::before`) — delightful signature element without being distracting.
- **Filter sidebar on desktop** — correct pattern for complex filtering; only mobile needs rework.
- **Local-first persistence** — appropriate for MVP; the sync-attempt-then-fallback pattern in `api.ts` is sound.

---

*Next step: confirm priority and scope, then implement. I would start with #1–4 (accessibility + safety) as they are low-effort, high-impact, and create no visual regressions.*
