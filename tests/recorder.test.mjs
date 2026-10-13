import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

// Ejecuta el cliente real con APIs DOM/audio simuladas, sin micrófono personal.
class Element {
  constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.value='';this.textContent='';this.listeners={};this.attributes={};this.children=new Map();this.classes=new Set();this.classList={add:key=>this.classes.add(key),remove:(...keys)=>keys.forEach(key=>this.classes.delete(key)),toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};this.style={setProperty(){}};this.elements={};this.paused=true;this.currentTime=0;this.duration=Infinity;}
  set innerHTML(value){this.html=value;if(value.includes('record-start')){
    this.children=new Map(['record-start','record-stop','record-send','record-again','record-preview','record-preview-player','preview-toggle','preview-seek','preview-current','preview-duration','record-live','record-confirm','record-state','record-clock','record-confirm-title','platform-feedback'].map(key=>[`.${key}`,new Element(key)]));
    for(const key of ['record-live','record-confirm','record-preview'])this.children.get(`.${key}`).hidden=true;
  }}
  get innerHTML(){return this.html||'';}
  querySelector(selector){return this.children.get(selector)||null;}
  querySelectorAll(){return [];}
  append(element){element.parent=this;}
  addEventListener(type,fn){this.listeners[type]=fn;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  focus(){}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this[name];}
  load(){this.currentTime=0;this.duration=Infinity;}
  pause(){this.paused=true;this.listeners.pause?.();}
  async play(){this.paused=false;this.listeners.play?.();}
}
async function client({denyMic=false,failPut=false,role='tenor'}={}){
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
  const docListeners={},windowListeners={},requests=[],uploads=[],revoked=[];
  const seasonId=randomUUID(),songs=[{id:randomUUID(),season_id:seasonId,legacy_key:'fum',title:'Fum Fum Fum'},{id:randomUUID(),season_id:seasonId,legacy_key:'campanas',title:'Canto de las campanas'}];
  let clock=1000,lastRecorder,failed=false;
  const track={stopped:false,stop(){this.stopped=true;},addEventListener(){}};
  class Recorder {
    static isTypeSupported(mime){return mime==='audio/webm;codecs=opus';}
    constructor(stream,options){lastRecorder=this;this.state='inactive';this.mimeType=options.mimeType;this.options=options;}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,1,2,3,4])],{type:this.mimeType})});queueMicrotask(()=>this.onstop?.());}
  }
  const location={protocol:'http:',hash:'#fum'};
  const fetch=async(path,options={})=>{
    requests.push({path,options});let data={ok:true};
    if(path==='/api/session')data={user:{id:randomUUID(),role,display_name:'Cuenta de prueba'},csrf:'test-csrf',limits:{audio_bytes:20000000,audio_seconds:600}};
    else if(path==='/api/setup')data={needs_setup:false};
    else if(path==='/api/public/seasons')data=[{id:seasonId,year:2026,status:'active'},{id:randomUUID(),year:2025,status:'closed'}];
    else if(path.startsWith('/api/public/songs'))data=songs;
    else if(path.startsWith('/api/public/stats'))data={members:[],overview:{rehearsals:0,totalHours:0,averageAttendance:null}};
    else if(path==='/api/admin/users')data=[];
    else if(path.startsWith('/api/admin/active-rehearsal'))data=null;
    else if(path.startsWith('/api/admin/summary'))data={users:{active:1,total:8},storage:{bytes:0,count:0},season_storage:{bytes:0,count:0},limits:{total_bytes:8000000000,season_bytes:2000000000},storage_configured:true};
    else if(path==='/api/recordings/reserve'){const b=JSON.parse(options.body);uploads.push(b);data={id:b.id,status:'pending'};}
    else if(options.method==='PUT'&&failPut&&!failed){failed=true;throw new Error('simulated network failure');}
    return Response.json(data);
  };
  runInNewContext(await readFile('platform.js','utf8'),{
    document:{body:get('body'),readyState:'loading',getElementById:get,querySelectorAll:()=>[],addEventListener:(name,fn)=>docListeners[name]=fn},
    window:{MediaRecorder:Recorder,addEventListener:(name,fn)=>windowListeners[name]=fn,updateTenoresStats(){},updateTenoresSongs(){}},
    navigator:{mediaDevices:{async getUserMedia(options){if(denyMic){const e=new Error();e.name='NotAllowedError';throw e;}assert.equal(options.audio.channelCount,1);return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}},
    MediaRecorder:Recorder,location,fetch,Blob,URL:{createObjectURL:()=>`blob:test-${randomUUID()}`,revokeObjectURL:url=>revoked.push(url)},crypto:{randomUUID},
    performance:{now:()=>clock},setInterval:()=>1,clearInterval(){},setTimeout,FormData,console,Date
  });
  await docListeners.DOMContentLoaded();
  const root=get('practiceCard'),node=key=>root.querySelector(`.${key}`);
  return {get,node,root,requests,uploads,songs,track,revoked,advance(){clock+=4000;},recorder:()=>lastRecorder,navigate(key){location.hash=`#${key}`;windowListeners.hashchange();}};
}
test('Detener muestra confirmación y nunca sube sin pulsar Enviar',async()=>{
  const c=await client();assert(c.root.innerHTML.includes('Subir mi práctica'));assert(c.node('record-confirm').hidden);
  await c.node('record-start').onclick();assert.equal(c.recorder().options.audioBitsPerSecond,64000);assert(c.node('record-start').hidden);assert(!c.node('record-live').hidden);
  c.advance();c.node('record-stop').onclick();await Promise.resolve();
  assert(c.track.stopped);assert(!c.node('record-confirm').hidden);assert(c.node('record-preview').hidden);assert(c.root.innerHTML.includes('Tu jefe de cuerda lo revisará para evaluar tu progreso.'));assert.equal(c.uploads.length,0);
  await Promise.all([c.node('record-send').onclick(),c.node('record-send').onclick()]);
  assert.equal(c.uploads.length,1);assert.equal(c.requests.filter(r=>r.options.method==='PUT').length,1);assert.equal(c.uploads[0].duration_seconds,4);assert.equal(c.uploads[0].mime_type,'audio/webm;codecs=opus');assert(c.node('record-confirm').hidden);assert(!c.node('record-start').hidden);
});
test('Un fallo conserva la vista previa y el reintento usa el mismo identificador',async()=>{
  const c=await client({failPut:true});await c.node('record-start').onclick();c.advance();c.node('record-stop').onclick();await Promise.resolve();const preview=c.node('record-preview').src;
  await c.node('record-send').onclick();assert(!c.node('record-confirm').hidden);assert.equal(c.node('record-preview').src,preview);assert(c.node('platform-feedback').textContent.includes('Tu audio se conserva'));
  await c.node('record-send').onclick();assert.equal(c.uploads.length,2);assert.equal(c.uploads[0].id,c.uploads[1].id);assert(c.node('record-confirm').hidden);
});
test('Denegar micrófono permite volver a intentar sin subir nada',async()=>{
  const c=await client({denyMic:true});await c.node('record-start').onclick();assert(!c.node('record-start').hidden);assert(!c.node('record-start').disabled);assert(c.node('platform-feedback').textContent.includes('Permiso de micrófono denegado'));assert.equal(c.uploads.length,0);
});
test('Volver a grabar elimina el audio anterior y regresa al botón sin iniciar otra toma',async()=>{
  const c=await client();await c.node('record-start').onclick();c.advance();c.node('record-stop').onclick();await Promise.resolve();
  const previousRecorder=c.recorder(),previousUrl=c.node('record-preview').src;await c.node('preview-toggle').onclick();
  await c.node('record-again').onclick();assert(c.node('record-confirm').hidden);assert(c.node('record-live').hidden);assert(!c.node('record-start').hidden);assert(!c.node('record-start').disabled);assert(c.node('record-preview').paused);assert.equal(c.node('record-preview').src,undefined);assert(c.revoked.includes(previousUrl));assert.equal(c.recorder(),previousRecorder);assert.equal(c.recorder().state,'inactive');assert.equal(c.uploads.length,0);
  await c.node('record-start').onclick();assert.notEqual(c.recorder(),previousRecorder);assert.equal(c.recorder().state,'recording');
  c.advance();c.node('record-stop').onclick();await Promise.resolve();assert.notEqual(c.node('record-preview').src,previousUrl);await c.node('record-send').onclick();assert.equal(c.uploads.length,1);assert.equal(c.uploads[0].song_id,c.songs[0].id);
  c.navigate('campanas');await c.node('record-start').onclick();c.advance();c.node('record-stop').onclick();await Promise.resolve();await c.node('record-send').onclick();assert.equal(c.uploads[1].song_id,c.songs[1].id);
});

test('El reproductor de práctica reproduce, pausa y permite avanzar sin duración WebM',async()=>{
  const c=await client();await c.node('record-start').onclick();c.advance();c.node('record-stop').onclick();await Promise.resolve();
  assert.equal(c.node('preview-duration').textContent,'00:04');assert.equal(c.node('preview-seek').max,'4');
  await c.node('preview-toggle').onclick();assert.equal(c.node('preview-toggle').attributes['aria-label'],'Pausar práctica');assert(!c.node('record-preview').paused);
  c.node('preview-seek').value='2';c.node('preview-seek').oninput();assert.equal(c.node('record-preview').currentTime,2);assert.equal(c.node('preview-current').textContent,'00:02');
  await c.node('preview-toggle').onclick();assert(c.node('record-preview').paused);assert.equal(c.node('preview-toggle').attributes['aria-label'],'Escuchar práctica');
  c.node('record-preview').duration=4.5;c.node('record-preview').listeners.durationchange();assert.equal(c.node('preview-seek').max,'4.5');
  c.node('preview-seek').value='80';c.node('preview-seek').oninput();assert.equal(c.node('record-preview').currentTime,4.5);await c.node('record-send').onclick();assert(c.node('record-preview').paused);
});

test('Jefatura abre Inicio con dos gráficas y al salir restaura el espacio del tenor',async()=>{
  const c=await client({role:'admin'});assert(c.get('body').classes.has('is-admin'));assert(c.get('body').classes.has('is-admin-home'));assert(!c.get('adminDashboard').hidden);assert.equal(c.get('platformWorkspace').parent,c.get('adminWorkspace'));assert.equal(c.get('platformNav').parent,c.get('adminNavigation'));assert(!c.get('adminNavigation').hidden);assert(!c.get('platformPanel').open);assert(c.root.hidden);assert(c.get('platformContent').innerHTML.includes('Similitud del equipo'));assert(c.get('platformContent').innerHTML.includes('Progreso del equipo'));assert(!c.get('platformContent').innerHTML.includes('Grupos de desempeño'));assert(c.get('platformSeason').hidden);assert(!c.get('seasonPicker').hidden);
  c.get('body').classes.add('is-rehearsal');c.get('loginForm').elements.username=new Element();await c.get('logoutButton').onclick({target:c.get('logoutButton')});assert(!c.get('body').classes.has('is-admin'));assert(!c.get('body').classes.has('is-rehearsal'));assert(c.get('adminDashboard').hidden);assert.equal(c.get('platformWorkspace').parent,c.get('platformPanel'));assert(c.get('accessGate').open);
});

test('La biblioteca del tenor muestra únicamente la temporada 2026',async()=>{
  const c=await client();assert(c.get('platformSeason').hidden);assert(!c.get('personalSeason').hidden);assert(c.get('platformSeason').innerHTML.includes('2026'));assert(!c.get('platformSeason').innerHTML.includes('2025'));assert.equal(c.get('platformNav').parent,c.get('platformWorkspace'));
});
