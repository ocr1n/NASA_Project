# Rights and attribution

## Original project code

This public repository provides source for review. The team has not selected an open-source license for original project code; no additional reuse license is granted here. Third-party code, data and geometry retain the licenses below. NASA resources are context, not endorsement.

## Dependencies

Exact versions are pinned in package-lock.json. Runtime notices include React, Three.js, Ajv, ajv-formats and transitive dependencies under their retained terms; Dexie is Apache-2.0. The build copies the full reviewed license texts and Dexie NOTICE into third-party-notices.html. Development tools and type packages retain their own licenses. Browser binaries and dependencies are not committed. Bahnschrift/Arial are local font fallbacks, not distributed fonts.

## Research data

The [fixture manifest](src/shared/sources/fixtures/manifest.json) records exact URLs, versions, retrieval, byte selections and hashes. PTB-XL+ 1.0.1 (Strodthoff et al., 2023, DOI 10.13026/g6h6-7g88; original paper DOI 10.1038/s41597-023-02153-8) supplies ECGDeli/Uni-G features and definitions. PTB-XL parent 1.0.3 (Wagner et al., DOI 10.13026/kfzx-aw45; original paper DOI 10.1038/s41597-020-0495-6) supplies matching public patient metadata. Both are CC BY 4.0; the [complete source license](src/shared/sources/fixtures/LICENSE-PTB.txt) is retained. Changes are header/whole-row selection for ECG IDs 1 and 2 only; numeric values are unchanged. Parent, child and method variants remain one acquisition lineage.

PhysioNet platform attribution: Pollard et al. (2026), PhysioNet as a global platform for biomedical research, Nature Health, DOI [10.1038/s44360-026-00096-z](https://doi.org/10.1038/s44360-026-00096-z). Source/parent/publication/license links appear in the product and [DATA_SOURCES](docs/DATA_SOURCES.md). No proprietary ECG algorithm code or diagnostic statements are imported.

NASA OSDR factual metadata/file listings and original paraphrases of NASA HRP context are attributed and linked. No NASA logos/media or endorsement claim. Assay dataset revision/redistribution rights remain unconfirmed; serum values/ranges are not bundled. UCUM/BIPM and scientific papers are citation references, not copied content or clinical admission. No restricted imaging or original waveform is included. Dataset rights do not select a public license for the project's original code.

## Reference anatomy

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. [Current database terms](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The packed model and GPU batching approach are adapted from [ashemag/human-atlas](https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d), copyright 2026 ashemag, MIT. The complete application license is distributed in `public/atlas/HUMAN-ATLAS-LICENSE.txt`; complete data attribution, upstream simplification/axis changes and reference limitations are in `public/atlas/ATTRIBUTION.md`. This project adds three layer controls, local evidence integration, a generated region manifest and a demand-rendered adapter. Reference proportions are preserved. It is an adult male educational reference, not individual crew anatomy or a diagnostic model. Three.js retains its MIT license in the generated third-party notices.
