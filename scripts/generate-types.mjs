import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from 'json-schema-to-typescript';
const root=resolve(import.meta.dirname,'..');
const schema=JSON.parse(await readFile(resolve(root,'src/shared/contracts/v0.1.0.schema.json'),'utf8'));
// Reach every named definition explicitly; this wrapper changes no runtime schema.
const wrapper={...schema,title:'FoundationContracts',type:'object',properties:Object.fromEntries(Object.keys(schema.$defs).map(name=>[name,{$ref:`#/$defs/${name}`}]))};
delete wrapper.$ref;
const types=await compile(wrapper,'FoundationContracts',{unreachableDefinitions:true,additionalProperties:false,bannerComment:'/* Generated from v0.1.0.schema.json. Run npm run generate; never edit this file. */',ignoreMinAndMaxItems:true,style:{singleQuote:true}});
const target=resolve(root,'src/shared/contracts/generated.ts');
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==types)throw new Error('Generated TypeScript drift');}else await writeFile(target,types);
console.log('TypeScript generated from JSON Schema.');
