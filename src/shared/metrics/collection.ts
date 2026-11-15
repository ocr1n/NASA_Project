import type {MissionContext,Observation,CollectionAttemptEvidence} from '../contracts';
import {metricRegistry} from './index';

/** Project-authored demonstration cadence in seconds; never a clinical collection plan. */
export const collectionSchedules=Object.freeze([
 {scheduleId:'fictional-context-7d',label:'Fictional optional context collection — one available acquisition',context:'rest' as const,intervalSeconds:604800},
 {scheduleId:'fictional-ecg-30d',label:'Fictional ECG report review',context:'rest' as const,intervalSeconds:2592000},
 {scheduleId:'fictional-echo-30d',label:'Fictional echo report review',context:'rest' as const,intervalSeconds:2592000}
] as const);
export type CollectionGroup='bp'|'spo2'|'glucose'|'mass'|'height'|'dxa'|'vo2'|'vo2max'|'vo2absolute'|'respiration'|'temperature'|'fatigue'|'mood'|'stress';
export const collectionGroups:Readonly<Record<CollectionGroup,readonly Observation['metric'][]>>=Object.freeze({
 bp:['bp_systolic','bp_diastolic'],spo2:['spo2'],glucose:['blood_glucose'],mass:['body_mass'],height:['body_height'],dxa:['bone_mineral_density'],vo2:['vo2_relative'],vo2max:['vo2max_relative'],vo2absolute:['vo2_absolute'],respiration:['respiratory_rate'],temperature:['body_temperature'],fatigue:['fatigue_rating'],mood:['mood_rating'],stress:['stress_rating']
});
export const groupLabel=(group:CollectionGroup)=>collectionGroups[group].map(metric=>metricRegistry[metric].label).join(' / ');
export interface CollectionSlot {schedule:CollectionAttemptEvidence['schedule'];index:number;dueAt:string;missionDay:number}
/** Elapsed seconds from the retained mission clock; missing clocks yield no invented slot. */
export function collectionSlot(mission:MissionContext,scheduleId:string,index?:number):CollectionSlot|null {
 const configured=collectionSchedules.find(s=>s.scheduleId===scheduleId),schedule=mission.schedule.find(s=>s.scheduleId===scheduleId);
 if(!configured||!schedule||!mission.missionStart||!mission.scenarioClock||schedule.intervalSeconds!==configured.intervalSeconds||schedule.context!==configured.context||schedule.label!==configured.label)return null;
 const elapsed=(Date.parse(mission.scenarioClock)-Date.parse(mission.missionStart))/1000;
 if(!Number.isFinite(elapsed)||elapsed<0)return null;
 const current=Math.floor(elapsed/schedule.intervalSeconds),slotIndex=index??current;
 if(!Number.isSafeInteger(slotIndex)||slotIndex<0||slotIndex>current)return null;
 const offset=slotIndex*schedule.intervalSeconds;
 return {schedule:{...schedule,scheduleId:configured.scheduleId},index:slotIndex,dueAt:new Date(Date.parse(mission.missionStart)+offset*1000).toISOString(),missionDay:Math.floor(offset/86400)};
}
