import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import worker from '../server/worker.mjs';
import {analyticsData} from '../server/analytics.mjs';
import {LocalD1} from '../scripts/local-adapters.mjs';
const window={};runInNewContext(await readFile('advanced.js','utf8'),{window,URLSearchParams,console});
const model=window.TenoresAdvanced;
test('Selección, porcentajes ponderados, huecos temporales y CSV coherente',()=>{
  const members=[{id:'a',name:'Ana',minutes:50,scheduled:100,attended:1,rehearsals:1,late:0,practices:1,scoreSum:73,scoredPractices:1},{id:'b',name:'Beto',minutes:300,scheduled:300,attended:2,rehearsals:3,late:1,practices:0,scoreSum:0,scoredPractices:0},{id:'c',name:'=CMD()',minutes:0,scheduled:0,attended:0,rehearsals:0,late:0,practices:0,scoreSum:0,scoredPractices:0}];
  assert.equal(model.value(members,'attendance'),87.5);assert.equal(model.value(model.selected(members,['a']),'attendance'),50);
  assert.equal(model.value(members,'coverage'),75);assert(Math.abs(model.value(members,'punctuality')-200/3)<1e-10);
  assert.equal(model.value([members[2]],'attendance'),null);assert.equal(model.value([members[2]],'similarity'),null);assert.equal(model.value(members,'similarity'),73);assert.equal(model.value(members,'logins',{webAvailable:false}),null);
  const data={range:{from:'2026-07-17',to:'2026-07-19'},meta:{webAvailable:true},daily:[{user_id:'a',day:'2026-07-17',minutes:50,scheduled:100},{user_id:'b',day:'2026-07-19',minutes:300,scheduled:300}]};
  assert.equal(JSON.stringify(model.timeline(data,['a'],'attendance','day')),JSON.stringify([{day:'2026-07-17',value:50},{day:'2026-07-18',value:null},{day:'2026-07-19',value:null}]));
  const csv=model.csv([members[0],members[2]],['attendance','similarity'],['a','c'],['a'],true,{});assert(csv.startsWith('\ufeff'));assert(csv.includes('"Ana";"A / B";"50";"73"'));assert(csv.includes('"\'=CMD()";"A";"";""'));assert(!csv.includes('Beto'));
});
test('Analytics: período, canciones, UTC-6, totales históricos y privacidad',async()=>{
  const DB=new LocalD1();await DB.migrate();const s=DB.sqlite;
  try{
    const season=s.prepare('SELECT * FROM seasons WHERE year=2026').get(),old=s.prepare('SELECT * FROM seasons WHERE year=2025').get();
    const members=s.prepare('SELECT user_id FROM season_memberships WHERE season_id=? LIMIT 2').all(season.id).map(r=>r.user_id),songs=s.prepare('SELECT id FROM songs WHERE season_id=? LIMIT 2').all(season.id).map(r=>r.id);
    const admin=randomUUID();s.prepare("INSERT INTO users(id,display_name,role) VALUES(?,'Prueba','admin')").run(admin);
    const rehearsal=(day,minutes,records,status='final')=>{const id=randomUUID();s.prepare('INSERT INTO rehearsals(id,season_id,rehearsal_date,starts_at,ends_at,duration_minutes,status,write_token,payload_hash,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,season.id,day,'08:00',minutes===100?'09:40':'13:00',minutes,status,id,id,admin,admin);for(const [user_id,effective] of records)s.prepare("INSERT INTO rehearsal_attendance(rehearsal_id,user_id,attendance_status,effective_minutes) VALUES(?,?,?,?)").run(id,user_id,effective?'on_time':'absent',effective);};
    rehearsal('2026-07-17',100,[[members[0],50]]);rehearsal('2026-07-19',300,[[members[1],300]]);rehearsal('2026-07-20',100,[[members[0],100]],'draft');
    for(const [song,uploaded,status] of [[songs[0],'2026-07-18T03:00:00Z','ready'],[songs[1],'2026-07-18T08:00:00Z','ready'],[songs[0],'2026-07-17T08:00:00Z','pending']])s.prepare('INSERT INTO recordings(id,user_id,song_id,season_id,r2_object_key,duration_seconds,file_size,mime_type,status,recorded_at,uploaded_at,score) VALUES(?,?,?,?,?,10,100,?,?,?,?,?)').run(randomUUID(),members[0],song,season.id,randomUUID(),'audio/webm',status,uploaded,uploaded,song===songs[0]?70:94);
    s.prepare("INSERT INTO activity_events(id,user_id,event_type,song_id,event_day) VALUES(?,?,'reference_start',?,'2026-07-17')").run(randomUUID(),members[0],songs[0]);
    const read=params=>analyticsData({DB},new URL('https://test/api/admin/analytics?season='+season.id+'&'+params));
    const all=await read(''),chosen=model.selected(all.members,members);assert.equal(model.value(chosen,'attendance'),87.5);assert.equal(chosen.find(m=>m.id===members[0]).practices,2);assert.equal(model.value(chosen,'similarity'),82);assert.equal(all.meta.similarityMode,'analysis');assert(!all.daily.some(r=>r.day==='2026-07-20'));
    const filtered=await read(`from=2026-07-17&to=2026-07-17&song=${songs[0]}`);assert.equal(filtered.members.find(m=>m.id===members[0]).practices,1);assert.equal(model.value(filtered.members,'similarity'),70);assert.equal(filtered.members.find(m=>m.id===members[0]).referenceDays,1);assert.equal(filtered.members.find(m=>m.id===members[1]).scheduled,0);
    const otherSong=await read(`from=2026-07-17&to=2026-07-17&song=${songs[1]}`);assert.equal(otherSong.members.find(m=>m.id===members[0]).practices,0);assert.equal(otherSong.members.find(m=>m.id===members[0]).referenceDays,0);assert.equal(otherSong.members.find(m=>m.id===members[0]).minutes,50);
    const historical=await analyticsData({DB},new URL('https://test/api/admin/analytics?season='+old.id));assert.equal(historical.meta.legacyIncluded,true);assert.equal(historical.meta.webAvailable,false);assert.equal(historical.members.reduce((n,m)=>n+m.minutes,0),16914);assert.equal(historical.daily.length,0);
    const partial=await analyticsData({DB},new URL(`https://test/api/admin/analytics?season=${old.id}&from=2025-07-01&to=2025-07-31`));assert.equal(partial.meta.legacyPeriodUnavailable,true);assert.equal(partial.members.reduce((n,m)=>n+m.minutes,0),0);
    await assert.rejects(read('from=2025-01-01'),/período/);await assert.rejects(read('from=2026-09-01&to=2026-08-01'),/período/);await assert.rejects(read('song='+randomUUID()),/canción/);
    assert(!/password_hash|r2_object_key|username_key|csrf_token/.test(JSON.stringify(all)));
  }finally{s.close();}
});
test('Presentaciones incompletas: fecha suficiente, edición posterior y autorización analytics',async()=>{
  const DB=new LocalD1();await DB.migrate();const env={LOCAL:true,DB,BOOTSTRAP_SECRET:'optional-test-key'};let n=0;
  const call=async(path,body,auth={})=>{const r=await worker.fetch(new Request('https://test'+path,{method:body?'POST':'GET',headers:{Origin:'https://test','CF-Connecting-IP':`optional-test-${++n}`,...(body?{'Content-Type':'application/json'}:{}),...auth},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,data:await r.json(),headers:r.headers};};
  try{
    await call('/api/setup',{setup_key:env.BOOTSTRAP_SECRET,password:'optional-test-admin-password'});
    const login=await call('/api/login',{username:'Jefe de cuerda',password:'optional-test-admin-password'}),auth={Cookie:login.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':login.data.csrf},season=DB.sqlite.prepare('SELECT id FROM seasons WHERE year=2026').get().id;
    const request={id:randomUUID(),season_id:season,presentation_date:'2026-11-20'};
    assert.equal((await call('/api/admin/presentations',request,auth)).status,200);let events=(await call('/api/public/presentations?season='+season)).data;assert.equal(events.length,1);assert.equal(events[0].starts_at,'');assert.equal(events[0].call_at,'');assert.equal(events[0].venue,'');assert.equal(events[0].title,'Presentación');
    assert.equal((await call('/api/admin/presentations',{...request,city:'Zozicapango',starts_at:null},auth)).status,200);
    for(const fields of [{starts_at:'25:00'},{call_at:'9:30'},{venue:42},{presentation_date:''}])assert.equal((await call('/api/admin/presentations',{...request,...fields},auth)).status,400);
    assert.equal((await call('/api/admin/presentations',{...request,title:'Concierto',starts_at:'17:00',call_at:'15:30',venue:'Teatro'},auth)).status,200);events=(await call('/api/public/presentations?season='+season)).data;assert.equal(events.length,1);assert.equal(events[0].starts_at,'17:00');
    assert.equal((await call('/api/admin/analytics?season='+season)).status,401);assert.equal((await call('/api/admin/analytics?season='+season,null,auth)).status,200);
    await call('/api/admin/users',{username:'Tenor prueba analytics',display_name:'Prueba analytics',active:true,password:'2468'},auth);const tenor=await call('/api/login',{username:'Tenor prueba analytics',password:'2468'});assert.equal((await call('/api/admin/analytics?season='+season,null,{Cookie:tenor.headers.get('Set-Cookie').split(';')[0]})).status,403);
  }finally{DB.sqlite.close();}
});
