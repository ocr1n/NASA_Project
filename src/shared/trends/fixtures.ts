import {assertValid,type HistoricalCohort,type Observation} from '../contracts';
import {createDemoRecords} from '../fixtures';

/** Authored arithmetic fixtures. Dates/values/populations are fictional, not NASA cohort measurements. */
export async function historicalDemoCohorts(){
 const records=await createDemoRecords(),source=records.find((r):r is Observation=>r.recordType==='Observation')!.source;
 const older:HistoricalCohort={protocolVersion:'historical-cohort/1',cohortId:'authored-older',label:'Authored older cohort — no real participants',dataOrigin:'synthetic',era:'authored_historical_demo',date:'1974-01-01',species:'human_fictional',population:'same_authored_adult_population',missionDurationDays:10,metric:'lvef',unit:'%',modality:'echo',protocolId:'authored-matched-echo',deviceId:'authored-matched-device',assay:'not_applicable',statistic:'mean',sampleSize:4,value:61,sources:[structuredClone(source)],validationStatus:'pending',admission:'demo_only',limitations:['Authored synthetic arithmetic only; not a NASA observation, reference interval or clinical dataset.']};
 const newer:HistoricalCohort={...structuredClone(older),cohortId:'authored-newer',label:'Authored newer cohort — no real participants',era:'authored_current_demo',date:'2026-01-01',value:58};
 assertValid('HistoricalCohort',older);assertValid('HistoricalCohort',newer);return {older,newer};
}
