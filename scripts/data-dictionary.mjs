import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const schema=JSON.parse(await readFile(resolve(root,'src/shared/contracts/v0.1.0.schema.json'),'utf8'));
const metrics=JSON.parse(await readFile(resolve(root,'src/shared/metrics/registry.json'),'utf8'));
const target=resolve(root,'docs/DATA_DICTIONARY.md');
const cell=value=>String(value).replaceAll('|','&#124;').replaceAll('\n',' ');
const literal=value=>'`'+cell(JSON.stringify(value))+'`';
function typeOf(s){
 if(s.$ref)return s.$ref.split('/').at(-1);
 if('const' in s)return literal(s.const);
 if(s.enum)return s.enum.map(literal).join(' / ');
 if(s.anyOf||s.oneOf)return (s.anyOf??s.oneOf).map(typeOf).join(' or ');
 if(s.type==='array')return `array of ${typeOf(s.items??{})}`;
 return Array.isArray(s.type)?s.type.join(' or '):s.type??'see constraints';
}
function example(s){
 if('const' in s)return literal(s.const);
 if(s.enum)return literal(s.enum[0]);
 if(s.$ref)return `See ${s.$ref.split('/').at(-1)}`;
 if(s.anyOf||s.oneOf)return example((s.anyOf??s.oneOf).find(x=>x.type!=='null')??{type:'null'});
 if(s.type==='array')return 'See item fields/type';
 if(s.type==='object')return 'See nested fields';
 if(s.type==='null')return '`null`';
 if(s.type==='boolean')return '`false`';
 if(s.type==='number'||s.type==='integer')return literal(s.minimum??0);
 if(s.format==='date-time')return '`2026-01-10T12:00:00Z`';
 if(s.format==='date')return '`2026-01-10`';
 if(s.format==='uri')return '`https://example.org/evidence`';
 return 'Illustrative string; obey pattern below';
}
function rows(s,prefix='',required=true){
 const out=[];
 for(const [key,field] of Object.entries(s.properties??{})){
  const path=prefix?`${prefix}.${key}`:key;
  const rules=Object.fromEntries(Object.entries(field).filter(([k])=>!['title','description','type','properties','items','$ref','const','enum','anyOf','oneOf'].includes(k)));
  out.push(`| \`${cell(path)}\` | ${cell(typeOf(field))} | ${required&&(s.required??[]).includes(key)?'yes':'conditional/optional'} | ${Object.keys(rules).length?literal(rules):'—'} | ${example(field)} |`);
  out.push(...rows(field,path,required&&(s.required??[]).includes(key)));
  if(field.items)out.push(...rows(field.items,path+'[]',false));
  for(const variant of field.anyOf??field.oneOf??[])out.push(...rows(variant,path,false));
 }
 return out;
}
const parts=[
 '# Data dictionary',
 'Generated from the shared JSON Schema and metric registry. Run npm run docs:dictionary to regenerate; append -- --check to verify drift.',
 'Contract version **0.1.0**. Examples illustrate structure, not medical values. Undeclared fields are rejected. Cross-record and interpretation gates are described in [DATA_VALIDATION](DATA_VALIDATION.md). The [canonical schema](../src/shared/contracts/v0.1.0.schema.json) contains every conditional and variant; nested requiredness here depends on the selected variant. These tables avoid duplicating the complete schema.',
 'Reported measurement time, received time, original units and values remain distinct. Unknown or missing data is null with a reason; partial dates are never fabricated into exact timestamps. Immutable RawRecord evidence carries versioned capture, reference and demo-state payloads.',
 '## Metric catalogue',
 Object.keys(metrics).length+' registered metrics. Scientific definitions remain pending; no operational medical threshold is admitted. Dimensional conversions do not establish clinical validity.',
 '| Key | Bundle/category | Canonical unit | Input units | Value kinds | Required acquisition context | Definition status |',
 '| --- | --- | --- | --- | --- | --- | --- |',
 ...Object.entries(metrics).map(([key,m])=>'| '+key+' | '+m.category+' | '+literal(m.canonicalUnit)+' | '+m.allowedInputUnits.map(literal).join(', ')+' | '+m.valueKinds.join(', ')+' | '+m.requiredContext.join(', ')+' | '+m.definitionStatus+' |'),
 'Full definitions and conversion evidence are in [registry.json](../src/shared/metrics/registry.json). Canonical value = input value × factor + offset. Indexed/unindexed quantities, percentage points/relative change and measured/estimated results remain distinct.',
 '## Shared definitions'
];
for(const [name,definition] of Object.entries(schema.$defs)){
 parts.push(`### ${name}`);
 if(definition.properties){
  parts.push('| Field/path | Type or allowed values | Required | Constraints | Example/illustration |','| --- | --- | --- | --- | --- |',...rows(definition));
 }else parts.push(`Type/variants: ${typeOf(definition)}.`);
}
const content=parts.join('\n\n').replaceAll('|\n\n|','|\n|')+'\n';
if(process.argv.includes('--check')){
 const existing=await readFile(target,'utf8').catch(()=>null);
 if(existing?.replaceAll('\r\n','\n')!==content){console.error('Data dictionary is missing or stale; run npm run docs:dictionary.');process.exitCode=1;}
 else console.log(`PASS: dictionary matches ${Object.keys(schema.$defs).length} definitions and ${Object.keys(metrics).length} metrics.`);
}else{
 await writeFile(target,content);
 console.log(`Generated docs/DATA_DICTIONARY.md (${Object.keys(schema.$defs).length} definitions, ${Object.keys(metrics).length} metrics).`);
}
