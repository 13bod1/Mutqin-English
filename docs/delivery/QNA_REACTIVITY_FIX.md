# Q&A reactive feed and client guard correction

Original computed subscribed to an RxJS stream without any signal dependency, permanently caching the original question list. It also retained an undisposed subscription. Replaced with toSignal and automatic Angular destruction cleanup. Guest submission no longer invents random identities; client moderation entry requires a staff role. Single cooldown interval is cleared on replacement and component destruction.

Actual external diagnostic imports the production component and LiveQnaService, instantiates under Angular injection context and checks7/7 cases: creation, initial list, reactive submission, guest rejection, nonstaff moderation rejection, staff approval and lifecycle timer cleanup. First harness attempt called a mocked DestroyRef instead of actual environment injector; correcting teardown to injector.destroy passed the unchanged cleanup assertion. This was a harness lifecycle correction, not a hidden product PASS.

Final BuildPASS, Unit173/173, E2E21/21, controlled browser behaviors25/25; zeroskips. Existing repository tests unchanged for this fix. Source-only client guards do not resolve AG143 backend moderation/privacy gap. Real server RBAC/ratelimiting/persistence still required; do not close the entire security bug from this fix.
