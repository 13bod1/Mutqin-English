# Sprint 3 Review/UAT — instructions, not executed acceptance

Facilitator prepares isolated accounts (teacher, assistant, two students, guardian), source revision and synthetic records. Do not supply invented login addresses. PO follows user-facing steps only. Facilitator handles network throttling, clocks, API inspection, fixtures and cleanup. Record PASS/FAIL/BLOCKED with exact evidence; no prefilled human signatures.

| Story | User-facing steps | Expected acceptance | Current gate |
|---|---|---|---|
|AG46 live|Teacher opens authorized live studio, starts broadcast; students join; stop and view recording|Actual media, delay<10s, recovery, archivewithin30min|BLOCKED: client simulator is not media backend|
|AG47 push|Student opts in; Admin publishes; student taps notification; test denial/revoke|Real deliverywithin1min, correct destination, bilingual, no failure on denial|BLOCKED: fake subscription/local notifications|
|AG48 reconciliation|Admin opens /admin/payments, reconciliation tab; use synthetic receipt; inspect discrepancy/refund|Gateway matched ledger, no duplicate refund, authorized audit|Local walkthrough only; no real gateway acceptance|
|AG94 protection|Student plays authorized lecture; facilitator tests copied/expired link and seconddevice|Server denial/DRM on supporteddevices, watermark, single session|BLOCKED: browser hashing/localstorage not trusted enforcement|
|AG95 Q&A|Open /live/:id, Q&A tab; view bilingual rules; submit one sample; staffapprove/hide/answer|Pending isolation and15scooldown across actual distinctusers|Client checks only; real server/multiuser acceptance unproven|
|AG96 guardian|Open /guardian/report/:token for isolated issuedreport; facilitator tests expired/tamperedtoken|Only intendedstudent,7dayexpiry, realweeklyjob/adminswitch|Client sample lookup only; no serverprivacyacceptance|

AG123 content is independent: verify each language's rules under60words, respect/on-topic/no-personal-data, exactly five synthetic English-lesson questions. Sample questions are prompts, not real student posts. AG135 finished-story gallery only includes genuinely accepted stories; local WIP captures remain separate.

## Execution record
Actual person executing PO review: NOT RECORDED. Date/time: NOT EXECUTED. QA Lead review: PENDING. ScrumMaster review: PENDING. PO feedback/new backlogitems: only record after a real session, never fabricate.
