CRFV internal reference artifacts
=================================

These files were relocated here on 2026-06-16 from `public/crfv/textfiles/`,
where they were being served as static, anonymously-downloadable files under the
web root. They are developer reference material, not web assets:

- databaseschema.txt   - Supabase/Postgres schema reference (context only)
- appscript.txt        - Google Apps Script source for the Sheets integration
- SQLQueries.txt       - reporting SQL query reference
- locationlist.txt     - location reference notes
- textvalidfiles.txt   - internal list of valid input IDs (do not republish)

A separate user-data dump (`mongodbusers.txt`) that contained real names, emails
and bcrypt password hashes was DELETED entirely (P0-1). It still exists in git
history until a history purge is performed; see docs/EXECUTION-TRACKER.md (P0-1).

Do not move these back under `public/`. The static layer now blocks anything in
`/crfv/textfiles/` except the two genuine public assets (the province JSON and the
attendee template). See app/setupCoreMiddleware.js.
