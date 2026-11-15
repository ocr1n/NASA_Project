// Packed-buffer and GPU part-state approach adapted from ashemag/human-atlas (MIT).
// Pinned source and full license: public/atlas/HUMAN-ATLAS-LICENSE.txt and provenance.json.
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AtlasData} from '../../shared/atlas';
export type Layer='skeletal'|'muscular'|'organ';
export interface AtlasState {layers:Record<Layer,{visible:boolean;opacity:number}>;selected:string[];isolate:boolean;focus:number;reset:number;overlays:Record<string,'warning'|'critical'|'reported_site'>}
const layerOf=(system:string):Layer=>system==='skeletal'||system==='connective'?'skeletal':system==='muscular'?'muscular':'organ';
const colors:Record<Layer,T.Color>={skeletal:new T.Color('#ddd2b6'),muscular:new T.Color('#a85b50'),organ:new T.Color('#ac6870')};

export function mountAtlas(host:HTMLElement,atlas:AtlasData,onSelect:(id:string)=>void,onProgress:(n:number)=>void,onError:(text:string)=>void){
 let disposed=false,visible=false,frame=0,ready=false,state:AtlasState|null=null,lastReset=-1,lastFocus=-1;
 const abort=new AbortController(),renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#fbfbf9');renderer.outputColorSpace=T.SRGBColorSpace;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D reference anatomy. Drag to orbit; scroll to zoom. Use the region list for keyboard selection.');host.appendChild(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,50),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.dampingFactor=.1;controls.minDistance=.06;controls.maxDistance=8;controls.target.set(0,.85,0);camera.position.set(0,.9,3.4);
 scene.add(new T.HemisphereLight(0xffffff,0x59605c,2.3));const light=new T.DirectionalLight(0xffffff,2);light.position.set(-2,3,4);scene.add(light);
 const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),texture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;
 const geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],batches:T.Mesh[]=[],materials:Record<Layer,T.MeshStandardMaterial>={} as Record<Layer,T.MeshStandardMaterial>;
 const invalidate=()=>{if(!disposed&&visible&&!frame)frame=requestAnimationFrame(render);};
 const reset=()=>{controls.target.set(0,.85,0);camera.position.set(0,.9,Math.max(3.4,1.15/camera.aspect));controls.update();};
 function render(){frame=0;if(disposed||!visible)return;controls.update();renderer.render(scene,camera);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);}
 const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)invalidate();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});visibilityObserver.observe(host);
 for(const layer of ['skeletal','muscular','organ'] as const){
  const m=new T.MeshStandardMaterial({color:colors[layer],roughness:.7,side:T.DoubleSide});
  m.onBeforeCompile=shader=>{shader.uniforms.partState={value:texture};shader.uniforms.stateWidth={value:width};
   shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform float stateWidth; varying vec4 partFlags;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npartFlags = texture2D(partState, vec2((partIndex + 0.5) / stateWidth, 0.5));');
   shader.fragmentShader='varying vec4 partFlags;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(partFlags.r < 0.5) discard;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(partFlags.b > 0.5) diffuseColor.rgb = partFlags.b > 1.5 ? vec3(0.75,0.15,0.16) : vec3(0.85,0.48,0.1);\nelse if(partFlags.g > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15,0.7,0.65),0.7);');
  };materials[layer]=m;
 }
 function apply(next:AtlasState){state=next;if(disposed)return;host.dataset.highlightedParts=String(Object.keys(next.overlays).length);
  atlas.parts.forEach((p,i)=>{const selected=next.selected.includes(p.id),overlay=next.overlays[p.id];data.set([(next.isolate?selected:(p.system!=='integumentary'&&next.layers[layerOf(p.system)].visible)||selected)?1:0,selected?1:0,overlay==='critical'?2:overlay?1:0,0],i*4);});texture.needsUpdate=true;
  for(const layer of ['skeletal','muscular','organ'] as const){const m=materials[layer],opacity=next.isolate?1:next.layers[layer].opacity;m.opacity=opacity;m.transparent=opacity<1;m.depthWrite=opacity===1;m.needsUpdate=true;}
  if(lastReset!==next.reset){lastReset=next.reset;reset();}
  if(lastFocus!==next.focus){lastFocus=next.focus;const box=new T.Box3();for(const p of atlas.parts)if(next.selected.includes(p.id))box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));if(!box.isEmpty()){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),distance=Math.max(size.y,size.x/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.4;controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(.12,.05,1).normalize().multiplyScalar(Math.max(.1,distance)));controls.update();}}
  invalidate();
 }
 const resize=()=>{if(disposed)return;camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);invalidate();};const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',invalidate);resize();reset();
 let start:{id:number;x:number;y:number;drag:boolean}|null=null;
 const down=(e:PointerEvent)=>{if(start){start.drag=true;return;}start={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false};};
 const move=(e:PointerEvent)=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)start.drag=true;};
 const cancel=()=>{start=null;};
 const up=(e:PointerEvent)=>{const tap=start;start=null;if(!ready||!tap||tap.id!==e.pointerId||tap.drag||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>6)return;const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);let hit:string|null=null,distance=Infinity;
  pickers.forEach((mesh,i)=>{if(!mesh||data[i*4]<.5)return;const intersection=ray.intersectObject(mesh,false)[0];if(intersection&&intersection.distance<distance){distance=intersection.distance;hit=atlas.parts[i].id;}});if(hit)onSelect(hit);
 };
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
 const lost=(e:Event)=>{e.preventDefault();onError('Graphics context lost. The region list and saved evidence remain available. Reopen this page to retry 3D.');};canvas.addEventListener('webglcontextlost',lost);
 const load=async(index:number)=>{const chunk=atlas.chunks[index],url=`${import.meta.env.BASE_URL}atlas/${chunk.gzip.split('/').at(-1)}`;const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw Error('An anatomy file could not be loaded.');let buffer=await response.arrayBuffer();if(new Uint8Array(buffer)[0]===0x1f&&new Uint8Array(buffer)[1]===0x8b)buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();if(buffer.byteLength!==chunk.bytes)throw Error('An anatomy file is incomplete.');if(disposed)return;
  const groups=new Map<Layer,T.BufferGeometry[]>();atlas.parts.forEach((p,i)=>{if(p.chunk!==index)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));g.setAttribute('partIndex',new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i),1));g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);const pick=new T.Mesh(g);pick.updateMatrixWorld(true);pickers[i]=pick;const layer=layerOf(p.system),list=groups.get(layer)??[];list.push(g);groups.set(layer,list);});
  for(const [layer,list] of groups){const g=mergeGeometries(list,false);if(!g)throw Error('Anatomy batch could not be assembled.');geometries.push(g);const mesh=new T.Mesh(g,materials[layer]);mesh.frustumCulled=false;batches.push(mesh);scene.add(mesh);}invalidate();
 };
 void(async()=>{try{let cursor=0,loaded=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<atlas.chunks.length){await load(cursor++);if(disposed)return;onProgress(Math.round(++loaded/atlas.chunks.length*100));}}));if(!disposed){ready=true;if(state)apply(state);host.dataset.loaded='true';invalidate();}}catch(e){if(!disposed)onError(e instanceof Error?e.message:'3D anatomy unavailable.');}})();
 return {update:apply,dispose:()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();visibilityObserver.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
