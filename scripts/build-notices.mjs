import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
// Conservative runtime closure: include every non-development locked package,
// even when the bundler removes part of it. New packages require rights review.
const noticeFiles={
 'ajv':['LICENSE'], 'ajv-formats':['LICENSE'], 'dexie':['LICENSE','NOTICE'], 'three':['LICENSE'],
 'fast-deep-equal':['LICENSE'], 'fast-uri':['LICENSE'], 'json-schema-traverse':['LICENSE'],
 'react':['LICENSE'], 'react-dom':['LICENSE'], 'require-from-string':['license'], 'scheduler':['LICENSE']
};
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const runtime=Object.entries(lock.packages).filter(([path,pkg])=>path&&!pkg.dev).sort(([a],[b])=>a.localeCompare(b));
const expected=Object.keys(noticeFiles).map(name=>'node_modules/'+name).sort();
if(JSON.stringify(runtime.map(([path])=>path).sort())!==JSON.stringify(expected))throw new Error('Runtime dependency set changed: review license/notice files before distribution.');
const sections=['Astronaut health prototype — third-party notices',
 'Original project code has no selected public reuse license. Third-party components and research excerpts retain the terms below. NASA resources are context, not endorsement. Personal demo data are fictional.'];
for(const [path,pkg] of runtime){
 const installed=JSON.parse(await readFile(resolve(root,path,'package.json'),'utf8'));
 if(installed.version!==pkg.version||installed.license!==pkg.license)throw new Error('Installed runtime package does not match the lockfile: '+path);
 sections.push(`${installed.name} ${pkg.version} (${pkg.license})`);
 for(const file of noticeFiles[installed.name]){
  const license=await readFile(resolve(root,path,file),'utf8');
  if(!license.trim())throw new Error('Empty license/notice: '+path+'/'+file);
  sections.push(`${installed.name}/${file}\n\n${license}`);
 }
}
const attribution=(await readFile(resolve(root,'NOTICE.md'),'utf8')).split('## Research data')[1];
if(!attribution?.includes('CC BY 4.0'))throw new Error('Research attribution is missing.');
sections.push('Research data'+attribution,
 'PTB-XL / PTB-XL+ full source license\n\n'+await readFile(resolve(root,'src/shared/sources/fixtures/LICENSE-PTB.txt'),'utf8'));
// A static HTML wrapper preserves text/UTF-8 and favicon metadata on direct
// navigation. Escaping changes markup representation, not the license text.
const text=sections.join('\n\n'+'='.repeat(72)+'\n\n')+'\n';
const escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await writeFile(resolve(root,'dist/third-party-notices.html'),`<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" href="data:,"><title>Third-party notices | Astronaut health</title><style>body{margin:1.5rem;font-family:monospace;line-height:1.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:80rem;margin:auto}</style></head><body><main><pre>${escaped}</pre></main></body></html>\n`);
console.log(`Static notices: ${runtime.length} runtime packages, Dexie NOTICE and attributed PTB source license.`);
