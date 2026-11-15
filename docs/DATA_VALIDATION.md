# Validation and limits

## Software checks

```sh
npm test
npm run sources:verify
npm run docs:dictionary -- --check
npm run build
npx playwright install chromium
npm run test:browser
```

The build checks generated-schema drift and TypeScript, then creates dependency notices and an offline asset manifest. Browser tests cover actual tab navigation, capture, import, crew isolation, storage failures/retries, export/restore, atlas/demo lifecycle and offline reopening. The legacy compatibility fixture makes these checks independent of private Git history.

## Data gates

- Numeric values, units, reported time precision and required acquisition context are validated through shared contracts and registry.
- Original source content and hashes are retained. Stable identities prevent duplicate imports; changed content under an existing identity is preserved as a conflict.
- Missing, skipped, failed, unknown-quality and partial-date measurements remain explicit. Charts do not invent values or bridge excluded gaps.
- A personal comparison needs an explicit compatible reference. Fixed preflight, exam anchor and rolling mission windows remain distinct.
- Fictional localized warnings require compatible reported sites, adequate declared demo quality, multiple independent acquisitions and persistence. Generic systemic signals cannot claim an injured organ.
- Follow-up answers alone cannot clear a finding. The configured recovery evidence is evaluated separately from completing a task.
- Scripted repeat input, answer, clock, assessment and highlight changes commit atomically; rollback/retry is tested against IndexedDB.

## Interpretation boundary

The bone/muscle examples use authored 10% change and 5% recovery parameters. These and quality/support counts are software fixtures, not medical thresholds or a physiological recovery schedule. No operational rule, diagnosis, risk probability or clinical validation is claimed. Public PTB records have unknown signal quality/actual acquisition times and remain research-only. [Sources](DATA_SOURCES.md).
