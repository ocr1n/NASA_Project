import registry from './registry.json';
import type { MetricDefinition, Observation } from '../contracts';
import { canonicalJSON } from '../contracts/identity';
export const metricRegistry = registry as unknown as Readonly<Record<string,MetricDefinition>>;
export const unitRegistry = Object.freeze(Object.fromEntries(Object.entries(metricRegistry).map(([key,m])=>[key,m.conversions])));
export type UnitResult={ok:true;value:number;unit:string;originalValue:number;originalUnit:string}|{ok:false;code:'UNSUPPORTED_UNIT'|'VALIDATION_FAILED';reason:string};
/** Value is in inputUnit; result is in the metric's canonical UCUM unit. No cross-quantity guesses. */
export function normalizeUnit(metric:string,value:number,inputUnit:string,context?:{analyte?:string|null}):UnitResult {
 if(!Number.isFinite(value))return {ok:false,code:'VALIDATION_FAILED',reason:'A finite numeric value is required'};
 if(metric==='blood_glucose'&&inputUnit==='mmol/L'&&context?.analyte!=='glucose')return {ok:false,code:'UNSUPPORTED_UNIT',reason:'Molar conversion requires an explicitly reported glucose analyte'};
 const definition=metricRegistry[metric];const conversion=definition?.conversions.find(x=>x.inputUnit===inputUnit);
 if(!definition?.canonicalUnit||!conversion)return {ok:false,code:'UNSUPPORTED_UNIT',reason:'No reviewed dimensional conversion is registered for this metric and unit'};
 const converted=value*conversion.factor+conversion.offset;
 if(!Number.isFinite(converted))return {ok:false,code:'VALIDATION_FAILED',reason:'Conversion exceeds numeric representation'};
 return {ok:true,value:converted,unit:definition.canonicalUnit,originalValue:value,originalUnit:inputUnit};
}
export type ComparisonKeyResult={availability:'available'|'incomparable';key:string|null;reasons:string[]};
/** Known acquisition grouping only; this does not calculate a baseline or health status. */
export function buildComparisonKey(observation:Observation):ComparisonKeyResult {
 const definition=metricRegistry[observation.metric];if(!definition)return {availability:'incomparable',key:null,reasons:['metric_unregistered']};
 const envelope=observation as unknown as Record<string,unknown>, mc=observation.measurementContext as Record<string,unknown>;
 // These two versioned context keys already fit the canonical scalar provenance shape.
 const contextValue=(field:string)=>['analyte','resultBasis'].includes(field)?observation.provenance.parameters[field]:field in envelope?envelope[field]:mc[field];
 const reasons:string[]=[];const values:unknown[]=[observation.namespace,observation.dataOrigin,observation.publicSubjectId,observation.datasetId];
 for(const field of definition.requiredContext){const value=contextValue(field);if(value===null||value===undefined||value==='unknown'||value==='')reasons.push(`context_unknown:${field}`);}
 for(const field of definition.comparabilityKeys){const value=contextValue(field);if((value===null||value===undefined||value==='unknown'||value==='')&&field!=='unit')reasons.push(`context_unknown:${field}`);values.push([field,value??null]);}
 if(observation.context==='unknown')reasons.push('context_unknown:context');
 // New report protocol opts into stricter acquisition keys; frozen legacy keys are unchanged.
 const reportVersion=observation.provenance.parameters.reportContextVersion;
 if(reportVersion!==undefined){
  values.push(['reportContextVersion',reportVersion]);
  if(reportVersion!=='ultrasound-context/1')reasons.push('report_context_version_unsupported');
  for(const field of [...definition.requiredContext,...definition.comparabilityKeys]){const value=contextValue(field);if(typeof value==='string'&&(!value.trim()||value.trim().toLowerCase()==='unknown'))reasons.push(`context_unknown:${field}`);}
  const fields=observation.metric==='muscle_thickness'?['probeId','muscle']:['probeId'];
  for(const field of fields){const value=observation.provenance.parameters[field];if(value===null||value===undefined||value==='unknown'||value==='')reasons.push(`context_unknown:${field}`);values.push([field,value??null]);}
 }
 return reasons.length?{availability:'incomparable',key:null,reasons:[...new Set(reasons)]}:{availability:'available',key:canonicalJSON(values),reasons:[]};
}
