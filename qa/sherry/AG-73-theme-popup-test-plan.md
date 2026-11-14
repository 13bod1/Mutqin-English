# IEEE 829 Test Plan: Theme Options, Popup & WCAG Accessibility (AG-73)
**Issue Key:** AG-73  
**Parent Story:** AG-43 (PBI-15: Themes & Main Page Popup)  
**Assigned QA Engineer:** Sherry Hany (`sherryhany`)  
**Standard Authority:** IEEE Std 829-2008 & W3C WCAG 2.1 Level AA  
**Estimated Effort:** 6h  

---

## 1. Test Items & Architectural Scope
1. Site Theme Model: `src/app/core/models/admin.ts` (`SiteTheme`, `AcademySettings`)
2. Admin Settings Interface: `src/app/features/admin/settings.page.ts`
3. Landing Page Hero & Shell: `src/app/features/landing/landing.page.html`, `src/app/shared/layout/shell.component.ts`
4. Popup State Management: `sessionStorage` / `localStorage` dismissal flags

---

## 2. Test Approach & Verification Matrix
- **Production Server & Cross-Browser Suite:** Production Angular build served locally on free port 4285. Audited across Chromium 156.0.8078.4, Firefox 157.0, and WebKit 27.2 (Playwright Windows WebKit engine build, with explicit disclosure that it is not Apple Safari on macOS/iOS).
- **WCAG AA Compliance Testing:** Computed real rendered foreground color vs background color from live DOM using the relative luminance formula $(L_1 + 0.05) / (L_2 + 0.05)$. Evaluated normal text against the $\ge 4.5:1$ threshold and large headings ($\ge 24\text{px}$ or bold $\ge 18.66\text{px}$) against the $\ge 3.0:1$ threshold.
- **Popup Lifecycle Testing:** Tested admin settings configuration, header notification banner rendering, banner dismiss click, and disabled state. Audited landing page DOM (`landing.page.html`) for dedicated modal dialog component.
- **Mobile Responsive Layout:** Verified rendering and zero horizontal scrolling on 360px x 740px mobile viewport across all three browser engines.

---

## 3. Test Cases Ledger & Executed Findings

| Test ID | Test Objective | Target Component | Criteria / Standard | Real Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-THEME-01** | Theme Application & Reload Hydration | `AdminSettingsPage` (`/admin/settings`) | Root `data-theme` attribute & storage update on reload | Dark mode toggles in session, but persisted theme is not hydrated on page reload (`themeAfterReload: null` in Chromium/WebKit). Normalized status: FAIL (not PASS_WITH_FALLBACK). | FAIL |
| **TC-THEME-02** | Text Contrast (WCAG AA) | Sampled DOM elements on Landing Page | Normal text $\ge 4.5:1$, Large text $\ge 3.0:1$ | Computed ratios on 5 sampled baseline elements: `h1` (48px bold): **14.63:1**; `h2` (36px bold): **15.35:1**; `p` (18px regular): **8.91:1**; `.btn-primary`: **11.32:1**; footer: **5.57:1**. Evaluated ONLY on sampled baseline colors, NOT all theme permutations. | PASS (SAMPLED BASELINE ONLY) |
| **TC-POP-01** | Landing Popup Banner & Dismissal | `LandingPage` (`/`) | Header banner renders message, on/off control, and dismisses on click | Header banner renders message and controls, but Chromium dismissal failed (`bannerGoneAfterDismiss: false`). Normalized status: FAIL (not pass). Demanding dedicated modal dialog component is an invented requirement (not mandated by AG-43 AC). | FAIL |
| **TC-POP-02** | Popup Disabled State | Settings `popupMessage.enabled = false` | Zero banner/popup rendered | Verified on reload; all notification text absent from DOM. | PASS |
| **TC-RESP-01** | Mobile 360px Viewport | Landing Hero & Admin Settings | Zero horizontal scroll (`scrollWidth <= clientWidth`) | Verified on 360px viewport across Chromium, Firefox, WebKit. No overflow. | PASS |

---

## 4. Defect Report & Jira Synchronization
- **Jira Defect Key:** **AG-90** (Adjudicated & Updated)  
  **Summary:** BUG: Persisted theme not hydrated on reload & top banner dismissal observed false [AG-73]  
  **Type:** Bug (Issue Type ID 10041) | **Link:** Relates to AG-73  
  **Finding Details (Authoritative Adjudication):**
  1. Theme Reload Persistence Failure: Persisted theme in storage is not hydrated on page reload (`themeAfterReload: null` under Chromium and WebKit). Normalized status: FAIL (not PASS_WITH_FALLBACK).
  2. Banner Dismissal Failure: Top notification banner dismissal observed false under Chromium (`bannerGoneAfterDismiss: false`). Normalized status: FAIL (not pass).
  3. Invented Requirement Clarification: AG-43 / AG-54 AC explicitly specifies an admin-controlled popup message appearing on the main page with on/off control, dismissibility, and mobile support. The AC does NOT mandate a dedicated centered modal dialog component. Demanding a dedicated popup modal was an invented requirement; the top notification banner satisfies the message display and control requirement once reload hydration and Chromium dismissal are resolved.
- **Theme Bootstrap Caveat:** `AdminService` initializes `activeTheme` signal from storage, but does not execute `document.documentElement.setAttribute('data-theme', theme)` during bootstrap; attribute is only set upon invoking `saveSettings()` or `saveTheme()`.
- **Status & Tracking:** Issue AG-73 remains strictly **In Progress** (per Immutable Tests Law, cannot transition to Done while landing modal popup is missing). Original estimate filled in Jira: **6h** (zero worklogs added).
- **Execution Receipt & Screenshots:** Saved to `sherry/runtime/theme_announcements_receipt.json` and `sherry/runtime/screenshots/` (15 browser captures).
