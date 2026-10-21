import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import worker from '../server/worker.mjs';
import { LocalD1, LocalR2 } from '../scripts/local-adapters.mjs';
import { attendance, recordingMetadata, sniffAudio, practiceAnalysis, referencePayload } from '../server/domain.mjs';
import { hashPassword, verifyPassword, digest } from '../server/security.mjs';
const uid=randomUUID();
test('Minutos de ensayo, tardanzas y salida anticipada',()=>{
  const value=(status,at,reason='justified',departure)=>attendance({user_id:uid,attendance_status:status,arrival_at:at,late_reason:reason,departure_at:departure},'08:00','12:00');
  assert.equal(value('on_time').effective_minutes,240);assert.equal(value('absent').effective_minutes,0);
  assert.equal(value('late','08:15').effective_minutes,225);assert.equal(value('late','09:00').effective_minutes,180);
  assert.equal(value('late','08:35','justified').effective_minutes,205);assert.equal(value('late','08:35','unjustified').effective_minutes,205);
  for(const time of ['07:59','08:00','12:00','12:01'])assert.throws(()=>value('late',time));
  assert.equal(value('pending').effective_minutes,null);assert.equal(value('on_time',null,null,'10:30').effective_minutes,150);
  assert.equal(value('late','09:00','justified','10:30').effective_minutes,90);assert.throws(()=>value('late','09:00','justified','08:30'));
  assert.throws(()=>attendance({user_id:uid,attendance_status:'on_time'},'12:00','08:00'));
});
test('Hash adaptativo con sal individual y verificación',async()=>{
  const a=await hashPassword('password-test-only-123'),b=await hashPassword('password-test-only-123');assert.notEqual(a,b);assert(!a.includes('password-test-only'));
  assert(await verifyPassword('password-test-only-123',a));assert(!await verifyPassword('incorrect',a));await assert.rejects(()=>hashPassword('short'));
  const nameHash=await hashPassword('Name2026',8);assert(await verifyPassword('Name2026',nameHash));await assert.rejects(()=>hashPassword('Name2026'));
  const pinHash=await hashPassword('0007',4);assert(await verifyPassword('0007',pinHash));assert(!await verifyPassword('0008',pinHash));
  for(const value of ['007','00007','abcd',1234])await assert.rejects(()=>hashPassword(value,4),/cuatro números/);
});
test('PIN de tenor: restablecimiento revoca sesiones y conserva jefatura',async()=>{
  const DB=new LocalD1();await DB.migrate();const env={LOCAL:true,DB,BOOTSTRAP_SECRET:'pin-test-key'};let n=0;
  const call=async(path,body,auth={})=>{const response=await worker.fetch(new Request('https://tenores.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://tenores.test','CF-Connecting-IP':`pin-test-${++n}`,...(body?{'Content-Type':'application/json'}:{}),...auth},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:response.status,data:await response.json(),headers:response.headers};};
  try{
    await call('/api/setup',{setup_key:env.BOOTSTRAP_SECRET,password:'pin-test-admin-password'});
    const admin=await call('/api/login',{username:'Jefe de cuerda',password:'pin-test-admin-password'}),adminAuth={Cookie:admin.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':admin.data.csrf};
    for(const password of ['123','12345','abcd'])assert.equal((await call('/api/admin/users',{username:'Prueba PIN',display_name:'Prueba PIN',active:true,password},adminAuth)).status,400);
    const created=await call('/api/admin/users',{username:'Prueba PIN',display_name:'Prueba PIN',active:true,password:'0007'},adminAuth);assert.equal(created.status,200);
    const login=await call('/api/login',{username:'Prueba PIN',password:'0007'});assert.equal(login.status,200);const cookie={Cookie:login.headers.get('Set-Cookie').split(';')[0]};
    assert.equal((await call('/api/admin/users',{id:created.data.id,username:'Prueba PIN',display_name:'Prueba PIN',active:true,password:'2468'},adminAuth)).status,200);
    assert.equal((await call('/api/session',null,cookie)).data.user,null);assert.equal((await call('/api/login',{username:'Prueba PIN',password:'0007'})).status,401);assert.equal((await call('/api/login',{username:'Prueba PIN',password:'2468'})).status,200);
    assert.equal((await call('/api/admin/users',{id:admin.data.user.id,username:'Jefe de cuerda',display_name:'Jefe de cuerda',active:true,password:'2468'},adminAuth)).status,400);
    assert.equal((await call('/api/session',null,adminAuth)).data.user.role,'admin');
  }finally{DB.sqlite.close();}
});
test('Restricción de tamaño, formatos y firma del contenido',()=>{
  const b={id:randomUUID(),song_id:randomUUID(),season_id:randomUUID(),file_size:10,duration_seconds:5,mime_type:'audio/webm;codecs=opus'};
  assert.equal(recordingMetadata(b,{bytes:20,seconds:600}).codec,'opus');assert.throws(()=>recordingMetadata({...b,file_size:21},{bytes:20,seconds:600}));
  assert.throws(()=>recordingMetadata({...b,mime_type:'text/html'},{bytes:20,seconds:600}));assert.throws(()=>recordingMetadata({...b,duration_seconds:601},{bytes:20,seconds:600}));
  assert(sniffAudio(new Uint8Array([0x1a,0x45,0xdf,0xa3]),'audio/webm'));assert(!sniffAudio(new TextEncoder().encode('<html>'),'audio/webm'));
});
test('Usuarios con mayúsculas y tildes: acceso Unicode, duplicados y cambio sin perder identidad',async()=>{
  const DB=new LocalD1();await DB.migrate();
  const env={LOCAL:true,DB,BOOTSTRAP_SECRET:'username-test-key'};
  let counter=0;
  const call=async(path,body,auth={})=>{
    const response=await worker.fetch(new Request('https://tenores.test'+path,{method:'POST',headers:{Origin:'https://tenores.test','CF-Connecting-IP':`username-test-${++counter}`,'Content-Type':'application/json',...auth},body:JSON.stringify(body)}),env);
    return {status:response.status,data:await response.json(),headers:response.headers};
  };
  assert.equal((await call('/api/setup',{setup_key:env.BOOTSTRAP_SECRET,password:'username-test-admin-password'})).status,201);
  const admin=await call('/api/login',{username:'Jefe de cuerda',password:'username-test-admin-password'});
  assert.equal(admin.status,200);
  const auth={Cookie:admin.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':admin.data.csrf};
  const created=await call('/api/admin/users',{username:'He\u0301ctor',display_name:'Héctor',password:'1357',active:true},auth);
  assert.equal(created.status,200);
  const saved=DB.sqlite.prepare('SELECT * FROM users WHERE id=?').get(created.data.id);
  assert.equal(saved.username,'Héctor');assert.equal(saved.username_key,'héctor');
  for(const username of ['Héctor','HÉCTOR','He\u0301ctor']){
    const login=await call('/api/login',{username,password:'1357'});
    assert.equal(login.status,200);assert.equal(login.data.user.username,'Héctor');assert.equal(login.data.user.id,saved.id);
  }
  assert.equal((await call('/api/login',{username:'Hector',password:'1357'})).status,401);
  assert.equal((await call('/api/admin/users',{username:'HÉCTOR',display_name:'Duplicado',password:'1357',active:true},auth)).status,409);
  assert.equal((await call('/api/admin/users',{username:'Nombre <script>',display_name:'Inválido',password:'Nombre2026',active:true},auth)).status,400);
  assert.equal((await call('/api/admin/users',{id:saved.id,username:'HÉCTOR',display_name:'Héctor',active:true},auth)).status,200);
  const updated=DB.sqlite.prepare('SELECT * FROM users WHERE id=?').get(saved.id);
  assert.equal(updated.password_hash,saved.password_hash);
  assert.equal((await call('/api/login',{username:'héctor',password:'1357'})).data.user.id,saved.id);
  assert.equal((await call('/api/admin/users',{id:admin.data.user.id,username:'Jefe de cuerda',display_name:'Jefe de cuerda',active:true},auth)).status,200);
  const chief=await call('/api/login',{username:'Jefe de cuerda',password:'username-test-admin-password'});
  assert.equal(chief.status,200);assert.equal(chief.data.user.role,'admin');assert.equal(chief.data.user.username,'Jefe de cuerda');
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n,1);
  DB.sqlite.close();
});
test('Ensayo activo con pendientes, actualización de llegadas, progreso privado y presentaciones persistentes',async()=>{
  const DB=new LocalD1();await DB.migrate();const env={LOCAL:true,DB,BOOTSTRAP_SECRET:'live-test-key'};let counter=0;
  const call=async(path,body,auth={})=>{const response=await worker.fetch(new Request('https://tenores.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://tenores.test','CF-Connecting-IP':`live-${++counter}`,...(body?{'Content-Type':'application/json'}:{}),...auth},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:response.status,data:await response.json(),headers:response.headers};};
  await call('/api/setup',{setup_key:env.BOOTSTRAP_SECRET,password:'live-admin-password'});
  const admin=await call('/api/login',{username:'Jefe de cuerda',password:'live-admin-password'}),auth={Cookie:admin.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':admin.data.csrf};
  const season=DB.sqlite.prepare('SELECT id FROM seasons WHERE year=2026').get().id;
  const ids=DB.sqlite.prepare('SELECT user_id FROM season_memberships WHERE season_id=? LIMIT 2').all(season).map(m=>m.user_id);
  for(const [i,userId] of ids.entries())assert.equal((await call('/api/admin/users',{id:userId,username:`Live tenor ${i}`,display_name:`Tenor ${i}`,password:'2468',active:true},auth)).status,200);
  const tenor=await call('/api/login',{username:'Live tenor 0',password:'2468'}),tenorAuth={Cookie:tenor.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':tenor.data.csrf};
  let rehearsal={id:randomUUID(),request_id:randomUUID(),season_id:season,rehearsal_date:'2026-07-17',starts_at:'08:00',ends_at:'12:00',status:'draft',is_live:true,version:0,attendance:[{user_id:ids[0],attendance_status:'on_time'},{user_id:ids[1],attendance_status:'pending'}]};
  assert.equal((await call('/api/admin/rehearsals',rehearsal,auth)).status,200);
  assert.equal((await call(`/api/admin/active-rehearsal?season=${season}`,null,auth)).data.id,rehearsal.id);
  assert.equal((await call('/api/public/stats?year=2026')).data.overview.rehearsals,0);
  const progress=await call(`/api/my-progress?season=${season}`,null,tenorAuth);assert.equal(progress.status,200);assert.equal(progress.data.user.id,ids[0]);assert.equal(progress.data.attendance[0].is_live,1);assert.equal(progress.data.attendance[0].attendance_status,'on_time');assert(!JSON.stringify(progress.data).includes(ids[1]));
  assert.equal((await call(`/api/admin/tenors/${ids[1]}?season=${season}`,null,tenorAuth)).status,403);
  assert.equal((await call('/api/admin/rehearsals',{...rehearsal,id:randomUUID(),request_id:randomUUID(),starts_at:'14:00',ends_at:'16:00'},auth)).status,409);
  assert.equal((await call('/api/admin/rehearsals',{...rehearsal,status:'final',is_live:false,request_id:randomUUID(),version:1},auth)).status,400);
  rehearsal={...rehearsal,request_id:randomUUID(),version:1,attendance:[rehearsal.attendance[0],{user_id:ids[1],attendance_status:'late',late_reason:'unjustified',arrival_at:'08:35'}]};
  assert.equal((await call('/api/admin/rehearsals',rehearsal,auth)).data.version,2);assert.equal((await call('/api/admin/rehearsals',rehearsal,auth)).data.version,2);
  const detail=(await call(`/api/admin/tenors/${ids[1]}?season=${season}`,null,auth)).data;assert.equal(detail.attendance[0].effective_minutes,205);assert.equal(detail.attendance[0].late_reason,'unjustified');
  const liam=DB.sqlite.prepare("SELECT id FROM users WHERE legacy_key='liam'").get(),hector=DB.sqlite.prepare("SELECT id FROM users WHERE legacy_key='hector'").get();
  assert.deepEqual((await call(`/api/admin/tenors/${liam.id}?season=${season}`,null,auth)).data.seasons.map(s=>s.year),[2026]);
  assert.deepEqual((await call(`/api/admin/tenors/${hector.id}?season=${season}`,null,auth)).data.seasons.map(s=>s.year),[2026,2025]);
  assert.equal((await call('/api/admin/rehearsals',{...rehearsal,status:'final',is_live:false,version:2,request_id:randomUUID()},auth)).status,200);
  assert.equal((await call(`/api/admin/active-rehearsal?season=${season}`,null,auth)).data,null);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM rehearsals').get().n,1);
  assert.equal((await call('/api/public/stats?year=2026')).data.members.find(m=>m.id===ids[1]).minutes,205);
  const presentation={id:randomUUID(),season_id:season,title:'Presentación de prueba',presentation_date:'2026-11-20',starts_at:'17:00',call_at:'15:00',venue:'Teatro',city:'San Salvador',notes:'Llegar puntualmente.'};
  assert.equal((await call('/api/admin/presentations',presentation,tenorAuth)).status,403);
  assert.equal((await call('/api/admin/presentations',{...presentation,presentation_date:'2025-11-20'},auth)).status,400);
  assert.equal((await call('/api/admin/presentations',presentation,auth)).status,200);assert.equal((await call('/api/admin/presentations',presentation,auth)).status,200);
  assert.equal((await call('/api/admin/presentations',{...presentation,title:'Presentación corregida'},auth)).status,200);
  const calendar=(await call(`/api/public/presentations?season=${season}`)).data;assert.equal(calendar.length,1);assert.equal(calendar[0].title,'Presentación corregida');assert(!JSON.stringify(calendar).includes('created_by'));
  DB.sqlite.prepare("UPDATE seasons SET status='closed' WHERE id=?").run(season);
  assert.equal((await call('/api/admin/rehearsals',{...rehearsal,version:3,request_id:randomUUID()},auth)).status,409);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM legacy_attendance').get().n,9);DB.sqlite.close();
});
test('Integración del Worker: autorización, asistencia, correcciones, audios y cierre',async t=>{
  const DB=new LocalD1();await DB.migrate();const R2=new LocalR2();const env={LOCAL:true,DB,RECORDINGS:R2,BOOTSTRAP_SECRET:'test-only-initial-key',ASSETS:{fetch:async()=>new Response('public')}};
  let counter=0;
  const call=async(path,{method='GET',body,cookie,csrf,ip,origin='https://tenores.test',headers={}}={})=>{
    const h={Origin:origin,'CF-Connecting-IP':ip||`test-ip-${++counter}`,...headers};if(cookie)h.Cookie=cookie;if(csrf)h['X-CSRF-Token']=csrf;
    if(body && !(body instanceof Uint8Array)){body=JSON.stringify(body);h['Content-Type']='application/json';}
    const r=await worker.fetch(new Request('https://tenores.test'+path,{method,headers:h,...(body?{body}:{})}),env);
    return {status:r.status,headers:r.headers,data:r.headers.get('Content-Type')?.includes('json')?await r.json():new Uint8Array(await r.arrayBuffer())};
  };
  const sql=(s,...a)=>DB.sqlite.prepare(s).run(...a),query=(s,...a)=>DB.sqlite.prepare(s).get(...a);
  const analysisFor=(songId,total=80)=>({engineVersion:'1.0',songId,mode:'guide',isFull:true,valid:true,scores:{total,pitch:total,rhythm:total,stability:total},tips:[],phrases:[],curves:{ref:[60,null],user:[60,null],hopMs:10,startSec:0}});
  const season=query('SELECT id FROM seasons WHERE year=2026').id,oldSeason=query('SELECT id FROM seasons WHERE year=2025').id,song=query('SELECT id FROM songs LIMIT 1').id;
  const create=(await call('/api/setup',{method:'POST',body:{setup_key:env.BOOTSTRAP_SECRET,password:'test-only-admin-password'}}));assert.equal(create.status,201);
  const auth=await call('/api/login',{method:'POST',body:{username:'Jefe de cuerda',password:'test-only-admin-password'}});assert.equal(auth.status,200);
  const admin={cookie:auth.headers.get('Set-Cookie').split(';')[0],csrf:auth.data.csrf};assert.match(auth.headers.get('Set-Cookie'),/HttpOnly/);assert.match(auth.headers.get('Set-Cookie'),/Secure/);assert.match(auth.headers.get('Set-Cookie'),/SameSite=Strict/);
  const tenorIds=DB.sqlite.prepare('SELECT user_id FROM season_memberships WHERE season_id=? ORDER BY user_id LIMIT 2').all(season).map(x=>x.user_id);
  const fixtureHash=await hashPassword('test-only-tenor-password');for(const [i,u] of tenorIds.entries())sql('UPDATE users SET username=?,password_hash=?,active=1 WHERE id=?',`test-tenor-${i}`,fixtureHash,u);
  const a=await call('/api/login',{method:'POST',body:{username:'test-tenor-0',password:'test-only-tenor-password'}}),b=await call('/api/login',{method:'POST',body:{username:'test-tenor-1',password:'test-only-tenor-password'}});
  const tenor={cookie:a.headers.get('Set-Cookie').split(';')[0],csrf:a.data.csrf},other={cookie:b.headers.get('Set-Cookie').split(';')[0],csrf:b.data.csrf};
  await t.test('Invitado público, sesiones revocadas/expiradas y CSRF',async()=>{
    assert.equal((await call('/')).status,200);assert.equal((await call('/api/public/stats?year=2025')).data.members.length,9);
    assert.equal((await call('/api/recordings/reserve',{method:'POST',body:{}})).status,401);
    assert.equal((await call('/api/admin/users',tenor)).status,403);
    assert.equal((await call('/api/admin/users',{method:'POST',cookie:admin.cookie,body:{}})).status,403);
    assert.equal((await call('/api/admin/users',{method:'POST',...admin,origin:'https://evil.test',body:{}})).status,403);
    const tokenHash=digest(a.headers.get('Set-Cookie').split(';')[0].split('=')[1]);sql('UPDATE sessions SET expires_at=? WHERE token_hash=?','2000-01-01',tokenHash);assert.equal((await call('/api/session',tenor)).data.user,null);sql('UPDATE sessions SET expires_at=? WHERE token_hash=?','2099-01-01',tokenHash);
    sql('UPDATE sessions SET revoked_at=? WHERE token_hash=?','2026-10-12',tokenHash);assert.equal((await call('/api/session',tenor)).data.user,null);sql('UPDATE sessions SET revoked_at=NULL WHERE token_hash=?',tokenHash);
  });
  let rehearsal={id:randomUUID(),request_id:randomUUID(),season_id:season,rehearsal_date:'2026-10-12',starts_at:'08:00',ends_at:'12:00',status:'draft',version:0,attendance:tenorIds.map(user_id=>({user_id,attendance_status:'pending'}))};
  await t.test('Borrador persistente, finalización, reenvío y edición sin duplicados',async()=>{
    const draft=await call('/api/admin/rehearsals',{method:'POST',...admin,body:rehearsal});assert.equal(draft.status,200);assert.equal(draft.data.version,1);
    assert.equal((await call('/api/public/stats?year=2026')).data.overview.rehearsals,0);
    const unfinished={...rehearsal,version:1,request_id:randomUUID(),status:'final'};assert.equal((await call('/api/admin/rehearsals',{method:'POST',...admin,body:unfinished})).status,400);
    rehearsal={...unfinished,attendance:[{user_id:tenorIds[0],attendance_status:'on_time'},{user_id:tenorIds[1],attendance_status:'late',late_reason:'justified',arrival_at:'08:35'}]};
    const done=await call('/api/admin/rehearsals',{method:'POST',...admin,body:rehearsal});assert.equal(done.status,200);assert.equal(done.data.version,2);
    const repeated=await call('/api/admin/rehearsals',{method:'POST',...admin,body:rehearsal});assert.equal(repeated.status,200);assert.equal(repeated.data.version,2);assert.equal(query('SELECT COUNT(*) n FROM rehearsals').n,1);
    const stats=(await call('/api/public/stats?year=2026')).data;assert.equal(stats.members.find(m=>m.id===tenorIds[0]).minutes,240);assert.equal(stats.members.find(m=>m.id===tenorIds[1]).minutes,205);assert(!JSON.stringify(stats).includes('justified'));
    const changed={...rehearsal,version:2,request_id:randomUUID(),attendance:[{user_id:tenorIds[0],attendance_status:'absent'},{user_id:tenorIds[1],attendance_status:'on_time'}]};assert.equal((await call('/api/admin/rehearsals',{method:'POST',...admin,body:changed})).status,200);
    assert.equal((await call('/api/public/stats?year=2026')).data.members.find(m=>m.id===tenorIds[0]).minutes,0);
    assert.equal((await call('/api/admin/rehearsals',{method:'POST',...admin,body:{...rehearsal,request_id:randomUUID()}})).status,409);
    assert.equal(query('SELECT COUNT(*) n FROM admin_audit WHERE entity_id=?',rehearsal.id).n,3);
    await call('/api/admin/memberships',{method:'POST',...admin,body:{season_id:season,user_id:tenorIds[1],active:false}});
    assert(!(await call('/api/public/stats?year=2026')).data.members.some(m=>m.id===tenorIds[1]));
    assert.equal((await call(`/api/admin/rehearsals/${rehearsal.id}`,admin)).data.attendance.find(a=>a.user_id===tenorIds[1]).effective_minutes,240);
    await call('/api/admin/memberships',{method:'POST',...admin,body:{season_id:season,user_id:tenorIds[1],active:true}});
    const different=await call('/api/admin/seasons',{method:'POST',...admin,body:{year:2027,starts_on:'2027-01-01',ends_on:'2027-12-31'}});const ms=await call(`/api/admin/memberships?season=${different.data.id}`,admin);assert.equal(ms.data.length,0);
    assert.equal((await call('/api/admin/rehearsals',{method:'POST',...admin,body:{...rehearsal,id:randomUUID(),request_id:randomUUID(),season_id:different.data.id,rehearsal_date:'2027-01-01'}})).status,400);
  });
  await t.test('Integridad SQL y transacción con fallo',async()=>{
    await assert.rejects(()=>DB.batch([DB.prepare("UPDATE users SET display_name='CHANGED' WHERE id=?").bind(tenorIds[0]),DB.prepare("INSERT INTO seasons(id,year,starts_on,ends_on) VALUES('bad',2026,'2026-01-01','2026-12-31')")]));assert.notEqual(query('SELECT display_name FROM users WHERE id=?',tenorIds[0]).display_name,'CHANGED');
    assert.throws(()=>sql('INSERT INTO rehearsal_attendance(rehearsal_id,user_id,attendance_status,effective_minutes) VALUES(?,?,?,?)',rehearsal.id,tenorIds[0],'invalid',0));
    assert.equal(query('SELECT COUNT(*) n FROM legacy_attendance').n,9);assert.equal(query('SELECT SUM(minutes) n FROM legacy_attendance').n,16914);
  });
  let uploaded=[];
  await t.test('Resultados sin audio: autorización, reintentos y datos privados',async()=>{
    assert((await call('/api/public/stats?year=2026')).data.members.every(m=>m.similarity===null));
    const originalPut=R2.put;R2.put=()=>{throw Error('Nunca debe guardar audio');};
    for(let i=0;i<2;i++){
      const meta={id:randomUUID(),song_id:song,season_id:season,duration_seconds:3,analysis:analysisFor(song)};
      const saved=await call('/api/practice-results',{method:'POST',...tenor,body:meta});assert.equal(saved.status,201,JSON.stringify(saved.data));uploaded.push(meta.id);
      assert.equal((await call('/api/practice-results',{method:'POST',...tenor,body:meta})).status,200);
      assert.equal((await call('/api/practice-results',{method:'POST',...tenor,body:{...meta,analysis:analysisFor(song,75)}})).status,409);
      assert.equal((await call('/api/recordings/reserve',{method:'POST',...tenor,body:meta})).status,410);
      assert.equal((await call(`/api/recordings/${meta.id}`,{method:'PUT',...tenor,body:new Uint8Array([1]),headers:{'Content-Type':'audio/webm'}})).status,410);
      assert.equal((await call(`/api/practice-results/${meta.id}/analysis`,other)).status,404);
      assert.equal((await call(`/api/practice-results/${meta.id}/analysis`,admin)).data.scores.pitch,80);
    }
    R2.put=originalPut;assert.equal(R2.memory.size,0);
    const list=(await call(`/api/practice-results?season=${season}`,tenor)).data;assert.equal(list.items.length,2);assert(!/r2_object_key|audio_url|mime_type/.test(JSON.stringify(list)));
    assert.equal((await call('/api/public/stats?year=2026')).data.members.find(m=>m.id===tenorIds[0]).similarity,80);
    assert.equal((await call(`/api/practice-results?season=${season}&user=${tenorIds[0]}`,other)).data.items.length,0);
    const base={id:randomUUID(),song_id:song,season_id:season,duration_seconds:3,analysis:analysisFor(song)};
    assert.equal((await call('/api/practice-results',{method:'POST',...tenor,body:{...base,audio:'data:audio'}})).status,400);
    assert.equal((await call('/api/practice-results',{method:'POST',...tenor,body:{...base,duration_seconds:NaN}})).status,400);
    const analytics=(await call(`/api/admin/analytics?season=${season}`,admin)).data.members.find(m=>m.id===tenorIds[0]);assert.equal(analytics.pitchSum,160);assert.equal(analytics.pitchCount,2);
  });
  await t.test('Cierre conserva resultados y asistencia histórica',async()=>{
    const exported=await call(`/api/admin/seasons/${season}/export`,admin);assert.equal(exported.data.items.length,2);assert(!JSON.stringify(exported.data).includes('audio_url'));
    assert.equal((await call(`/api/admin/seasons/${season}/close`,{method:'POST',...admin,body:{confirmation:'yes'}})).status,400);
    assert.equal((await call(`/api/admin/seasons/${season}/close`,{method:'POST',...admin,body:{confirmation:'ELIMINAR AUDIOS 2026'}})).status,200);
    assert.equal((await call(`/api/admin/seasons/${season}/cleanup`,{method:'POST',...admin,body:{}})).data.status,'closed');
    assert.equal(query('SELECT COUNT(*) n FROM practice_results').n,2);assert.equal(query('SELECT COUNT(*) n FROM legacy_attendance').n,9);
    assert.equal((await call(`/api/practice-results/${uploaded[0]}/analysis`,tenor)).data.scores.total,80);
    sql('DELETE FROM practice_results');
  });
  await t.test('Prácticas con análisis y curvas',async()=>{
    sql("UPDATE seasons SET status='active' WHERE id=?",season);
    const fumSong=query("SELECT * FROM songs WHERE legacy_key='fum'"),bytes=new Uint8Array([0x1a,0x45,0xdf,0xa3,5,6,7,8]);
    const meta={id:randomUUID(),song_id:fumSong.id,season_id:season,duration_seconds:3};
    const reserve=body=>call('/api/practice-results',{method:'POST',...tenor,body});
    assert.equal((await reserve(meta)).status,400);
    assert.equal((await reserve({...meta,analysis:{...analysisFor(fumSong.id),isFull:false}})).status,400);
    const created=await reserve({...meta,analysis:analysisFor(fumSong.id)});assert.equal(created.status,201);
    const again=await reserve({...meta,analysis:analysisFor(fumSong.id)});assert.equal(again.status,200);assert.equal(again.data.id,meta.id);
    assert.equal((await reserve({...meta,analysis:analysisFor(fumSong.id,75)})).status,409);
    const analysis=await call(`/api/practice-results/${meta.id}/analysis`,tenor);assert.equal(analysis.status,200);assert.equal(analysis.data.scores.total,80);
    assert.equal((await call(`/api/practice-results/${meta.id}/analysis`,other)).status,404);assert.equal((await call(`/api/practice-results/${meta.id}/analysis`,admin)).status,200);
    const list=(await call(`/api/practice-results?season=${season}`,tenor)).data.items;
    assert.equal(list.find(r=>r.id===meta.id).score,80);assert(list.every(r=>!('analysis' in r)));
    const ref=await call(`/api/songs/${fumSong.id}/reference`,tenor);assert.equal(ref.status,200);assert.equal(ref.data.songId,fumSong.id);assert(ref.data.midi.length>0);
    assert.equal((await call('/api/public/songs?season='+season)).data.find(s=>s.id===fumSong.id).has_reference,1);
    const newSource='https://res.cloudinary.com/dcwx23x5o/video/upload/v2/fum_nueva.wav';
    assert.equal((await call('/api/admin/songs',{method:'POST',...admin,body:{id:fumSong.id,season_id:season,title:fumSong.title,reference_audio_key:newSource,lyrics:fumSong.lyrics,active:true}})).status,200);
    const gone=await call(`/api/songs/${fumSong.id}/reference`,tenor);assert.equal(gone.status,404);assert.equal(gone.data.error,'Esta canción aún no tiene curva de referencia.');
    assert.equal((await call('/api/public/songs?season='+season)).data.find(s=>s.id===fumSong.id).has_reference,0);
    assert.equal((await call(`/api/admin/songs?season=${season}`,admin)).data.find(s=>s.id===fumSong.id).has_reference,0);
    assert.equal((await call(`/api/practice-results/${meta.id}/analysis`,tenor)).data.scores.total,80);
    const fixture=JSON.parse(await readFile(new URL('./fixtures/fum-reference.json',import.meta.url),'utf8'));
    const path=`/api/admin/songs/${fumSong.id}/reference`;
    assert.equal((await call(path,{method:'POST',...tenor,body:{reference:{...fixture,source:newSource}}})).status,403);
    assert.equal((await call(path,{method:'POST',...admin,body:{reference:fixture}})).status,409);
    const saved=await call(path,{method:'POST',...admin,body:{reference:{...fixture,source:newSource}}});assert.equal(saved.status,200);assert.deepEqual(saved.data,{ok:true});
    assert.equal((await call('/api/public/songs?season='+season)).data.find(s=>s.id===fumSong.id).has_reference,1);
    assert.equal((await call(`/api/admin/songs?season=${season}`,admin)).data.find(s=>s.id===fumSong.id).has_reference,1);
    assert.equal((await call(`/api/songs/${fumSong.id}/reference`,tenor)).data.songId,fumSong.id);
    assert.equal(query("SELECT COUNT(*) n FROM admin_audit WHERE action='reference_generated' AND entity_id=?",fumSong.id).n,1);
    assert.equal((await call(`/api/admin/practice-scores?season=${season}`,tenor)).status,403);
    assert.deepEqual((await call(`/api/admin/practice-scores?season=${season}`,admin)).data,[{user_id:tenorIds[0],average:80,count:1,pitch:80,rhythm:80,stability:80}]);
  });
  await t.test('Rate limiting distribuido con D1',async()=>{for(let i=0;i<240;i++)await call('/api/session',{ip:'test-rate'});assert.equal((await call('/api/session',{ip:'test-rate'})).status,429);});
  DB.sqlite.close();
});
test('Regresión de fuentes y paquete público',async()=>{
  const app=await readFile('app.js','utf8'),historical=JSON.parse(await readFile('docs/historical-2025.json','utf8')),html=await readFile('index.html','utf8');
  assert(!/CHOIR_RECORDINGS|renderChoir|youtube|youtu\.be/i.test(app));assert(!html.includes('choir-card'));
  const extract=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b));
  const data=runInNewContext(extract(app,'const TEAM_OVERVIEW','const CALENDAR_MONTHS')+'; ({overview:TEAM_OVERVIEW,members:TENOR_MEMBERS_DATA});',{}, {timeout:1000});
  assert.deepEqual(JSON.parse(JSON.stringify(data)),historical);
  for(const marker of ['audio-track','mini-toggle','fontUp','q','memories-view','presentationsPanel','dataPanel'])assert(html.includes(`id="${marker}"`));
});

test('El paquete público incluye el motor de práctica',async()=>{
  const { execFileSync } = await import('node:child_process');const { access } = await import('node:fs/promises');
  execFileSync(process.execPath,['scripts/build.mjs']);
  for(const f of ['dist/practice/analyze.js','dist/practice/recorder-worklet.js','dist/practice/practice.css'])await access(f);
  for(const f of ['dist/tests','dist/server','dist/migrations'])await assert.rejects(access(f));
});
test('Las 12 curvas existentes se cargan íntegras',async()=>{
  const DB=new LocalD1();await DB.migrate();
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM song_references').get().n,12);
  const rows=DB.sqlite.prepare('SELECT r.song_id,r.source,r.reference,s.reference_audio_key,s.legacy_key FROM song_references r JOIN songs s ON s.id=r.song_id').all();
  assert.equal(rows.length,12);
  for(const row of rows){const ref=JSON.parse(row.reference);assert(ref.phrases.length>0);assert.equal(ref.hopMs,10);assert.equal(ref.source,row.reference_audio_key);assert.equal(row.source,row.reference_audio_key);}
  const fum=rows.find(r=>r.legacy_key==='fum');
  assert.deepEqual(JSON.parse(fum.reference),JSON.parse(await readFile(new URL('./fixtures/fum-reference.json',import.meta.url),'utf8')));
});
test('Ninguna sentencia de la migración de curvas supera 100 000 bytes',async()=>{
  const { sqlStatements }=await import('../scripts/sql-statements.mjs');
  const sql=await readFile(new URL('../migrations/0007_song_references_data.sql',import.meta.url),'utf8');
  for(const s of sqlStatements(sql))assert(Buffer.byteLength(s)<=100000);
});
test('Validación del análisis y de la curva',async()=>{
  const ok={engineVersion:'1.0',songId:'fum',mode:'guide',isFull:true,valid:true,scores:{total:83,pitch:80,rhythm:85,stability:84},tips:[],phrases:[],curves:{ref:[1,null],user:[1,null],hopMs:10,startSec:0}};
  const r=practiceAnalysis(ok,'fum');assert.equal(r.score,83);assert.equal(JSON.parse(r.json).songId,'fum');
  const bad=(patch,status=400)=>assert.throws(()=>practiceAnalysis({...ok,...patch},'fum'),e=>e.status===status);
  bad({mode:'test'});bad({isFull:false});bad({valid:false});bad({songId:'otra'});
  bad({scores:{...ok.scores,total:101}});bad({scores:{...ok.scores,total:82.5}});
  bad({curves:{...ok.curves,ref:new Array(70000).fill(1.23)}},413);
  assert.throws(()=>practiceAnalysis(null,'fum'),e=>e.status===400);
  const fx=JSON.parse(await readFile(new URL('./fixtures/fum-reference.json',import.meta.url),'utf8'));
  const song={id:'song-1',reference_audio_key:fx.source};
  assert.equal(JSON.parse(referencePayload(fx,song)).songId,'song-1');
  assert.throws(()=>referencePayload({...fx,source:'https://x/y.wav'},song),e=>e.status===409);
  assert.throws(()=>referencePayload({...fx,phrases:[]},song),e=>e.status===400);
  assert.throws(()=>referencePayload({...fx,phrases:[{start:5,end:5}]},song),e=>e.status===400);
  assert.throws(()=>referencePayload({...fx,hopMs:20},song),e=>e.status===400);
});
