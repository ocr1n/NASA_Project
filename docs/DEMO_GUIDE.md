# Demo guide

## Atlas walkthrough

1. Overview → below the Flight log → Demo scenarios → Choose a demo file.
2. Load **Bone change** or **Muscle change**; each opens an independent local copy.
3. Open Atlas, inspect the indicated region and optionally isolate it. Amber marks a fictional warning; teal marks selection.
4. Return to Overview. Confirm site/side and acquisition details and enter the fictional astronaut's notes.
5. Record a response only to show it cannot establish recovery. Apply the next scripted reports to show task completion separately from the recovery condition.

[Editable files and detailed input format](../public/demos/README.md).

| File | Expected demonstration |
| --- | --- |
| bone-change.json | Sustained reported left-femur change, prompt and subsequent recovery steps |
| muscle-change.json | Reported left-biceps change on the muscular layer |
| bone-uncertain.json | Unknown/poor quality prevents an automatic highlight |
| bone-single-reading.json | Watch/repeat prompt; one sample cannot sustain an atlas warning |
| bone-recovery.json | Retained warning history with completed fictional recovery |
| systemic-change.json | Systemic heart-rate change without an organ highlight |

## Public ECG sample

Sources → Public ECG report import → select **Uni-G** → Preview ECG import. The compatible public excerpt is already bundled.

To demonstrate file upload, expand **Choose other licensed PTB CSV excerpts** and load [UPLOAD_THIS_UniG_ECGs.csv](../DEMO_ECG_UPLOAD/UPLOAD_THIS_UniG_ECGs.csv) as the ECG feature CSV. Keep the matching parent/description defaults. Preview → Inspect fields for ECG 2 → Import selected ECG reports.

| ECG | Heart rate | PR | QRS | QT |
| --- | --- | --- | --- | --- |
| 1 | 63 /min | 142 ms | 86 ms | 410 ms |
| 2 | 47 /min | 156 ms | 84 ms | 416 ms |

These are imported published features, not values extracted by this app from a waveform. No diagnosis or automatic organ finding is produced. Research records stay separate from crew histories.

## Recording

Use [the three-person, 30-second script](../DEMO_SCRIPT.md). Capture short clips in advance, preload the atlas and edit cuts between screens. Keep **Research prototype · fictional, time-compressed replay** visible. The app's own source/quality labels should remain visible when demonstrating real research imports.

Offline reopening requires a production build and an initial online installation. Export local data to keep an independent recovery copy; browser storage can be cleared or evicted.
