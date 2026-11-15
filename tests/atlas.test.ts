import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {atlasManifest} from '../src/shared/atlas';
const atlas=JSON.parse(readFileSync('public/atlas/atlas.json','utf8'));
test('pinned packed anatomy has complete buffers and verified source mappings',()=>{
 expect(atlas.parts).toHaveLength(2234);let triangles=0;
 for(const [index,chunk] of atlas.chunks.entries()){
  const bytes=gunzipSync(readFileSync('public/atlas/'+chunk.gzip.split('/').at(-1)));expect(bytes.byteLength).toBe(chunk.bytes);
  for(const p of atlas.parts.filter((p:{chunk:number})=>p.chunk===index)){expect(p.positions+p.vertexCount*12).toBeLessThanOrEqual(bytes.length);expect(p.normals+p.vertexCount*6).toBeLessThanOrEqual(bytes.length);expect(p.indices+p.indexCount*4).toBeLessThanOrEqual(bytes.length);triangles+=p.indexCount/3;}
 }
 expect(triangles).toBe(2288268);expect(atlasManifest.regions.every(r=>r.structureIds.length&&r.structureIds.every(id=>atlas.parts.some((p:{id:string})=>p.id===id)))).toBe(true);
 for(const region of atlasManifest.regions.filter(r=>r.laterality==='left'))for(const id of region.structureIds){const p=atlas.parts.find((p:{id:string})=>p.id===id);expect(p.name.toLowerCase()).toContain('left');expect((p.bounds[0][0]+p.bounds[1][0])/2).toBeGreaterThan(0);}
 expect(atlasManifest.regions.find(r=>r.regionKey==='heart')?.structureIds).toEqual([...atlas.concepts.find((c:{id:string})=>c.id==='FMA7088').elements].sort());
});
test('all distributed atlas files match their pinned provenance hashes',()=>{
 const provenance=JSON.parse(readFileSync('public/atlas/provenance.json','utf8'));for(const file of provenance.files){const bytes=readFileSync('public/atlas/'+file.file);expect(bytes.length).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);}
});
