import type {Scale, Observation} from '../contracts';

/** Fictional subjective anchors only. No clinical meaning or scale conversion is implied. */
export const checkInScales:Readonly<Partial<Record<Observation['metric'],Scale>>> = Object.freeze({
 fatigue_rating:Object.freeze({scaleId:'fictional-fatigue',version:'1',low:0,high:4,lowLabel:'No fatigue',highLabel:'Very fatigued'}),
 mood_rating:Object.freeze({scaleId:'fictional-mood',version:'1',low:0,high:4,lowLabel:'Very low mood',highLabel:'Very good mood'}),
 stress_rating:Object.freeze({scaleId:'fictional-stress',version:'1',low:0,high:4,lowLabel:'No stress',highLabel:'Very high stress'})
});
export const checkInSchedule=Object.freeze({scheduleId:'fictional-daily-check-in-v1',label:'Fictional daily check-in',context:'rest' as const,intervalSeconds:86400});
