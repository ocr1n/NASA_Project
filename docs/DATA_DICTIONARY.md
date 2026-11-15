# Data dictionary

Generated from the shared JSON Schema and metric registry. Run npm run docs:dictionary to regenerate; append -- --check to verify drift.

Contract version **0.1.0**. Examples illustrate structure, not medical values. Undeclared fields are rejected. Cross-record and interpretation gates are described in [DATA_VALIDATION](DATA_VALIDATION.md). The [canonical schema](../src/shared/contracts/v0.1.0.schema.json) contains every conditional and variant; nested requiredness here depends on the selected variant. These tables avoid duplicating the complete schema.

Reported measurement time, received time, original units and values remain distinct. Unknown or missing data is null with a reason; partial dates are never fabricated into exact timestamps. Immutable RawRecord evidence carries versioned capture, reference and demo-state payloads.

## Metric catalogue

47 registered metrics. Scientific definitions remain pending; no operational medical threshold is admitted. Dimensional conversions do not establish clinical validity.

| Key | Bundle/category | Canonical unit | Input units | Value kinds | Required acquisition context | Definition status |
| --- | --- | --- | --- | --- | --- | --- |
| heart_rate | daily | `"/min"` | `"/min"`, `"bpm"` | number | modality, deviceId, protocolId, method, posture | pending |
| sleep_duration | daily | `"h"` | `"h"`, `"min"`, `"s"` | number | method, intervalSeconds | pending |
| fatigue_rating | daily | `"1"` | `"1"` | number, coded | scale | pending |
| mood_rating | daily | `"1"` | `"1"` | number, coded | scale | pending |
| stress_rating | daily | `"1"` | `"1"` | number, coded | scale | pending |
| respiratory_rate | additional | `"/min"` | `"/min"` | number | method, activity, intervalSeconds | pending |
| body_temperature | additional | `"Cel"` | `"Cel"` | number | site, deviceId | pending |
| bp_systolic | additional | `"mm[Hg]"` | `"mm[Hg]"` | number | deviceId, posture, protocolId, acquisitionId | pending |
| bp_diastolic | additional | `"mm[Hg]"` | `"mm[Hg]"` | number | deviceId, posture, protocolId, acquisitionId | pending |
| spo2 | additional | `"%"` | `"%"` | number | deviceId, oxygenContext | pending |
| blood_glucose | additional | `"mg/dL"` | `"mg/dL"`, `"mmol/L"` | number | mealContext, method, analyte | pending |
| body_mass | additional | `"kg"` | `"kg"`, `"g"` | number | method, gravityCondition | pending |
| body_height | additional | `"cm"` | `"cm"`, `"m"`, `"mm"` | number | method | pending |
| ecg_pr | cardiac | `"ms"` | `"ms"`, `"s"` | number | lead, method, protocolId | pending |
| ecg_qrs | cardiac | `"ms"` | `"ms"`, `"s"` | number | lead, method, protocolId | pending |
| ecg_qt | cardiac | `"ms"` | `"ms"`, `"s"` | number | lead, method, protocolId | pending |
| ecg_qtc | cardiac | `"ms"` | `"ms"`, `"s"` | number | lead, method, qtcCorrection | pending |
| ecg_rr_irregularity | cardiac | `"1"` | `"1"` | number, boolean | statistic, method, windowSeconds | pending |
| hrv_rmssd | cardiac | `"ms"` | `"ms"`, `"s"` | number | method, windowSeconds, artifactHandling | pending |
| hrv_sdnn | cardiac | `"ms"` | `"ms"`, `"s"` | number | method, windowSeconds, artifactHandling | pending |
| lvef | cardiac | `"%"` | `"%"` | number | view, method, reportId | pending |
| lv_edv | cardiac | `"mL"` | `"mL"`, `"L"` | number | view, method, indexing, reportId | pending |
| lv_esv | cardiac | `"mL"` | `"mL"`, `"L"` | number | view, method, indexing, reportId | pending |
| lv_edv_indexed | cardiac | `"mL/m2"` | `"mL/m2"`, `"L/m2"` | number | view, method, indexing, reportId | pending |
| lv_esv_indexed | cardiac | `"mL/m2"` | `"mL/m2"`, `"L/m2"` | number | view, method, indexing, reportId | pending |
| muscle_thickness | additional | `"mm"` | `"mm"`, `"cm"`, `"m"` | number | site, laterality, posture, protocolId | pending |
| bone_mineral_density | additional | `"g/cm2"` | `"g/cm2"` | number | site, laterality, modality, deviceId | pending |
| exercise_duration | exercise | `"min"` | `"min"`, `"s"` | number | sessionId, activity | pending |
| exercise_mean_hr | exercise | `"/min"` | `"/min"` | number | sessionId, activity, workload, statistic | pending |
| exercise_peak_hr | exercise | `"/min"` | `"/min"` | number | sessionId, activity, workload, statistic | pending |
| cycling_power | exercise | `"W"` | `"W"` | number | sessionId, activity, workload, statistic | pending |
| perceived_exertion | exercise | `"1"` | `"1"` | number, coded | sessionId, scale | pending |
| vo2_relative | exercise | `"mL/(kg.min)"` | `"mL/(kg.min)"`, `"L/(kg.min)"` | number | protocolId, method, resultBasis | pending |
| vo2max_relative | exercise | `"mL/(kg.min)"` | `"mL/(kg.min)"`, `"L/(kg.min)"` | number | protocolId, method, resultBasis | pending |
| vo2_absolute | exercise | `"L/min"` | `"L/min"`, `"mL/min"` | number | protocolId, method, resultBasis | pending |
| radiation_dose | additional | `"mSv"` | `"mSv"`, `"Sv"` | number | doseQuantity, deviceId, site, intervalSeconds | pending |
| radiation_dose_rate | additional | `"mSv/h"` | `"mSv/h"`, `"Sv/h"` | number | doseQuantity, deviceId, site, intervalSeconds | pending |
| symptom_report | additional | `null` |  | structured | site, laterality | pending |
| injury_report | additional | `null` |  | structured | site, laterality | pending |
| cabin_co2 | environment | `"[ppm]"` | `"[ppm]"` | number | deviceId, intervalSeconds | pending |
| cabin_o2 | environment | `"%"` | `"%"` | number | deviceId, intervalSeconds | pending |
| cabin_temperature | environment | `"Cel"` | `"Cel"` | number | deviceId, intervalSeconds | pending |
| cabin_pressure | environment | `"kPa"` | `"kPa"`, `"Pa"` | number | deviceId, intervalSeconds | pending |
| radiation_absorbed_dose | environment | `"mGy"` | `"mGy"`, `"Gy"` | number | doseQuantity, deviceId, site, intervalSeconds | pending |
| radiation_absorbed_dose_rate | environment | `"mGy/h"` | `"mGy/h"`, `"Gy/h"` | number | doseQuantity, deviceId, site, intervalSeconds | pending |
| cabin_co2_partial_pressure | environment | `"kPa"` | `"kPa"`, `"Pa"` | number | deviceId, intervalSeconds | pending |
| cabin_o2_partial_pressure | environment | `"kPa"` | `"kPa"`, `"Pa"` | number | deviceId, intervalSeconds | pending |

Full definitions and conversion evidence are in [registry.json](../src/shared/metrics/registry.json). Canonical value = input value × factor + offset. Indexed/unindexed quantities, percentage points/relative change and measured/estimated results remain distinct.

## Shared definitions

### Quality

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `score` | number or null | yes | — | `0` |
| `method` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `flags` | array of string | yes | — | See item fields/type |
| `lowConfidence` | boolean | yes | — | `false` |

### ValidationEnvelope

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `status` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |
| `validationRunId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `evidenceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `procedureVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `issues` | array of string | yes | — | See item fields/type |
| `admission` | `"quarantined"` / `"research_sandbox"` / `"demo_only"` / `"assessment_eligible"` | yes | — | `"quarantined"` |

### Scale

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `scaleId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `version` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `low` | number | yes | — | `0` |
| `high` | number | yes | — | `0` |
| `lowLabel` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `highLabel` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### MeasurementContext

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `modality` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `deviceId` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `protocolId` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `method` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `posture` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `activity` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `site` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `lead` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `view` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `qtcCorrection` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `artifactHandling` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `statistic` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `doseQuantity` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `oxygenContext` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `mealContext` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `gravityCondition` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `workload` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `indexing` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `missionPhase` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | conditional/optional | — | `"left"` |
| `windowSeconds` | number or null | conditional/optional | — | `0` |
| `intervalSeconds` | number or null | conditional/optional | — | `0` |
| `scale` | Scale or null | conditional/optional | — | See Scale |

### ReportValue

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `code` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `text` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `site` | string or null | yes | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |
| `certainty` | `"reported"` / `"uncertain"` / `"confirmed_by_report"` | yes | — | `"reported"` |
| `author` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### CodedValue

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `code` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### Provenance

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `rawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `contentHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `sourceRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `importBatchId` | string or null | yes | — | Illustrative string; obey pattern below |
| `pipelineVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `algorithm` | string or null | yes | — | Illustrative string; obey pattern below |
| `parameters` | object | yes | `{"additionalProperties":{"type":["string","number","boolean","null"]}}` | See nested fields |
| `originalUnit` | string or null | yes | — | Illustrative string; obey pattern below |
| `originalValue` | number or string or boolean or object or null | yes | — | Illustrative string; obey pattern below |
| `evidenceObservationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `windowIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `originalSamplingHz` | number or null | yes | — | `0` |
| `outputSamplingHz` | number or null | yes | — | `0` |

### SourceSnapshot

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `name` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `tier` | `"nasa"` / `"agency_partner"` / `"peer_reviewed"` / `"third_party"` / `"device"` / `"crew_report"` / `"simulation"` | yes | — | `"nasa"` |
| `canonicalURL` | string or null | yes | — | `https://example.org/evidence` |
| `version` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `license` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `attribution` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `retrievedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### SourceRecord

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"SourceRecord"` | yes | — | `"SourceRecord"` |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `name` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `tier` | `"nasa"` / `"agency_partner"` / `"peer_reviewed"` / `"third_party"` / `"device"` / `"crew_report"` / `"simulation"` | yes | — | `"nasa"` |
| `canonicalURL` | string or null | yes | — | `https://example.org/evidence` |
| `doi` | string or null | yes | — | Illustrative string; obey pattern below |
| `publisher` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `host` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `version` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `license` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `attribution` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `accessRestrictions` | array of string | yes | — | See item fields/type |
| `retrievedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `supportedMetrics` | array of string | yes | — | See item fields/type |
| `purpose` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `nasaSearchEvidence` | array of string | yes | — | See item fields/type |
| `fallbackReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `lineageIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `reviewStatus` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |

### CrewProfile

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"CrewProfile"` | yes | — | `"CrewProfile"` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `alias` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionStart` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `displayTimeZone` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `preferences` | object | yes | `{"required":["locale","reducedMotion"],"additionalProperties":false}` | See nested fields |
| `preferences.locale` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `preferences.reducedMotion` | boolean | yes | — | `false` |
| `bodyHeightObservationId` | string or null | yes | — | Illustrative string; obey pattern below |
| `bodyMassObservationId` | string or null | yes | — | Illustrative string; obey pattern below |
| `profileOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `createdAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `updatedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### MissionContext

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"MissionContext"` | yes | — | `"MissionContext"` |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `environmentType` | `"ground"` / `"iss"` / `"lunar"` / `"mars_transit"` / `"other"` | yes | — | `"ground"` |
| `missionStart` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `scenarioClock` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `missionPhase` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `location` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `schedule` | array of object | yes | — | See item fields/type |
| `schedule[].scheduleId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `schedule[].label` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `schedule[].context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | conditional/optional | — | `"rest"` |
| `schedule[].intervalSeconds` | number | conditional/optional | `{"exclusiveMinimum":0}` | `0` |
| `communicationScenario` | object or null | yes | — | See nested fields |
| `communicationScenario.oneWayDelaySeconds` | number | conditional/optional | `{"minimum":0}` | `0` |
| `communicationScenario.label` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `sourceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |

### MetricDefinition

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"MetricDefinition"` | yes | — | `"MetricDefinition"` |
| `metric` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `valueKinds` | array of `"number"` / `"boolean"` / `"coded"` / `"structured"` | yes | — | See item fields/type |
| `canonicalUnit` | string or null | yes | — | Illustrative string; obey pattern below |
| `allowedInputUnits` | array of string | yes | — | See item fields/type |
| `conversions` | array of object | yes | — | See item fields/type |
| `conversions[].inputUnit` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `conversions[].factor` | number | conditional/optional | — | `0` |
| `conversions[].offset` | number | conditional/optional | — | `0` |
| `conversions[].evidenceURL` | string | conditional/optional | `{"format":"uri"}` | `https://example.org/evidence` |
| `category` | `"daily"` / `"cardiac"` / `"exercise"` / `"additional"` / `"environment"` | yes | — | `"daily"` |
| `requiredContext` | array of string | yes | — | See item fields/type |
| `missingValueBehavior` | `"explicit_reason"` | yes | — | `"explicit_reason"` |
| `provenanceRequirements` | array of string | yes | — | See item fields/type |
| `comparabilityKeys` | array of string | yes | — | See item fields/type |
| `regionAssociations` | array of string | yes | — | See item fields/type |
| `definitionStatus` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |
| `definitionEvidence` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `displayPrecision` | integer | yes | `{"minimum":0,"maximum":10}` | `0` |

### Observation

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"Observation"` | yes | — | `"Observation"` |
| `observationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `publicSubjectId` | string or null | yes | — | Illustrative string; obey pattern below |
| `datasetId` | string or null | yes | — | Illustrative string; obey pattern below |
| `timestamp` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `timePrecision` | `"exact"` / `"date"` / `"mission_relative"` / `"unknown"` | yes | — | `"exact"` |
| `originalTime` | string or null | yes | — | Illustrative string; obey pattern below |
| `timeReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionAnchor` | object or null | yes | — | See nested fields |
| `missionAnchor.missionId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionAnchor.missionDay` | integer | conditional/optional | `{"minimum":0}` | `0` |
| `missionAnchor.secondsIntoDay` | number or null | conditional/optional | — | `0` |
| `receivedAt` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `valueKind` | `"number"` / `"boolean"` / `"coded"` / `"structured"` | yes | — | `"number"` |
| `value` | see constraints | yes | — | Illustrative string; obey pattern below |
| `unit` | string or null | yes | — | Illustrative string; obey pattern below |
| `missingReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `measurementContext` | MeasurementContext | yes | — | See MeasurementContext |
| `source` | SourceSnapshot | yes | — | See SourceSnapshot |
| `quality` | Quality | yes | — | See Quality |
| `validation` | ValidationEnvelope | yes | — | See ValidationEnvelope |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `deliveryMode` | `"manual"` / `"file_import"` / `"live"` / `"replay"` | yes | — | `"manual"` |
| `synthetic` | boolean | yes | — | `false` |
| `era` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `provenance` | Provenance | yes | — | See Provenance |
| `acquisitionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `regionKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |
| `reportId` | string or null | yes | — | Illustrative string; obey pattern below |
| `sessionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `supersedesObservationId` | string or null | yes | — | Illustrative string; obey pattern below |

### EnvironmentalObservation

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"EnvironmentalObservation"` | yes | — | `"EnvironmentalObservation"` |
| `environmentalObservationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `instrumentId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `location` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `observedFrom` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `observedTo` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `timestamp` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `timePrecision` | `"exact"` / `"date"` / `"mission_relative"` / `"unknown"` | yes | — | `"exact"` |
| `originalTime` | string or null | yes | — | Illustrative string; obey pattern below |
| `timeReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionAnchor` | object or null | yes | — | See nested fields |
| `missionAnchor.missionId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionAnchor.missionDay` | integer | conditional/optional | `{"minimum":0}` | `0` |
| `missionAnchor.secondsIntoDay` | number or null | conditional/optional | — | `0` |
| `receivedAt` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `valueKind` | `"number"` / `"boolean"` / `"coded"` / `"structured"` | yes | — | `"number"` |
| `value` | see constraints | yes | — | Illustrative string; obey pattern below |
| `unit` | string or null | yes | — | Illustrative string; obey pattern below |
| `missingReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `measurementContext` | MeasurementContext | yes | — | See MeasurementContext |
| `source` | SourceSnapshot | yes | — | See SourceSnapshot |
| `quality` | Quality | yes | — | See Quality |
| `validation` | ValidationEnvelope | yes | — | See ValidationEnvelope |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `deliveryMode` | `"manual"` / `"file_import"` / `"live"` / `"replay"` | yes | — | `"manual"` |
| `synthetic` | boolean | yes | — | `false` |
| `era` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `provenance` | Provenance | yes | — | See Provenance |
| `acquisitionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `regionKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |

### RawRecord

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"RawRecord"` | yes | — | `"RawRecord"` |
| `rawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `acquisitionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `importBatchId` | string or null | yes | — | Illustrative string; obey pattern below |
| `payload` | string or null | yes | — | Illustrative string; obey pattern below |
| `fileReference` | string or null | yes | — | Illustrative string; obey pattern below |
| `contentHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `mediaType` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `encoding` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `retrievedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `retentionPolicy` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `accessPolicy` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### EvidenceGroup

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `lineageId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceIds` | array of string | yes | `{"uniqueItems":true,"minItems":1}` | See item fields/type |
| `locations` | array of string | yes | `{"minItems":1}` | See item fields/type |

### ValidationRun

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"ValidationRun"` | yes | — | `"ValidationRun"` |
| `validationRunId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `claim` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `subjectRecordIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `sourceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `ruleIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `independentEvidenceGroups` | array of EvidenceGroup | yes | — | See item fields/type |
| `sourcesChecked` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `normalization` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `toleranceDefinition` | object or null | yes | — | See nested fields |
| `toleranceDefinition.value` | number | conditional/optional | — | `0` |
| `toleranceDefinition.unit` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `toleranceDefinition.justification` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `structuralResults` | array of string | yes | — | See item fields/type |
| `methodComparisons` | array of string | yes | — | See item fields/type |
| `conflicts` | array of string | yes | — | See item fields/type |
| `limitations` | array of string | yes | — | See item fields/type |
| `status` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |
| `admission` | `"quarantined"` / `"research_sandbox"` / `"demo_only"` / `"assessment_eligible"` | yes | — | `"quarantined"` |
| `reviewer` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `procedureVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `pipelineVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `runAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### Report

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"Report"` | yes | — | `"Report"` |
| `reportId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string or null | yes | — | Illustrative string; obey pattern below |
| `publicSubjectId` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `type` | `"ecg"` / `"echo"` / `"muscle"` / `"dxa"` / `"other"` | yes | — | `"ecg"` |
| `timestamp` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `timePrecision` | `"exact"` / `"date"` / `"mission_relative"` / `"unknown"` | yes | — | `"exact"` |
| `originalTime` | string or null | yes | — | Illustrative string; obey pattern below |
| `timeReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionAnchor` | object or null | yes | — | See nested fields |
| `missionAnchor.missionId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionAnchor.missionDay` | integer | conditional/optional | `{"minimum":0}` | `0` |
| `missionAnchor.secondsIntoDay` | number or null | conditional/optional | — | `0` |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `method` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `lead` | string or null | yes | — | Illustrative string; obey pattern below |
| `view` | string or null | yes | — | Illustrative string; obey pattern below |
| `site` | string or null | yes | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |
| `originalReportRawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |

### ExerciseSession

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"ExerciseSession"` | yes | — | `"ExerciseSession"` |
| `sessionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `activity` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `startAt` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `endAt` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `durationMinutes` | number or null | yes | — | `0` |
| `workload` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceSessionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `notes` | string or null | yes | — | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |

### ExerciseReportedTime

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `precision` | `"exact"` / `"date"` / `"unknown"` | yes | — | `"exact"` |
| `text` | string | yes | — | Illustrative string; obey pattern below |
| `reason` | string | yes | — | Illustrative string; obey pattern below |

### ExerciseMetricInput

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `metric` | `"exercise_duration"` / `"perceived_exertion"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` | yes | — | `"exercise_duration"` |
| `input` | string | yes | — | Illustrative string; obey pattern below |
| `unit` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `missingReason` | string or null | yes | — | Illustrative string; obey pattern below |

### ExerciseCaptureContent

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `sessionKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `crewId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `activity` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `workload` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `time` | ExerciseReportedTime | yes | — | See ExerciseReportedTime |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `posture` | string or null | yes | — | Illustrative string; obey pattern below |
| `values` | array of ExerciseMetricInput | yes | `{"minItems":5,"maxItems":5}` | See item fields/type |
| `extraColumns` | string | yes | — | Illustrative string; obey pattern below |

### ExerciseCaptureEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"exercise-capture/1"` | yes | — | `"exercise-capture/1"` |
| `sessionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `content` | ExerciseCaptureContent | yes | — | See ExerciseCaptureContent |
| `contentFingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `receivedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `deliveryMode` | `"manual"` / `"file_import"` | yes | — | `"manual"` |

### ExerciseNoteAmendment

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"exercise-notes/1"` | yes | — | `"exercise-notes/1"` |
| `sessionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sequence` | integer | yes | `{"minimum":1}` | `1` |
| `previousRawRecordId` | string or null | yes | — | Illustrative string; obey pattern below |
| `text` | string | yes | `{"maxLength":4000}` | Illustrative string; obey pattern below |
| `recordedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### EcgMetricInput

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `metric` | `"heart_rate"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"hrv_sdnn"` / `"hrv_rmssd"` | yes | — | `"heart_rate"` |
| `input` | string | yes | `{"maxLength":200}` | Illustrative string; obey pattern below |
| `unit` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `missingReason` | string or null | yes | — | Illustrative string; obey pattern below |

### EcgCaptureContent

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `reportKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `crewId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `time` | ExerciseReportedTime | yes | — | See ExerciseReportedTime |
| `lead` | string | yes | `{"minLength":1,"maxLength":200}` | Illustrative string; obey pattern below |
| `method` | string | yes | `{"minLength":1,"maxLength":200}` | Illustrative string; obey pattern below |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string or null | yes | — | Illustrative string; obey pattern below |
| `posture` | string or null | yes | — | Illustrative string; obey pattern below |
| `context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `missionPhase` | `"preflight"` / `"inflight"` / `"postflight"` / `"unknown"` | yes | — | `"preflight"` |
| `qtcCorrection` | string or null | yes | — | Illustrative string; obey pattern below |
| `hrvMethod` | string or null | yes | — | Illustrative string; obey pattern below |
| `windowSeconds` | number or null | yes | — | `0` |
| `artifactHandling` | string or null | yes | — | Illustrative string; obey pattern below |
| `qualityNotes` | string | yes | `{"maxLength":2000}` | Illustrative string; obey pattern below |
| `values` | array of EcgMetricInput | yes | `{"minItems":7,"maxItems":7}` | See item fields/type |

### EcgCaptureEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"ecg-report/1"` | yes | — | `"ecg-report/1"` |
| `reportId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `content` | EcgCaptureContent | yes | — | See EcgCaptureContent |
| `contentFingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `receivedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `deliveryMode` | `"manual"` | yes | — | `"manual"` |

### EcgDraftContent

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `reportKey` | string | yes | `{"maxLength":128}` | Illustrative string; obey pattern below |
| `crewId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `time` | ExerciseReportedTime | yes | — | See ExerciseReportedTime |
| `lead` | string | yes | `{"maxLength":200}` | Illustrative string; obey pattern below |
| `method` | string | yes | `{"maxLength":200}` | Illustrative string; obey pattern below |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string or null | yes | — | Illustrative string; obey pattern below |
| `posture` | string or null | yes | — | Illustrative string; obey pattern below |
| `context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `missionPhase` | `"preflight"` / `"inflight"` / `"postflight"` / `"unknown"` | yes | — | `"preflight"` |
| `qtcCorrection` | string or null | yes | — | Illustrative string; obey pattern below |
| `hrvMethod` | string or null | yes | — | Illustrative string; obey pattern below |
| `windowSeconds` | number or null | yes | — | `0` |
| `artifactHandling` | string or null | yes | — | Illustrative string; obey pattern below |
| `qualityNotes` | string | yes | `{"maxLength":2000}` | Illustrative string; obey pattern below |
| `values` | array of EcgMetricInput | yes | `{"minItems":7,"maxItems":7}` | See item fields/type |

### ReportMetricInput

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `metric` | `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` | yes | — | `"lvef"` |
| `input` | string | yes | — | Illustrative string; obey pattern below |
| `unit` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `missingReason` | string or null | yes | — | Illustrative string; obey pattern below |
| `indexing` | `"unindexed"` / `"body_surface_area"` / `"unknown"` or null | yes | — | `"unindexed"` |

### ReportCaptureContent

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `astronautId` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `publicSubjectId` | string or null | yes | — | Illustrative string; obey pattern below |
| `datasetId` | string or null | yes | — | Illustrative string; obey pattern below |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `reportKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `type` | `"echo"` / `"muscle"` | yes | — | `"echo"` |
| `time` | ExerciseReportedTime | yes | — | See ExerciseReportedTime |
| `context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `missionPhase` | string or null | yes | — | Illustrative string; obey pattern below |
| `method` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `view` | string or null | yes | — | Illustrative string; obey pattern below |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `probeId` | string or null | yes | — | Illustrative string; obey pattern below |
| `posture` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string or null | yes | — | Illustrative string; obey pattern below |
| `muscle` | string or null | yes | — | Illustrative string; obey pattern below |
| `site` | string or null | yes | — | Illustrative string; obey pattern below |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |
| `quality` | Quality | yes | — | See Quality |
| `limitations` | array of string | yes | — | See item fields/type |
| `originalReport` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `values` | array of ReportMetricInput | yes | `{"minItems":1,"maxItems":5}` | See item fields/type |
| `extraColumns` | string | yes | — | Illustrative string; obey pattern below |

### ReportCaptureEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"ultrasound-report/1"` | yes | — | `"ultrasound-report/1"` |
| `reportId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `content` | ReportCaptureContent | yes | — | See ReportCaptureContent |
| `contentFingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `receivedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `deliveryMode` | `"manual"` / `"file_import"` | yes | — | `"manual"` |
| `originalFileRawRecordId` | string or null | yes | — | Illustrative string; obey pattern below |
| `originalFileHash` | string or null | yes | — | Illustrative string; obey pattern below |

### DemoScenarioReading

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `timestamp` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `value` | number or null | yes | — | `0` |
| `qualityScore` | number or null | yes | — | `0` |
| `lowConfidence` | boolean | yes | — | `false` |
| `site` | string or null | yes | — | Illustrative string; obey pattern below |

### DemoScenarioInput

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"atlas-demo-input/1"` | yes | — | `"atlas-demo-input/1"` |
| `scenarioId` | string | yes | `{"pattern":"^[a-z0-9-]{1,60}$"}` | Illustrative string; obey pattern below |
| `title` | string | yes | `{"minLength":1,"maxLength":160}` | Illustrative string; obey pattern below |
| `description` | string | yes | `{"minLength":1,"maxLength":1000}` | Illustrative string; obey pattern below |
| `crewId` | `"crew-a"` / `"crew-b"` | yes | — | `"crew-a"` |
| `kind` | `"bone"` / `"muscle"` / `"systemic"` | yes | — | `"bone"` |
| `initialCount` | integer | yes | `{"minimum":1,"maximum":12}` | `1` |
| `reference` | array of number | yes | `{"minItems":3,"maxItems":3}` | See item fields/type |
| `readings` | array of DemoScenarioReading | yes | `{"minItems":1,"maxItems":12}` | See item fields/type |

### DemoScenarioResponse

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `site` | `"confirmed"` / `"uncertain"` | yes | — | `"confirmed"` |
| `acquisition` | `"confirmed"` / `"uncertain"` | yes | — | `"confirmed"` |
| `notes` | string | yes | `{"maxLength":2000}` | Illustrative string; obey pattern below |

### DemoScenarioState

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"atlas-demo-state/1"` | yes | — | `"atlas-demo-state/1"` |
| `input` | DemoScenarioInput | yes | — | See DemoScenarioInput |
| `appliedCount` | integer | yes | `{"minimum":1,"maximum":12}` | `1` |
| `sequence` | integer | yes | `{"minimum":1}` | `1` |
| `previousRawRecordId` | string or null | yes | — | Illustrative string; obey pattern below |
| `baselineId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `response` | DemoScenarioResponse or null | yes | — | See DemoScenarioResponse |

### ImportBatch

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"ImportBatch"` | yes | — | `"ImportBatch"` |
| `importBatchId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `fileHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `parser` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `parserVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `mapping` | array of object | yes | — | See item fields/type |
| `mapping[].sourceColumn` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `mapping[].canonicalField` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `previewToken` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `previewState` | `"previewed"` / `"committed"` | yes | — | `"previewed"` |
| `acceptedRows` | integer | yes | `{"minimum":0}` | `0` |
| `rejectedRows` | integer | yes | `{"minimum":0}` | `0` |
| `quarantinedRows` | integer | yes | `{"minimum":0}` | `0` |
| `errors` | array of object | yes | — | See item fields/type |
| `errors[].row` | integer | conditional/optional | `{"minimum":0}` | `0` |
| `errors[].field` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `errors[].code` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `errors[].message` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `stableSourceRecordKeys` | array of string | yes | — | See item fields/type |
| `importedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### CollectionAttemptEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"collection-attempt/1"` | yes | — | `"collection-attempt/1"` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `schedule` | object | yes | `{"required":["scheduleId","label","context","intervalSeconds"],"additionalProperties":false}` | See nested fields |
| `schedule.scheduleId` | `"fictional-context-7d"` / `"fictional-ecg-30d"` / `"fictional-echo-30d"` | yes | — | `"fictional-context-7d"` |
| `schedule.label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `schedule.context` | `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | `"rest"` |
| `schedule.intervalSeconds` | integer | yes | `{"minimum":1}` | `1` |
| `slotIndex` | integer | yes | `{"minimum":0}` | `0` |
| `dueAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `sequence` | integer | yes | `{"minimum":1}` | `1` |
| `previousRawRecordId` | string or null | yes | — | Illustrative string; obey pattern below |
| `outcome` | `"recorded"` / `"missing"` / `"skipped"` / `"device_failed"` | yes | — | `"recorded"` |
| `reason` | string | yes | `{"maxLength":4000}` | Illustrative string; obey pattern below |
| `time` | object | yes | `{"required":["precision","text","reason"],"additionalProperties":false}` | See nested fields |
| `time.precision` | `"exact"` / `"date"` / `"unknown"` | yes | — | `"exact"` |
| `time.text` | string | yes | `{"maxLength":200}` | Illustrative string; obey pattern below |
| `time.reason` | string | yes | `{"maxLength":4000}` | Illustrative string; obey pattern below |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `reportIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `recordedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### Window

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `from` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `to` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `precision` | `"exact"` / `"date"` / `"unknown"` | yes | — | `"exact"` |

### Exclusion

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `observationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `reason` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### Baseline

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"Baseline"` | yes | — | `"Baseline"` |
| `baselineId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `unit` | string or null | yes | — | Illustrative string; obey pattern below |
| `comparabilityKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `comparabilityVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `method` | `"preflight_median"` / `"preflight_anchor"` / `"mission_rolling"` | yes | — | `"preflight_median"` |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `window` | Window | yes | — | See Window |
| `sampleCount` | integer | yes | `{"minimum":0}` | `0` |
| `center` | number or null | yes | — | `0` |
| `spread` | number or null | yes | — | `0` |
| `qualityCriteria` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `admissionCriteria` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `exclusions` | array of Exclusion | yes | — | See item fields/type |
| `calculatedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `algorithmVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `status` | `"available"` / `"insufficient_data"` / `"baseline_unavailable"` / `"incomparable"` / `"unsupported"` / `"stale"` / `"invalid"` | yes | — | `"available"` |
| `reasons` | array of string | yes | — | See item fields/type |

### ComparisonResult

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"ComparisonResult"` | yes | — | `"ComparisonResult"` |
| `comparisonId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `baselineId` | string or null | yes | — | Illustrative string; obey pattern below |
| `referenceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `comparabilityKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `availability` | `"available"` / `"insufficient_data"` / `"baseline_unavailable"` / `"incomparable"` / `"unsupported"` / `"stale"` / `"invalid"` | yes | — | `"available"` |
| `reasons` | array of string | yes | — | See item fields/type |
| `absoluteDelta` | number or null | yes | — | `0` |
| `relativeDelta` | number or null | yes | — | `0` |
| `percentagePointDelta` | number or null | yes | — | `0` |
| `trend` | object or null | yes | — | See nested fields |
| `trend.slope` | number | conditional/optional | — | `0` |
| `trend.unit` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `trend.method` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `sampleCount` | integer | yes | `{"minimum":0}` | `0` |
| `coverage` | number | yes | `{"minimum":0,"maximum":1}` | `0` |
| `qualitySummary` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `validationSummary` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `algorithmVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### BaselinePolicy

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"baseline-policy/1"` | yes | — | `"baseline-policy/1"` |
| `version` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `demoOnly` | `true` | yes | — | `true` |
| `minimumSamples` | integer | yes | `{"minimum":2}` | `2` |
| `minimumSpreadSamples` | integer | yes | `{"minimum":2}` | `2` |
| `minimumQualityScore` | number | yes | `{"minimum":0,"maximum":1}` | `0` |
| `cadenceSeconds` | number or null | yes | — | `0` |
| `spreadMethod` | `"raw_mad"` | yes | — | `"raw_mad"` |
| `methodEvidenceURLs` | array of string | yes | `{"minItems":2,"uniqueItems":true}` | See item fields/type |

### BaselineRequest

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"baseline-request/1"` | yes | — | `"baseline-request/1"` |
| `namespace` | `"demo"` / `"crew"` | yes | — | `"demo"` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `method` | `"preflight_median"` / `"preflight_anchor"` / `"mission_rolling"` | yes | — | `"preflight_median"` |
| `missionPhase` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `selectorObservationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `anchorObservationId` | string or null | yes | — | Illustrative string; obey pattern below |
| `window` | Window | yes | — | See Window |
| `currentObservationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `exclusions` | array of Exclusion | yes | — | See item fields/type |
| `excludedPeriods` | array of object | yes | — | See item fields/type |
| `excludedPeriods[].window` | Window | conditional/optional | — | See Window |
| `excludedPeriods[].reason` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |

### BaselineComputationDetail

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"baseline-computation/1"` | yes | — | `"baseline-computation/1"` |
| `request` | BaselineRequest | yes | — | See BaselineRequest |
| `policy` | BaselinePolicy | yes | — | See BaselinePolicy |
| `inputHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `seriesKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `operationalInterpretation` | `false` | yes | — | `false` |
| `effectiveWindow` | Window | yes | — | See Window |
| `expectedSlots` | integer or null | yes | — | `1` |
| `occupiedSlots` | integer or null | yes | — | `0` |
| `coverage` | number or null | yes | — | `0` |
| `uncertainty` | array of string | yes | — | See item fields/type |
| `diagnostics` | array of string | yes | — | See item fields/type |
| `inputRecords` | array of object | yes | — | See item fields/type |
| `inputRecords[].observationId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `inputRecords[].hash` | string | conditional/optional | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `inputRecords[].sourceId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `inputRecords[].sourceVersion` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `inputRecords[].sourceRecordId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `inputRecords[].rawRecordId` | string | conditional/optional | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `inputRecords[].acquisitionId` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `inputRecords[].timestamp` | string or null | conditional/optional | — | `2026-01-10T12:00:00Z` |
| `inputRecords[].originalTime` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `inputRecords[].timePrecision` | `"exact"` / `"date"` / `"mission_relative"` / `"unknown"` | conditional/optional | — | `"exact"` |

### BaselineComputation

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `baseline` | Baseline | yes | — | See Baseline |
| `detail` | BaselineComputationDetail | yes | — | See BaselineComputationDetail |

### SavedBaselineCalculation

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"saved-baseline/1"` | yes | — | `"saved-baseline/1"` |
| `seriesId` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `sequence` | integer | yes | `{"minimum":1}` | `1` |
| `previousRawRecordId` | string or null | yes | — | Illustrative string; obey pattern below |
| `sourceId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `reason` | string | yes | `{"minLength":1,"maxLength":4000}` | Illustrative string; obey pattern below |
| `savedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `snapshotObservationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `computation` | BaselineComputation | yes | — | See BaselineComputation |

### PersonalComparisonEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"personal-comparison/1"` | yes | — | `"personal-comparison/1"` |
| `comparison` | ComparisonResult | yes | — | See ComparisonResult |
| `current` | Observation | yes | — | See Observation |
| `reference` | BaselineComputation or null | yes | — | See BaselineComputation |
| `coverage` | number or null | yes | — | `0` |
| `limitations` | array of string | yes | — | See item fields/type |
| `operationalInterpretation` | `false` | yes | — | `false` |

### TrendRequest

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"trend-request/1"` | yes | — | `"trend-request/1"` |
| `namespace` | `"demo"` | yes | — | `"demo"` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` | yes | — | `"synthetic"` |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `missionPhase` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `referenceBaselineId` | string or null | yes | — | Illustrative string; obey pattern below |
| `window` | Window | yes | — | See Window |
| `maximumGapSeconds` | number or null | yes | — | `0` |
| `cadenceSeconds` | number or null | yes | — | `0` |

### TrendPoint

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `observation` | Observation | yes | — | See Observation |
| `seriesKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `availability` | `"available"` / `"insufficient_data"` / `"baseline_unavailable"` / `"incomparable"` / `"unsupported"` / `"stale"` / `"invalid"` | yes | — | `"available"` |
| `reasons` | array of string | yes | — | See item fields/type |
| `segment` | integer or null | yes | — | `0` |
| `comparison` | PersonalComparisonEvidence or null | yes | — | See PersonalComparisonEvidence |
| `reportId` | string or null | yes | — | Illustrative string; obey pattern below |
| `sessionId` | string or null | yes | — | Illustrative string; obey pattern below |
| `repeatTaskIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |

### TrendProjection

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"trend-projection/1"` | yes | — | `"trend-projection/1"` |
| `request` | TrendRequest | yes | — | See TrendRequest |
| `reference` | BaselineComputation or null | yes | — | See BaselineComputation |
| `points` | array of TrendPoint | yes | — | See item fields/type |
| `series` | array of object | yes | — | See item fields/type |
| `series[].seriesKey` | string | conditional/optional | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `series[].metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | conditional/optional | — | `"heart_rate"` |
| `series[].unit` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `series[].missionPhase` | string | conditional/optional | `{"minLength":1}` | Illustrative string; obey pattern below |
| `series[].sampleCount` | integer | conditional/optional | `{"minimum":0}` | `0` |
| `series[].slopePerDay` | number or null | conditional/optional | — | `0` |
| `series[].slopeUnit` | string or null | conditional/optional | — | Illustrative string; obey pattern below |
| `series[].coverage` | number or null | conditional/optional | — | `0` |
| `series[].limitations` | array of string | conditional/optional | — | See item fields/type |
| `reasons` | array of string | yes | — | See item fields/type |
| `algorithmVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `operationalInterpretation` | `false` | yes | — | `false` |

### HistoricalCohort

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"historical-cohort/1"` | yes | — | `"historical-cohort/1"` |
| `cohortId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `dataOrigin` | `"synthetic"` / `"public_research"` | yes | — | `"synthetic"` |
| `era` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `date` | string | yes | `{"format":"date"}` | `2026-01-10` |
| `species` | string or null | yes | — | Illustrative string; obey pattern below |
| `population` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionDurationDays` | number or null | yes | — | `0` |
| `metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `unit` | string or null | yes | — | Illustrative string; obey pattern below |
| `modality` | string or null | yes | — | Illustrative string; obey pattern below |
| `protocolId` | string or null | yes | — | Illustrative string; obey pattern below |
| `deviceId` | string or null | yes | — | Illustrative string; obey pattern below |
| `assay` | string or null | yes | — | Illustrative string; obey pattern below |
| `statistic` | `"mean"` / `"median"` | yes | — | `"mean"` |
| `sampleSize` | integer or null | yes | — | `1` |
| `value` | number or null | yes | — | `0` |
| `sources` | array of SourceSnapshot | yes | — | See item fields/type |
| `validationStatus` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |
| `admission` | `"quarantined"` / `"research_sandbox"` / `"demo_only"` / `"assessment_eligible"` | yes | — | `"quarantined"` |
| `limitations` | array of string | yes | — | See item fields/type |

### HistoricalComparison

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"historical-comparison/1"` | yes | — | `"historical-comparison/1"` |
| `left` | HistoricalCohort or null | yes | — | See HistoricalCohort |
| `right` | HistoricalCohort or null | yes | — | See HistoricalCohort |
| `availability` | `"available"` / `"insufficient_data"` / `"baseline_unavailable"` / `"incomparable"` / `"unsupported"` / `"stale"` / `"invalid"` | yes | — | `"available"` |
| `reasons` | array of string | yes | — | See item fields/type |
| `absoluteDelta` | number or null | yes | — | `0` |
| `relativeDelta` | number or null | yes | — | `0` |
| `percentagePointDelta` | number or null | yes | — | `0` |
| `limitations` | array of string | yes | — | See item fields/type |
| `algorithmVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `operationalInterpretation` | `false` | yes | — | `false` |

### EcgResearchField

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `metric` | `"heart_rate"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"hrv_sdnn"` / `"hrv_rmssd"` | yes | — | `"heart_rate"` |
| `column` | string or null | yes | — | Illustrative string; obey pattern below |
| `status` | `"accepted"` / `"missing"` / `"rejected"` | yes | — | `"accepted"` |
| `value` | number or null | yes | — | `0` |
| `unit` | string or null | yes | — | Illustrative string; obey pattern below |
| `originalUnit` | string or null | yes | — | Illustrative string; obey pattern below |
| `originalValue` | string or null | yes | — | Illustrative string; obey pattern below |
| `reason` | string or null | yes | — | Illustrative string; obey pattern below |

### EcgResearchRow

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `ecgId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `publicSubjectId` | string or null | yes | — | Illustrative string; obey pattern below |
| `reportId` | string or null | yes | — | Illustrative string; obey pattern below |
| `contentFingerprint` | string or null | yes | — | Illustrative string; obey pattern below |
| `action` | `"create"` / `"duplicate"` / `"conflict"` / `"rejected"` | yes | — | `"create"` |
| `fields` | array of EcgResearchField | yes | — | See item fields/type |
| `errors` | array of string | yes | — | See item fields/type |

### EcgResearchEvidence

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"ptb-ecg-report/1"` | yes | — | `"ptb-ecg-report/1"` |
| `method` | `"ECGDeli"` / `"Uni-G"` | yes | — | `"ECGDeli"` |
| `ecgId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `publicSubjectId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `reportId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `featureRawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `parentRawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `descriptionRawRecordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `contentFingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `importBatchId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `validationRunId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `receivedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### EcgResearchPreview

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `protocolVersion` | `"ptb-report-preview/1"` | yes | — | `"ptb-report-preview/1"` |
| `namespace` | `"research:ptb-xl-plus"` | yes | — | `"research:ptb-xl-plus"` |
| `method` | `"ECGDeli"` / `"Uni-G"` | yes | — | `"ECGDeli"` |
| `selectedEcgIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `rows` | array of EcgResearchRow | yes | — | See item fields/type |
| `unmappedColumns` | array of string | yes | — | See item fields/type |
| `command` | CommandEnvelope or null | yes | — | See CommandEnvelope |
| `integrity` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |

### ThresholdRule

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"ThresholdRule"` | yes | — | `"ThresholdRule"` |
| `ruleId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `version` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `title` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `metrics` | array of `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | See item fields/type |
| `applicableContext` | array of `"rest"` / `"exercise"` / `"sleep"` / `"eva"` / `"launch"` / `"landing"` / `"pre_flight"` / `"post_flight"` / `"unknown"` | yes | — | See item fields/type |
| `population` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `protocolId` | string or null | yes | — | Illustrative string; obey pattern below |
| `predicates` | array of object | yes | — | See item fields/type |
| `predicates[].op` | `"gt"` / `"lt"` / `"outside"` / `"delta_gt"` / `"quality_below"` / `"missing"` | conditional/optional | — | `"gt"` |
| `predicates[].metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | conditional/optional | — | `"heart_rate"` |
| `predicates[].parameters` | object | conditional/optional | `{"required":["value","low","high"],"additionalProperties":false}` | See nested fields |
| `predicates[].parameters.value` | number or null | conditional/optional | — | `0` |
| `predicates[].parameters.low` | number or null | conditional/optional | — | `0` |
| `predicates[].parameters.high` | number or null | conditional/optional | — | `0` |
| `evidenceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `admissionRequirements` | array of `"quarantined"` / `"research_sandbox"` / `"demo_only"` / `"assessment_eligible"` | yes | — | See item fields/type |
| `baselineStrategy` | `"fixed"` / `"rolling"` / `"anchor"` / `"none"` | yes | — | `"fixed"` |
| `qualityGate` | object | yes | `{"required":["minimumScore","allowLowConfidence"],"additionalProperties":false}` | See nested fields |
| `qualityGate.minimumScore` | number | yes | `{"minimum":0,"maximum":1}` | `0` |
| `qualityGate.allowLowConfidence` | boolean | yes | — | `false` |
| `persistence` | object | yes | `{"required":["minimumSeconds","minimumIndependentSamples"],"additionalProperties":false}` | See nested fields |
| `persistence.minimumSeconds` | number | yes | `{"minimum":0}` | `0` |
| `persistence.minimumIndependentSamples` | integer | yes | `{"minimum":1}` | `1` |
| `severity` | `"info"` / `"watch"` / `"warning"` / `"critical"` | yes | — | `"info"` |
| `recovery` | object | yes | `{"required":["minimumSeconds","minimumIndependentSamples"],"additionalProperties":false}` | See nested fields |
| `recovery.minimumSeconds` | number | yes | `{"minimum":0}` | `0` |
| `recovery.minimumIndependentSamples` | integer | yes | `{"minimum":1}` | `1` |
| `status` | `"pending"` / `"verified"` / `"single_source"` / `"conflict"` / `"rejected"` | yes | — | `"pending"` |
| `demoOnly` | boolean | yes | — | `false` |
| `approvedScope` | `"demo_only"` / `"review_required"` / `"operational"` | yes | — | `"demo_only"` |
| `regionMapping` | object | yes | `{"required":["regionKey","layer","localizing"],"additionalProperties":false}` | See nested fields |
| `regionMapping.regionKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `regionMapping.layer` | `"skeletal"` / `"muscular"` / `"organ"` / `"systemic"` | yes | — | `"skeletal"` |
| `regionMapping.localizing` | boolean | yes | — | `false` |
| `guidanceSourceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |

### Assessment

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"Assessment"` | yes | — | `"Assessment"` |
| `assessmentId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `missionId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `evaluatedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `window` | Window | yes | — | See Window |
| `ruleId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `ruleVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `environmentalObservationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `comparisonIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `baselineIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `availability` | `"available"` / `"insufficient_data"` / `"baseline_unavailable"` / `"incomparable"` / `"unsupported"` / `"stale"` / `"invalid"` | yes | — | `"available"` |
| `reasons` | array of string | yes | — | See item fields/type |
| `severity` | `"info"` / `"watch"` / `"warning"` / `"critical"` or null | yes | — | `"info"` |
| `finding` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `contributingFactors` | array of string | yes | — | See item fields/type |
| `corroboration` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `sustained` | boolean | yes | — | `false` |
| `independentSampleCount` | integer | yes | `{"minimum":0}` | `0` |
| `localizationSupported` | boolean | yes | — | `false` |
| `limitations` | array of string | yes | — | See item fields/type |
| `evidenceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `mode` | `"demo"` / `"operational"` | yes | — | `"demo"` |
| `lifecycle` | `"active"` / `"recovering"` / `"cleared"` | yes | — | `"active"` |
| `taskIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `highlightIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |

### FollowUpTask

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"FollowUpTask"` | yes | — | `"FollowUpTask"` |
| `taskId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `type` | `"repeat_measurement"` / `"review_report"` / `"scheduled_check"` / `"verify_quality"` | yes | — | `"repeat_measurement"` |
| `dueAt` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `duePrecision` | `"exact"` / `"date"` / `"unknown"` | yes | — | `"exact"` |
| `state` | `"scheduled"` / `"due"` / `"in_progress"` / `"completed"` / `"excused"` / `"cancelled"` | yes | — | `"scheduled"` |
| `assessmentIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `requiredMeasurement` | object | yes | `{"required":["metric","comparabilityKey"],"additionalProperties":false}` | See nested fields |
| `requiredMeasurement.metric` | `"heart_rate"` / `"sleep_duration"` / `"fatigue_rating"` / `"mood_rating"` / `"stress_rating"` / `"respiratory_rate"` / `"body_temperature"` / `"bp_systolic"` / `"bp_diastolic"` / `"spo2"` / `"blood_glucose"` / `"body_mass"` / `"body_height"` / `"ecg_pr"` / `"ecg_qrs"` / `"ecg_qt"` / `"ecg_qtc"` / `"ecg_rr_irregularity"` / `"hrv_rmssd"` / `"hrv_sdnn"` / `"lvef"` / `"lv_edv"` / `"lv_esv"` / `"lv_edv_indexed"` / `"lv_esv_indexed"` / `"muscle_thickness"` / `"bone_mineral_density"` / `"exercise_duration"` / `"exercise_mean_hr"` / `"exercise_peak_hr"` / `"cycling_power"` / `"perceived_exertion"` / `"vo2_relative"` / `"vo2max_relative"` / `"vo2_absolute"` / `"radiation_dose"` / `"radiation_dose_rate"` / `"symptom_report"` / `"injury_report"` / `"cabin_co2"` / `"cabin_o2"` / `"cabin_temperature"` / `"cabin_pressure"` / `"radiation_absorbed_dose"` / `"radiation_absorbed_dose_rate"` / `"cabin_co2_partial_pressure"` / `"cabin_o2_partial_pressure"` | yes | — | `"heart_rate"` |
| `requiredMeasurement.comparabilityKey` | string or null | yes | — | Illustrative string; obey pattern below |
| `completionObservationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `completionReportIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `explanation` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `sourceIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `idempotencyKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `episodeId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `createdAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `updatedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |

### AtlasRegion

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `regionKey` | string | yes | `{"minLength":1,"pattern":"^[a-z][a-z0-9_]*$"}` | Illustrative string; obey pattern below |
| `label` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `layer` | `"skeletal"` / `"muscular"` / `"organ"` / `"systemic"` | yes | — | `"skeletal"` |
| `laterality` | `"left"` / `"right"` / `"bilateral"` / `"midline"` / `"unknown"` or null | yes | — | `"left"` |
| `structureIds` | array of string | yes | — | See item fields/type |
| `verified` | boolean | yes | — | `false` |

### AtlasRegionManifest

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"AtlasRegionManifest"` | yes | — | `"AtlasRegionManifest"` |
| `manifestId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `manifestVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `asset` | object | yes | `{"required":["sourceURL","revision","contentHash","format","attributions","referenceLimitations","coordinateSystem","units","scale"],"additionalProperties":false}` | See nested fields |
| `asset.sourceURL` | string or null | yes | — | `https://example.org/evidence` |
| `asset.revision` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `asset.contentHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `asset.format` | `"unmapped"` / `"packed"` / `"gltf"` / `"other"` | yes | — | `"unmapped"` |
| `asset.attributions` | array of string | yes | — | See item fields/type |
| `asset.referenceLimitations` | array of string | yes | — | See item fields/type |
| `asset.coordinateSystem` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `asset.units` | `"m"` / `"mm"` | yes | — | `"m"` |
| `asset.scale` | number | yes | `{"exclusiveMinimum":0}` | `0` |
| `regions` | array of AtlasRegion | yes | — | See item fields/type |

### AtlasHighlight

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `recordType` | `"AtlasHighlight"` | yes | — | `"AtlasHighlight"` |
| `highlightId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":1}` | `1` |
| `astronautId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `regionKey` | string | yes | `{"minLength":1,"pattern":"^[a-z][a-z0-9_]*$"}` | Illustrative string; obey pattern below |
| `layer` | `"skeletal"` / `"muscular"` / `"organ"` / `"systemic"` | yes | — | `"skeletal"` |
| `severity` | `"info"` / `"watch"` / `"warning"` / `"critical"` | yes | — | `"info"` |
| `kind` | `"automatic"` / `"reported_site"` | yes | — | `"automatic"` |
| `reason` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `assessmentId` | string or null | yes | — | Illustrative string; obey pattern below |
| `ruleId` | string or null | yes | — | Illustrative string; obey pattern below |
| `ruleVersion` | string or null | yes | — | Illustrative string; obey pattern below |
| `observationIds` | array of string | yes | `{"uniqueItems":true}` | See item fields/type |
| `confidence` | number or null | yes | — | `0` |
| `confidenceKind` | `"unknown"` / `"heuristic"` / `"calibrated"` | yes | — | `"unknown"` |
| `limitations` | array of string | yes | — | See item fields/type |
| `since` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `lastEvaluatedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `expires` | string or null | yes | — | `2026-01-10T12:00:00Z` |
| `status` | `"active"` / `"recovering"` / `"cleared"` | yes | — | `"active"` |
| `dataOrigin` | `"synthetic"` / `"public_research"` / `"crew_measurement"` | yes | — | `"synthetic"` |
| `mode` | `"demo"` / `"operational"` | yes | — | `"demo"` |
| `manifestId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `manifestVersion` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |

### CanonicalRecord

Type/variants: CrewProfile or MissionContext or Observation or EnvironmentalObservation or MetricDefinition or SourceRecord or RawRecord or ValidationRun or Report or ExerciseSession or ImportBatch or Baseline or ComparisonResult or ThresholdRule or Assessment or FollowUpTask or AtlasRegionManifest or AtlasHighlight.

### RecordReference

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `recordType` | `"CrewProfile"` / `"MissionContext"` / `"Observation"` / `"EnvironmentalObservation"` / `"MetricDefinition"` / `"SourceRecord"` / `"RawRecord"` / `"ValidationRun"` / `"Report"` / `"ExerciseSession"` / `"ImportBatch"` / `"Baseline"` / `"ComparisonResult"` / `"ThresholdRule"` / `"Assessment"` / `"FollowUpTask"` / `"AtlasRegionManifest"` / `"AtlasHighlight"` | yes | — | `"CrewProfile"` |
| `recordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |

### ExpectedRevision

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `recordType` | `"CrewProfile"` / `"MissionContext"` / `"Observation"` / `"EnvironmentalObservation"` / `"MetricDefinition"` / `"SourceRecord"` / `"RawRecord"` / `"ValidationRun"` / `"Report"` / `"ExerciseSession"` / `"ImportBatch"` / `"Baseline"` / `"ComparisonResult"` / `"ThresholdRule"` / `"Assessment"` / `"FollowUpTask"` / `"AtlasRegionManifest"` / `"AtlasHighlight"` | yes | — | `"CrewProfile"` |
| `recordId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `revision` | integer | yes | `{"minimum":0}` | `0` |

### ImportKey

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `key` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `observationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `fingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |

### Subject

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `kind` | `"crew"` / `"mission"` / `"namespace"` | yes | — | `"crew"` |
| `astronautId` | string or null | yes | — | Illustrative string; obey pattern below |
| `missionId` | string or null | yes | — | Illustrative string; obey pattern below |

### CommandEnvelope

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `operationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `idempotencyKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `subject` | Subject | yes | — | See Subject |
| `createdAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `operation` | `"capture"` / `"import"` / `"upsert"` / `"correct"` / `"complete_task"` | yes | — | `"capture"` |
| `domain` | `"capture"` / `"profiles"` / `"sources"` / `"reports"` / `"sessions"` / `"baselines"` / `"assessments"` / `"tasks"` / `"environment"` / `"findings"` / `"configuration"` | yes | — | `"capture"` |
| `payload` | object | yes | `{"required":["records","expectedRevisions","importKeys","previewToken"],"additionalProperties":false}` | See nested fields |
| `payload.records` | array of CanonicalRecord | yes | — | See item fields/type |
| `payload.expectedRevisions` | array of ExpectedRevision | yes | — | See item fields/type |
| `payload.importKeys` | array of ImportKey | yes | — | See item fields/type |
| `payload.previewToken` | string or null | yes | — | Illustrative string; obey pattern below |

### ErrorEnvelope

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `code` | `"VALIDATION_FAILED"` / `"REFERENCE_INVALID"` / `"CONFLICT"` / `"UNSUPPORTED_UNIT"` / `"UNSUPPORTED_VERSION"` / `"UNSUPPORTED_CAPABILITY"` / `"STORAGE_UNAVAILABLE"` / `"STORAGE_QUOTA"` / `"STORAGE_EVICTED"` / `"STORAGE_FAILED"` / `"TRANSIENT_TRANSPORT"` | yes | — | `"VALIDATION_FAILED"` |
| `message` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `path` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `recoverable` | boolean | yes | — | `false` |
| `retryContext` | string or null | yes | — | Illustrative string; obey pattern below |

### EventEnvelope

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `eventId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `operationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `subject` | Subject | yes | — | See Subject |
| `sequence` | integer | yes | `{"minimum":1}` | `1` |
| `cursor` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `eventTime` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `receivedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `deliveryMode` | `"manual"` / `"file_import"` / `"live"` / `"replay"` | yes | — | `"manual"` |
| `payload` | object | yes | `{"required":["changedRecords"],"additionalProperties":false}` | See nested fields |
| `payload.changedRecords` | array of RecordReference | yes | — | See item fields/type |

### OperationReceipt

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `operationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `idempotencyKey` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |
| `digest` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `committedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `recordIds` | array of RecordReference | yes | — | See item fields/type |

### ImportLedgerEntry

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `key` | string | yes | `{"minLength":1}` | Illustrative string; obey pattern below |
| `fingerprint` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `observationId` | string | yes | `{"minLength":1,"pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$"}` | Illustrative string; obey pattern below |

### ExportSnapshot

| Field/path | Type or allowed values | Required | Constraints | Example/illustration |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `"0.1.0"` | yes | — | `"0.1.0"` |
| `namespace` | string | yes | `{"minLength":1,"pattern":"^(demo&#124;crew&#124;research:[A-Za-z0-9._-]+)$"}` | Illustrative string; obey pattern below |
| `exportedAt` | string | yes | `{"format":"date-time","pattern":"Z$"}` | `2026-01-10T12:00:00Z` |
| `records` | array of CanonicalRecord | yes | — | See item fields/type |
| `operationLedger` | array of OperationReceipt | yes | — | See item fields/type |
| `importLedger` | array of ImportLedgerEntry | yes | — | See item fields/type |
| `integrity` | object | yes | `{"required":["algorithm","contentHash","recordCount"],"additionalProperties":false}` | See nested fields |
| `integrity.algorithm` | `"sha256"` | yes | — | `"sha256"` |
| `integrity.contentHash` | string | yes | `{"pattern":"^[a-f0-9]{64}$"}` | Illustrative string; obey pattern below |
| `integrity.recordCount` | integer | yes | `{"minimum":0}` | `0` |
