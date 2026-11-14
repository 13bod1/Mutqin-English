# Urgent discussion-readiness patch — light-mode demo verified

Stacked on PR #5, which is stacked on PR #4. No automatic merge. Remote main advanced to ac585bfb72e1da595274cd2f421c3efdcbe52b35 and has conflicts with these branches; it was inspected but not overwritten/merged under time pressure. This candidate is NOT a verified integration with latest main.

## Actual fixes
- Register BellOff used by the no-announcements view.
- Distinguish announcement-load failure from an empty successful result.
- Use semantic backgrounds on landing sections and the Madrasetna panel; improve light muted text and footer link readability.
- Reserve popup close-button space and enlarge its touch target to 44×44px.
- Reject malformed platform-stat rows rather than rendering NaN; preserve the existing fallback contract. Fallback marketing data is existing sample content, not verified live statistics.

## Executed verification
- Actual production build: PASS.
- Browser behavior: 25/25 PASS across Chromium/Firefox/WebKit, including popup dismissal, revised popup, disabled popup and empty announcement state.
- Small Android viewport 360×640 and iPhone13-sized viewport 390×844 checked with touch contexts; Firefox supports touch/viewport here, not isMobile emulation. Screenshots recorded. Additional desktop widths 768 and 1280 checked.
- Light-mode contrast sample: zero measured failures across classic/navy/emerald/purple/gold. Gradients/media remain unmeasured; not WCAG certification.
- Dark-mode contrast sample still reports failures and rapid theme transitions may affect sampling. Use LIGHT mode for the discussion. Do not present dark mode as accepted.
- Unit: 132 passed / 6 failed / 0 skipped, total138. E2E:18 passed /3 failed /0 skipped. The three E2E failures still expect the old Mutqin brand; Unit includes four catalog/quiz async failures and two strict-auth fixture mismatches. Tests/assertions unchanged. No weakening of authentication or title gaming.
- Parent probe disproved the worker's speculative Angular Ivy context-binding explanation: the old empty-state text renders after actual settling. No fictional compiler fix was applied.

## Discussion boundary
The download is the ACTUAL exercised production bundle with a loopback static SPA launcher and screenshots. It is not a live backend, standalone authenticated admin demo, production deployment, offline payment system or full task completion. Public content may need connectivity and existing fallback/sample content is not verified business data. No production migrations/auth/payments/SMTP were exercised. Required UAT leadership approvals, official social identities, real HTTP403/IDOR and backend transaction acceptance remain open. PR4/5 unchanged; all assignees preserved.
