# Architecture

ORBITAL is a local React/TypeScript application built with Vite. Three.js renders pinned reference anatomy; Dexie/IndexedDB stores canonical records in the browser. JSON Schema and its generated TypeScript contracts define one data model.

## Data flow

Input or report → original RawRecord → normalized Observation → explicit personal reference/comparison → versioned fictional Assessment → FollowUpTask and eligible AtlasHighlight → interface.

All writes use the shared repository. Capture, numerical report adapters and scripted demos retain original units, times, method/context and source links. Transactions enforce ownership, revisions, immutable evidence and atomic retries. Public research and fictional crew data use separate namespaces.

## Code map

| Path | Responsibility |
| --- | --- |
| src/shared/contracts | Canonical schema, generated types and cross-record evidence |
| src/shared/capture | Common numeric/time validation and report adapters |
| src/shared/baselines and trends | Explicit reference calculations and descriptive comparisons |
| src/shared/rules | Typed fictional rules, eligibility and episode/task lifecycle |
| src/shared/scenarios | Strict demo inputs and atomic walkthrough steps |
| src/shared/repositories | Memory/IndexedDB persistence, graph validation and snapshots |
| src/shared/view-models | Crew-scoped selectors, drafts, progress and log derivation |
| src/features | Overview, forms, charts, atlas, reports, findings and source panels |
| public/atlas and public/demos | Attributed model assets and editable fictional inputs |

The atlas renders shared findings; it performs no physiological inference. It merges packed geometry into batches, uses per-structure GPU state, pauses offscreen drawing and disposes owned resources. Visited UI tabs stay mounted to retain drafts and geometry.

## Boundaries

Unknown data is explicit. Reference methods and acquisition contexts are not silently mixed. Task completion does not establish recovery. Recorded progress is not a health score. No server, synchronization or live sensor is required. [Validation](DATA_VALIDATION.md) · [Atlas](ATLAS.md).
