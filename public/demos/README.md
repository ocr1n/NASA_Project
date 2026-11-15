# Atlas demo files

Open the local app and expand **Demo scenarios → Choose a demo file**. Click a named example, or use **Load demo input file** to select one of these JSON files. Loading makes an independent local copy; previous browser data is preserved.

| File | What to demonstrate |
| --- | --- |
| bone-change.json | Two compatible fictional bone-density reports trigger an amber left-femur warning and a follow-up prompt. |
| muscle-change.json | A repeated fictional thickness change reveals/highlights the left biceps on the muscular layer. |
| bone-uncertain.json | Similar values with poor/unknown quality stay unavailable; no automatic bone highlight. |
| bone-single-reading.json | One reading gives a watch/repeat prompt, without a localized alarm. |
| bone-recovery.json | A complete replay retains warning history, completes the repeat task and then clears the highlight after two compatible recovery readings. |
| systemic-change.json | Resting heart-rate change generates a systemic finding and prompt, without coloring an organ. |

For the interactive walkthrough, load **bone-change.json**. Click **Locate reported region on atlas**, then inspect the finding. In **Astronaut follow-up**, confirm the site/side and acquisition protocol and enter fictional reported discomfort or notes. **Record response only** preserves the answer without clearing anything. **Submit follow-up and apply next input** adds the next scripted numerical report and recalculates the state. The first compatible repeat can complete the task while the warning is still recovering; the second can clear it. Uncertain answers cannot upgrade quality. Amber indicates a fictional warning; teal indicates selection.

These are editable *input* files, not prepainted outputs. Change `readings[].value` to see different results. `qualityScore: null` or `lowConfidence: true` blocks automatic interpretation. A mismatched `site` prevents a compatible localized comparison. `initialCount` controls how many scripted reports are applied on loading; `reference` contains three fictional preflight values. Dates must remain strictly increasing after 10 January 2026, 12:00 UTC and no later than 12 January 2026, 12:00 UTC; the visible scenario clock advances with applied reports, not with answers.

Units are fixed by `kind`: bone = g/cm2, muscle = mm, systemic heart rate = /min. The bone/muscle 10% change trigger and 5% recovery band are authored software parameters, **not medical thresholds**. Times and values are compressed fictional examples and do not represent a physiological change/recovery rate, diagnosis or clinical test schedule. No real astronaut or patient data is present. Operational medical rules remain disabled.
