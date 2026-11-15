# Ready-to-upload public ECG feature sample

Source: PTB-XL+ 1.0.1, Strodthoff et al., PhysioNet, https://physionet.org/content/ptb-xl-plus/1.0.1/ ; DOI https://doi.org/10.13026/g6h6-7g88 . CC BY 4.0; full terms in LICENSE-PTB.txt. The two complete ECG-ID 1/2 rows are unchanged copies of the repository's pinned public-source excerpts. Matching parent metadata are from PTB-XL 1.0.3. These are public clinical research examples, not astronaut data.

1. Open the Sources tab in ORBITAL.
2. Find Public ECG report import.
3. Set Published ECG feature method to Uni-G.
4. Expand Choose other licensed PTB CSV excerpts.
5. For ECG feature CSV, select UPLOAD_THIS_UniG_ECGs.csv.
6. Leave parent/description on their matching bundled defaults (or choose the matching files in this folder).
7. Click Preview ECG import, then Inspect fields for ECG 2.
8. Select the records you want and click Import selected ECG reports.

Expected published values:

| ECG | Heart rate | PR | QRS | QT |
| --- | --- | --- | --- | --- |
| 1 | 63 /min | 142 ms | 86 ms | 410 ms |
| 2 | 47 /min | 156 ms | 84 ms | 416 ms |

These are already-extracted measurements imported from the dataset. The current app does not analyze ECG images, PDFs or raw waveforms, diagnose a condition, or automatically highlight the heart from this research import. Signal quality and actual examination time remain unknown. Identical prior imports are marked duplicate rather than added twice.

Fastest no-file option: Sources -> select Uni-G -> Preview ECG import uses the same bundled excerpt.

For the separate fictional atlas demonstrations: Overview -> scroll below the Flight log to Demo scenarios -> Choose a demo file -> Load bone change demo / Load muscle change demo. Then switch to Atlas to see the body map.
