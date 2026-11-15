import type {Observation} from '../contracts';
import {metricRegistry} from './index';
import {checkInScales} from './check-in';

export type BundleId='daily'|'cardiac'|'exercise'|'additional';
export interface BundleField {
 metric:Observation['metric'];purpose:string;sourcePath:string;collectionMethods:readonly string[];
 timing:string;missingPath:string;references:readonly string[];
 canonicalUnit:string|null;inputUnits:readonly string[];definitionStatus:'pending';
}
export interface MeasurementBundle {id:BundleId;label:string;fields:readonly BundleField[]}
const nasaExercise='https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/';
const nasaLabs='https://www.nasa.gov/reference/jsc-human-research-laboratories/';
const cipher='https://www.nasa.gov/reference/cipher/';
const field=(metric:Observation['metric'],purpose:string,sourcePath:string,collectionMethods:readonly string[],timing:string,missingPath:string,references:readonly string[]):BundleField=>Object.freeze({metric,purpose,sourcePath,collectionMethods:Object.freeze([...collectionMethods]),timing,missingPath,references:Object.freeze([...references]),canonicalUnit:metricRegistry[metric].canonicalUnit,inputUnits:Object.freeze([...metricRegistry[metric].allowedInputUnits]),definitionStatus:'pending'});
const dailyTime='Fictional scheduled check-in; actual measurement date/precision retained';
const examTime='Preflight or separately scheduled exam/report; no clinical cadence inferred';
const sessionTime='One recorded session; comparable activity/workload kept separate from rest';
const contextTime='When a suitable device/report is available or explicitly scheduled; not a mandatory daily measurement';

/** Educational collection paths, never a claim of connected hardware or clinical schedules. */
export const measurementBundles:readonly MeasurementBundle[]=Object.freeze([
 Object.freeze({id:'daily' as const,label:'Daily readiness',fields:Object.freeze([
  field('heart_rate','Record a resting pulse separately from exercise HR','Reported device reading or manual pulse',['manual','device_report'],dailyTime,'Record missing reason or use an appropriate pulse device/report',[cipher]),
  field('sleep_duration','Record sleep over a declared observation interval','Crew report or sleep-device summary',['manual','device_report'],dailyTime,'Retain unknown duration or device failure, never zero-fill',[cipher]),
  field('fatigue_rating','Record subjective fatigue with named anchors','Crew self-report',['manual'],dailyTime,'Skip with reason; do not translate another scale',[cipher]),
  field('mood_rating','Record subjective mood context','Crew self-report',['manual'],dailyTime,'Keep unanswered mood missing and scale identity visible',[cipher]),
  field('stress_rating','Record subjective stress context','Crew self-report',['manual'],dailyTime,'Keep unanswered stress missing and scale identity visible',[cipher])
 ])}),
 Object.freeze({id:'cardiac' as const,label:'Cardiac reports',fields:Object.freeze([
  field('heart_rate','Link report HR while preserving ECG versus pulse modality','ECG report',['report_link'],examTime,'Link a labeled ECG report; report adapter owned by module 04',[nasaLabs]),
  field('ecg_qrs','Link an already measured ECG interval with lead/method','ECG report',['report_link'],examTime,'Keep unavailable interval missing; no waveform inference here',[nasaLabs]),
  field('lvef','Link the reported echo measurement and its view/method','Echo report',['report_link'],examTime,'Link a labeled echo report; report adapter owned by module 05',[nasaLabs]),
  field('lv_edv','Keep reported ventricular volume separate from indexed measures','Echo report',['report_link'],examTime,'Record unavailable view/method/report explicitly',[nasaLabs]),
  field('lv_esv','Keep the separate reported systolic volume','Echo report',['report_link'],examTime,'Record unavailable view/method/report explicitly',[nasaLabs])
 ])}),
 Object.freeze({id:'exercise' as const,label:'Exercise and recovery',fields:Object.freeze([
  field('exercise_duration','Record activity and duration in one session','Manual session or named export',['manual_session','previewed_csv'],sessionTime,'Keep unknown duration explicit; no unsupported provider/FIT claim',[nasaExercise]),
  field('perceived_exertion','Attach subjective effort using its own scale','Crew self-report',['manual_session','previewed_csv'],sessionTime,'Omit or record missing effort; scale conversions are unsupported',[nasaExercise]),
  field('exercise_mean_hr','Retain the supplied average HR and statistic/coverage context','Reported session device summary',['manual_session','previewed_csv'],sessionTime,'Do not derive an average from inadequate/unidentified coverage',[nasaExercise]),
  field('exercise_peak_hr','Retain the supplied peak HR separately from mean/rest HR','Reported session device summary',['manual_session','previewed_csv'],sessionTime,'No device summary means missing peak, not a fabricated value',[nasaExercise]),
  field('cycling_power','Retain recorded cycling workload/power','Power-equipped cycle report or export',['manual_session','previewed_csv'],sessionTime,'Use a named power export/report; an ordinary phone is not a power meter',[nasaExercise])
 ])}),
 Object.freeze({id:'additional' as const,label:'Additional measurements and context',fields:Object.freeze([
  ...(['bp_systolic','bp_diastolic'] as const).map(metric=>field(metric,'Record one component of a paired BP acquisition','Appropriate BP device or labeled paired report',['manual','device_report'],contextTime,'Provide both acquired values/device/posture/protocol or explicit missing reasons',[cipher])),
  field('spo2','Retain device and oxygen context with reported quality','Appropriate pulse oximeter report',['manual','device_report'],contextTime,'Unsupported phone acquisition remains missing',[cipher]),
  field('blood_glucose','Record the glucose analyte with method and meal context','Appropriate glucose device or laboratory report',['manual','device_report'],contextTime,'Keep analyte/meal/unit uncertainty explicit; no phone glucose claim',[cipher]),
  field('body_mass','Retain measured mass with gravity and method','Appropriate mass device or labeled report',['manual','device_report'],contextTime,'An ordinary Earth scale cannot establish mass in microgravity',[nasaLabs]),
  field('body_height','Retain a dated height measurement','Reported measurement or labeled report',['manual','device_report'],examTime,'Use dated report/measurement; do not infer from reference anatomy',[nasaLabs]),
  field('bone_mineral_density','Retain site-specific areal DXA density','DXA device/report',['manual','report_link'],examTime,'DXA unavailable is missing; muscle thickness is not density',[nasaLabs]),
  ...(['vo2_relative','vo2max_relative','vo2_absolute'] as const).map(metric=>field(metric,'Retain test method, protocol, units and measured/estimated basis','Gas-analysis test/report or explicitly labeled estimate',['manual','device_report'],examTime,'Keep relative/absolute and estimates separate; never assume body mass',[nasaExercise])),
  field('respiratory_rate','Record breathing frequency with method/activity/interval','Reported count or appropriate device summary',['manual','device_report'],contextTime,'Record unknown acquisition or device failure explicitly',[cipher]),
  field('body_temperature','Retain reported temperature and measurement site/device','Appropriate thermometer report',['manual','device_report'],contextTime,'Record unavailable device/site; no camera temperature inference',[cipher])
 ])})
]);

/** Separate fictional effort anchors; not Borg, fatigue, a clinical scale or a conversion. */
export const measurementScales=Object.freeze({...checkInScales,perceived_exertion:Object.freeze({scaleId:'fictional-effort',version:'1',low:0,high:10,lowLabel:'No effort reported',highLabel:'Maximum effort reported'})});
export const bundleConfigurationVersion='measurement-bundles/03.1';
