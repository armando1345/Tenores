import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import worker from '../server/worker.mjs';
import { LocalD1, LocalR2 } from '../scripts/local-adapters.mjs';
import { attendance, recordingMetadata, sniffAudio } from '../server/domain.mjs';
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
  const created=await call('/api/admin/users',{username:'He\u0301ctor',display_name:'Héctor',password:'Prúeba-solo-test-2026',active:true},auth);
  assert.equal(created.status,200);
  const saved=DB.sqlite.prepare('SELECT * FROM users WHERE id=?').get(created.data.id);
  assert.equal(saved.username,'Héctor');assert.equal(saved.username_key,'héctor');
  for(const username of ['Héctor','HÉCTOR','He\u0301ctor']){
    const login=await call('/api/login',{username,password:'Prúeba-solo-test-2026'});
    assert.equal(login.status,200);assert.equal(login.data.user.username,'Héctor');assert.equal(login.data.user.id,saved.id);
  }
  assert.equal((await call('/api/login',{username:'Hector',password:'Prúeba-solo-test-2026'})).status,401);
  assert.equal((await call('/api/admin/users',{username:'HÉCTOR',display_name:'Duplicado',password:'Prúeba-solo-test-2026',active:true},auth)).status,409);
  assert.equal((await call('/api/admin/users',{username:'Nombre <script>',display_name:'Inválido',password:'Nombre2026',active:true},auth)).status,400);
  assert.equal((await call('/api/admin/users',{id:saved.id,username:'HÉCTOR',display_name:'Héctor',active:true},auth)).status,200);
  const updated=DB.sqlite.prepare('SELECT * FROM users WHERE id=?').get(saved.id);
  assert.equal(updated.password_hash,saved.password_hash);
  assert.equal((await call('/api/login',{username:'héctor',password:'Prúeba-solo-test-2026'})).data.user.id,saved.id);
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
  for(const [i,userId] of ids.entries())assert.equal((await call('/api/admin/users',{id:userId,username:`Live tenor ${i}`,display_name:`Tenor ${i}`,password:'Tenor2026',active:true},auth)).status,200);
  const tenor=await call('/api/login',{username:'Live tenor 0',password:'Tenor2026'}),tenorAuth={Cookie:tenor.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':tenor.data.csrf};
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
  await t.test('Grabaciones privadas, reintentos, límites y audios anteriores',async()=>{
    const bytes=new Uint8Array([0x1a,0x45,0xdf,0xa3,1,2,3,4]);
    for(let i=0;i<2;i++){
      const meta={id:randomUUID(),song_id:song,season_id:season,duration_seconds:3,file_size:bytes.length,mime_type:'audio/webm;codecs=opus'};
      const reserved=await call('/api/recordings/reserve',{method:'POST',...tenor,body:meta});assert.equal(reserved.status,201);uploaded.push(meta.id);
      const summary=await call(`/api/admin/summary?season=${season}`,admin);assert.equal(summary.data.season_storage.submitted_count,uploaded.length-1);assert.equal(summary.data.season_storage.count,uploaded.length);
      assert.equal((await call(`/api/recordings/${meta.id}`,{method:'PUT',...tenor,body:bytes,headers:{'Content-Type':meta.mime_type}})).status,200);
      assert.equal((await call('/api/recordings/reserve',{method:'POST',...tenor,body:meta})).status,200);
      assert.equal((await call(`/api/recordings/${meta.id}`,{method:'PUT',...tenor,body:bytes,headers:{'Content-Type':meta.mime_type}})).status,200);
      assert.deepEqual((await call(`/api/recordings/${meta.id}/audio`,tenor)).data,bytes);
      assert.equal((await call(`/api/recordings/${meta.id}/audio`,other)).status,404);assert.equal((await call(`/api/recordings/${meta.id}/audio`)).status,401);assert.equal((await call(`/api/recordings/${meta.id}/audio`,admin)).status,200);
    }
    const list=(await call(`/api/recordings?season=${season}`,tenor)).data;assert.equal(list.items.length,2);assert(!JSON.stringify(list).includes('r2_object_key'));
    assert.equal((await call(`/api/recordings?season=${season}&song=${song}`,tenor)).data.items.length,2);
    const anotherSong=query('SELECT id FROM songs WHERE id!=? LIMIT 1',song).id;
    assert.equal((await call(`/api/recordings?season=${season}&song=${anotherSong}`,tenor)).data.items.length,0);
    assert.equal((await call(`/api/recordings?season=${season}&user=${tenorIds[0]}`,other)).data.items.length,0);
    const base={id:randomUUID(),song_id:song,season_id:season,duration_seconds:3,file_size:20000001,mime_type:'audio/webm'};
    assert.equal((await call('/api/recordings/reserve',{method:'POST',...tenor,body:base})).status,413);
    const corrupt={...base,id:randomUUID(),file_size:8};await call('/api/recordings/reserve',{method:'POST',...tenor,body:corrupt});assert.equal((await call(`/api/recordings/${corrupt.id}`,{method:'PUT',...tenor,body:new TextEncoder().encode('<html />'),headers:{'Content-Type':'audio/webm'}})).status,415);
    assert.equal((await R2.head(query('SELECT r2_object_key FROM recordings WHERE id=?',corrupt.id).r2_object_key)),null);
    // Reservas y archivos pendientes siguen contándose: no se libera cuota si el proveedor falla.
    const retry={...corrupt,id:randomUUID(),mime_type:'audio/webm;codecs=opus'};await call('/api/recordings/reserve',{method:'POST',...tenor,body:retry});const put=R2.put.bind(R2);R2.put=async()=>{throw new Error('test network failure');};assert.equal((await call(`/api/recordings/${retry.id}`,{method:'PUT',...tenor,body:bytes,headers:{'Content-Type':retry.mime_type}})).status,503);R2.put=put;
    assert.equal(query('SELECT status FROM recordings WHERE id=?',retry.id).status,'pending');assert.equal((await call(`/api/recordings/${retry.id}`,{method:'PUT',...tenor,body:bytes,headers:{'Content-Type':retry.mime_type}})).status,200);
    sql('UPDATE app_limits SET total_bytes=24');assert.equal((await call('/api/recordings/reserve',{method:'POST',...tenor,body:{...retry,id:randomUUID()}})).status,429);sql('UPDATE app_limits SET total_bytes=8000000000');
  });
  await t.test('Actividad privada y cierre por lotes con reanudación',async()=>{
    const event={event_type:'reference_start',song_id:song};await call('/api/events',{method:'POST',...tenor,body:event});await call('/api/events',{method:'POST',...tenor,body:event});assert.equal(query("SELECT COUNT(*) n FROM activity_events WHERE user_id=? AND event_type='reference_start'",tenorIds[0]).n,1);
    assert.equal((await call('/api/admin/activity',tenor)).status,403);assert.equal((await call('/api/admin/activity',admin)).status,200);
    const exportResult=await call(`/api/admin/seasons/${season}/export`,admin);assert.equal(exportResult.data.items.length,3);assert(!JSON.stringify(exportResult.data).includes('r2_object_key'));
    assert.equal((await call(`/api/admin/seasons/${season}/close`,{method:'POST',...admin,body:{confirmation:'yes'}})).status,400);
    assert.equal((await call(`/api/admin/seasons/${season}/close`,{method:'POST',...admin,body:{confirmation:'ELIMINAR AUDIOS 2026'}})).status,200);
    assert.equal((await call(`/api/admin/seasons/${season}/cleanup`,{method:'POST',...admin,body:{}})).data.waiting,true);
    sql("UPDATE recordings SET created_at='2026-01-01T00:00:00.000Z' WHERE season_id=?",season);
    const deletion=R2.delete.bind(R2);let once=true;R2.delete=async key=>{if(once){once=false;throw new Error('test failed delete');}return deletion(key);};assert.equal((await call(`/api/admin/seasons/${season}/cleanup`,{method:'POST',...admin,body:{}})).status,503);assert.equal(query("SELECT COUNT(*) n FROM recordings WHERE status!='deleted'").n,4);R2.delete=deletion;
    const done=await call(`/api/admin/seasons/${season}/cleanup`,{method:'POST',...admin,body:{}});assert.equal(done.data.status,'closed');assert.equal(R2.memory.size,0);assert.equal(query('SELECT COUNT(*) n FROM rehearsal_attendance').n,2);assert.equal(query('SELECT COUNT(*) n FROM legacy_attendance WHERE season_id=?',oldSeason).n,9);
    assert.equal((await call(`/api/recordings/${uploaded[0]}/audio`,tenor)).status,410);
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
