import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
async function files(folder){const result=[];for(const entry of await readdir(folder,{withFileTypes:true})){if(['.git','node_modules','dist','.scratch','test-results','playwright-report'].includes(entry.name))continue;const path=resolve(folder,entry.name);result.push(...entry.isDirectory()?await files(path):[path]);}return result;}
const all=await files(root),failures=[];let links=0;
for(const path of all){const name=relative(root,path).replaceAll('\\','/');if(/(^|\/)UI_REFERENCES\//.test(name)||/(^|\/)(?:AGENTS\.md|NASA_Project\.docx|NASA_Space_Apps_Astronaut_Health_Research\.docx|prompt\.txt|PROMPT_\d+.*\.txt|\.env(?:\..*)?|.*\.(?:pem|key))$/.test(name))failures.push('Private/internal file included: '+name);
 if(extname(path)==='.md'){const text=await readFile(path,'utf8');for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const target=match[1].replace(/^<|>$/g,'');if(/^[a-z][a-z\d+.-]*:/i.test(target)||target.startsWith('#'))continue;const file=resolve(dirname(path),decodeURIComponent(target.split('#')[0]));links++;if(file!==root&&!file.startsWith(root+sep)){failures.push('Link leaves public snapshot: '+name+' -> '+target);continue;}try{await stat(file);}catch{failures.push('Broken link: '+name+' -> '+target);}}}}
const provenance=JSON.parse(await readFile(resolve(root,'public/atlas/provenance.json'),'utf8'));for(const entry of provenance.files){const bytes=await readFile(resolve(root,'public/atlas',entry.file));if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)failures.push('Atlas bytes/hash differ: '+entry.file);}
if(failures.length)throw Error(failures.join('\n'));console.log(`Public snapshot: ${all.length} files, ${links} local links and all pinned atlas hashes checked.`);
