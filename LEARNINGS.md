# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

- **Planning:**
- **Detection:** Consume complete formatted-number runs before validating length; otherwise regexes can accept partial phone or card matches.
- **Detection:** Consume optional suffixes before validating them; otherwise a malformed NINO can be accepted as a shorter, valid-looking partial match.
- **Security/persistence:** A generic “contains an asterisk” database check does not guarantee a masked example; enforce a type-specific masked shape at the persistence boundary.
- **Security/persistence:** Verify the *live* schema with a real negative test; a corrected migration file proves nothing if an older revision was applied.
- **Security/persistence:** A negative test against a weak schema can itself persist the bad value; apply the fix before rerunning, and plan cleanup for rows earlier runs left behind.
- **Security/persistence:** A negative test that writes a "should be rejected" value leaks that value whenever the guard is missing; use synthetic values only and plan cleanup.
- **UI:** Refresh stored history after a successful scan instead of incrementing optimistic counters; keep the saved result visible and report a failed refresh separately.
- **UI:** Fixed-layout tables need a token-sized inner canvas and a scrollable wrapper on mobile; shrinking six columns into the viewport hides useful masked examples.
- **UI:** When a reference calls for primary app navigation, use the documented Lepide Sidebar anatomy and keep dashboard charts/totals derived from stored records rather than decorative placeholders.
- **Testing/deployment:** Behind TLS inspection, Node fails with `SELF_SIGNED_CERT_IN_CHAIN` and supabase-js reports a vague retryable fetch error; set `NODE_USE_SYSTEM_CA=1` rather than disabling TLS verification.
- **Export:** Quote every CSV field *and* prefix `'` to cells starting with `= + - @ \t \r`; quoting alone does not stop spreadsheets evaluating an uploaded filename like `=HYPERLINK(...)`.
- **Testing:** A hidden browser tab never runs animation frames, so React streaming reveals stall on the loading fallback; check `document.visibilityState` before blaming the app.
- **UI:** Set `box-sizing: border-box` globally; `inline-size: 100%` plus padding silently overflows. Verify with `scrollWidth <= innerWidth` at 390px, not by eye. Never put a Card inside another bordered panel. Things that must wrap on mobile belong in a layout row, not a component's internal slot.
- **UI/routing:** Give each sidebar item its own route with its own server-side session check. Shared `loading.tsx`/`error.tsx` must derive the active item from the pathname. Streamed HTML contains both the loading fallback and the page, so assert on the *set* of active hrefs. Signed-out pages stream 200 + `NEXT_REDIRECT`, not 307.
- **What I'd do differently:**
