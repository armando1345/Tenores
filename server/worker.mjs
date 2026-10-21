import { HttpError, ensure, text, uuid, date, clock, attendance, canReadRecording, recordingMetadata, sniffAudio, practiceAnalysis, referencePayload } from './domain.mjs';
import { digest, token } from './security.mjs';
import { passwordHash, passwordVerify } from './password-service.mjs';
import { analyticsData } from './analytics.mjs';
export { PasswordHasher } from './password-object.mjs';

const now = () => new Date().toISOString();
const day = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/El_Salvador',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const id = () => crypto.randomUUID();
const json = (data,status=200,headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const stmt = (env,sql,...args) => env.DB.prepare(sql).bind(...args);
const one = (env,sql,...args) => stmt(env,sql,...args).first();
const rows = async (env,sql,...args) => (await stmt(env,sql,...args).all()).results;
const run = (env,sql,...args) => stmt(env,sql,...args).run();
const audit = (env,user,action,entity,before,after) => stmt(env,'INSERT INTO admin_audit(id,changed_by,action,entity_id,previous_value,new_value) VALUES(?,?,?,?,?,?)',id(),user.id,action,entity,before?JSON.stringify(before):null,after?JSON.stringify(after):null);
const HAS_REFERENCE = 'EXISTS(SELECT 1 FROM song_references sr WHERE sr.song_id=songs.id AND sr.source=songs.reference_audio_key) AS has_reference';
const safeUser = user => user ? {id:user.id,username:user.username,display_name:user.display_name,role:user.role,active:user.active,last_login_at:user.last_login_at} : null;
function origin(request) {
  ensure(request.headers.get('Origin') === new URL(request.url).origin,'Origen de solicitud no permitido.',403);
  ensure(!['cross-site','none'].includes(request.headers.get('Sec-Fetch-Site')),'Solicitud no permitida.',403);
}
async function body(request,max=32768) {
  ensure(request.headers.get('Content-Type')?.startsWith('application/json'),'Se requiere JSON.',415);
  const bytes = await limitedBody(request,max);
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400,'JSON inválido.'); }
}
async function limitedBody(request,max) {
  ensure(Number(request.headers.get('Content-Length')||0)<=max,'Solicitud demasiado grande.',413);
  ensure(request.body,'Solicitud vacía.');
  const reader=request.body.getReader(), chunks=[]; let total=0;
  while(true){ const {done,value}=await reader.read(); if(done)break; total+=value.byteLength; if(total>max){await reader.cancel();throw new HttpError(413,'Solicitud demasiado grande.');} chunks.push(value); }
  const bytes=new Uint8Array(total); let offset=0; for(const c of chunks){bytes.set(c,offset);offset+=c.length;} return bytes;
}
async function rate(env,key,max,seconds=60) {
  const window=Math.floor(Date.now()/1000/seconds), hashed=digest(key),expiry=(window+1)*seconds;
  const result=await stmt(env,'INSERT INTO rate_limits(key,window,count,expires_at) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window,expires_at=excluded.expires_at RETURNING count',hashed,window,expiry).first();
  ensure(result.count<=max,'Demasiadas solicitudes. Intenta más tarde.',429);
}
async function session(request,env) {
  const value=/(?:^|; )tenores_session=([^;]+)/.exec(request.headers.get('Cookie')||'')?.[1];
  if(!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  return one(env,'SELECT u.*,s.id AS session_id,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.active=1',digest(value),now());
}
async function requireUser(request,env,admin=false) {
  const user=await session(request,env);
  ensure(user,'Inicia sesión para continuar.',401);
  ensure(!admin || user.role==='admin','Solo jefatura puede realizar esta acción.',403);
  if(!['GET','HEAD'].includes(request.method)) ensure(request.headers.get('X-CSRF-Token')===user.csrf_token,'Sesión de formulario inválida. Recarga la página.',403);
  return user;
}
function cookie(request,value,seconds) {
  const secure=new URL(request.url).protocol==='https:';
  // HTTP solo para el servidor local; Workers debe exponerse por HTTPS.
  ensure(secure || ['localhost','127.0.0.1'].includes(new URL(request.url).hostname),'HTTPS requerido.',400);
  return `tenores_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure?'; Secure':''}`;
}
async function limits(env) { return one(env,'SELECT * FROM app_limits WHERE id=1'); }
async function event(env,user,type,song=null) {
  return run(env,'INSERT OR IGNORE INTO activity_events(id,user_id,event_type,song_id,event_day) VALUES(?,?,?,?,?)',id(),user.id,type,song,day());
}
async function checkSeason(env,season) {
  const s=await one(env,'SELECT * FROM seasons WHERE id=?',uuid(season)); ensure(s,'Temporada no encontrada.',404); return s;
}
async function checkMember(env,user,season) {
  ensure(user.role==='admin' || await one(env,'SELECT 1 AS ok FROM season_memberships WHERE season_id=? AND user_id=? AND active=1',season,user.id),'No estás inscrito en esta temporada.',403);
}
async function publicStats(env,year) {
  const season=await one(env,'SELECT * FROM seasons WHERE year=?',year); ensure(season,'Temporada no encontrada.',404);
  // Solo agregados permitidos. No devolver late_reason, activity ni credenciales.
  let members=await rows(env,`SELECT u.id,u.display_name AS name,u.legacy_key,m.active AS membership_active,
    (SELECT AVG(p.score) FROM recordings p WHERE p.user_id=u.id AND p.season_id=m.season_id AND p.status='ready' AND p.score IS NOT NULL) AS similarity,
    COALESCE(SUM(CASE WHEN r.status='final' THEN a.effective_minutes END),0) AS minutes,
    COALESCE(SUM(CASE WHEN r.status='final' THEN r.duration_minutes END),0) AS scheduled_minutes,
    COUNT(CASE WHEN r.status='final' THEN 1 END) AS rehearsals,
    COUNT(CASE WHEN r.status='final' AND a.attendance_status IN ('on_time','late') THEN 1 END) AS rehearsalsAttended,
    COUNT(CASE WHEN r.status='final' AND a.attendance_status='late' THEN 1 END) AS tardyCount
    FROM season_memberships m JOIN users u ON u.id=m.user_id
    LEFT JOIN rehearsal_attendance a ON a.user_id=u.id LEFT JOIN rehearsals r ON r.id=a.rehearsal_id AND r.season_id=m.season_id
    WHERE m.season_id=? GROUP BY u.id ORDER BY u.display_name`,season.id);
  const total=await one(env,"SELECT COUNT(*) AS rehearsals,COALESCE(SUM(duration_minutes),0) AS totalMinutes,MIN(rehearsal_date) AS firstDate,MAX(rehearsal_date) AS lastDate FROM rehearsals WHERE season_id=? AND status='final'",season.id);
  const legacy=await rows(env,'SELECT * FROM legacy_attendance WHERE season_id=?',season.id);
  for(const m of members){
    const l=legacy.find(x=>x.user_id===m.id);
    if(l){m.minutes+=l.minutes;m.scheduled_minutes+=l.scheduled_minutes;m.rehearsals+=l.rehearsals;m.rehearsalsAttended+=l.rehearsals_attended;m.tardyCount+=l.tardy_count;}
    m.attendance=m.scheduled_minutes?m.minutes/m.scheduled_minutes*100:null;
    m.minutesLost=m.scheduled_minutes-m.minutes;
    m.tardyPct=m.rehearsalsAttended?m.tardyCount/m.rehearsalsAttended*100:null;
    m.tardyJustifiedPct=null;
  }
  members=members.filter(m=>m.membership_active||season.status==='closed'||legacy.some(l=>l.user_id===m.id));
  const legacyCount=legacy[0]?.rehearsals||0,withData=members.filter(m=>m.attendance!==null);
  return {season,members,overview:{...total,rehearsals:total.rehearsals+legacyCount,totalMinutes:total.totalMinutes+(legacy[0]?.scheduled_minutes||0),totalHours:(total.totalMinutes+(legacy[0]?.scheduled_minutes||0))/60,totalMembers:members.length,averageMinutes:withData.length?withData.reduce((s,m)=>s+m.minutes,0)/withData.length:0,averageAttendance:withData.length?withData.reduce((s,m)=>s+m.attendance,0)/withData.length:null,timeframe:`${total.firstDate||''} – ${total.lastDate||''}`,observations:['Asistencia = minutos efectivos / minutos programados para cada integrante.','Los promedios incluyen solo integrantes con registros finalizados; sin registros no significa ausencia.','Borradores excluidos. Las correcciones reemplazan el registro vigente.'],levels:[]},hasLegacy:!!legacy.length};
}
async function saveRehearsal(request,env,user) {
  const b=await body(request), rehearsalId=uuid(b.id), requestId=uuid(b.request_id), season=await checkSeason(env,b.season_id);
  date(b.rehearsal_date); ensure(b.rehearsal_date>=season.starts_on && b.rehearsal_date<=season.ends_on,'La fecha no pertenece a la temporada.');
  const duration=clock(b.ends_at)-clock(b.starts_at); ensure(duration>0,'El cierre debe ser posterior al inicio, en la misma fecha.');
  const live=b.is_live===true?1:0;
  ensure(!live || b.status==='draft','Un ensayo activo aún no está finalizado.');
  ensure(!live || season.status==='active','La temporada está cerrada.',409);
  ensure(['draft','final'].includes(b.status),'Estado del ensayo inválido.');
  const old=await one(env,'SELECT * FROM rehearsals WHERE id=?',rehearsalId);
  const fingerprint=digest(JSON.stringify(b));
  if(old?.write_token===requestId){ensure(old.payload_hash===fingerprint,'El identificador de envío ya se utilizó.',409);return json(old);}
  ensure(!old || old.season_id===season.id,'No se puede mover un ensayo entre temporadas.');
  ensure(!old || b.version===old.version,'El ensayo cambió. Vuelve a abrirlo antes de corregir.',409);
  ensure(old || season.status==='active','La temporada está cerrada.',409);
  const members=old ? await rows(env,'SELECT user_id AS id FROM rehearsal_attendance WHERE rehearsal_id=?',rehearsalId) : await rows(env,'SELECT u.id FROM season_memberships m JOIN users u ON u.id=m.user_id WHERE m.season_id=? AND m.active=1 AND u.active=1 AND u.role=\'tenor\'',season.id);
  ensure(members.length>0,'Activa e inscribe integrantes antes de registrar el ensayo.');
  ensure(Array.isArray(b.attendance) && b.attendance.length===members.length,'Debe marcarse la lista completa de integrantes de este ensayo.');
  const seen=new Set(), normalized=b.attendance.map(a=>{ensure(members.some(m=>m.id===a.user_id) && !seen.has(a.user_id),'Integrante inválido o duplicado.');seen.add(a.user_id);return attendance(a,b.starts_at,b.ends_at);});
  ensure(b.status==='draft' || normalized.every(a=>a.attendance_status!=='pending'),'Hay integrantes sin marcar. Guarda un borrador o completa la lista.');
  const before=old ? {rehearsal:old,attendance:await rows(env,'SELECT * FROM rehearsal_attendance WHERE rehearsal_id=?',rehearsalId)} : null;
  const statements=[];
  if(old) statements.push(stmt(env,'UPDATE rehearsals SET rehearsal_date=?,starts_at=?,ends_at=?,duration_minutes=?,status=?,is_live=?,version=version+1,write_token=?,payload_hash=?,updated_by=?,updated_at=? WHERE id=? AND version=?',b.rehearsal_date,b.starts_at,b.ends_at,duration,b.status,live,requestId,fingerprint,user.id,now(),rehearsalId,b.version));
  else statements.push(stmt(env,'INSERT INTO rehearsals(id,season_id,rehearsal_date,starts_at,ends_at,duration_minutes,status,is_live,write_token,payload_hash,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',rehearsalId,season.id,b.rehearsal_date,b.starts_at,b.ends_at,duration,b.status,live,requestId,fingerprint,user.id,user.id));
  for(const a of normalized) statements.push(stmt(env,`INSERT INTO rehearsal_attendance(rehearsal_id,user_id,attendance_status,late_reason,arrival_at,departure_at,effective_minutes) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rehearsals WHERE id=? AND write_token=?) ON CONFLICT(rehearsal_id,user_id) DO UPDATE SET attendance_status=excluded.attendance_status,late_reason=excluded.late_reason,arrival_at=excluded.arrival_at,departure_at=excluded.departure_at,effective_minutes=excluded.effective_minutes,updated_at=datetime('now')`,rehearsalId,a.user_id,a.attendance_status,a.late_reason,a.arrival_at,a.departure_at,a.effective_minutes,rehearsalId,requestId));
  statements.push(stmt(env,'INSERT OR IGNORE INTO admin_audit(id,changed_by,action,entity_id,previous_value,new_value) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rehearsals WHERE id=? AND write_token=?)',digest(`rehearsal:${rehearsalId}:${requestId}`),user.id,old?'rehearsal_updated':'rehearsal_created',rehearsalId,before?JSON.stringify(before):null,JSON.stringify({rehearsal:b,attendance:normalized}),rehearsalId,requestId));
  await env.DB.batch(statements);
  const saved=await one(env,'SELECT * FROM rehearsals WHERE id=?',rehearsalId);
  ensure(saved.write_token===requestId,'Otra corrección se guardó primero. Abre el ensayo de nuevo.',409);
  return json(saved);
}
async function api(request,env) {
  ensure(env.DB,'El backend aún no está configurado.',503);
  const url=new URL(request.url), p=url.pathname, method=request.method;
  if(!['GET','HEAD'].includes(method)) origin(request);
  const ip=request.headers.get('CF-Connecting-IP') || 'local';
  await rate(env,`api:${ip}`,240);
  if(p==='/api/session' && method==='GET') { const u=await session(request,env);return json({user:safeUser(u),csrf:u?.csrf_token||null,limits:await limits(env)}); }
  if(p==='/api/setup' && method==='GET') return json({needs_setup:!(await one(env,"SELECT id FROM users WHERE role='admin' LIMIT 1"))});
  if(p==='/api/setup' && method==='POST') {
    await rate(env,`setup:${ip}`,3,900);const b=await body(request);
    ensure(env.BOOTSTRAP_SECRET && typeof b.setup_key==='string' && digest(b.setup_key)===digest(env.BOOTSTRAP_SECRET),'Clave de configuración inválida.',403);
    ensure(!(await one(env,"SELECT id FROM users WHERE role='admin' LIMIT 1")),'La configuración inicial ya se completó.',409);
    const userId=id(), hash=await passwordHash(env,b.password);
    await run(env,"INSERT INTO users(id,username,username_key,display_name,password_hash,role,active) SELECT ?,'Jefe de cuerda','jefe de cuerda','Jefe de cuerda',?,'admin',1 WHERE NOT EXISTS(SELECT 1 FROM users WHERE role='admin')",userId,hash);
    return json({ok:true,username:'Jefe de cuerda'},201);
  }
  if(p==='/api/login' && method==='POST') {
    const b=await body(request);await rate(env,`login-ip:${ip}`,40,900);
    const username=text(b.username,50).normalize('NFC').toLowerCase();await rate(env,`login-user:${username}`,5,900);
    const user=await one(env,'SELECT * FROM users WHERE username_key=? OR (username_key IS NULL AND username=?)',username,username);
    const dummy='scrypt$32768$8$3$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
    const valid=await passwordVerify(env,b.password,user?.password_hash||dummy);
    ensure(valid && user?.active,user?.role==='admin'?'Usuario o contraseña incorrectos.':'Usuario o PIN incorrectos.',401);
    const value=token(), csrf=token(), expiry=new Date(Date.now()+7*86400000).toISOString();
    await env.DB.batch([stmt(env,'INSERT INTO sessions(id,user_id,token_hash,csrf_token,expires_at) VALUES(?,?,?,?,?)',id(),user.id,digest(value),csrf,expiry),stmt(env,'UPDATE users SET last_login_at=? WHERE id=?',now(),user.id),stmt(env,"INSERT INTO activity_events(id,user_id,event_type,event_day) VALUES(?,?,'login',?)",id(),user.id,day())]);
    await event(env,user,'active_day');
    return json({user:safeUser(user),csrf},200,{'Set-Cookie':cookie(request,value,7*86400)});
  }
  if(p==='/api/public/seasons' && method==='GET') return json(await rows(env,'SELECT id,year,status FROM seasons ORDER BY year DESC'));
  if(p==='/api/public/stats' && method==='GET') return json(await publicStats(env,Number(url.searchParams.get('year')||2026)));
  if(p==='/api/public/songs' && method==='GET') return json(await rows(env,`SELECT id,season_id,legacy_key,title,reference_audio_key,lyrics,${HAS_REFERENCE} FROM songs WHERE season_id=? AND active=1 ORDER BY title`,uuid(url.searchParams.get('season'))));
  if(p==='/api/public/presentations' && method==='GET') return json(await rows(env,'SELECT id,season_id,title,presentation_date,starts_at,call_at,venue,city,notes FROM presentations WHERE season_id=? ORDER BY presentation_date,starts_at',uuid(url.searchParams.get('season'))));
  const user=await requireUser(request,env,p.startsWith('/api/admin/'));
  if(p==='/api/admin/analytics' && method==='GET')return json(await analyticsData(env,url));
  if(p==='/api/my-progress' && method==='GET'){
    const season=await checkSeason(env,url.searchParams.get('season'));await checkMember(env,user,season.id);
    const stats=await publicStats(env,season.year);
    return json({user:safeUser(user),stats:stats.members.find(m=>m.id===user.id)||null,attendance:await rows(env,'SELECT r.id,r.rehearsal_date,r.starts_at,r.ends_at,r.status,r.is_live,a.attendance_status,a.late_reason,a.arrival_at,a.effective_minutes FROM rehearsal_attendance a JOIN rehearsals r ON r.id=a.rehearsal_id WHERE a.user_id=? AND r.season_id=? ORDER BY r.rehearsal_date DESC,r.starts_at DESC LIMIT 100',user.id,season.id)});
  }
  if(p==='/api/admin/active-rehearsal' && method==='GET')return json(await one(env,'SELECT id,rehearsal_date,starts_at,ends_at,version FROM rehearsals WHERE season_id=? AND is_live=1',uuid(url.searchParams.get('season'))));
  const tenorDetail=/^\/api\/admin\/tenors\/([a-f0-9-]{36})$/.exec(p);
  if(tenorDetail && method==='GET'){
    const season=await checkSeason(env,url.searchParams.get('season')),person=await one(env,"SELECT * FROM users WHERE id=? AND role='tenor'",tenorDetail[1]);ensure(person,'Tenor no encontrado.',404);
    const stats=await publicStats(env,season.year);
    const personSeasons=await rows(env,`SELECT s.id,s.year FROM seasons s WHERE EXISTS (SELECT 1 FROM season_memberships m WHERE m.season_id=s.id AND m.user_id=?) OR EXISTS (SELECT 1 FROM legacy_attendance l WHERE l.season_id=s.id AND l.user_id=?) OR EXISTS (SELECT 1 FROM rehearsal_attendance a JOIN rehearsals r ON r.id=a.rehearsal_id WHERE r.season_id=s.id AND a.user_id=?) OR EXISTS (SELECT 1 FROM recordings r WHERE r.season_id=s.id AND r.user_id=? AND r.status='ready') ORDER BY s.year DESC`,person.id,person.id,person.id,person.id);
    return json({user:safeUser(person),seasons:personSeasons,stats:stats.members.find(m=>m.id===person.id)||null,attendance:await rows(env,'SELECT r.id,r.rehearsal_date,r.starts_at,r.ends_at,r.status,r.is_live,a.attendance_status,a.late_reason,a.arrival_at,a.effective_minutes FROM rehearsal_attendance a JOIN rehearsals r ON r.id=a.rehearsal_id WHERE a.user_id=? AND r.season_id=? ORDER BY r.rehearsal_date DESC,r.starts_at DESC LIMIT 100',person.id,season.id),recordings:await one(env,"SELECT COUNT(*) AS total FROM recordings WHERE user_id=? AND season_id=? AND status='ready'",person.id,season.id)});
  }
  if(p==='/api/admin/presentations' && method==='POST'){
    const b=await body(request),season=await checkSeason(env,b.season_id),presentationId=b.id?uuid(b.id):id();
    ensure(season.status==='active','La temporada está cerrada.',409);date(b.presentation_date);
    const optional=(value,max)=>{if(value==null)return '';ensure(typeof value==='string','Texto inválido.');const clean=value.trim();ensure(clean.length<=max,'Texto demasiado largo.');return clean;};
    const starts=optional(b.starts_at,5),call=optional(b.call_at,5);if(starts)clock(starts);if(call)clock(call);
    ensure(b.presentation_date>=season.starts_on && b.presentation_date<=season.ends_on,'La fecha no pertenece a la temporada.');
    const old=await one(env,'SELECT * FROM presentations WHERE id=?',presentationId);ensure(!old || old.season_id===season.id,'No se puede mover una presentación entre temporadas.');
    const title=optional(b.title,150)||'Presentación',venue=optional(b.venue,150),city=optional(b.city,100),notes=optional(b.notes,2000);
    ensure(city.length<=100 && notes.length<=2000,'Texto demasiado largo.');
    await env.DB.batch([stmt(env,"INSERT INTO presentations(id,season_id,title,presentation_date,starts_at,call_at,venue,city,notes,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,presentation_date=excluded.presentation_date,starts_at=excluded.starts_at,call_at=excluded.call_at,venue=excluded.venue,city=excluded.city,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=datetime('now')",presentationId,season.id,title,b.presentation_date,starts,call,venue,city,notes,user.id,user.id),audit(env,user,old?'presentation_updated':'presentation_created',presentationId,old,{title,presentation_date:b.presentation_date,starts_at:starts,call_at:call,venue,city,notes})]);
    return json({id:presentationId});
  }
  if(p==='/api/logout' && method==='POST'){await run(env,'UPDATE sessions SET revoked_at=? WHERE id=?',now(),user.session_id);return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});}
  if(p==='/api/password' && method==='POST'){
    const b=await body(request);await rate(env,`password:${user.id}`,3,900);ensure(await passwordVerify(env,b.current_password,user.password_hash),user.role==='tenor'?'PIN actual incorrecto.':'Contraseña actual incorrecta.',403);
    const hash=await passwordHash(env,b.password,user.role==='tenor'?4:12);
    await env.DB.batch([stmt(env,'UPDATE users SET password_hash=?,updated_at=? WHERE id=?',hash,now(),user.id),stmt(env,'UPDATE sessions SET revoked_at=? WHERE user_id=?',now(),user.id)]);return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
  }
  if(p==='/api/events' && method==='POST'){
    const b=await body(request);ensure(['active_day','reference_start'].includes(b.event_type),'Evento inválido.');
    if(b.song_id){const s=await one(env,'SELECT * FROM songs WHERE id=?',uuid(b.song_id));ensure(s,'Canción no encontrada.',404);await checkMember(env,user,s.season_id);}
    ensure(b.event_type!=='reference_start'||b.song_id,'Canción requerida.');await event(env,user,b.event_type,b.song_id||null);return json({ok:true});
  }
  if(p==='/api/recordings' && method==='GET'){
    const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0)),season=uuid(url.searchParams.get('season'));
    const owner=user.role==='admin'?(url.searchParams.get('user')||null):user.id;
    const songFilter=url.searchParams.has('song')?uuid(url.searchParams.get('song')):null;
    const result=await rows(env,'SELECT r.id,r.user_id,r.song_id,r.season_id,r.recorded_at,r.uploaded_at,r.duration_seconds,r.file_size,r.mime_type,r.codec,r.score,r.analysis IS NOT NULL AS has_analysis,s.title,u.display_name FROM recordings r JOIN songs s ON s.id=r.song_id JOIN users u ON u.id=r.user_id WHERE r.season_id=? AND r.status=\'ready\' AND (? IS NULL OR r.user_id=?) AND (? IS NULL OR r.song_id=?) ORDER BY s.title,r.uploaded_at DESC,r.id LIMIT 30 OFFSET ?',season,owner,owner,songFilter,songFilter,offset);
    return json({items:result,next_offset:result.length===30?offset+30:null});
  }
  if(p==='/api/recordings/reserve' && method==='POST'){
    ensure(env.RECORDINGS,'Almacenamiento privado pendiente de configurar.',503);
    const l=await limits(env), b=recordingMetadata(await body(request,300000),{bytes:l.audio_bytes,seconds:l.audio_seconds}), a=practiceAnalysis(b.analysis,b.song_id);
    await checkMember(env,user,b.season_id);
    const old=await one(env,'SELECT * FROM recordings WHERE id=?',b.id);
    if(old){ensure(old.user_id===user.id && old.song_id===b.song_id && old.file_size===b.file_size && old.mime_type===b.mime_type && old.duration_seconds===b.duration_seconds && old.score===a.score,'Identificador de grabación en uso.',409);ensure(old.status!=='deleted','La grabación fue eliminada.',410);return json({id:old.id,status:old.status});}
    await run(env,'INSERT INTO recordings(id,user_id,song_id,season_id,r2_object_key,duration_seconds,file_size,mime_type,codec,analysis,score,recorded_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',b.id,user.id,b.song_id,b.season_id,`${b.season_id}/${user.id}/${b.id}`,b.duration_seconds,b.file_size,b.mime_type,b.codec,a.json,a.score,now(),now());
    return json({id:b.id,status:'pending'},201);
  }
  const songReference=/^\/api\/songs\/([a-f0-9-]{36})\/reference$/.exec(p);
  if(songReference && method==='GET'){
    const s=await one(env,'SELECT * FROM songs WHERE id=?',songReference[1]);ensure(s,'Canción no encontrada.',404);await checkMember(env,user,s.season_id);
    const r=await one(env,'SELECT reference FROM song_references WHERE song_id=? AND source=?',s.id,s.reference_audio_key);ensure(r,'Esta canción aún no tiene curva de referencia.',404);
    return json({...JSON.parse(r.reference),songId:s.id});
  }
  const recordingMatch=/^\/api\/recordings\/([a-f0-9-]{36})(\/audio|\/analysis)?$/.exec(p);
  if(recordingMatch){
    const r=await one(env,'SELECT * FROM recordings WHERE id=?',recordingMatch[1]);ensure(r && canReadRecording(user,r),'Grabación no encontrada.',404);
    ensure(r.status!=='deleted','Grabación eliminada.',410);ensure(env.RECORDINGS,'Almacenamiento no configurado.',503);
    if(method==='PUT' && !recordingMatch[2]){
      ensure(r.user_id===user.id,'Solo el autor puede subir este audio.',403);
      if(r.status==='ready')return json({id:r.id,status:'ready'});
      const season=await checkSeason(env,r.season_id);ensure(season.status==='active','La temporada está cerrándose.',409);
      ensure(request.headers.get('Content-Type')?.toLowerCase()===r.mime_type,'El formato no coincide.',415);
      const bytes=await limitedBody(request,r.file_size);ensure(bytes.length===r.file_size,'Tamaño de archivo incompleto.');ensure(sniffAudio(bytes,r.mime_type),'El contenido no coincide con el formato declarado.',415);
      // PUT condicional: un reintento nunca reemplaza un archivo ya recibido.
      // Tomar una reserva temporal DESPUÉS de leer el cuerpo: un cliente lento no
      // puede escribir una vez iniciada la limpieza. Se serializan PUT concurrentes.
      const uploadStarted=now(),oldLease=new Date(Date.now()-15*60000).toISOString();
      const lease=await run(env,"UPDATE recordings SET upload_started_at=? WHERE id=? AND status='pending' AND (upload_started_at IS NULL OR upload_started_at<?) AND EXISTS(SELECT 1 FROM seasons WHERE id=? AND status='active')",uploadStarted,r.id,oldLease,r.season_id);
      ensure(lease.meta.changes>0,'Hay otra subida en curso o la temporada comenzó a cerrarse. Reintenta más tarde.',409);
      try{await env.RECORDINGS.put(r.r2_object_key,bytes,{httpMetadata:{contentType:r.mime_type},onlyIf:{etagDoesNotMatch:'*'},customMetadata:{recordingId:r.id}});}
      catch(error){await run(env,"UPDATE recordings SET upload_started_at=NULL WHERE id=? AND status='pending' AND upload_started_at=?",r.id,uploadStarted);throw error;}
      const stored=await env.RECORDINGS.head(r.r2_object_key);ensure(stored && stored.size===r.file_size,'No se pudo confirmar la subida.',503);
      // Cierre concurrente: no liberar reserva ni perder trazabilidad; cierre reanudable borrará el objeto.
      const updated=await run(env,"UPDATE recordings SET status='ready',uploaded_at=?,upload_started_at=NULL WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM seasons WHERE id=? AND status='active')",now(),r.id,r.season_id);
      if(updated.meta.changes===0){
        // Si se confirmó cierre durante PUT, borrar el objeto recién recibido;
        // ante fallo, su metadata sigue reservada para la limpieza reanudable.
        await env.RECORDINGS.delete(r.r2_object_key);
        await run(env,"UPDATE recordings SET status='deleted',upload_started_at=NULL WHERE id=?",r.id);
        throw new HttpError(409,'La temporada comenzó a cerrarse. El audio no se guardó.');
      }
      await event(env,user,'recording_sent',r.song_id);return json({id:r.id,status:'ready'});
    }
    if(method==='GET' && recordingMatch[2]==='/analysis'){
      ensure(r.status==='ready','La grabación aún no está disponible.',409);ensure(r.analysis,'Esta práctica no tiene análisis.',404);
      return json(JSON.parse(r.analysis));
    }
    if(method==='GET' && recordingMatch[2]==='/audio'){
      ensure(r.status==='ready','La grabación aún no está disponible.',409);
      const range=request.headers.get('Range');
      if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);ensure(match&&(match[1]||match[2]),'Rango inválido.',416);if(match[1])ensure(Number(match[1])<r.file_size&&(!match[2]||Number(match[2])>=Number(match[1])),'Rango fuera del audio.',416);else ensure(Number(match[2])>0,'Rango inválido.',416);}
      const object=await env.RECORDINGS.get(r.r2_object_key,{range:request.headers});ensure(object,'Audio no disponible.',404);
      const headers=new Headers({'Content-Type':r.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline'});
      let status=200;
      if(range && object.range){status=206;headers.set('Content-Range',`bytes ${object.range.offset}-${object.range.offset+object.range.length-1}/${object.size}`);headers.set('Content-Length',String(object.range.length));}
      else headers.set('Content-Length',String(object.size));
      return new Response(object.body,{status,headers});
    }
  }
  if(p==='/api/admin/users' && method==='GET') return json(await rows(env,'SELECT id,username,display_name,role,active,last_login_at,legacy_key FROM users ORDER BY display_name'));
  if(p==='/api/admin/users' && method==='POST'){
    const b=await body(request), userId=b.id?uuid(b.id):id(), old=await one(env,'SELECT * FROM users WHERE id=?',userId);
    const username=text(b.username,50).normalize('NFC');ensure(/^[\p{L}\p{N}][\p{L}\p{M}\p{N}_ -]{2,49}$/u.test(username)&&!username.includes('  '),'Usuario: 3–50 letras (se permiten tildes), números, espacios o guiones.');
    const usernameKey=username.toLowerCase();
    const duplicate=await one(env,'SELECT id FROM users WHERE username_key=? OR (username_key IS NULL AND username=?)',usernameKey,usernameKey);
    ensure(!duplicate || duplicate.id===userId,'Ya existe un usuario con ese nombre.',409);
    const name=text(b.display_name,80), active=b.active===true||b.active===1?1:0;
    ensure(!(old?.role==='admin' && !active),'No se puede desactivar jefatura desde este panel.');
    const hash=b.password?await passwordHash(env,b.password,old?.role==='admin'?12:4):old?.password_hash;
    ensure(hash,old?.role==='admin'?'Establece una contraseña inicial.':'Establece un PIN inicial de cuatro números.');
    const statements=[stmt(env,'INSERT INTO users(id,username,username_key,display_name,password_hash,role,active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,username_key=excluded.username_key,display_name=excluded.display_name,password_hash=excluded.password_hash,active=excluded.active,updated_at=datetime(\'now\')',userId,username,usernameKey,name,hash,old?.role||'tenor',active),audit(env,user,old?'user_updated':'user_created',userId,safeUser(old),{username,display_name:name,active,password_reset:!!b.password})];
    if(b.password || !active)statements.push(stmt(env,'UPDATE sessions SET revoked_at=? WHERE user_id=?',now(),userId));
    await env.DB.batch(statements);return json({id:userId});
  }
  if(p==='/api/admin/seasons' && method==='GET') return json(await rows(env,'SELECT * FROM seasons ORDER BY year DESC'));
  if(p==='/api/admin/seasons' && method==='POST'){
    const b=await body(request);ensure(Number.isInteger(b.year) && b.year>=2000 && b.year<=2200,'Año inválido.');date(b.starts_on);date(b.ends_on);ensure(b.ends_on>=b.starts_on,'Fechas inválidas.');
    const seasonId=id();await env.DB.batch([stmt(env,'INSERT INTO seasons(id,year,starts_on,ends_on) VALUES(?,?,?,?)',seasonId,b.year,b.starts_on,b.ends_on),audit(env,user,'season_created',seasonId,null,b)]);return json({id:seasonId},201);
  }
  if(p==='/api/admin/memberships' && method==='GET') return json(await rows(env,'SELECT u.id,u.display_name,u.active AS account_active,m.active FROM season_memberships m JOIN users u ON u.id=m.user_id WHERE m.season_id=? AND u.role=\'tenor\' ORDER BY u.display_name',uuid(url.searchParams.get('season'))));
  if(p==='/api/admin/memberships' && method==='POST'){
    const b=await body(request);await checkSeason(env,b.season_id);uuid(b.user_id);
    ensure((await one(env,'SELECT role FROM users WHERE id=?',b.user_id))?.role==='tenor','Selecciona un tenor válido.');
    await env.DB.batch([stmt(env,'INSERT INTO season_memberships(season_id,user_id,active) VALUES(?,?,?) ON CONFLICT(season_id,user_id) DO UPDATE SET active=excluded.active',b.season_id,b.user_id,b.active?1:0),audit(env,user,'membership_updated',b.user_id,null,b)]);return json({ok:true});
  }
  if(p==='/api/admin/rehearsals' && method==='POST') return saveRehearsal(request,env,user);
  if(p==='/api/admin/rehearsals' && method==='GET'){
    const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
    return json(await rows(env,'SELECT * FROM rehearsals WHERE season_id=? ORDER BY rehearsal_date DESC,starts_at DESC LIMIT 30 OFFSET ?',uuid(url.searchParams.get('season')),offset));
  }
  const rehearsalMatch=/^\/api\/admin\/rehearsals\/([a-f0-9-]{36})$/.exec(p);
  if(rehearsalMatch && method==='GET'){
    const r=await one(env,'SELECT * FROM rehearsals WHERE id=?',rehearsalMatch[1]);ensure(r,'Ensayo no encontrado.',404);
    return json({...r,attendance:await rows(env,'SELECT a.*,u.display_name FROM rehearsal_attendance a JOIN users u ON u.id=a.user_id WHERE a.rehearsal_id=? ORDER BY u.display_name',r.id),audit:await rows(env,'SELECT a.action,a.changed_at,u.display_name FROM admin_audit a JOIN users u ON u.id=a.changed_by WHERE a.entity_id=? ORDER BY a.changed_at DESC LIMIT 20',r.id)});
  }
  if(p==='/api/admin/songs' && method==='GET') return json(await rows(env,`SELECT *,${HAS_REFERENCE} FROM songs WHERE season_id=? ORDER BY title`,uuid(url.searchParams.get('season'))));
  if(p==='/api/admin/songs' && method==='POST'){
    const b=await body(request),songId=b.id?uuid(b.id):id();await checkSeason(env,b.season_id);
    const ref=text(b.reference_audio_key,1000);ensure(/^https:\/\//.test(ref),'La referencia debe ser una URL HTTPS.');
    const before=await one(env,'SELECT * FROM songs WHERE id=?',songId);ensure(!before || before.season_id===b.season_id,'No se puede mover una canción.');
    ensure(typeof b.lyrics==='string'&&b.lyrics.length<=16000,'Letra inválida.');
    await env.DB.batch([stmt(env,'INSERT INTO songs(id,season_id,title,reference_audio_key,lyrics,active) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,reference_audio_key=excluded.reference_audio_key,lyrics=excluded.lyrics,active=excluded.active',songId,b.season_id,text(b.title,150),ref,b.lyrics,b.active?1:0),audit(env,user,'song_updated',songId,before,b)]);return json({id:songId});
  }
  const referenceMatch=/^\/api\/admin\/songs\/([a-f0-9-]{36})\/reference$/.exec(p);
  if(referenceMatch && method==='POST'){
    const b=await body(request,170000),s=await one(env,'SELECT * FROM songs WHERE id=?',referenceMatch[1]);ensure(s,'Canción no encontrada.',404);
    const reference=referencePayload(b.reference,s),before=await one(env,'SELECT source,created_at FROM song_references WHERE song_id=?',s.id);
    await env.DB.batch([stmt(env,"INSERT INTO song_references(song_id,source,reference,created_by,created_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(song_id) DO UPDATE SET source=excluded.source,reference=excluded.reference,created_by=excluded.created_by,created_at=excluded.created_at",s.id,s.reference_audio_key,reference,user.id),audit(env,user,'reference_generated',s.id,before,{source:s.reference_audio_key})]);
    return json({ok:true});
  }
  if(p==='/api/admin/practice-scores' && method==='GET'){
    const season=await checkSeason(env,url.searchParams.get('season'));
    return json(await rows(env,"SELECT user_id,AVG(score) AS average,COUNT(*) AS count FROM recordings WHERE season_id=? AND status='ready' AND score IS NOT NULL GROUP BY user_id ORDER BY user_id",season.id));
  }
  if(p==='/api/admin/activity' && method==='GET'){
    const since=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
    return json({period_days:90,users:await rows(env,`SELECT u.id,u.display_name,u.last_login_at,(SELECT COUNT(*) FROM recordings r WHERE r.user_id=u.id AND r.uploaded_at>=?) AS recordings_sent,COUNT(CASE WHEN a.event_type='login' THEN 1 END) AS logins,COUNT(CASE WHEN a.event_type='active_day' THEN 1 END) AS active_days,COUNT(CASE WHEN a.event_type='recording_sent' THEN 1 END) AS song_submission_days,COUNT(CASE WHEN a.event_type='reference_start' THEN 1 END) AS reference_song_days FROM users u LEFT JOIN activity_events a ON a.user_id=u.id AND a.event_day>=? WHERE u.role='tenor' GROUP BY u.id`,since,since),songs:await rows(env,`SELECT s.title,u.display_name,a.event_type,COUNT(*) AS days FROM activity_events a JOIN songs s ON s.id=a.song_id JOIN users u ON u.id=a.user_id WHERE a.event_day>=? GROUP BY a.user_id,a.song_id,a.event_type LIMIT 300`,since)});
  }
  if(p==='/api/admin/summary' && method==='GET') {
    await env.DB.batch([stmt(env,'DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 500)',Math.floor(Date.now()/1000)),stmt(env,'DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at<? LIMIT 100)',new Date(Date.now()-30*86400000).toISOString())]);
    return json({users:await one(env,"SELECT COUNT(*) AS total,SUM(active) AS active FROM users WHERE role='tenor'"),storage:await one(env,"SELECT COUNT(*) AS count,COALESCE(SUM(CASE WHEN status='ready' THEN 1 ELSE 0 END),0) AS submitted_count,COALESCE(SUM(file_size),0) AS bytes FROM recordings WHERE status!='deleted'"),season_storage:url.searchParams.has('season')?await one(env,"SELECT COUNT(*) AS count,COALESCE(SUM(CASE WHEN status='ready' THEN 1 ELSE 0 END),0) AS submitted_count,COALESCE(SUM(file_size),0) AS bytes FROM recordings WHERE status!='deleted' AND season_id=?",uuid(url.searchParams.get('season'))):null,limits:await limits(env),storage_configured:!!env.RECORDINGS});
  }
  if(p==='/api/admin/limits' && method==='POST'){
    const b=await body(request);for(const k of ['audio_bytes','audio_seconds','daily_recordings','season_bytes','total_bytes'])ensure(Number.isInteger(b[k])&&b[k]>0,`Límite inválido: ${k}.`);
    ensure(b.audio_bytes<=20000000 && b.audio_seconds<=600 && b.daily_recordings<=20 && b.total_bytes<=8000000000 && b.season_bytes<=b.total_bytes,'Los límites no pueden superar los máximos conservadores.');
    await env.DB.batch([stmt(env,'UPDATE app_limits SET audio_bytes=?,audio_seconds=?,daily_recordings=?,season_bytes=?,total_bytes=? WHERE id=1',b.audio_bytes,b.audio_seconds,b.daily_recordings,b.season_bytes,b.total_bytes),audit(env,user,'limits_updated','storage',await limits(env),b)]);return json({ok:true});
  }
  const seasonAction=/^\/api\/admin\/seasons\/([a-f0-9-]{36})\/(storage|export|close|cleanup)$/.exec(p);
  if(seasonAction){
    const season=await checkSeason(env,seasonAction[1]),action=seasonAction[2];
    if(action==='storage'&&method==='GET')return json(await one(env,"SELECT COUNT(*) AS count,COALESCE(SUM(file_size),0) AS bytes,SUM(status='pending') AS pending FROM recordings WHERE season_id=? AND status!='deleted'",season.id));
    if(action==='export'&&method==='GET'){
      const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
      const items=await rows(env,"SELECT r.id,r.recorded_at,r.mime_type,r.file_size,u.display_name,s.title FROM recordings r JOIN users u ON u.id=r.user_id JOIN songs s ON s.id=r.song_id WHERE r.season_id=? AND r.status='ready' ORDER BY r.id LIMIT 30 OFFSET ?",season.id,offset);
      return json({items:items.map(r=>({...r,audio_url:`/api/recordings/${r.id}/audio`})),next_offset:items.length===30?offset+30:null});
    }
    if(action==='close'&&method==='POST'){
      const b=await body(request);ensure(b.confirmation===`ELIMINAR AUDIOS ${season.year}`,'Escribe la confirmación exacta.');ensure(env.RECORDINGS,'Almacenamiento no configurado.',503);
      await env.DB.batch([stmt(env,"UPDATE seasons SET status='closing' WHERE id=? AND status='active'",season.id),audit(env,user,'season_closing',season.id,null,{year:season.year})]);return json({status:'closing'});
    }
    if(action==='cleanup'&&method==='POST'){
      ensure(season.status==='closing','Primero confirma el cierre.',409);ensure(env.RECORDINGS,'Almacenamiento no configurado.',503);
      // Las reservas más recientes esperan 15 minutos: cubre PUT en curso que vio active.
      const cutoff=new Date(Date.now()-15*60000).toISOString();
      const batch=await rows(env,"SELECT id,r2_object_key FROM recordings WHERE season_id=? AND status!='deleted' AND created_at<? AND (upload_started_at IS NULL OR upload_started_at<?) ORDER BY id LIMIT 5",season.id,cutoff,cutoff);
      for(const r of batch){await env.RECORDINGS.delete(r.r2_object_key);await env.DB.batch([stmt(env,"UPDATE recordings SET status='deleted' WHERE id=?",r.id),audit(env,user,'recording_deleted',r.id,null,{season_id:season.id})]);}
      const remaining=await one(env,"SELECT COUNT(*) AS count FROM recordings WHERE season_id=? AND status!='deleted'",season.id);
      if(!remaining.count)await env.DB.batch([stmt(env,"UPDATE seasons SET status='closed' WHERE id=?",season.id),audit(env,user,'season_closed',season.id,null,{year:season.year})]);
      return json({remaining:remaining.count,status:remaining.count?'closing':'closed',waiting:batch.length===0&&remaining.count>0});
    }
  }
  throw new HttpError(404,'Ruta no encontrada.');
}
export default {
  async fetch(request,env) {
    if(!new URL(request.url).pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    try{return await api(request,env);}catch(error){
      if(error instanceof HttpError)return json({error:error.message},error.status);
      const message=String(error.message);
      if(/storage_limit|daily_limit|audio_limit/.test(message))return json({error:'Se alcanzó un límite de almacenamiento, tamaño o envíos diarios.'},429);
      if(/UNIQUE constraint/.test(message))return json({error:'Ya existe un registro con esos datos.'},409);
      // Nunca responder con SQL, hashes, claves R2 ni errores del proveedor.
      console.error('API failure',error.name);
      return json({error:'No se pudo completar la operación. Conserva tus datos y vuelve a intentar.'},503);
    }
  }
};
