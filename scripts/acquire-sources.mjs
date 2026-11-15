import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const fixtureRoot=resolve('src/shared/sources/fixtures'),cacheRoot=resolve('.scratch/sources');
const manifest=JSON.parse(await readFile(resolve(fixtureRoot,'manifest.json'),'utf8'));
const refresh=process.argv.includes('--refresh'),only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
if(only&&!manifest.files.some(f=>f.id===only))throw Error('Unknown manifest asset');
const hash=b=>createHash('sha256').update(b).digest('hex');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Extract exact header and complete source rows; no reserialization or numeric transformation. */
function excerpt(bytes,ids){
 if(!ids)return bytes;
 const rows=[];let quote=false,start=0;
 for(let i=0;i<bytes.length;i++){if(bytes[i]===34){if(quote&&bytes[i+1]===34)i++;else quote=!quote;}if(bytes[i]===10&&!quote){rows.push(bytes.subarray(start,i+1));start=i+1;}}
 if(quote)throw Error('Malformed CSV');if(start<bytes.length)rows.push(bytes.subarray(start));
 const selected=ids.map(id=>rows.slice(1).filter(r=>r.toString('utf8').startsWith(`${id},`)));
 if(selected.some(rows=>rows.length!==1))throw Error('Missing or duplicate selected ECG identity');
 return Buffer.concat([rows[0],...selected.flat()]);
}

let failed=false;
for(const file of manifest.files.filter(f=>!only||f.id===only)){
 const fixture=await readFile(resolve(fixtureRoot,file.file));if(hash(fixture)!==file.sha256||fixture.length!==file.bytes)throw Error(`Fixture checksum mismatch: ${file.id}`);
 if(!refresh){console.log(JSON.stringify({id:file.id,status:'offline_fixture',sha256:file.sha256,bytes:file.bytes,retrievedAt:manifest.retrievedAt}));continue;}
 const directory=resolve(cacheRoot,file.id);await mkdir(directory,{recursive:true});
 let state;try{state=JSON.parse(await readFile(resolve(directory,'state.json'),'utf8'));}catch{}
 const checkedAt=new Date().toISOString();
 if(state?.retryAt&&Date.parse(state.retryAt)>Date.now()){console.log(JSON.stringify({id:file.id,status:'rate_limited',retryAt:state.retryAt,retained:state.latestHash??null}));continue;}
 // One-hour archive cache, one-second pacing. These are network policies, not medical thresholds.
 if(state?.checkedAt&&Date.now()-Date.parse(state.checkedAt)<3600000){
  const cached=await readFile(resolve(directory,`${state.latestHash}.raw`));if(hash(cached)!==state.latestHash)throw Error('Cached raw integrity failure');
  console.log(JSON.stringify({id:file.id,status:state.status==='conflict'?'conflict':'cached',sha256:state.latestHash,checkedAt:state.checkedAt,note:state.status==='conflict'?'Changed same-version content remains quarantined':'Retained archive cache'}));continue;
 }
 try{
  const response=await fetch(file.url,{signal:AbortSignal.timeout(45000)});
  if(response.status===429||response.status===503){const retry=response.headers.get('retry-after'),delay=retry&&/^\d+$/.test(retry)?Number(retry)*1000:retry?Date.parse(retry)-Date.now():60000;const retryAt=new Date(Date.now()+Math.max(1000,Number.isFinite(delay)?delay:60000)).toISOString();await writeFile(resolve(directory,'state.json'),JSON.stringify({...state,retryAt}));console.log(JSON.stringify({id:file.id,status:'rate_limited',retryAt,retained:state?.latestHash??null}));continue;}
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);if(!Buffer.from(text).equals(bytes))throw Error('UTF-8 round-trip mismatch');
  const digest=hash(bytes),selected=excerpt(bytes,file.selectedEcgIds),selectedHash=hash(selected);
  try{await writeFile(resolve(directory,`${digest}.raw`),bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(!bytes.equals(await readFile(resolve(directory,`${digest}.raw`))))throw Error('Cached hash identity conflict');}
  const result={id:file.id,url:file.url,status:selectedHash===file.sha256?(state?.latestHash===digest?'unchanged':'refreshed'):'conflict',checkedAt,retrievedAt:state?.latestHash===digest?state.retrievedAt:checkedAt,latestHash:digest,selectedHash,bytes:bytes.length,note:'Archive only; changed same-version content requires review, no automatic fixture promotion'};
  await writeFile(resolve(directory,'state.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){failed=true;console.log(JSON.stringify({id:file.id,status:'error',message:e.message,retained:state?.latestHash??null}));}
 await wait(1000);
}
if(failed)process.exitCode=1;
