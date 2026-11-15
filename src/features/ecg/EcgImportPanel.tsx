import {useEffect,useSyncExternalStore} from 'react';
import type {EcgImportStore} from '../../shared/view-models/ecg-import';
import type {EcgResearchMethod} from '../../shared/contracts/ecg-research';
import {ecgLabels} from '../../shared/contracts/ecg';
import {metricRegistry} from '../../shared/metrics';
import './ecg-import.css';

export function EcgImportPanel({store}:{store:EcgImportStore}){
 const s=useSyncExternalStore(store.subscribe,store.getSnapshot);useEffect(()=>{void store.initialize();},[store]);
 const locked=s.busy||s.pending,selected=s.selectedEcgIds;
 return <section className="ecg-import-panel" aria-label="Public ECG report import">
  <div className="ecg-import-heading"><div><h2>Public ECG report import</h2><p>Preview numerical PTB-XL+ reports with their original method, patient identity and source fields.</p></div><span className="research-label">Public research only</span></div>
  <p>These clinical research records stay separate from crew histories. Shifted dates are not actual examination times; parsing does not establish signal quality.</p>
  {s.error&&<p className="ecg-import-error" role="alert">{s.error.message}</p>}{s.notice&&<p className="ecg-import-notice" role="status">{s.notice}</p>}
  <fieldset disabled={locked}><legend>Named input and source files</legend><label>Published ECG feature method<select value={s.method} onChange={e=>store.setMethod(e.currentTarget.value as EcgResearchMethod)}><option>ECGDeli</option><option>Uni-G</option></select></label>
   <p>Licensed pinned excerpts are ready offline. Choose optional matching PTB files to replace them for this preview; each must be valid UTF-8 and at most 2 MiB.</p>
   <details><summary>Choose other licensed PTB CSV excerpts</summary><div className="ecg-import-files">{(['features','parent','description'] as const).map(role=><label key={role}>{({features:'ECG feature CSV',parent:'Matching PTB parent metadata CSV',description:'Feature description CSV'})[role]}<input type="file" accept=".csv,text/csv" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void store.loadFile(role,file);}}/><small>{s.files[role]}</small></label>)}</div></details>
  </fieldset>
  <div className="ecg-import-actions"><button disabled={locked} onClick={()=>void store.preview()}>{s.busy?'Preparing ECG import…':'Preview ECG import'}</button><button disabled={s.busy||!s.pending&&!s.preview?.command} onClick={()=>void store.save()}>{s.pending?'Retry same ECG import':'Import selected ECG reports'}</button><button disabled={s.busy} onClick={()=>void store.resetPreview()}>Clear ECG import preview</button></div>
  {s.preview&&<div className="ecg-import-preview"><h3>Record preview</h3><p>Choose records to import. Missing fields stay missing; rejected or conflicting records cannot be selected.</p>
   {s.preview.rows.map(row=><article key={row.ecgId}><div className="ecg-import-row"><label><input type="checkbox" aria-label={`Select ECG ${row.ecgId}`} checked={selected.includes(row.ecgId)} disabled={locked||['rejected','conflict'].includes(row.action)} onChange={e=>void store.selectRows(e.currentTarget.checked?[...selected,row.ecgId]:selected.filter(id=>id!==row.ecgId))}/> ECG {row.ecgId}</label><strong>{row.publicSubjectId??'Patient identity unavailable'}</strong><span>{row.action}</span></div>
    {row.errors.length>0&&<ul>{row.errors.map(error=><li key={error}>{error}</li>)}</ul>}
    <details><summary>Inspect fields for ECG {row.ecgId}</summary><dl>{row.fields.map(field=><div key={field.metric}><dt>{ecgLabels[field.metric]}</dt><dd><span>{field.status==='accepted'?<>{field.value} {field.unit} · original {field.originalValue} {field.originalUnit}</>:field.status==='missing'?`Missing: ${field.reason}`:`Rejected: ${field.reason}`}</span><small>Column: {field.column??'Not supplied by this mapping'}</small></dd></div>)}</dl></details>
   </article>)}
   <details><summary>Original files and {s.preview.unmappedColumns.length} unmapped columns</summary><p>Complete source files are retained unchanged if selected records are imported. Unmapped fields remain raw evidence and do not become diagnoses or derived measurements.</p><p className="ecg-import-columns">{s.preview.unmappedColumns.join(', ')}</p></details>
  </div>}
  <details className="ecg-import-retained"><summary>Retained public ECG reports ({s.reports.length})</summary>{s.reports.length?s.reports.map(({report,observations})=><article key={report.reportId}><h3>{report.publicSubjectId} · {report.method} · {report.lead}</h3><p>Reported shifted date: {report.originalTime??'Unknown'} · Actual time unavailable</p><ul>{observations.map(o=><li key={o.observationId}>{metricRegistry[o.metric].label}: {o.value===null?`Missing (${o.missingReason})`:`${o.value} ${o.unit}`}<small>{o.source.name} · Quality unknown · {o.validation.status} / {o.validation.admission}</small></li>)}</ul></article>):<p>No public ECG reports have been imported.</p>}</details>
  <button disabled={s.busy||!s.reports.length} onClick={()=>void store.exportRecords().then(snapshot=>{if(!snapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='ptb-ecg-research.json';link.click();URL.revokeObjectURL(url);})}>Export ECG research records</button>
  <p className="ecg-import-footnote">Research records are exported separately from crew data. <a href="https://physionet.org/content/ptb-xl-plus/1.0.1/" target="_blank" rel="noreferrer">PTB-XL+ 1.0.1</a> · <a href="https://physionet.org/content/ptb-xl/1.0.3/" target="_blank" rel="noreferrer">PTB-XL parent data</a> · CC BY 4.0. One acquisition lineage; individual assessment unavailable.</p>
 </section>;
}
