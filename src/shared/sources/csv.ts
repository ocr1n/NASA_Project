import {failure} from '../contracts';

/** Strict CSV decoding; quoted delimiters/newlines and unmapped columns remain intact in RawRecord. */
export function readCSV(payload:string):Record<string,string>[] {
 // A leading UTF-8 BOM is transport metadata, not part of the first column name. RawRecord retains it.
 if(payload.startsWith('\uFEFF'))payload=payload.slice(1);
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 const finish=()=>{row.push(field);field='';closed=false;};
 for(let i=0;i<payload.length;i++){
  const c=payload[i];
  if(quoted){if(c==='"'){if(payload[i+1]==='"'){field+='"';i++;}else {quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){if(field||closed)throw failure('VALIDATION_FAILED','Unexpected CSV quote');quoted=true;}
  else if(c===',')finish();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&payload[i+1]==='\n')i++;finish();rows.push(row);row=[];}
  else {if(closed)throw failure('VALIDATION_FAILED','Characters after quoted CSV field');field+=c;}
 }
 if(quoted)throw failure('VALIDATION_FAILED','Unclosed CSV field');
 if(field||row.length||closed){finish();rows.push(row);}
 const headers=rows.shift();if(!headers?.length||new Set(headers).size!==headers.length||headers.some(h=>!h))throw failure('VALIDATION_FAILED','CSV headers must be nonempty and unique');
 return rows.filter(values=>values.some(value=>value!=='')).map((values,index)=>{if(values.length!==headers.length)throw failure('VALIDATION_FAILED',`CSV row ${index+2} has an incompatible field count`);return Object.fromEntries(headers.map((key,i)=>[key,values[i]]));});
}
