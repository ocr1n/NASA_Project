/* Generated from v0.1.0.schema.json. Run npm run generate; never edit this file. */

/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Quality".
 */
export type Quality = Quality1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ValidationEnvelope".
 */
export type ValidationEnvelope = ValidationEnvelope1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "SourceRecord".
 */
export type SourceRecord = SourceRecord1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "MissionContext".
 */
export type MissionContext = MissionContext1 & MissionContext2;
export type MissionContext1 =
  | {
      missionStart?: string;
    }
  | {
      scenarioClock?: string;
    };
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Observation".
 */
export type Observation = (
  | {
      timePrecision?: 'exact';
      timestamp?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'date';
      timestamp?: null;
      originalTime?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'mission_relative';
      timestamp?: null;
      missionAnchor?: {
        missionId: string;
        missionDay: number;
        secondsIntoDay: number | null;
      };
    }
  | {
      timePrecision?: 'unknown';
      timestamp?: null;
      timeReason?: string;
      missionAnchor?: null;
    }
) &
  (
    | {
        metric?: 'heart_rate';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'sleep_duration';
        valueKind?: 'number';
        unit?: 'h';
        value?: number | null;
      }
    | {
        metric?: 'fatigue_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'fatigue_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'mood_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'mood_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'stress_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'stress_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'respiratory_rate';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'body_temperature';
        valueKind?: 'number';
        unit?: 'Cel';
        value?: number | null;
      }
    | {
        metric?: 'bp_systolic';
        valueKind?: 'number';
        unit?: 'mm[Hg]';
        value?: number | null;
      }
    | {
        metric?: 'bp_diastolic';
        valueKind?: 'number';
        unit?: 'mm[Hg]';
        value?: number | null;
      }
    | {
        metric?: 'spo2';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'blood_glucose';
        valueKind?: 'number';
        unit?: 'mg/dL';
        value?: number | null;
      }
    | {
        metric?: 'body_mass';
        valueKind?: 'number';
        unit?: 'kg';
        value?: number | null;
      }
    | {
        metric?: 'body_height';
        valueKind?: 'number';
        unit?: 'cm';
        value?: number | null;
      }
    | {
        metric?: 'ecg_pr';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qrs';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qt';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qtc';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_rr_irregularity';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'ecg_rr_irregularity';
        valueKind?: 'boolean';
        unit?: null;
        value?: boolean | null;
      }
    | {
        metric?: 'hrv_rmssd';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'hrv_sdnn';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'lvef';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'lv_edv';
        valueKind?: 'number';
        unit?: 'mL';
        value?: number | null;
      }
    | {
        metric?: 'lv_esv';
        valueKind?: 'number';
        unit?: 'mL';
        value?: number | null;
      }
    | {
        metric?: 'lv_edv_indexed';
        valueKind?: 'number';
        unit?: 'mL/m2';
        value?: number | null;
      }
    | {
        metric?: 'lv_esv_indexed';
        valueKind?: 'number';
        unit?: 'mL/m2';
        value?: number | null;
      }
    | {
        metric?: 'muscle_thickness';
        valueKind?: 'number';
        unit?: 'mm';
        value?: number | null;
      }
    | {
        metric?: 'bone_mineral_density';
        valueKind?: 'number';
        unit?: 'g/cm2';
        value?: number | null;
      }
    | {
        metric?: 'exercise_duration';
        valueKind?: 'number';
        unit?: 'min';
        value?: number | null;
      }
    | {
        metric?: 'exercise_mean_hr';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'exercise_peak_hr';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'cycling_power';
        valueKind?: 'number';
        unit?: 'W';
        value?: number | null;
      }
    | {
        metric?: 'perceived_exertion';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'perceived_exertion';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'vo2_relative';
        valueKind?: 'number';
        unit?: 'mL/(kg.min)';
        value?: number | null;
      }
    | {
        metric?: 'vo2max_relative';
        valueKind?: 'number';
        unit?: 'mL/(kg.min)';
        value?: number | null;
      }
    | {
        metric?: 'vo2_absolute';
        valueKind?: 'number';
        unit?: 'L/min';
        value?: number | null;
      }
    | {
        metric?: 'radiation_dose';
        valueKind?: 'number';
        unit?: 'mSv';
        value?: number | null;
      }
    | {
        metric?: 'radiation_dose_rate';
        valueKind?: 'number';
        unit?: 'mSv/h';
        value?: number | null;
      }
    | {
        metric?: 'symptom_report';
        valueKind?: 'structured';
        unit?: null;
        value?: ReportValue | null;
      }
    | {
        metric?: 'injury_report';
        valueKind?: 'structured';
        unit?: null;
        value?: ReportValue | null;
      }
    | {
        metric?: 'cabin_co2';
        valueKind?: 'number';
        unit?: '[ppm]';
        value?: number | null;
      }
    | {
        metric?: 'cabin_o2';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'cabin_temperature';
        valueKind?: 'number';
        unit?: 'Cel';
        value?: number | null;
      }
    | {
        metric?: 'cabin_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
    | {
        metric?: 'radiation_absorbed_dose';
        valueKind?: 'number';
        unit?: 'mGy';
        value?: number | null;
      }
    | {
        metric?: 'radiation_absorbed_dose_rate';
        valueKind?: 'number';
        unit?: 'mGy/h';
        value?: number | null;
      }
    | {
        metric?: 'cabin_co2_partial_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
    | {
        metric?: 'cabin_o2_partial_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
  ) &
  (
    | {
        dataOrigin?: 'synthetic' | 'crew_measurement';
        astronautId?: string;
        missionId?: string;
        publicSubjectId?: null;
        datasetId?: null;
      }
    | {
        dataOrigin?: 'public_research';
        astronautId?: null;
        missionId?: null;
        publicSubjectId?: string;
        datasetId?: string;
      }
  ) &
  Observation1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EnvironmentalObservation".
 */
export type EnvironmentalObservation = (
  | {
      timePrecision?: 'exact';
      timestamp?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'date';
      timestamp?: null;
      originalTime?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'mission_relative';
      timestamp?: null;
      missionAnchor?: {
        missionId: string;
        missionDay: number;
        secondsIntoDay: number | null;
      };
    }
  | {
      timePrecision?: 'unknown';
      timestamp?: null;
      timeReason?: string;
      missionAnchor?: null;
    }
) &
  (
    | {
        metric?: 'heart_rate';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'sleep_duration';
        valueKind?: 'number';
        unit?: 'h';
        value?: number | null;
      }
    | {
        metric?: 'fatigue_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'fatigue_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'mood_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'mood_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'stress_rating';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'stress_rating';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'respiratory_rate';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'body_temperature';
        valueKind?: 'number';
        unit?: 'Cel';
        value?: number | null;
      }
    | {
        metric?: 'bp_systolic';
        valueKind?: 'number';
        unit?: 'mm[Hg]';
        value?: number | null;
      }
    | {
        metric?: 'bp_diastolic';
        valueKind?: 'number';
        unit?: 'mm[Hg]';
        value?: number | null;
      }
    | {
        metric?: 'spo2';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'blood_glucose';
        valueKind?: 'number';
        unit?: 'mg/dL';
        value?: number | null;
      }
    | {
        metric?: 'body_mass';
        valueKind?: 'number';
        unit?: 'kg';
        value?: number | null;
      }
    | {
        metric?: 'body_height';
        valueKind?: 'number';
        unit?: 'cm';
        value?: number | null;
      }
    | {
        metric?: 'ecg_pr';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qrs';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qt';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_qtc';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'ecg_rr_irregularity';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'ecg_rr_irregularity';
        valueKind?: 'boolean';
        unit?: null;
        value?: boolean | null;
      }
    | {
        metric?: 'hrv_rmssd';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'hrv_sdnn';
        valueKind?: 'number';
        unit?: 'ms';
        value?: number | null;
      }
    | {
        metric?: 'lvef';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'lv_edv';
        valueKind?: 'number';
        unit?: 'mL';
        value?: number | null;
      }
    | {
        metric?: 'lv_esv';
        valueKind?: 'number';
        unit?: 'mL';
        value?: number | null;
      }
    | {
        metric?: 'lv_edv_indexed';
        valueKind?: 'number';
        unit?: 'mL/m2';
        value?: number | null;
      }
    | {
        metric?: 'lv_esv_indexed';
        valueKind?: 'number';
        unit?: 'mL/m2';
        value?: number | null;
      }
    | {
        metric?: 'muscle_thickness';
        valueKind?: 'number';
        unit?: 'mm';
        value?: number | null;
      }
    | {
        metric?: 'bone_mineral_density';
        valueKind?: 'number';
        unit?: 'g/cm2';
        value?: number | null;
      }
    | {
        metric?: 'exercise_duration';
        valueKind?: 'number';
        unit?: 'min';
        value?: number | null;
      }
    | {
        metric?: 'exercise_mean_hr';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'exercise_peak_hr';
        valueKind?: 'number';
        unit?: '/min';
        value?: number | null;
      }
    | {
        metric?: 'cycling_power';
        valueKind?: 'number';
        unit?: 'W';
        value?: number | null;
      }
    | {
        metric?: 'perceived_exertion';
        valueKind?: 'number';
        unit?: '1';
        value?: number | null;
      }
    | {
        metric?: 'perceived_exertion';
        valueKind?: 'coded';
        unit?: null;
        value?: CodedValue | null;
      }
    | {
        metric?: 'vo2_relative';
        valueKind?: 'number';
        unit?: 'mL/(kg.min)';
        value?: number | null;
      }
    | {
        metric?: 'vo2max_relative';
        valueKind?: 'number';
        unit?: 'mL/(kg.min)';
        value?: number | null;
      }
    | {
        metric?: 'vo2_absolute';
        valueKind?: 'number';
        unit?: 'L/min';
        value?: number | null;
      }
    | {
        metric?: 'radiation_dose';
        valueKind?: 'number';
        unit?: 'mSv';
        value?: number | null;
      }
    | {
        metric?: 'radiation_dose_rate';
        valueKind?: 'number';
        unit?: 'mSv/h';
        value?: number | null;
      }
    | {
        metric?: 'symptom_report';
        valueKind?: 'structured';
        unit?: null;
        value?: ReportValue | null;
      }
    | {
        metric?: 'injury_report';
        valueKind?: 'structured';
        unit?: null;
        value?: ReportValue | null;
      }
    | {
        metric?: 'cabin_co2';
        valueKind?: 'number';
        unit?: '[ppm]';
        value?: number | null;
      }
    | {
        metric?: 'cabin_o2';
        valueKind?: 'number';
        unit?: '%';
        value?: number | null;
      }
    | {
        metric?: 'cabin_temperature';
        valueKind?: 'number';
        unit?: 'Cel';
        value?: number | null;
      }
    | {
        metric?: 'cabin_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
    | {
        metric?: 'radiation_absorbed_dose';
        valueKind?: 'number';
        unit?: 'mGy';
        value?: number | null;
      }
    | {
        metric?: 'radiation_absorbed_dose_rate';
        valueKind?: 'number';
        unit?: 'mGy/h';
        value?: number | null;
      }
    | {
        metric?: 'cabin_co2_partial_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
    | {
        metric?: 'cabin_o2_partial_pressure';
        valueKind?: 'number';
        unit?: 'kPa';
        value?: number | null;
      }
  ) &
  EnvironmentalObservation1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "RawRecord".
 */
export type RawRecord = RawRecord1 & RawRecord2;
export type RawRecord1 =
  | {
      payload?: string;
      fileReference?: null;
    }
  | {
      payload?: null;
      fileReference?: string;
    };
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Report".
 */
export type Report = (
  | {
      timePrecision?: 'exact';
      timestamp?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'date';
      timestamp?: null;
      originalTime?: string;
      missionAnchor?: null;
    }
  | {
      timePrecision?: 'mission_relative';
      timestamp?: null;
      missionAnchor?: {
        missionId: string;
        missionDay: number;
        secondsIntoDay: number | null;
      };
    }
  | {
      timePrecision?: 'unknown';
      timestamp?: null;
      timeReason?: string;
      missionAnchor?: null;
    }
) &
  Report1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseSession".
 */
export type ExerciseSession = ExerciseSession1 & ExerciseSession2;
export type ExerciseSession1 =
  | {
      startAt?: string;
      endAt?: string;
    }
  | {
      durationMinutes?: number;
    };
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Baseline".
 */
export type Baseline = Baseline1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ComparisonResult".
 */
export type ComparisonResult = ComparisonResult1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "CanonicalRecord".
 */
export type CanonicalRecord =
  | CrewProfile
  | MissionContext
  | Observation
  | EnvironmentalObservation
  | MetricDefinition
  | SourceRecord
  | RawRecord
  | ValidationRun
  | Report
  | ExerciseSession
  | ImportBatch
  | Baseline
  | ComparisonResult
  | ThresholdRule
  | Assessment
  | FollowUpTask
  | AtlasRegionManifest
  | AtlasHighlight;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ThresholdRule".
 */
export type ThresholdRule = ThresholdRule1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Assessment".
 */
export type Assessment = Assessment1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "FollowUpTask".
 */
export type FollowUpTask = FollowUpTask1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "AtlasRegion".
 */
export type AtlasRegion = AtlasRegion1;
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "AtlasHighlight".
 */
export type AtlasHighlight = AtlasHighlight1;

export interface FoundationContracts {
  Quality?: Quality;
  ValidationEnvelope?: ValidationEnvelope;
  Scale?: Scale;
  MeasurementContext?: MeasurementContext;
  ReportValue?: ReportValue;
  CodedValue?: CodedValue;
  Provenance?: Provenance;
  SourceSnapshot?: SourceSnapshot;
  SourceRecord?: SourceRecord;
  CrewProfile?: CrewProfile;
  MissionContext?: MissionContext;
  MetricDefinition?: MetricDefinition;
  Observation?: Observation;
  EnvironmentalObservation?: EnvironmentalObservation;
  RawRecord?: RawRecord;
  EvidenceGroup?: EvidenceGroup;
  ValidationRun?: ValidationRun;
  Report?: Report;
  ExerciseSession?: ExerciseSession;
  ExerciseReportedTime?: ExerciseReportedTime;
  ExerciseMetricInput?: ExerciseMetricInput;
  ExerciseCaptureContent?: ExerciseCaptureContent;
  ExerciseCaptureEvidence?: ExerciseCaptureEvidence;
  ExerciseNoteAmendment?: ExerciseNoteAmendment;
  EcgMetricInput?: EcgMetricInput;
  EcgCaptureContent?: EcgCaptureContent;
  EcgCaptureEvidence?: EcgCaptureEvidence;
  EcgDraftContent?: EcgDraftContent;
  ReportMetricInput?: ReportMetricInput;
  ReportCaptureContent?: ReportCaptureContent;
  ReportCaptureEvidence?: ReportCaptureEvidence;
  DemoScenarioReading?: DemoScenarioReading;
  DemoScenarioInput?: DemoScenarioInput;
  DemoScenarioResponse?: DemoScenarioResponse;
  DemoScenarioState?: DemoScenarioState;
  ImportBatch?: ImportBatch;
  CollectionAttemptEvidence?: CollectionAttemptEvidence;
  Window?: Window;
  Exclusion?: Exclusion;
  Baseline?: Baseline;
  ComparisonResult?: ComparisonResult;
  BaselinePolicy?: BaselinePolicy;
  BaselineRequest?: BaselineRequest;
  BaselineComputationDetail?: BaselineComputationDetail;
  BaselineComputation?: BaselineComputation;
  SavedBaselineCalculation?: SavedBaselineCalculation;
  PersonalComparisonEvidence?: PersonalComparisonEvidence;
  TrendRequest?: TrendRequest;
  TrendPoint?: TrendPoint;
  TrendProjection?: TrendProjection;
  HistoricalCohort?: HistoricalCohort;
  HistoricalComparison?: HistoricalComparison;
  EcgResearchField?: EcgResearchField;
  EcgResearchRow?: EcgResearchRow;
  EcgResearchEvidence?: EcgResearchEvidence;
  EcgResearchPreview?: EcgResearchPreview;
  ThresholdRule?: ThresholdRule;
  Assessment?: Assessment;
  FollowUpTask?: FollowUpTask;
  AtlasRegion?: AtlasRegion;
  AtlasRegionManifest?: AtlasRegionManifest;
  AtlasHighlight?: AtlasHighlight;
  CanonicalRecord?: CanonicalRecord;
  RecordReference?: RecordReference;
  ExpectedRevision?: ExpectedRevision;
  ImportKey?: ImportKey;
  Subject?: Subject;
  CommandEnvelope?: CommandEnvelope;
  ErrorEnvelope?: ErrorEnvelope;
  EventEnvelope?: EventEnvelope;
  OperationReceipt?: OperationReceipt;
  ImportLedgerEntry?: ImportLedgerEntry;
  ExportSnapshot?: ExportSnapshot;
}
export interface Quality1 {
  score: number | null;
  method: string;
  flags: string[];
  lowConfidence: boolean;
}
export interface ValidationEnvelope1 {
  status: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
  validationRunId: string;
  evidenceIds: string[];
  procedureVersion: string;
  issues: string[];
  admission: 'quarantined' | 'research_sandbox' | 'demo_only' | 'assessment_eligible';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Scale".
 */
export interface Scale {
  scaleId: string;
  version: string;
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "MeasurementContext".
 */
export interface MeasurementContext {
  modality?: string | null;
  deviceId?: string | null;
  protocolId?: string | null;
  method?: string | null;
  posture?: string | null;
  activity?: string | null;
  site?: string | null;
  lead?: string | null;
  view?: string | null;
  qtcCorrection?: string | null;
  artifactHandling?: string | null;
  statistic?: string | null;
  doseQuantity?: string | null;
  oxygenContext?: string | null;
  mealContext?: string | null;
  gravityCondition?: string | null;
  workload?: string | null;
  indexing?: string | null;
  missionPhase?: string | null;
  laterality?: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  windowSeconds?: number | null;
  intervalSeconds?: number | null;
  scale?: Scale | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ReportValue".
 */
export interface ReportValue {
  code: string;
  text: string;
  site: string | null;
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  certainty: 'reported' | 'uncertain' | 'confirmed_by_report';
  author: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "CodedValue".
 */
export interface CodedValue {
  code: string;
  label: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Provenance".
 */
export interface Provenance {
  rawRecordId: string;
  contentHash: string;
  sourceRecordId: string;
  importBatchId: string | null;
  pipelineVersion: string;
  algorithm: string | null;
  parameters: {
    [k: string]: string | number | boolean | null;
  };
  originalUnit: string | null;
  originalValue: number | string | boolean | {} | null;
  evidenceObservationIds: string[];
  windowIds: string[];
  originalSamplingHz: number | null;
  outputSamplingHz: number | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "SourceSnapshot".
 */
export interface SourceSnapshot {
  schemaVersion: '0.1.0';
  sourceId: string;
  name: string;
  tier: 'nasa' | 'agency_partner' | 'peer_reviewed' | 'third_party' | 'device' | 'crew_report' | 'simulation';
  canonicalURL: string | null;
  version: string;
  license: string;
  attribution: string;
  retrievedAt: string;
}
export interface SourceRecord1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'SourceRecord';
  sourceId: string;
  revision: number;
  name: string;
  tier: 'nasa' | 'agency_partner' | 'peer_reviewed' | 'third_party' | 'device' | 'crew_report' | 'simulation';
  canonicalURL: string | null;
  doi: string | null;
  publisher: string;
  host: string;
  version: string;
  license: string;
  attribution: string;
  accessRestrictions: string[];
  retrievedAt: string;
  supportedMetrics: string[];
  purpose: string;
  nasaSearchEvidence: string[];
  fallbackReason: string | null;
  lineageIds: string[];
  reviewStatus: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "CrewProfile".
 */
export interface CrewProfile {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'CrewProfile';
  astronautId: string;
  revision: number;
  alias: string;
  missionId: string;
  missionStart: string | null;
  displayTimeZone: string;
  preferences: {
    locale: string;
    reducedMotion: boolean;
  };
  bodyHeightObservationId: string | null;
  bodyMassObservationId: string | null;
  profileOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  createdAt: string;
  updatedAt: string;
}
export interface MissionContext2 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'MissionContext';
  missionId: string;
  revision: number;
  label: string;
  environmentType: 'ground' | 'iss' | 'lunar' | 'mars_transit' | 'other';
  missionStart: string | null;
  scenarioClock: string | null;
  missionPhase: string;
  location: string;
  schedule: {
    scheduleId: string;
    label: string;
    context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
    intervalSeconds: number;
  }[];
  communicationScenario: {
    oneWayDelaySeconds: number;
    label: string;
  } | null;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  sourceIds: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "MetricDefinition".
 */
export interface MetricDefinition {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'MetricDefinition';
  metric: string;
  revision: number;
  label: string;
  valueKinds: ('number' | 'boolean' | 'coded' | 'structured')[];
  canonicalUnit: string | null;
  allowedInputUnits: string[];
  conversions: {
    inputUnit: string;
    factor: number;
    offset: number;
    evidenceURL: string;
  }[];
  category: 'daily' | 'cardiac' | 'exercise' | 'additional' | 'environment';
  requiredContext: string[];
  missingValueBehavior: 'explicit_reason';
  provenanceRequirements: string[];
  comparabilityKeys: string[];
  regionAssociations: string[];
  definitionStatus: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
  definitionEvidence: string[];
  displayPrecision: number;
}
export interface Observation1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'Observation';
  observationId: string;
  revision: number;
  astronautId: string | null;
  missionId: string | null;
  publicSubjectId: string | null;
  datasetId: string | null;
  timestamp: string | null;
  timePrecision: 'exact' | 'date' | 'mission_relative' | 'unknown';
  originalTime: string | null;
  timeReason: string | null;
  missionAnchor: {
    missionId: string;
    missionDay: number;
    secondsIntoDay: number | null;
  } | null;
  receivedAt: string | null;
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  valueKind: 'number' | 'boolean' | 'coded' | 'structured';
  value: unknown;
  unit: string | null;
  missingReason: string | null;
  context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
  measurementContext: MeasurementContext;
  source: SourceSnapshot;
  quality: Quality;
  validation: ValidationEnvelope;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  deliveryMode: 'manual' | 'file_import' | 'live' | 'replay';
  synthetic: boolean;
  era: string;
  provenance: Provenance;
  acquisitionId: string | null;
  regionKey: string | null;
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  reportId: string | null;
  sessionId: string | null;
  supersedesObservationId: string | null;
}
export interface EnvironmentalObservation1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'EnvironmentalObservation';
  environmentalObservationId: string;
  revision: number;
  missionId: string;
  instrumentId: string;
  location: string;
  observedFrom: string;
  observedTo: string;
  timestamp: string | null;
  timePrecision: 'exact' | 'date' | 'mission_relative' | 'unknown';
  originalTime: string | null;
  timeReason: string | null;
  missionAnchor: {
    missionId: string;
    missionDay: number;
    secondsIntoDay: number | null;
  } | null;
  receivedAt: string | null;
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  valueKind: 'number' | 'boolean' | 'coded' | 'structured';
  value: unknown;
  unit: string | null;
  missingReason: string | null;
  context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
  measurementContext: MeasurementContext;
  source: SourceSnapshot;
  quality: Quality;
  validation: ValidationEnvelope;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  deliveryMode: 'manual' | 'file_import' | 'live' | 'replay';
  synthetic: boolean;
  era: string;
  provenance: Provenance;
  acquisitionId: string | null;
  regionKey: string | null;
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
}
export interface RawRecord2 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'RawRecord';
  rawRecordId: string;
  revision: number;
  sourceId: string;
  acquisitionId: string | null;
  importBatchId: string | null;
  payload: string | null;
  fileReference: string | null;
  contentHash: string;
  mediaType: string;
  encoding: string;
  retrievedAt: string;
  retentionPolicy: string;
  accessPolicy: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EvidenceGroup".
 */
export interface EvidenceGroup {
  lineageId: string;
  /**
   * @minItems 1
   */
  sourceIds: string[];
  /**
   * @minItems 1
   */
  locations: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ValidationRun".
 */
export interface ValidationRun {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'ValidationRun';
  validationRunId: string;
  revision: number;
  claim: string;
  subjectRecordIds: string[];
  sourceIds: string[];
  ruleIds: string[];
  independentEvidenceGroups: EvidenceGroup[];
  sourcesChecked: string[];
  normalization: string;
  toleranceDefinition: {
    value: number;
    unit: string;
    justification: string;
  } | null;
  structuralResults: string[];
  methodComparisons: string[];
  conflicts: string[];
  limitations: string[];
  status: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
  admission: 'quarantined' | 'research_sandbox' | 'demo_only' | 'assessment_eligible';
  reviewer: string;
  procedureVersion: string;
  pipelineVersion: string;
  runAt: string;
}
export interface Report1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'Report';
  reportId: string;
  revision: number;
  astronautId: string | null;
  publicSubjectId: string | null;
  missionId: string | null;
  type: 'ecg' | 'echo' | 'muscle' | 'dxa' | 'other';
  timestamp: string | null;
  timePrecision: 'exact' | 'date' | 'mission_relative' | 'unknown';
  originalTime: string | null;
  timeReason: string | null;
  missionAnchor: {
    missionId: string;
    missionDay: number;
    secondsIntoDay: number | null;
  } | null;
  sourceId: string;
  observationIds: string[];
  method: string;
  deviceId: string | null;
  lead: string | null;
  view: string | null;
  site: string | null;
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  originalReportRawRecordId: string;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
}
export interface ExerciseSession2 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'ExerciseSession';
  sessionId: string;
  revision: number;
  astronautId: string;
  missionId: string;
  activity: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  workload: string | null;
  protocolId: string;
  observationIds: string[];
  sourceId: string;
  sourceSessionId: string;
  notes: string | null;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseReportedTime".
 */
export interface ExerciseReportedTime {
  precision: 'exact' | 'date' | 'unknown';
  text: string;
  reason: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseMetricInput".
 */
export interface ExerciseMetricInput {
  metric: 'exercise_duration' | 'perceived_exertion' | 'exercise_mean_hr' | 'exercise_peak_hr' | 'cycling_power';
  input: string;
  unit: string;
  missingReason: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseCaptureContent".
 */
export interface ExerciseCaptureContent {
  sessionKey: string;
  crewId: string;
  activity: string;
  workload: string | null;
  protocolId: string;
  time: ExerciseReportedTime;
  deviceId: string | null;
  posture: string | null;
  /**
   * @minItems 5
   * @maxItems 5
   */
  values: ExerciseMetricInput[];
  extraColumns: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseCaptureEvidence".
 */
export interface ExerciseCaptureEvidence {
  protocolVersion: 'exercise-capture/1';
  sessionId: string;
  astronautId: string;
  missionId: string;
  sourceId: string;
  content: ExerciseCaptureContent;
  contentFingerprint: string;
  receivedAt: string;
  deliveryMode: 'manual' | 'file_import';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExerciseNoteAmendment".
 */
export interface ExerciseNoteAmendment {
  protocolVersion: 'exercise-notes/1';
  sessionId: string;
  astronautId: string;
  missionId: string;
  sequence: number;
  previousRawRecordId: string | null;
  text: string;
  recordedAt: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgMetricInput".
 */
export interface EcgMetricInput {
  metric: 'heart_rate' | 'ecg_pr' | 'ecg_qrs' | 'ecg_qt' | 'ecg_qtc' | 'hrv_sdnn' | 'hrv_rmssd';
  input: string;
  unit: string;
  missingReason: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgCaptureContent".
 */
export interface EcgCaptureContent {
  reportKey: string;
  crewId: string;
  time: ExerciseReportedTime;
  lead: string;
  method: string;
  deviceId: string | null;
  protocolId: string | null;
  posture: string | null;
  context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
  missionPhase: 'preflight' | 'inflight' | 'postflight' | 'unknown';
  qtcCorrection: string | null;
  hrvMethod: string | null;
  windowSeconds: number | null;
  artifactHandling: string | null;
  qualityNotes: string;
  /**
   * @minItems 7
   * @maxItems 7
   */
  values: EcgMetricInput[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgCaptureEvidence".
 */
export interface EcgCaptureEvidence {
  protocolVersion: 'ecg-report/1';
  reportId: string;
  astronautId: string;
  missionId: string;
  sourceId: string;
  content: EcgCaptureContent;
  contentFingerprint: string;
  receivedAt: string;
  deliveryMode: 'manual';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgDraftContent".
 */
export interface EcgDraftContent {
  reportKey: string;
  crewId: string;
  time: ExerciseReportedTime;
  lead: string;
  method: string;
  deviceId: string | null;
  protocolId: string | null;
  posture: string | null;
  context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
  missionPhase: 'preflight' | 'inflight' | 'postflight' | 'unknown';
  qtcCorrection: string | null;
  hrvMethod: string | null;
  windowSeconds: number | null;
  artifactHandling: string | null;
  qualityNotes: string;
  /**
   * @minItems 7
   * @maxItems 7
   */
  values: EcgMetricInput[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ReportMetricInput".
 */
export interface ReportMetricInput {
  metric: 'lvef' | 'lv_edv' | 'lv_esv' | 'lv_edv_indexed' | 'lv_esv_indexed' | 'muscle_thickness';
  input: string;
  unit: string;
  missingReason: string | null;
  indexing: ('unindexed' | 'body_surface_area' | 'unknown') | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ReportCaptureContent".
 */
export interface ReportCaptureContent {
  namespace: string;
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  astronautId: string | null;
  missionId: string | null;
  publicSubjectId: string | null;
  datasetId: string | null;
  sourceId: string;
  reportKey: string;
  type: 'echo' | 'muscle';
  time: ExerciseReportedTime;
  context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
  missionPhase: string | null;
  method: string;
  view: string | null;
  deviceId: string | null;
  probeId: string | null;
  posture: string | null;
  protocolId: string | null;
  muscle: string | null;
  site: string | null;
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  quality: Quality;
  limitations: string[];
  originalReport: string;
  /**
   * @minItems 1
   * @maxItems 5
   */
  values: ReportMetricInput[];
  extraColumns: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ReportCaptureEvidence".
 */
export interface ReportCaptureEvidence {
  protocolVersion: 'ultrasound-report/1';
  reportId: string;
  content: ReportCaptureContent;
  contentFingerprint: string;
  receivedAt: string;
  deliveryMode: 'manual' | 'file_import';
  originalFileRawRecordId: string | null;
  originalFileHash: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "DemoScenarioReading".
 */
export interface DemoScenarioReading {
  timestamp: string;
  value: number | null;
  qualityScore: number | null;
  lowConfidence: boolean;
  site: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "DemoScenarioInput".
 */
export interface DemoScenarioInput {
  protocolVersion: 'atlas-demo-input/1';
  scenarioId: string;
  title: string;
  description: string;
  crewId: 'crew-a' | 'crew-b';
  kind: 'bone' | 'muscle' | 'systemic';
  initialCount: number;
  /**
   * @minItems 3
   * @maxItems 3
   */
  reference: number[];
  /**
   * @minItems 1
   * @maxItems 12
   */
  readings: DemoScenarioReading[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "DemoScenarioResponse".
 */
export interface DemoScenarioResponse {
  site: 'confirmed' | 'uncertain';
  acquisition: 'confirmed' | 'uncertain';
  notes: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "DemoScenarioState".
 */
export interface DemoScenarioState {
  protocolVersion: 'atlas-demo-state/1';
  input: DemoScenarioInput;
  appliedCount: number;
  sequence: number;
  previousRawRecordId: string | null;
  baselineId: string;
  response: DemoScenarioResponse | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ImportBatch".
 */
export interface ImportBatch {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'ImportBatch';
  importBatchId: string;
  revision: number;
  sourceId: string;
  sourceVersion: string;
  fileHash: string;
  parser: string;
  parserVersion: string;
  mapping: {
    sourceColumn: string;
    canonicalField: string;
  }[];
  previewToken: string;
  previewState: 'previewed' | 'committed';
  acceptedRows: number;
  rejectedRows: number;
  quarantinedRows: number;
  errors: {
    row: number;
    field: string;
    code: string;
    message: string;
  }[];
  stableSourceRecordKeys: string[];
  importedAt: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "CollectionAttemptEvidence".
 */
export interface CollectionAttemptEvidence {
  protocolVersion: 'collection-attempt/1';
  astronautId: string;
  missionId: string;
  sourceId: string;
  schedule: {
    scheduleId: 'fictional-context-7d' | 'fictional-ecg-30d' | 'fictional-echo-30d';
    label: string;
    context: 'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown';
    intervalSeconds: number;
  };
  slotIndex: number;
  dueAt: string;
  sequence: number;
  previousRawRecordId: string | null;
  outcome: 'recorded' | 'missing' | 'skipped' | 'device_failed';
  reason: string;
  time: {
    precision: 'exact' | 'date' | 'unknown';
    text: string;
    reason: string;
  };
  observationIds: string[];
  reportIds: string[];
  recordedAt: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Window".
 */
export interface Window {
  from: string | null;
  to: string | null;
  precision: 'exact' | 'date' | 'unknown';
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Exclusion".
 */
export interface Exclusion {
  observationId: string;
  reason: string;
}
export interface Baseline1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'Baseline';
  baselineId: string;
  revision: number;
  astronautId: string;
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  unit: string | null;
  comparabilityKey: string | null;
  comparabilityVersion: '0.1.0';
  method: 'preflight_median' | 'preflight_anchor' | 'mission_rolling';
  observationIds: string[];
  window: Window;
  sampleCount: number;
  center: number | null;
  spread: number | null;
  qualityCriteria: string;
  admissionCriteria: string;
  exclusions: Exclusion[];
  calculatedAt: string;
  algorithmVersion: string;
  status:
    'available' | 'insufficient_data' | 'baseline_unavailable' | 'incomparable' | 'unsupported' | 'stale' | 'invalid';
  reasons: string[];
}
export interface ComparisonResult1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'ComparisonResult';
  comparisonId: string;
  revision: number;
  astronautId: string;
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  observationIds: string[];
  baselineId: string | null;
  referenceIds: string[];
  comparabilityKey: string | null;
  availability:
    'available' | 'insufficient_data' | 'baseline_unavailable' | 'incomparable' | 'unsupported' | 'stale' | 'invalid';
  reasons: string[];
  absoluteDelta: number | null;
  relativeDelta: number | null;
  percentagePointDelta: number | null;
  trend: {
    slope: number;
    unit: string;
    method: string;
  } | null;
  sampleCount: number;
  coverage: number;
  qualitySummary: string;
  validationSummary: string;
  algorithmVersion: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "BaselinePolicy".
 */
export interface BaselinePolicy {
  protocolVersion: 'baseline-policy/1';
  version: string;
  demoOnly: true;
  minimumSamples: number;
  minimumSpreadSamples: number;
  minimumQualityScore: number;
  cadenceSeconds: number | null;
  spreadMethod: 'raw_mad';
  /**
   * @minItems 2
   */
  methodEvidenceURLs: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "BaselineRequest".
 */
export interface BaselineRequest {
  protocolVersion: 'baseline-request/1';
  namespace: 'demo' | 'crew';
  astronautId: string;
  missionId: string;
  dataOrigin: 'synthetic' | 'crew_measurement';
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  method: 'preflight_median' | 'preflight_anchor' | 'mission_rolling';
  missionPhase: string;
  selectorObservationId: string;
  anchorObservationId: string | null;
  window: Window;
  currentObservationIds: string[];
  exclusions: Exclusion[];
  excludedPeriods: {
    window: Window;
    reason: string;
  }[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "BaselineComputationDetail".
 */
export interface BaselineComputationDetail {
  protocolVersion: 'baseline-computation/1';
  request: BaselineRequest;
  policy: BaselinePolicy;
  inputHash: string;
  seriesKey: string | null;
  operationalInterpretation: false;
  effectiveWindow: Window;
  expectedSlots: number | null;
  occupiedSlots: number | null;
  coverage: number | null;
  uncertainty: string[];
  diagnostics: string[];
  inputRecords: {
    observationId: string;
    hash: string;
    sourceId: string;
    sourceVersion: string;
    sourceRecordId: string;
    rawRecordId: string;
    acquisitionId: string | null;
    timestamp: string | null;
    originalTime: string | null;
    timePrecision: 'exact' | 'date' | 'mission_relative' | 'unknown';
  }[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "BaselineComputation".
 */
export interface BaselineComputation {
  baseline: Baseline;
  detail: BaselineComputationDetail;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "SavedBaselineCalculation".
 */
export interface SavedBaselineCalculation {
  protocolVersion: 'saved-baseline/1';
  seriesId: string;
  sequence: number;
  previousRawRecordId: string | null;
  sourceId: string;
  reason: string;
  savedAt: string;
  snapshotObservationIds: string[];
  computation: BaselineComputation;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "PersonalComparisonEvidence".
 */
export interface PersonalComparisonEvidence {
  protocolVersion: 'personal-comparison/1';
  comparison: ComparisonResult;
  current: Observation;
  reference: BaselineComputation | null;
  coverage: number | null;
  limitations: string[];
  operationalInterpretation: false;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "TrendRequest".
 */
export interface TrendRequest {
  protocolVersion: 'trend-request/1';
  namespace: 'demo';
  astronautId: string;
  missionId: string;
  dataOrigin: 'synthetic';
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  missionPhase: string;
  referenceBaselineId: string | null;
  window: Window;
  maximumGapSeconds: number | null;
  cadenceSeconds: number | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "TrendPoint".
 */
export interface TrendPoint {
  observation: Observation;
  seriesKey: string | null;
  availability:
    'available' | 'insufficient_data' | 'baseline_unavailable' | 'incomparable' | 'unsupported' | 'stale' | 'invalid';
  reasons: string[];
  segment: number | null;
  comparison: PersonalComparisonEvidence | null;
  reportId: string | null;
  sessionId: string | null;
  repeatTaskIds: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "TrendProjection".
 */
export interface TrendProjection {
  protocolVersion: 'trend-projection/1';
  request: TrendRequest;
  reference: BaselineComputation | null;
  points: TrendPoint[];
  series: {
    seriesKey: string;
    metric:
      | 'heart_rate'
      | 'sleep_duration'
      | 'fatigue_rating'
      | 'mood_rating'
      | 'stress_rating'
      | 'respiratory_rate'
      | 'body_temperature'
      | 'bp_systolic'
      | 'bp_diastolic'
      | 'spo2'
      | 'blood_glucose'
      | 'body_mass'
      | 'body_height'
      | 'ecg_pr'
      | 'ecg_qrs'
      | 'ecg_qt'
      | 'ecg_qtc'
      | 'ecg_rr_irregularity'
      | 'hrv_rmssd'
      | 'hrv_sdnn'
      | 'lvef'
      | 'lv_edv'
      | 'lv_esv'
      | 'lv_edv_indexed'
      | 'lv_esv_indexed'
      | 'muscle_thickness'
      | 'bone_mineral_density'
      | 'exercise_duration'
      | 'exercise_mean_hr'
      | 'exercise_peak_hr'
      | 'cycling_power'
      | 'perceived_exertion'
      | 'vo2_relative'
      | 'vo2max_relative'
      | 'vo2_absolute'
      | 'radiation_dose'
      | 'radiation_dose_rate'
      | 'symptom_report'
      | 'injury_report'
      | 'cabin_co2'
      | 'cabin_o2'
      | 'cabin_temperature'
      | 'cabin_pressure'
      | 'radiation_absorbed_dose'
      | 'radiation_absorbed_dose_rate'
      | 'cabin_co2_partial_pressure'
      | 'cabin_o2_partial_pressure';
    unit: string | null;
    missionPhase: string;
    sampleCount: number;
    slopePerDay: number | null;
    slopeUnit: string | null;
    coverage: number | null;
    limitations: string[];
  }[];
  reasons: string[];
  algorithmVersion: string;
  operationalInterpretation: false;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "HistoricalCohort".
 */
export interface HistoricalCohort {
  protocolVersion: 'historical-cohort/1';
  cohortId: string;
  label: string;
  dataOrigin: 'synthetic' | 'public_research';
  era: string;
  date: string;
  species: string | null;
  population: string | null;
  missionDurationDays: number | null;
  metric:
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure';
  unit: string | null;
  modality: string | null;
  protocolId: string | null;
  deviceId: string | null;
  assay: string | null;
  statistic: 'mean' | 'median';
  sampleSize: number | null;
  value: number | null;
  sources: SourceSnapshot[];
  validationStatus: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
  admission: 'quarantined' | 'research_sandbox' | 'demo_only' | 'assessment_eligible';
  limitations: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "HistoricalComparison".
 */
export interface HistoricalComparison {
  protocolVersion: 'historical-comparison/1';
  left: HistoricalCohort | null;
  right: HistoricalCohort | null;
  availability:
    'available' | 'insufficient_data' | 'baseline_unavailable' | 'incomparable' | 'unsupported' | 'stale' | 'invalid';
  reasons: string[];
  absoluteDelta: number | null;
  relativeDelta: number | null;
  percentagePointDelta: number | null;
  limitations: string[];
  algorithmVersion: string;
  operationalInterpretation: false;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgResearchField".
 */
export interface EcgResearchField {
  metric: 'heart_rate' | 'ecg_pr' | 'ecg_qrs' | 'ecg_qt' | 'ecg_qtc' | 'hrv_sdnn' | 'hrv_rmssd';
  column: string | null;
  status: 'accepted' | 'missing' | 'rejected';
  value: number | null;
  unit: string | null;
  originalUnit: string | null;
  originalValue: string | null;
  reason: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgResearchRow".
 */
export interface EcgResearchRow {
  ecgId: string;
  publicSubjectId: string | null;
  reportId: string | null;
  contentFingerprint: string | null;
  action: 'create' | 'duplicate' | 'conflict' | 'rejected';
  fields: EcgResearchField[];
  errors: string[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgResearchEvidence".
 */
export interface EcgResearchEvidence {
  protocolVersion: 'ptb-ecg-report/1';
  method: 'ECGDeli' | 'Uni-G';
  ecgId: string;
  publicSubjectId: string;
  reportId: string;
  featureRawRecordId: string;
  parentRawRecordId: string;
  descriptionRawRecordId: string;
  contentFingerprint: string;
  importBatchId: string;
  validationRunId: string;
  receivedAt: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EcgResearchPreview".
 */
export interface EcgResearchPreview {
  protocolVersion: 'ptb-report-preview/1';
  namespace: 'research:ptb-xl-plus';
  method: 'ECGDeli' | 'Uni-G';
  selectedEcgIds: string[];
  rows: EcgResearchRow[];
  unmappedColumns: string[];
  command: CommandEnvelope | null;
  integrity: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "CommandEnvelope".
 */
export interface CommandEnvelope {
  schemaVersion: '0.1.0';
  namespace: string;
  operationId: string;
  idempotencyKey: string;
  subject: Subject;
  createdAt: string;
  operation: 'capture' | 'import' | 'upsert' | 'correct' | 'complete_task';
  domain:
    | 'capture'
    | 'profiles'
    | 'sources'
    | 'reports'
    | 'sessions'
    | 'baselines'
    | 'assessments'
    | 'tasks'
    | 'environment'
    | 'findings'
    | 'configuration';
  payload: {
    records: CanonicalRecord[];
    expectedRevisions: ExpectedRevision[];
    importKeys: ImportKey[];
    previewToken: string | null;
  };
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "Subject".
 */
export interface Subject {
  kind: 'crew' | 'mission' | 'namespace';
  astronautId: string | null;
  missionId: string | null;
}
export interface ThresholdRule1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'ThresholdRule';
  ruleId: string;
  revision: number;
  version: string;
  title: string;
  metrics: (
    | 'heart_rate'
    | 'sleep_duration'
    | 'fatigue_rating'
    | 'mood_rating'
    | 'stress_rating'
    | 'respiratory_rate'
    | 'body_temperature'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'spo2'
    | 'blood_glucose'
    | 'body_mass'
    | 'body_height'
    | 'ecg_pr'
    | 'ecg_qrs'
    | 'ecg_qt'
    | 'ecg_qtc'
    | 'ecg_rr_irregularity'
    | 'hrv_rmssd'
    | 'hrv_sdnn'
    | 'lvef'
    | 'lv_edv'
    | 'lv_esv'
    | 'lv_edv_indexed'
    | 'lv_esv_indexed'
    | 'muscle_thickness'
    | 'bone_mineral_density'
    | 'exercise_duration'
    | 'exercise_mean_hr'
    | 'exercise_peak_hr'
    | 'cycling_power'
    | 'perceived_exertion'
    | 'vo2_relative'
    | 'vo2max_relative'
    | 'vo2_absolute'
    | 'radiation_dose'
    | 'radiation_dose_rate'
    | 'symptom_report'
    | 'injury_report'
    | 'cabin_co2'
    | 'cabin_o2'
    | 'cabin_temperature'
    | 'cabin_pressure'
    | 'radiation_absorbed_dose'
    | 'radiation_absorbed_dose_rate'
    | 'cabin_co2_partial_pressure'
    | 'cabin_o2_partial_pressure'
  )[];
  applicableContext: (
    'rest' | 'exercise' | 'sleep' | 'eva' | 'launch' | 'landing' | 'pre_flight' | 'post_flight' | 'unknown'
  )[];
  population: string;
  protocolId: string | null;
  predicates: {
    op: 'gt' | 'lt' | 'outside' | 'delta_gt' | 'quality_below' | 'missing';
    metric:
      | 'heart_rate'
      | 'sleep_duration'
      | 'fatigue_rating'
      | 'mood_rating'
      | 'stress_rating'
      | 'respiratory_rate'
      | 'body_temperature'
      | 'bp_systolic'
      | 'bp_diastolic'
      | 'spo2'
      | 'blood_glucose'
      | 'body_mass'
      | 'body_height'
      | 'ecg_pr'
      | 'ecg_qrs'
      | 'ecg_qt'
      | 'ecg_qtc'
      | 'ecg_rr_irregularity'
      | 'hrv_rmssd'
      | 'hrv_sdnn'
      | 'lvef'
      | 'lv_edv'
      | 'lv_esv'
      | 'lv_edv_indexed'
      | 'lv_esv_indexed'
      | 'muscle_thickness'
      | 'bone_mineral_density'
      | 'exercise_duration'
      | 'exercise_mean_hr'
      | 'exercise_peak_hr'
      | 'cycling_power'
      | 'perceived_exertion'
      | 'vo2_relative'
      | 'vo2max_relative'
      | 'vo2_absolute'
      | 'radiation_dose'
      | 'radiation_dose_rate'
      | 'symptom_report'
      | 'injury_report'
      | 'cabin_co2'
      | 'cabin_o2'
      | 'cabin_temperature'
      | 'cabin_pressure'
      | 'radiation_absorbed_dose'
      | 'radiation_absorbed_dose_rate'
      | 'cabin_co2_partial_pressure'
      | 'cabin_o2_partial_pressure';
    parameters: {
      value: number | null;
      low: number | null;
      high: number | null;
    };
  }[];
  evidenceIds: string[];
  admissionRequirements: ('quarantined' | 'research_sandbox' | 'demo_only' | 'assessment_eligible')[];
  baselineStrategy: 'fixed' | 'rolling' | 'anchor' | 'none';
  qualityGate: {
    minimumScore: number;
    allowLowConfidence: boolean;
  };
  persistence: {
    minimumSeconds: number;
    minimumIndependentSamples: number;
  };
  severity: 'info' | 'watch' | 'warning' | 'critical';
  recovery: {
    minimumSeconds: number;
    minimumIndependentSamples: number;
  };
  status: 'pending' | 'verified' | 'single_source' | 'conflict' | 'rejected';
  demoOnly: boolean;
  approvedScope: 'demo_only' | 'review_required' | 'operational';
  regionMapping: {
    regionKey: string | null;
    layer: 'skeletal' | 'muscular' | 'organ' | 'systemic';
    localizing: boolean;
  };
  guidanceSourceIds: string[];
}
export interface Assessment1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'Assessment';
  assessmentId: string;
  revision: number;
  astronautId: string;
  missionId: string;
  evaluatedAt: string;
  window: Window;
  ruleId: string;
  ruleVersion: string;
  observationIds: string[];
  environmentalObservationIds: string[];
  comparisonIds: string[];
  baselineIds: string[];
  availability:
    'available' | 'insufficient_data' | 'baseline_unavailable' | 'incomparable' | 'unsupported' | 'stale' | 'invalid';
  reasons: string[];
  severity: ('info' | 'watch' | 'warning' | 'critical') | null;
  finding: string;
  contributingFactors: string[];
  corroboration: string;
  sustained: boolean;
  independentSampleCount: number;
  localizationSupported: boolean;
  limitations: string[];
  evidenceIds: string[];
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  mode: 'demo' | 'operational';
  lifecycle: 'active' | 'recovering' | 'cleared';
  taskIds: string[];
  highlightIds: string[];
}
export interface FollowUpTask1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'FollowUpTask';
  taskId: string;
  revision: number;
  astronautId: string;
  type: 'repeat_measurement' | 'review_report' | 'scheduled_check' | 'verify_quality';
  dueAt: string | null;
  duePrecision: 'exact' | 'date' | 'unknown';
  state: 'scheduled' | 'due' | 'in_progress' | 'completed' | 'excused' | 'cancelled';
  assessmentIds: string[];
  observationIds: string[];
  requiredMeasurement: {
    metric:
      | 'heart_rate'
      | 'sleep_duration'
      | 'fatigue_rating'
      | 'mood_rating'
      | 'stress_rating'
      | 'respiratory_rate'
      | 'body_temperature'
      | 'bp_systolic'
      | 'bp_diastolic'
      | 'spo2'
      | 'blood_glucose'
      | 'body_mass'
      | 'body_height'
      | 'ecg_pr'
      | 'ecg_qrs'
      | 'ecg_qt'
      | 'ecg_qtc'
      | 'ecg_rr_irregularity'
      | 'hrv_rmssd'
      | 'hrv_sdnn'
      | 'lvef'
      | 'lv_edv'
      | 'lv_esv'
      | 'lv_edv_indexed'
      | 'lv_esv_indexed'
      | 'muscle_thickness'
      | 'bone_mineral_density'
      | 'exercise_duration'
      | 'exercise_mean_hr'
      | 'exercise_peak_hr'
      | 'cycling_power'
      | 'perceived_exertion'
      | 'vo2_relative'
      | 'vo2max_relative'
      | 'vo2_absolute'
      | 'radiation_dose'
      | 'radiation_dose_rate'
      | 'symptom_report'
      | 'injury_report'
      | 'cabin_co2'
      | 'cabin_o2'
      | 'cabin_temperature'
      | 'cabin_pressure'
      | 'radiation_absorbed_dose'
      | 'radiation_absorbed_dose_rate'
      | 'cabin_co2_partial_pressure'
      | 'cabin_o2_partial_pressure';
    comparabilityKey: string | null;
  };
  completionObservationIds: string[];
  completionReportIds: string[];
  explanation: string;
  sourceIds: string[];
  idempotencyKey: string;
  episodeId: string;
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "AtlasRegionManifest".
 */
export interface AtlasRegionManifest {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'AtlasRegionManifest';
  manifestId: string;
  revision: number;
  manifestVersion: string;
  asset: {
    sourceURL: string | null;
    revision: string;
    contentHash: string;
    format: 'unmapped' | 'packed' | 'gltf' | 'other';
    attributions: string[];
    referenceLimitations: string[];
    coordinateSystem: string;
    units: 'm' | 'mm';
    scale: number;
  };
  regions: AtlasRegion[];
}
export interface AtlasRegion1 {
  regionKey: string;
  label: string;
  layer: 'skeletal' | 'muscular' | 'organ' | 'systemic';
  laterality: ('left' | 'right' | 'bilateral' | 'midline' | 'unknown') | null;
  structureIds: string[];
  verified: boolean;
}
export interface AtlasHighlight1 {
  schemaVersion: '0.1.0';
  namespace: string;
  recordType: 'AtlasHighlight';
  highlightId: string;
  revision: number;
  astronautId: string;
  regionKey: string;
  layer: 'skeletal' | 'muscular' | 'organ' | 'systemic';
  severity: 'info' | 'watch' | 'warning' | 'critical';
  kind: 'automatic' | 'reported_site';
  reason: string;
  assessmentId: string | null;
  ruleId: string | null;
  ruleVersion: string | null;
  observationIds: string[];
  confidence: number | null;
  confidenceKind: 'unknown' | 'heuristic' | 'calibrated';
  limitations: string[];
  since: string;
  lastEvaluatedAt: string;
  expires: string | null;
  status: 'active' | 'recovering' | 'cleared';
  dataOrigin: 'synthetic' | 'public_research' | 'crew_measurement';
  mode: 'demo' | 'operational';
  manifestId: string;
  manifestVersion: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExpectedRevision".
 */
export interface ExpectedRevision {
  recordType:
    | 'CrewProfile'
    | 'MissionContext'
    | 'Observation'
    | 'EnvironmentalObservation'
    | 'MetricDefinition'
    | 'SourceRecord'
    | 'RawRecord'
    | 'ValidationRun'
    | 'Report'
    | 'ExerciseSession'
    | 'ImportBatch'
    | 'Baseline'
    | 'ComparisonResult'
    | 'ThresholdRule'
    | 'Assessment'
    | 'FollowUpTask'
    | 'AtlasRegionManifest'
    | 'AtlasHighlight';
  recordId: string;
  revision: number;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ImportKey".
 */
export interface ImportKey {
  key: string;
  observationId: string;
  fingerprint: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "RecordReference".
 */
export interface RecordReference {
  recordType:
    | 'CrewProfile'
    | 'MissionContext'
    | 'Observation'
    | 'EnvironmentalObservation'
    | 'MetricDefinition'
    | 'SourceRecord'
    | 'RawRecord'
    | 'ValidationRun'
    | 'Report'
    | 'ExerciseSession'
    | 'ImportBatch'
    | 'Baseline'
    | 'ComparisonResult'
    | 'ThresholdRule'
    | 'Assessment'
    | 'FollowUpTask'
    | 'AtlasRegionManifest'
    | 'AtlasHighlight';
  recordId: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ErrorEnvelope".
 */
export interface ErrorEnvelope {
  schemaVersion: '0.1.0';
  code:
    | 'VALIDATION_FAILED'
    | 'REFERENCE_INVALID'
    | 'CONFLICT'
    | 'UNSUPPORTED_UNIT'
    | 'UNSUPPORTED_VERSION'
    | 'UNSUPPORTED_CAPABILITY'
    | 'STORAGE_UNAVAILABLE'
    | 'STORAGE_QUOTA'
    | 'STORAGE_EVICTED'
    | 'STORAGE_FAILED'
    | 'TRANSIENT_TRANSPORT';
  message: string;
  path: string;
  recoverable: boolean;
  retryContext: string | null;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "EventEnvelope".
 */
export interface EventEnvelope {
  schemaVersion: '0.1.0';
  eventId: string;
  namespace: string;
  operationId: string;
  subject: Subject;
  sequence: number;
  cursor: string;
  eventTime: string;
  receivedAt: string;
  deliveryMode: 'manual' | 'file_import' | 'live' | 'replay';
  payload: {
    changedRecords: RecordReference[];
  };
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "OperationReceipt".
 */
export interface OperationReceipt {
  operationId: string;
  idempotencyKey: string;
  digest: string;
  committedAt: string;
  recordIds: RecordReference[];
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ImportLedgerEntry".
 */
export interface ImportLedgerEntry {
  key: string;
  fingerprint: string;
  observationId: string;
}
/**
 * This interface was referenced by `FoundationContracts`'s JSON-Schema
 * via the `definition` "ExportSnapshot".
 */
export interface ExportSnapshot {
  schemaVersion: '0.1.0';
  namespace: string;
  exportedAt: string;
  records: CanonicalRecord[];
  operationLedger: OperationReceipt[];
  importLedger: ImportLedgerEntry[];
  integrity: {
    algorithm: 'sha256';
    contentHash: string;
    recordCount: number;
  };
}
