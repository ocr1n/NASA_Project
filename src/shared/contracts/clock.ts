import { failure, validateRecord } from './index';
export interface Clock { now():string }
export const systemClock:Clock={now:()=>new Date().toISOString()};
export class FixedClock implements Clock {
 constructor(private readonly instant:string){if(!/^\d{4}-\d\d-\d\dT.*Z$/.test(instant)||!Number.isFinite(Date.parse(instant)))throw failure('VALIDATION_FAILED','Clock requires an exact UTC instant');}
 now(){return this.instant;}
}
/** UTC elapsed-day convention; day zero starts at missionStart, independent of locale or retrieval. */
export function missionDay(start:string,instant:string):number|null {
 if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(instant)))return null;
 return Math.floor((Date.parse(instant)-Date.parse(start))/86400000);
}
