import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

// Ejecuta el cliente real con APIs DOM simuladas y un módulo de práctica simulado (sin micrófono).
const rendered=[];
class Element {
  constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.value='';this.textContent='';this.listeners={};this.attributes={};this.children=new Map();this.classes=new Set();this.classList={add:key=>this.classes.add(key),remove:(...keys)=>keys.forEach(key=>this.classes.delete(key)),toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};this.style={setProperty(){}};this.elements={};this.dataset={};this.paused=true;this.currentTime=0;this.duration=Infinity;}
  // Cada clase del marcado se vuelve un hijo consultable con querySelector('.clase').
  set innerHTML(value){this.html=value;rendered.push(value);this.children=new Map();
    for(const [,attrs] of value.matchAll(/<\w+([^>]*)>/g)){const cls=/class="([^"]*)"/.exec(attrs);if(!cls)continue;for(const name of cls[1].split(/\s+/).filter(Boolean))if(!this.children.has(`.${name}`)){const child=new Element(name);child.hidden=/\shidden(\s|=|$)/.test(attrs);this.children.set(`.${name}`,child);}}
  }
  get innerHTML(){return this.html||'';}
  querySelector(selector){return this.children.get(selector)||null;}
  querySelectorAll(){return [];}
  append(element){element.parent=this;}
  addEventListener(type,fn){this.listeners[type]=fn;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  focus(){}
  scrollIntoView(){}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this[name];}
  load(){this.currentTime=0;this.duration=Infinity;}
  pause(){this.paused=true;this.listeners.pause?.();}
  async play(){this.paused=false;this.listeners.play?.();}
}
async function client({role='tenor',hasReference=1,supported=true,reserveStatus=200}={}){
  rendered.length=0;
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
  const docListeners={},windowListeners={},requests=[],uploads=[],created=[],opened=[],closed=[],pending={value:false};
  const seasonId=randomUUID(),songs=[{id:randomUUID(),season_id:seasonId,legacy_key:'fum',title:'Fum Fum Fum',reference_audio_key:'https://res.cloudinary.com/demo/video/upload/fum.mp3',has_reference:hasReference},{id:randomUUID(),season_id:seasonId,legacy_key:'campanas',title:'Canto de las campanas',reference_audio_key:'https://res.cloudinary.com/demo/video/upload/campanas.mp3',has_reference:1}];
  const recordings=[{id:randomUUID(),song_id:songs[0].id,title:songs[0].title,uploaded_at:'2026-03-01T15:00:00Z',duration_seconds:30,score:80,has_analysis:1},{id:randomUUID(),song_id:songs[0].id,title:songs[0].title,uploaded_at:'2026-02-01T15:00:00Z',duration_seconds:20,score:null,has_analysis:0}];
  const location={protocol:'http:',hash:'#fum'};
  const fetch=async(path,options={})=>{
    requests.push({path,options});let data={ok:true};
    if(path==='/api/session')data={user:{id:randomUUID(),role,display_name:'Cuenta de prueba'},csrf:'test-csrf',limits:{audio_bytes:20000000,audio_seconds:600}};
    else if(path==='/api/setup')data={needs_setup:false};
    else if(path==='/api/public/seasons')data=[{id:seasonId,year:2026,status:'active'},{id:randomUUID(),year:2025,status:'closed'}];
    else if(path.startsWith('/api/public/songs'))data=songs;
    else if(path.startsWith('/api/public/stats'))data={members:[],overview:{rehearsals:0,totalHours:0,averageAttendance:null}};
    else if(path==='/api/admin/users')data=[];
    else if(path.startsWith('/api/admin/practice-scores'))data=[];
    else if(path.startsWith('/api/admin/active-rehearsal'))data=null;
    else if(path.startsWith('/api/admin/summary'))data={users:{active:1,total:8},storage:{bytes:0,count:0},season_storage:{bytes:0,count:0},limits:{total_bytes:8000000000,season_bytes:2000000000},storage_configured:true};
    else if(path.startsWith('/api/recordings?'))data={items:recordings,next_offset:null};
    else if(/^\/api\/recordings\/[^/]+\/analysis$/.test(path))data={scores:{total:80}};
    else if(path==='/api/recordings/reserve'){const b=JSON.parse(options.body);uploads.push(b);if(reserveStatus!==200)return Response.json({error:'El almacenamiento de audios aún no está configurado.'},{status:reserveStatus});data={id:b.id,status:'pending'};}
    return Response.json(data);
  };
  const tenoresPractice={isSupported:()=>supported,open(song,hooks){opened.push({song,hooks});},close(options){closed.push(options);},hasPendingTake:()=>pending.value,analysisMarkup:a=>`<div class="stub-analysis">Detalle ${a.scores.total}</div>`};
  runInNewContext(await readFile('platform.js','utf8'),{
    document:{body:get('body'),readyState:'loading',getElementById:get,querySelectorAll:()=>[],createElement:tag=>{const e=new Element(tag);created.push(e);return e;},addEventListener:(name,fn)=>docListeners[name]=fn},
    window:{tenoresPractice,addEventListener:(name,fn)=>windowListeners[name]=fn,updateTenoresStats(){},updateTenoresSongs(){}},
    location,fetch,Blob,URL,crypto:{randomUUID},setInterval:()=>1,clearInterval(){},setTimeout,FormData,console,Date
  });
  await docListeners.DOMContentLoaded();
  const root=get('practiceCard'),node=key=>root.querySelector(`.${key}`);
  return {get,node,root,requests,uploads,songs,recordings,created,opened,closed,pending,location,navigate(key){location.hash=`#${key}`;windowListeners.hashchange();}};
}
const take=()=>({id:randomUUID(),blob:new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,1,2,3,4])],{type:'audio/webm;codecs=opus'}),mimeType:'audio/webm;codecs=opus',durationSeconds:4.2,analysis:{scores:{total:80}}});
const no90=()=>assert(!rendered.some(html=>html.includes('90%')),'ningún HTML debe mostrar 90%');

test('Con curva, la tarjeta ofrece «Practicar con guía» y abre la práctica con canción y límites',async()=>{
  const c=await client();assert(!c.root.hidden);assert(c.root.innerHTML.includes('Practicar con guía'));assert.equal(c.opened.length,0);
  await c.node('practice-launch').onclick();
  assert.equal(c.opened.length,1);const {song,hooks}=c.opened[0];
  assert.deepEqual({...song},{id:c.songs[0].id,title:'Fum Fum Fum',track:c.songs[0].reference_audio_key});
  assert.deepEqual({...hooks.limits},{audio_bytes:20000000,audio_seconds:600});
  await hooks.loadReference();assert(c.requests.some(r=>r.path===`/api/songs/${c.songs[0].id}/reference`));no90();
});
test('Sin curva se avisa y no se abre la práctica',async()=>{
  const c=await client({hasReference:0});assert(c.root.innerHTML.includes('Esta canción aún no tiene curva de referencia; jefatura debe generarla.'));assert(!c.root.innerHTML.includes('Practicar con guía'));assert.equal(c.node('practice-launch'),null);assert.equal(c.opened.length,0);
});
test('Sin soporte de grabación se avisa en la tarjeta',async()=>{
  const c=await client({supported:false});assert(c.root.innerHTML.includes('Tu navegador no permite grabar.'));assert.equal(c.node('practice-launch'),null);
});
test('Enviar reserva una vez con el análisis y sube el audio con PUT',async()=>{
  const c=await client();await c.node('practice-launch').onclick();const t=take();await c.opened[0].hooks.send(t);
  assert.equal(c.uploads.length,1);const b=c.uploads[0];
  assert.deepEqual({id:b.id,song_id:b.song_id,season_id:b.season_id,duration_seconds:b.duration_seconds,file_size:b.file_size,mime_type:b.mime_type},{id:t.id,song_id:c.songs[0].id,season_id:c.songs[0].season_id,duration_seconds:4.2,file_size:t.blob.size,mime_type:'audio/webm;codecs=opus'});
  assert.deepEqual(b.analysis,{scores:{total:80}});
  const puts=c.requests.filter(r=>r.options.method==='PUT');assert.equal(puts.length,1);assert.equal(puts[0].path,`/api/recordings/${t.id}`);assert.equal(puts[0].options.body,t.blob);assert.equal(puts[0].options.headers['Content-Type'],'audio/webm;codecs=opus');
});
test('Si la reserva falla (503) se rechaza con el mensaje del servidor y no hay PUT',async()=>{
  const c=await client({reserveStatus:503});await c.node('practice-launch').onclick();
  await assert.rejects(c.opened[0].hooks.send(take()),{message:'El almacenamiento de audios aún no está configurado.'});
  assert.equal(c.uploads.length,1);assert.equal(c.requests.filter(r=>r.options.method==='PUT').length,0);
});
test('Con una toma pendiente, cambiar de canción conserva la canción de la práctica',async()=>{
  const c=await client();c.pending.value=true;c.navigate('campanas');
  assert.equal(c.location.hash.replace('#',''),'fum');assert(c.node('platform-feedback').textContent.includes('Conservamos la práctica de Fum Fum Fum'));
  c.pending.value=false;c.navigate('campanas');assert(c.root.innerHTML.includes('Practicar con guía'));await c.node('practice-launch').onclick();assert.equal(c.opened.at(-1).song.id,c.songs[1].id);
});

test('Jefatura abre Inicio con dos gráficas y al salir restaura el espacio del tenor',async()=>{
  const c=await client({role:'admin'});assert(c.get('body').classes.has('is-admin'));assert(c.get('body').classes.has('is-admin-home'));assert(!c.get('adminDashboard').hidden);assert.equal(c.get('platformWorkspace').parent,c.get('adminWorkspace'));assert.equal(c.get('platformNav').parent,c.get('adminNavigation'));assert(!c.get('adminNavigation').hidden);assert(!c.get('platformPanel').open);assert(c.root.hidden);assert(c.get('platformContent').innerHTML.includes('Nota de práctica del equipo'));assert(c.get('platformContent').innerHTML.includes('Aún no hay prácticas enviadas.'));assert(!c.get('platformContent').innerHTML.includes('Similitud'));assert(c.get('platformContent').innerHTML.includes('Progreso del equipo'));assert(!c.get('platformContent').innerHTML.includes('Grupos de desempeño'));assert(c.get('platformSeason').hidden);assert(!c.get('seasonPicker').hidden);no90();
  c.get('body').classes.add('is-rehearsal');c.get('loginForm').elements.username=new Element();await c.get('logoutButton').onclick({target:c.get('logoutButton')});assert(!c.get('body').classes.has('is-admin'));assert(!c.get('body').classes.has('is-rehearsal'));assert(c.get('adminDashboard').hidden);assert.equal(c.get('platformWorkspace').parent,c.get('platformPanel'));assert(c.get('accessGate').open);
});

test('La biblioteca del tenor muestra únicamente la temporada 2026, con nota o «Sin análisis» y detalle bajo demanda',async()=>{
  const c=await client();assert(c.get('platformSeason').hidden);assert(!c.get('personalSeason').hidden);assert(c.get('platformSeason').innerHTML.includes('2026'));assert(!c.get('platformSeason').innerHTML.includes('2025'));assert.equal(c.get('platformNav').parent,c.get('platformWorkspace'));
  await c.get('practiceOpen').onclick();
  const items=c.created.filter(e=>e.className==='audio-history');assert.equal(items.length,2);
  const [scored,legacy]=items;assert(scored.innerHTML.includes('Nota: 80'));assert(scored.innerHTML.includes('Ver detalle'));assert(legacy.innerHTML.includes('Sin análisis'));assert(!legacy.innerHTML.includes('Ver detalle'));
  const toggle=scored.querySelector('.recording-detail-toggle'),detail=scored.querySelector('.recording-detail');assert(detail.hidden);
  await toggle.onclick();assert(!detail.hidden);assert(detail.innerHTML.includes('Detalle 80'));
  await toggle.onclick();assert(detail.hidden);await toggle.onclick();assert(!detail.hidden);
  assert.equal(c.requests.filter(r=>r.path===`/api/recordings/${c.recordings[0].id}/analysis`).length,1);no90();
});

test('El reproductor de práctica reproduce, pausa y permite avanzar sin duración WebM',async()=>{
  const c=await client();await c.get('practiceOpen').onclick();
  const item=c.created.find(e=>e.className==='audio-history'),find=key=>item.querySelector('.'+key);
  assert.equal(find('preview-duration').textContent,'00:30');assert.equal(find('preview-seek').max,'30');
  await find('preview-toggle').onclick();assert.equal(find('preview-toggle').attributes['aria-label'],'Pausar práctica');assert(!find('record-preview').paused);
  find('preview-seek').value='2';find('preview-seek').oninput();assert.equal(find('record-preview').currentTime,2);assert.equal(find('preview-current').textContent,'00:02');
  await find('preview-toggle').onclick();assert(find('record-preview').paused);assert.equal(find('preview-toggle').attributes['aria-label'],'Escuchar práctica');
  find('record-preview').duration=45.5;find('record-preview').listeners.durationchange();assert.equal(find('preview-seek').max,'45.5');
  find('preview-seek').value='80';find('preview-seek').oninput();assert.equal(find('record-preview').currentTime,45.5);
});
test('Cerrar sesión cierra la práctica a la fuerza y descarta la toma pendiente',async()=>{
  const c=await client();c.pending.value=true;c.get('loginForm').elements.username=new Element();
  await c.get('logoutButton').onclick({target:c.get('logoutButton')});
  assert.deepEqual(c.closed.map(o=>({...o})),[{force:true}]);assert(c.get('accessGate').open);
});
