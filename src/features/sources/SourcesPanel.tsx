import {useEffect,useSyncExternalStore} from 'react';
import type {SourcesStore} from '../../shared/sources/store';
import {nasaContext,fixtureManifest} from '../../shared/sources/catalogue';
import {metricRegistry} from '../../shared/metrics';
import './sources.css';

export function SourcesPanel({store}:{store:SourcesStore}){
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot);useEffect(()=>{void store.refresh();return()=>store.dispose();},[store]);
 return <section className="sources-panel" aria-labelledby="sources-title"><h2 id="sources-title">Research sources and context</h2><p>{nasaContext.text}</p><a href={nasaContext.url} target="_blank" rel="noreferrer">{nasaContext.source}</a>
  <details><summary>Inspect the archive sample and evidence</summary><p>NASA OSD-575 contains serum laboratory metadata. The numerical ECG sample comes from two public clinical records in PTB-XL+, under CC BY 4.0. It is separate from the selected crew.</p><p>Archive retrieved: {fixtureManifest.retrievedAt}. This is a cached research sample. Actual clinical event dates and signal quality are unknown.</p>
   <button disabled={snapshot.busy} onClick={()=>void store.openSample()}>{snapshot.busy?'Opening sample…':'Open research sample'}</button><p role="status">{snapshot.notice}</p>{snapshot.error&&<p role="alert" className="error">{snapshot.error}</p>}
   {snapshot.observations.length>0&&<div className="table-scroll"><table aria-label="Public research intervals"><thead><tr><th>Public subject</th><th>Metric</th><th>Value</th><th>Method / lead</th><th>Admission</th></tr></thead><tbody>{snapshot.observations.map(o=><tr key={o.observationId}><td>{o.publicSubjectId}</td><td>{metricRegistry[o.metric].label}</td><td>{o.value===null?'Unknown':`${o.value} ${o.unit}`}</td><td>{o.measurementContext.method} / {o.measurementContext.lead}</td><td>Single source · Research only</td></tr>)}</tbody></table></div>}
   {snapshot.runs.length>0&&<ul className="source-ledger">{snapshot.runs.map(r=><li key={r.validationRunId}><strong>{r.claim.replace(/^[^:]+: /,'')}</strong><span>{{pending:'Review pending',verified:'Technical review complete',single_source:'One source',conflict:'Evidence conflicts',rejected:'Rejected'}[r.status]} · {r.independentEvidenceGroups.length} counted evidence groups</span><p>{r.limitations.join('. ')}</p></li>)}</ul>}
   <p>Echo, DXA, muscle exams and exercise exports have no admitted public individual fixture. RadLab provides instrument archives; these cannot supply a personal crew dose. Scientific rules remain pending.</p>
   <p>Attribution: Strodthoff et al., <a href="https://physionet.org/content/ptb-xl-plus/1.0.1/">PTB-XL+ 1.0.1</a>; Wagner et al., <a href="https://physionet.org/content/ptb-xl/1.0.3/">PTB-XL 1.0.3</a>; <a href="https://doi.org/10.1038/s41597-023-02153-8">original feature publication</a>; <a href="https://doi.org/10.1038/s44360-026-00096-z">PhysioNet platform</a>; <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Complete header/row excerpts; values unchanged.</p>
  </details>
 </section>;
}
