# Submission verification

The public submission is prepared as a fresh source snapshot with its own Git history. Private planning documents, reference images, credentials, browser profiles, dependencies and build output are excluded. Original planning inputs remain in the local archive.

Observed on 15 November 2026 in the fresh submission folder (Node.js 24.20, Windows, Chromium):

| Check | Result |
| --- | --- |
| Fresh locked dependency install | Pass |
| Unit suite | 425/425 tests across 29 files |
| Browser suite | 22/22 scenarios, 4.4 minutes |
| Production build, generated contracts and TypeScript | Pass |
| Source fixtures | Seven pinned hashes and 10/10 source tests pass |
| Generated dictionary | 73 definitions, 47 metrics; no drift |
| Published local links and pinned anatomy hashes | Pass |

The production build retains a chunk-size warning: the main script is about 1.11 MB minified / 288 kB gzip, with a separate 565 kB / 140 kB gzip renderer. Geometry requires approximately 33 MB of compressed assets on the initial load. Preload the atlas before recording.

Reproduce the checks with:

```sh
npm ci
npm test
npm run build
npm run sources:verify
npm run docs:dictionary -- --check
node scripts/verify-public.mjs
npx playwright install chromium
npm run test:browser
```

Browser checks cover Chromium on Windows, including capture, crew isolation, references, ECG imports, atlas input cases, follow-up/recovery, export/restore and offline reopening. They do not establish clinical accuracy, physical-device performance or compatibility with every browser.
