import type {DemoScenarioInput,ThresholdRule} from '../contracts';
import {DEMO_RULE,type DemoRuleOptions} from './engine';
export function scenarioConfig(kind:DemoScenarioInput['kind']){
 const bone=kind==='bone',systemic=kind==='systemic';
 const metric=systemic?'heart_rate':bone?'bone_mineral_density':'muscle_thickness';
 const regionKey=systemic?null:bone?'femur_left':'biceps_brachii_left';
 const label=systemic?'systemic heart rate':bone?'left femur':'left biceps';
 const rule:ThresholdRule=structuredClone(DEMO_RULE);rule.ruleId=`demo-atlas-${kind}-v1`;rule.version=`fictional-atlas-${kind}/1`;rule.title=`Fictional ${label} change`;rule.metrics=[metric];rule.regionMapping={regionKey,layer:systemic?'systemic':bone?'skeletal':'muscular',localizing:!systemic};rule.predicates=[{op:'delta_gt',metric,parameters:{value:systemic?5:.1,low:null,high:null}}];
 const options:DemoRuleOptions={rule,direction:systemic?'absolute':'decline_fraction',trigger:systemic?5:.1,recovery:systemic?2:.05,finding:`Fictional sustained change at ${label}`,explanation:systemic?'Fictional software trigger: absolute change >5 /min, recovery ≤2 /min.':'Fictional software trigger: decline >10% from the personal reference, recovery within 5%. These are not medical thresholds.',taskPrompt:`Fictional follow-up: confirm the ${label} report site, side, device and acquisition protocol; record any reported discomfort; provide a compatible repeat report when available. Completing this task does not establish recovery.`};
 return {options,metric,regionKey,label,unit:systemic?'/min':bone?'g/cm2':'mm',measurementContext:{modality:systemic?'manual':bone?'dxa':'muscle_ultrasound',method:`fictional-${kind}-reported-method`,deviceId:`fictional-${kind}-device`,protocolId:`fictional-atlas-${kind}-v1`,posture:'supine',laterality:systemic?null:'left',site:regionKey,missionPhase:'inflight'}} as const;
}
