import {assertValid, failure, type BaselinePolicy, type BaselineRequest} from '../contracts';

/** Fictional support counts/quality only; cadence (seconds) is unknown until explicitly supplied. */
export const demoBaselinePolicy: Readonly<BaselinePolicy> = Object.freeze({
 protocolVersion:'baseline-policy/1', version:'demo-personal-baseline/1', demoOnly:true,
 minimumSamples:3, minimumSpreadSamples:3, minimumQualityScore:0.8, cadenceSeconds:null,
 spreadMethod:'raw_mad', methodEvidenceURLs:Object.freeze([
  'https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm',
  'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.median_abs_deviation.html'
 ]) as unknown as string[]
});

/** Parse a genuine exact UTC instant to epoch milliseconds, retaining null for unsupported input. */
export function exactInstant(value:string|null):number|null {
 if(!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) return null;
 const time=Date.parse(value);
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value.slice(0,10)?time:null;
}
/** Validate a calendar date without assigning an acquisition time of day. */
export function calendarDate(value:string|null):string|null {
 if(!value || !/^\d{4}-\d\d-\d\d$/.test(value))return null;
 const time=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?value:null;
}

/** Validate central request/policy plus relational constraints; never supply missing context. */
export function validateCalculation(request:BaselineRequest,policy:BaselinePolicy,calculatedAt:string):void {
 assertValid('BaselineRequest',request); assertValid('BaselinePolicy',policy);
 if(exactInstant(calculatedAt)===null)throw failure('VALIDATION_FAILED','Calculation needs an exact UTC clock.');
 if(policy.minimumSpreadSamples<policy.minimumSamples)throw failure('VALIDATION_FAILED','Spread support cannot be below center support.');
 if(request.missionPhase==='unknown'||!request.missionPhase.trim())throw failure('VALIDATION_FAILED','A known series phase is required.');
 if(request.method!=='mission_rolling'&&request.missionPhase!=='preflight')throw failure('VALIDATION_FAILED','Fixed references require explicit preflight series.');
 if(request.method==='mission_rolling'&&(request.missionPhase==='preflight'||!request.currentObservationIds.length))throw failure('VALIDATION_FAILED','Rolling mission references require current inputs and a mission series.');
 if(request.method==='preflight_anchor'?!request.anchorObservationId:request.anchorObservationId!==null)throw failure('VALIDATION_FAILED','Only a single anchor request names an exam observation.');
 const checkWindow=(window:BaselineRequest['window'])=>{
  const from=exactInstant(window.from),to=exactInstant(window.to);
  if(window.precision!=='exact'||from===null||to===null||from>=to||to>Date.parse(calculatedAt))throw failure('VALIDATION_FAILED','Window needs ordered exact UTC bounds before the calculation clock.');
  if(policy.cadenceSeconds!==null&&!Number.isSafeInteger(Math.ceil((to-from)/(policy.cadenceSeconds*1000))))throw failure('VALIDATION_FAILED','Coverage window exceeds supported slot representation.');
 };
 if(request.method!=='preflight_anchor'||request.window.precision==='exact')checkWindow(request.window);
 else if(request.window.from!==null||request.window.to!==null||request.window.precision!=='unknown')throw failure('VALIDATION_FAILED','An unbounded anchor must preserve unknown window bounds.');
 for(const period of request.excludedPeriods)checkWindow(period.window);
 if(new Set(request.exclusions.map(e=>e.observationId)).size!==request.exclusions.length)throw failure('VALIDATION_FAILED','Exclusion IDs must be unique.');
}
