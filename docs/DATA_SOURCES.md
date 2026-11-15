# Sources and attribution

NASA resources provide project context; they do not validate this prototype or its fictional alert rules. No private astronaut measurements are bundled.

| Source | Included material | Rights and current use |
| --- | --- | --- |
| Project-authored simulation | Two crew profiles, measurements, references and six input cases | Fictional/demo_only; no clinical admission |
| NASA OSDR OSD-575 | Factual dataset metadata and file listing | Research context only; no assay results or individual wearable measurements |
| NASA Human Research Program | Linked/paraphrased research context | Context, not endorsement or an operational medical protocol |
| PTB-XL+ 1.0.1 | Complete selected ECG-ID 1/2 feature rows and feature definitions | CC BY 4.0; public research namespace only |
| PTB-XL 1.0.3 | Matching public parent metadata | CC BY 4.0; no relabeling as astronauts |
| BodyParts3D 4.0 via Human Atlas | Pinned packed adult-male reference geometry | CC BY 4.0 data; MIT application adaptation; not personalized anatomy |

## Primary sources

- [NASA OSDR](https://osdr.nasa.gov/) and [OSD-575 metadata endpoint](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/?format=json).
- [NASA Human Research Program](https://www.nasa.gov/hrp/).
- Strodthoff et al. (2023), [PTB-XL+ 1.0.1](https://physionet.org/content/ptb-xl-plus/1.0.1/), DOI [10.13026/g6h6-7g88](https://doi.org/10.13026/g6h6-7g88); paper [10.1038/s41597-023-02153-8](https://doi.org/10.1038/s41597-023-02153-8).
- Wagner et al., [PTB-XL 1.0.3](https://physionet.org/content/ptb-xl/1.0.3/), DOI [10.13026/kfzx-aw45](https://doi.org/10.13026/kfzx-aw45).
- [Pinned Human Atlas source](https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d), [official BodyParts3D terms](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).

Exact source URLs, retrieval dates, hashes and excerpt selections: [source manifest](../src/shared/sources/fixtures/manifest.json). The ECG fallbacks are public clinical feature data; the reviewed NASA material does not provide a matching ready-to-import individual numerical ECG report for this path.

Full retained terms and adaptations: [NOTICE](../NOTICE.md), [PTB license](../src/shared/sources/fixtures/LICENSE-PTB.txt), [anatomy attribution](../public/atlas/ATTRIBUTION.md), [Human Atlas MIT terms](../public/atlas/HUMAN-ATLAS-LICENSE.txt), [asset pin/hashes](../public/atlas/provenance.json).

Original source files are unchanged; excerpting selects headers and complete rows. Methods from one ECG acquisition do not constitute independent corroboration. Real compatible historical cohort comparisons remain unadmitted; the historical arithmetic example is synthetic.

## Source selection

The retained NASA-first review covered CIPHER, Inspiration4/OSDR, NTRS cardiovascular research, HRP and exercise resources. These provided study context, imaging protocols or laboratory metadata; the reviewed files did not establish a ready-to-import individual PR/QRS/QT feature report. PTB-XL+ was selected as a bounded, openly licensed numerical-report demonstration. This is a gap in the reviewed path, not a claim that NASA has no ECG data. It does not justify assigning public patient records to astronauts.
