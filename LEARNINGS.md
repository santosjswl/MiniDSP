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
- **Testing/deployment:** Behind TLS inspection, Node fails with `SELF_SIGNED_CERT_IN_CHAIN` and supabase-js reports a vague retryable fetch error; set `NODE_USE_SYSTEM_CA=1` rather than disabling TLS verification.
- **Export:** Quote every CSV field *and* prefix `'` to cells starting with `= + - @ \t \r`; quoting alone does not stop spreadsheets evaluating an uploaded filename like `=HYPERLINK(...)`.
- **Testing:** A hidden browser tab never runs animation frames, so React streaming reveals stall on the loading fallback; check `document.visibilityState` before blaming the app.
- **What I'd do differently:**
