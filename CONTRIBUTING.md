# Contributing

Use Node.js 24 and the committed npm lockfile. Run npm ci, npm test and npm run build before proposing changes. For UI changes, install Chromium with npm exec playwright install chromium and run npm run test:browser.

Use shared schemas, metric/unit definitions, repositories and selectors. Preserve source content, units, time precision, namespace/crew isolation and explicit missing states. Do not introduce medical limits, diagnoses or operational rules through a UI or fixture change.

Generate contracts with npm run generate and the dictionary with npm run docs:dictionary. Update source attribution when adding data or assets. Tests must run from a fresh checkout; do not depend on unpublished Git objects, local browser data or credentials.

Small focused pull requests should describe the behavior changed, relevant validation and any remaining limits. Original project-code licensing is not yet selected; third-party terms in NOTICE.md remain applicable.
