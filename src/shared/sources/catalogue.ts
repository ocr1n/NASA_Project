import type {SourceRecord} from '../contracts';
import manifest from './fixtures/manifest.json';
import osdMetadata from './fixtures/osd575-metadata.json?raw';
import osdFiles from './fixtures/osd575-files.json?raw';
import ecgdeli from './fixtures/ecgdeli.csv?raw';
import unig from './fixtures/unig.csv?raw';
import parent from './fixtures/parent.csv?raw';
import description from './fixtures/feature-description.csv?raw';
import license from './fixtures/LICENSE-PTB.txt?raw';
import type {Artifact} from './acquisition';

export const fixtureManifest=manifest;
export const fixturePayloads:Record<string,string>={osd575:osdMetadata,osd575files:osdFiles,ptbecgdeli:ecgdeli,ptbunig:unig,ptbparent:parent,ptbdescription:description,ptblicense:license};
const nasaGap='Bounded CIPHER/OSDR/Inspiration4/NTRS/HRP review established research reports and serum assays, but no suitable open individual PR/QRS/QT feature file. See docs/DATA_SOURCES.md#source-selection.';

/** Create canonical source descriptors from inspected file metadata; no dataset rights or actual event date is inferred. */
export function fixtureArtifact(id:string):Artifact {
 const file=manifest.files.find(f=>f.id===id);if(!file)throw Error('Unknown fixture');
 const nasa=id.startsWith('osd'),meta=nasa?JSON.parse(osdMetadata)['OSD-575'].metadata:null;
 const source:SourceRecord={schemaVersion:'0.1.0',namespace:nasa?'research:osd575':'research:ptb-xl-plus',recordType:'SourceRecord',sourceId:`source-${id}`,revision:1,name:nasa?`${meta['study title']} — ${id==='osd575'?'metadata':'file listing'}`:`PTB ${id.replace('ptb','')} public file`,tier:nasa?'nasa':'peer_reviewed',canonicalURL:file.url,doi:nasa?null:id==='ptbparent'?'10.13026/kfzx-aw45':'10.13026/g6h6-7g88',publisher:nasa?'NASA OSDR':'PhysioNet dataset authors',host:nasa?'visualization.osdr.nasa.gov':'physionet.org',version:nasa?'API v2; dataset revision unconfirmed':id==='ptbparent'?'1.0.3':'1.0.1',license:nasa?'Public NASA factual metadata only; assay dataset rights unconfirmed':'CC-BY-4.0',attribution:nasa?'NASA OSDR; Inspiration4 study authors':'Strodthoff et al. PTB-XL+ (2023), DOI 10.13026/g6h6-7g88; Wagner et al. PTB-XL 1.0.3, DOI 10.13026/kfzx-aw45; PhysioNet. Byte excerpts; no numeric changes.',accessRestrictions:[],retrievedAt:manifest.retrievedAt,supportedMetrics:nasa?[]:['ecg_pr','ecg_qrs','ecg_qt'],purpose:nasa?`Catalogue only. ${meta.organism}, ${meta['material type']}, ${meta.mission.name}; ${meta.mission['start date']} to ${meta.mission['end date']}. No wearable feed.`:'Public clinical numerical research fixture; never a crew timeline',nasaSearchEvidence:nasa?[]:['docs/DATA_SOURCES.md#source-selection',nasaGap],fallbackReason:nasa?null:nasaGap,lineageIds:[nasa?'inspiration4-2021':'ptb-xl-acquisition'],reviewStatus:'single_source'};
 return {source,payload:fixturePayloads[id],expectedHash:file.sha256,mediaType:file.file.endsWith('.json')?'application/json':file.file.endsWith('.csv')?'text/csv':'text/plain',retrievedAt:manifest.retrievedAt};
}

export const nasaContext=Object.freeze({title:'Why mission context matters',url:'https://www.nasa.gov/hrp/hazards/',source:'NASA HRP: Five Hazards of Human Spaceflight',reviewedAt:'2026-11-15',text:'NASA groups spaceflight research around radiation, isolation and confinement, distance from Earth, gravity changes, and closed environments. Measurements need their collection and mission context to be understood. These research categories provide background; they do not interpret the fictional readings above.'});
