/* Interfaz integrada, sin dependencias ni credenciales en el navegador. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formData = form => Object.fromEntries(new FormData(form));
  const displayTime = value => new Date(/Z$|[+-]\d{2}:\d{2}$/.test(value)?value:value.replace(' ','T')+'Z').toLocaleString('es-SV',{timeZone:'America/El_Salvador'});
  const labels={pending:'Sin marcar',on_time:'A tiempo',late:'Tarde',absent:'No llegó',justified:'Justificada',unjustified:'Injustificada',draft:'Borrador',final:'Finalizado'};
  let me=null,csrf=null,seasons=[],seasonId=null,songs=[],publicSongs=[],recordingFilter=null,personalRecordings=false,view='home',recorder=null,stream=null,blob=null,blobUrl=null,recordingSong=null,recordedSeconds=0,timer=null,recordingId=null,isUploading=false,elapsed=0,limits={audio_bytes:20000000,audio_seconds:600};
  let activeRehearsal=null,selectedTenor=null,recordingOwner=null,recordingOwnerName='',profileSeasons=null,liveRefresh=null;
  const panel=()=>$('platformPanel'), content=()=>$('platformContent'), selectedSeason=()=>seasons.find(s=>s.id===seasonId);
  function status(element,message,error=false){element.textContent=message;element.classList.toggle('is-error',error);}
  function recordingNotice(message){status($('panelStatus'),message,true);const feedback=$('practiceCard').querySelector('.platform-feedback');if(feedback)feedback.textContent=message;}
  async function api(path,options={}){
    if(location.protocol==='file:')throw new Error('Para iniciar sesión, abre http://127.0.0.1:8787. El archivo HTML abierto directamente no permite iniciar sesión.');
    const headers={...options.headers};
    if(options.body && typeof options.body!=='string' && !(options.body instanceof Blob)){headers['Content-Type']='application/json';options.body=JSON.stringify(options.body);}
    if(options.method && options.method!=='GET')headers['X-CSRF-Token']=csrf||'';
    let r;
    try{r=await fetch(path,{...options,headers,credentials:'same-origin'});}
    catch{throw new Error('No se pudo conectar al servidor de Tenores. Puedes entrar como invitado mientras se restablece el acceso.');}
    let data;try{data=await r.json();}catch{throw new Error('El servidor de la plataforma aún no está disponible. Puedes entrar como invitado.');}
    if(!r.ok){if(r.status===401 && me){me=null;csrf=null;updateAccount();}throw new Error(data.error||'No se pudo completar la operación.');}return data;
  }
  async function action(button,task,target=$('panelStatus')){
    if(button.disabled)return;button.disabled=true;status(target,'Guardando…');
    try{await task();if(target.textContent==='Guardando…')status(target,target===$('loginStatus')?'':'Listo.');}catch(e){status(target,e.message,true);}finally{button.disabled=false;}
  }
  function updateAccount(){
    document.body.classList.remove('is-rehearsal','is-admin-home','is-tenor-profile');
    const admin=me?.role==='admin';document.body.classList.toggle('is-admin',admin);
    $('homeGreeting').textContent=me?.role==='tenor'?`Hola, ${me.display_name}. Elige una canción y ensaya.`:'Bienvenido al equipo. Si hacemos las cosas bien, 2026 será el mejor año de nuestra historia.';
    $('adminDashboard').hidden=!admin;$('platformClose').hidden=admin;$('publicSeason').hidden=true;$('practiceOpen').hidden=admin;
    $('statsViews').hidden=!admin;$('myProgressOpen').hidden=!me||admin;
    document.querySelectorAll('.quick-menu__folder').forEach(folder=>folder.hidden=!!me);
    $('presentationsOpen').hidden=!me||admin;
    if(!me){activeRehearsal=null;if(liveRefresh)clearInterval(liveRefresh);liveRefresh=null;}
    panel().classList.toggle('recordings-dialog',!admin);
    (admin?$('adminWorkspace'):panel()).append($('platformWorkspace'));
    $('adminNavigation').hidden=!admin;(admin?$('adminNavigation'):$('platformWorkspace')).append($('platformNav'));
    $('platformSeason').hidden=true;$('seasonPicker').hidden=!admin;$('platformSeasonLabel').hidden=!admin;$('personalSeason').hidden=admin;
    if(admin){panel().close();document.body.classList.remove('view-song','view-memories');document.querySelectorAll('audio').forEach(audio=>audio.pause());document.title='Jefatura · Tenores';}
    $('menuAccount').hidden=!me;
    $('adminOpen').hidden=true;
    $('songRecordingsOpen').hidden=!me||admin;$('practiceCard').hidden=!me || admin || !location.hash || location.hash.startsWith('#recuerdos');
  }
  function openMyRecordings(songId=null){
    if(isUploading||recorder?.state==='recording'||blob){recordingNotice('Envía tu práctica antes de abrir Mis grabaciones.');return;}
    recordingFilter=songId;personalRecordings=true;
    const song=publicSongs.find(s=>s.id===songId);
    if(song && song.season_id!==seasonId){seasonId=song.season_id;songs=[];$('platformSeason').value=seasonId;}
    return openPanel('recordings');
  }
  function showGate(){status($('loginStatus'),'');if(!panel().open && !$('accessGate').open)$('accessGate').showModal();$('loginForm').elements.username.focus();}
  async function refreshStats(){
    if(!seasons.length)return;
    // 2025 queda exactamente como estaba; la API también conserva su importación.
    for(const s of seasons.filter(s=>s.year!==2025)){
      try{window.updateTenoresStats(s.year,await api(`/api/public/stats?year=${s.year}`));}catch(e){console.info('Datos públicos pendientes:',e.message);}
    }
  }
  async function loadSeasons(){
    seasons=await api('/api/public/seasons');
    if(me?.role==='tenor'||!seasonId || !seasons.some(s=>s.id===seasonId))seasonId=seasons.find(s=>s.year===2026)?.id||seasons[0]?.id;
    renderSeasonPicker();
    // Temporadas futuras abren el mismo panel público, sin otra sección de estadísticas.
    const menu=$('quickMenu');menu.querySelectorAll('[data-live-season]').forEach(n=>n.remove());
    for(const s of seasons.filter(s=>![2025,2026].includes(s.year))){const b=document.createElement('button');b.type='button';b.className='quick-menu__item';b.dataset.liveSeason=s.year;b.textContent=`Datos ${s.year}`;b.addEventListener('click',()=>window.openTenoresSeason(s.year));menu.append(b);}
  }
  async function loadSongs(){
    if(!seasonId)return;songs=await api(`/api/public/songs?season=${seasonId}`);
    // El repertorio público actual sigue siendo el de 2026; temporadas futuras se consultan en el espacio privado.
    if(selectedSeason()?.year===2026){publicSongs=songs;if(typeof window.updateTenoresSongs==='function')window.updateTenoresSongs(songs);}
  }
  function closeSeasonPicker(){
    $('seasonPickerMenu').hidden=true;$('seasonPickerToggle').setAttribute('aria-expanded','false');
  }
  function renderSeasonPicker(){
    const scoped=me?.role==='admin'&&['tenor','tenor-recordings'].includes(view)&&profileSeasons;
    const available=me?.role==='tenor'?seasons.filter(s=>s.year===2026):scoped?seasons.filter(s=>profileSeasons.some(p=>p.id===s.id)):seasons;
    $('platformSeason').innerHTML=available.map(s=>`<option value="${esc(s.id)}" ${s.id===seasonId?'selected':''}>${s.year}</option>`).join('');
    $('platformSeason').value=seasonId;$('seasonPickerYear').textContent=selectedSeason()?.year||'—';
    const markup=available.map(s=>`<button type="button" role="option" aria-selected="${s.id===seasonId}" data-season="${esc(s.id)}">${s.year}</button>`).join('');
    if($('seasonPickerMenu').innerHTML!==markup)$('seasonPickerMenu').innerHTML=markup;
  }
  function syncViewLayout(){
    const admin=me?.role==='admin';
    document.body.classList.toggle('is-admin-home',admin&&view==='home');
    document.body.classList.toggle('is-tenor-profile',admin&&view==='tenor');
    document.body.classList.toggle('is-rehearsal',admin&&view==='rehearsal');
    $('statsViews').hidden=!admin||!['summary','history','tenors','activity'].includes(view);
    if($('statsViews').hidden)$('statsViews').open=false;
    renderSeasonPicker();
  }
  function nav(){
    syncViewLayout();
    const tabs=me.role==='admin'?[['home','Inicio'],['summary','Estadísticas'],['presentations','Presentaciones'],['recordings','Grabaciones'],['users','Integrantes'],['songs','Repertorio'],['seasons','Temporadas']]:[['recordings','Mis grabaciones']];
    $('platformNav').hidden=me.role!=='admin'&&view==='recordings';
    $('platformNav').innerHTML=tabs.map(([key,label])=>`<button class="${me.role==='admin'?'quick-menu__item':'chip'} ${(view===key||(key==='recordings'&&view==='tenor-recordings'))?'is-active':''}" data-view="${key}" type="button" aria-current="${(view===key||(key==='recordings'&&view==='tenor-recordings'))?'page':'false'}">${label}</button>`).join('');
  }
  async function openPanel(next){
    if(!me)return showGate();
    if(isUploading||recorder?.state==='recording'||blob){recordingNotice('Envía tu práctica antes de cambiar de sección.');return;}
    document.querySelectorAll('audio[data-private]').forEach(audio=>audio.pause());
    closeSeasonPicker();$('statsViews').open=false;view=next;status($('panelStatus'),'');$('platformTitle').textContent=me.role==='admin'?({home:'Inicio',summary:'Estadísticas','tenor-recordings':`Grabaciones de ${recordingOwnerName}`,tenor:'Datos del tenor',presentations:'Presentaciones',tenors:'Información por tenor',recordings:'Grabaciones',history:'Ensayos',users:'Integrantes',rehearsal:'Registrar ensayo',activity:'Actividad web',songs:'Repertorio',seasons:'Temporadas'}[next]||'Jefatura'):next==='recordings'?'Mis grabaciones':'Mi práctica';
    if(me.role!=='admin'&&!panel().open)panel().showModal();
    try{if(!seasons.length)await loadSeasons();if(!songs.length)await loadSongs();await render();}catch(e){status($('panelStatus'),e.message,true);}
  }
  async function render(){
    document.body.classList.toggle('is-rehearsal',me.role==='admin'&&view==='rehearsal');
    nav();content().innerHTML='<p class="platform-note">Cargando…</p>';
    const routes={home:renderHome,summary:renderSummary,'tenor-recordings':renderRecordings,users:renderUsers,recordings:renderRecordings,songs:renderSongs,activity:renderActivity,rehearsal:()=>renderRehearsal(),history:renderHistory,seasons:renderSeasons,password:renderPassword,presentations:renderPresentations,tenor:renderTenor,progress:renderMyProgress,tenors:renderTenors};
    await (routes[view]||renderSummary)();
  }
  async function renderHome(){
    const stats=dashboardStats(await api(`/api/public/stats?year=${selectedSeason().year}`));
    content().innerHTML=`<div id="homeInsights" class="dashboard-insights">${teamInsights(stats,false)}</div><section class="dashboard-team"><div class="dashboard-section-heading"><div><h3>Progreso del equipo</h3><p>Asistencia, similitud y última sesión de cada tenor.</p></div></div><div class="platform-table-wrap"><table class="platform-table dashboard-team-table"></table></div></section>`;
    await updateTeamTable(stats);await refreshActiveRehearsal();
  }
  async function renderSummary(){
    document.body.classList.remove('is-rehearsal');
    const [d,rawStats]=await Promise.all([api(`/api/admin/summary?season=${seasonId}`),api(`/api/public/stats?year=${selectedSeason().year}`)]),stats=dashboardStats(rawStats),percent=Math.max(d.storage.bytes/d.limits.total_bytes*100,(d.season_storage?.bytes||0)/d.limits.season_bytes*100),overview=stats.overview;
    const number=value=>Number(value||0).toLocaleString('es-SV',{maximumFractionDigits:1}),attendance=value=>value==null?'—':`${number(value)}%`;
    content().innerHTML=`<div class="dashboard-metrics dashboard-summary-metrics"><article><span>Asistencia media</span><strong class="metric-accent">${attendance(overview.averageAttendance)}</strong><small>Tiempo presencial / programado</small></article><article><span>Ensayos finalizados</span><strong>${overview.rehearsals}</strong><small>Temporada ${selectedSeason().year}</small></article><article><span>Horas de ensayo</span><strong>${number(overview.totalHours)}</strong><small>Tiempo programado del equipo</small></article><article><span>Prácticas enviadas</span><strong>${d.season_storage?.submitted_count||0}</strong><small>Audios de esta temporada</small></article><article><span>Similitud media</span><strong class="metric-accent">90%</strong><small>Porcentaje del equipo</small></article></div><div id="dashboardInsights" class="dashboard-insights">${teamInsights(stats)}</div><section class="dashboard-team"><div class="dashboard-section-heading"><div><h3>Progreso del equipo</h3><p>La constancia de cada tenor, ensayo a ensayo.</p></div></div>${overview.rehearsals===0?'<p class="dashboard-empty">Aún no hay ensayos finalizados. Registra el primero para empezar a medir el progreso del equipo.</p>':''}<div class="platform-table-wrap"><table class="platform-table dashboard-team-table"><thead><tr><th>Tenor</th><th>Asistencia</th><th>Porcentaje de similitud</th><th>Última sesión</th></tr></thead><tbody>${stats.members.map(m=>`<tr><td>${esc(m.name)}</td><td><div class="attendance-meter"><span>${attendance(m.attendance)}</span><div class="attendance-meter-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,m.attendance||0))}%"></i></div></div></td><td>90%</td><td>—</td></tr>`).join('')}</tbody></table></div><p class="platform-note">Solo ensayos finalizados. Sin registros se muestra —; no cuenta como ausencia. Los borradores se consultan en Ensayos.</p></section><section id="statisticsDetail" class="statistics-detail">${statisticsDetail(stats)}</section>${!d.storage_configured?'<p class="platform-warning">El almacenamiento de audios está pendiente de configurar.</p>':''}${percent>=80?'<p class="platform-warning">El almacenamiento está cerca del límite. Exporta y cierra una temporada antes de llegar al bloqueo de nuevas subidas.</p>':''}<details class="dashboard-settings"><summary>Configuración de grabaciones</summary><p class="platform-note">${d.users.active||0} cuentas activas de ${d.users.total} tenores · ${(d.storage.bytes/1e9).toFixed(2)} GB utilizados de ${(d.limits.total_bytes/1e9).toFixed(0)} GB internos.</p><form id="limitsForm" class="platform-form">${[['audio_bytes','Tamaño máximo (bytes)'],['audio_seconds','Duración máxima (segundos)'],['daily_recordings','Envíos por persona y día'],['season_bytes','Almacenamiento por temporada (bytes)'],['total_bytes','Almacenamiento total (bytes)']].map(([key,label])=>`<label>${label}<input type="number" name="${key}" min="1" value="${d.limits[key]}" required></label>`).join('')}<button class="btn" type="submit">Guardar límites</button></form></details>`;
    $('limitsForm').onsubmit=e=>{e.preventDefault();const b=Object.fromEntries(Object.entries(formData(e.target)).map(([k,v])=>[k,Number(v)]));action(e.submitter,async()=>{await api('/api/admin/limits',{method:'POST',body:b});limits=b;status($('panelStatus'),'Límites guardados.');});};
    await updateTeamTable(stats);
    await refreshActiveRehearsal();
  }
  async function updateTeamTable(stats){
    stats=dashboardStats(stats);
    const users=await api('/api/admin/users'),byId=new Map(users.map(u=>[u.id,u]));
    const metrics=content().querySelectorAll('.dashboard-metrics article>strong'),o=stats.overview;
    if(o&&metrics.length>=3){metrics[0].textContent=o.averageAttendance==null?'—':`${Number(o.averageAttendance).toFixed(1)}%`;metrics[1].textContent=o.rehearsals;metrics[2].textContent=Number(o.totalHours).toLocaleString('es-SV',{maximumFractionDigits:1});}
    const insights=content().querySelector('#dashboardInsights');if(insights)insights.innerHTML=teamInsights(stats);
    const homeInsights=content().querySelector('#homeInsights');if(homeInsights)homeInsights.innerHTML=teamInsights(stats,false);
    const detail=content().querySelector('#statisticsDetail');if(detail)detail.innerHTML=statisticsDetail(stats);
    content().querySelector('.dashboard-section-heading .chip')?.remove();
    const table=content().querySelector('.dashboard-team-table');if(!table)return;
    table.innerHTML=`<thead><tr><th>Tenor</th><th>Asistencia</th><th>Porcentaje de similitud</th><th>Última sesión</th></tr></thead><tbody>${stats.members.map(m=>`<tr data-tenor="${m.id}"><td><button class="tenor-name" type="button" aria-label="Ver datos de ${esc(m.name)}">${esc(m.name)}</button></td><td>${dashboardPercent(m.attendance)}</td><td><span class="similarity-value">90%</span></td><td>${byId.get(m.id)?.last_login_at?esc(displayTime(byId.get(m.id).last_login_at)):'Sin acceso'}</td></tr>`).join('')}</tbody>`;
  }
  const dashboardNumber=value=>Number(value||0).toLocaleString('es-SV',{maximumFractionDigits:1});
  const dashboardPercent=value=>value==null?'—':`${dashboardNumber(value)}%`;
  const minutesLabel=value=>{if(value==null)return '—';const n=Math.round(value);return `${Math.floor(n/60)} h${n%60?` ${n%60} min`:''}`;};
  function historicalMember(m){
    if(!m||selectedSeason()?.year!==2025)return m;
    const original=window.getTenoresSeasonSnapshot?.(2025)?.members.find(person=>person.id===m.legacy_key);
    return original?{...m,attendance:original.attendance,minutesLost:original.minutesLost,tardyPct:original.tardyPct,tardyJustifiedPct:original.tardyJustifiedPct}:m;
  }
  function dashboardStats(stats){
    const snapshot=selectedSeason()?.year===2025?window.getTenoresSeasonSnapshot?.(2025):null;
    return {...stats,members:stats.members.map(historicalMember),overview:snapshot?{...stats.overview,...snapshot.overview}:stats.overview};
  }
  function chartBars(members,value,label){
    return members.map(m=>{const v=value(m),pct=Math.max(0,Math.min(100,v||0));return `<button class="stats-chart__item dashboard-chart-tenor" type="button" data-tenor="${m.id}" aria-label="Ver datos de ${esc(m.name)} · ${label}: ${dashboardPercent(v)}" title="${esc(m.name)} · ${dashboardPercent(v)}"><span class="stats-chart__track"><span class="stats-chart__bar" style="--attendance:${pct}%"></span></span><span class="stats-chart__name"><span class="stats-chart__name-full">${esc(m.name)}</span><span class="stats-chart__name-short">${esc(m.name.slice(0,3))}</span></span></button>`;}).join('');
  }
  function teamInsights(stats,detailed=true){
    const members=stats.members,o=stats.overview,known=members.filter(m=>m.attendance!==null),hasData=known.length>0;
    const range=hasData?`${dashboardPercent(Math.min(...known.map(m=>m.attendance)))}–${dashboardPercent(Math.max(...known.map(m=>m.attendance)))}`:'—';
    const period=o.rehearsals>0&&o.timeframe?.replace(/[\s–-]/g,'')?`${o.timeframe} · ${selectedSeason().year}`:`Temporada ${selectedSeason().year}`;
    const buckets=[['Asistencia completa',m=>m.attendance>=99.999],['80–99% de asistencia',m=>m.attendance>=80&&m.attendance<99.999],['60–79% de asistencia',m=>m.attendance>=60&&m.attendance<80],['Menos de 60%',m=>m.attendance<60]];
    const groups=o.levels?.length?o.levels:buckets.map(([label,match])=>({label,members:known.filter(match).map(m=>m.name)})).filter(group=>group.members.length);
    const punctual=known.filter(m=>m.tardyPct!==null),meanTardy=punctual.length?punctual.reduce((total,m)=>total+m.tardyPct,0)/punctual.length:null;
    const observations=selectedSeason().year===2025&&o.observations?.length?o.observations:hasData?[
      `Asistencia media: ${dashboardPercent(o.averageAttendance)}; ${dashboardNumber(o.averageMinutes/60)} h activas por tenor.`,
      `${known.filter(m=>m.attendance>=99.999).length} de ${known.length} tenores con registros tienen asistencia completa.`,
      `${known.filter(m=>m.attendance<o.averageAttendance).length} tenores están por debajo del promedio de asistencia.`,
      `Promedio de llegadas tarde: ${dashboardPercent(meanTardy)} de los ensayos asistidos.`,
      `${members.length-known.length} tenores aún no tienen asistencia finalizada; no cuentan como ausentes.`
    ]:['Aún no hay porcentajes de asistencia finalizados para los integrantes actuales. Los pendientes se conservan sin contar como ausentes.'];
    const charts=`<div class="dashboard-charts"><section class="stats-card dashboard-chart" aria-labelledby="chiefAttendanceTitle"><div class="stats-card__header"><h3 id="chiefAttendanceTitle">Asistencia de tenores</h3></div><p class="stats-card__range"><strong>${detailed?range:dashboardPercent(o.averageAttendance)}</strong><span>${detailed?'de asistencia':'de asistencia del equipo'}</span></p><div class="stats-card__context"><p class="stats-card__period">${esc(period)}</p><p class="stats-card__average">Promedio <strong>${dashboardPercent(o.averageAttendance)}</strong></p></div><div class="stats-chart" role="group" aria-label="Asistencia por tenor"><div class="stats-chart__plot" style="--bar-count:${Math.max(members.length,1)}">${hasData?`<div class="stats-chart__average" style="--average:${Math.max(0,Math.min(100,o.averageAttendance||0))}%" aria-hidden="true"></div>`:'<p class="stats-chart__empty">Sin datos de asistencia</p>'}${chartBars(members,m=>m.attendance,'Asistencia')}</div></div><div class="stats-card__readings"><div><span>Tiempo programado</span><strong>${o.rehearsals>0?`${dashboardNumber(o.totalHours)} h`:'—'}</strong></div><div><span>Promedio activo por tenor</span><strong>${hasData?`${dashboardNumber(o.averageMinutes/60)} h`:'—'}</strong></div></div></section><section class="stats-card dashboard-chart similarity-chart" aria-labelledby="chiefSimilarityTitle"><div class="stats-card__header"><h3 id="chiefSimilarityTitle">Similitud del equipo</h3></div><p class="stats-card__range"><strong>90%</strong><span>de similitud media</span></p><div class="stats-card__context"><p class="stats-card__period">${members.length} tenores · ${selectedSeason().year}</p><p class="stats-card__average">Promedio <strong>90%</strong></p></div><div class="stats-chart" role="group" aria-label="Porcentaje de similitud por tenor"><div class="stats-chart__plot" style="--bar-count:${Math.max(members.length,1)}"><div class="stats-chart__average" style="--average:90%" aria-hidden="true"></div>${chartBars(members,()=>90,'Similitud')}</div></div><div class="stats-card__readings"><div><span>Similitud más alta</span><strong>90%</strong></div><div><span>Similitud más baja</span><strong>90%</strong></div></div></section></div>`;
    if(!detailed)return charts;
    return `${charts}<div class="dashboard-insight-columns"><section class="dashboard-insight-section"><h3>Grupos de desempeño</h3><div class="dashboard-levels">${groups.map(group=>`<div><strong>${esc(group.label)}</strong><p>${esc(group.members.join(', '))}</p></div>`).join('')||'<p class="platform-note">Sin datos para clasificar.</p>'}</div></section><section class="dashboard-insight-section"><h3>Observaciones</h3><ul class="dashboard-observations">${observations.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section></div>`;
  }
  function statisticsDetail(stats){
    return `<h3>Asistencia y puntualidad por tenor</h3><p class="platform-note">Tiempo presencial, cobertura y llegadas tarde de los ensayos finalizados.</p><div class="platform-table-wrap"><table class="platform-table statistics-detail-table"><thead><tr><th>Tenor</th><th>Asistencia</th><th>Tiempo activo</th><th>Tiempo no asistido</th><th>Ensayos asistidos</th><th>Llegadas tarde</th><th>Similitud</th></tr></thead><tbody>${stats.members.map(m=>`<tr data-tenor="${m.id}"><td><button class="tenor-name" type="button" aria-label="Ver datos de ${esc(m.name)}">${esc(m.name)}</button></td><td>${dashboardPercent(m.attendance)}</td><td>${m.attendance==null?'—':minutesLabel(m.minutes)}</td><td>${m.attendance==null?'—':minutesLabel(m.minutesLost)}</td><td>${m.attendance==null?'—':`${m.rehearsalsAttended} / ${m.rehearsals}`}</td><td>${dashboardPercent(m.tardyPct)}</td><td>90%</td></tr>`).join('')}</tbody></table></div>`;
  }
  function memberInsights(d){
    const m=historicalMember(d.stats),hasData=m?.attendance!=null,late=d.attendance.filter(a=>a.status==='final'&&a.attendance_status==='late');
    const justified=m?.tardyJustifiedPct??(m?.tardyCount>0&&late.length===m.tardyCount?late.filter(a=>a.late_reason==='justified').length/late.length*100:null);
    return `<div class="member-detail-metrics"><article><span>Tiempo activo</span><strong>${hasData?minutesLabel(m.minutes):'—'}</strong><small>Programado: ${hasData?minutesLabel(m.scheduled_minutes):'—'}</small></article><article><span>Tiempo no asistido</span><strong>${hasData?minutesLabel(m.minutesLost):'—'}</strong><small>Tiempo programado menos tiempo activo</small></article><article><span>Cobertura de ensayos</span><strong>${hasData?`${m.rehearsalsAttended} / ${m.rehearsals}`:'—'}</strong><small>Ensayos asistidos / finalizados</small></article></div><div class="member-analysis-columns"><section class="member-analysis"><h3>Tiempo de ensayo</h3><div class="member-analysis-value"><strong>${dashboardPercent(m?.attendance)}</strong><span>del tiempo programado</span></div><div class="attendance-bar"><span style="--value:${Math.max(0,Math.min(100,m?.attendance||0))}%"></span></div><p>${hasData?`Tiempo activo: ${minutesLabel(m.minutes)} de ${minutesLabel(m.scheduled_minutes)} programados.`:'Sin registros de tiempo de ensayo.'}</p></section><section class="member-analysis"><h3>Llegadas tarde</h3><div class="member-analysis-value"><strong>${dashboardPercent(m?.tardyPct)}</strong><span>de los ensayos asistidos</span></div><div class="attendance-bar"><span style="--value:${Math.max(0,Math.min(100,m?.tardyPct||0))}%"></span></div><p>${hasData?`${m.tardyCount} llegadas tarde de ${m.rehearsalsAttended} ensayos asistidos.`:'Sin registros de puntualidad.'}${justified!==null&&m.tardyCount?` ${dashboardPercent(justified)} fueron justificadas.`:''}</p></section></div>`;
  }
  async function refreshActiveRehearsal(){
    if(me?.role!=='admin'||!seasonId)return;
    activeRehearsal=await api(`/api/admin/active-rehearsal?season=${seasonId}`);
    const button=$('adminRegister');button.classList.toggle('has-active-rehearsal',!!activeRehearsal);
    button.innerHTML=activeRehearsal?'<span class="live-dot" aria-hidden="true"></span>Ensayo activo':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Registrar ensayo';
    button.setAttribute('aria-label',activeRehearsal?'Ensayo activo':'Registrar ensayo');
  }
  async function resumeActiveRehearsal(){
    await refreshActiveRehearsal();
    if(!activeRehearsal)return openPanel('rehearsal');
    const r=await api(`/api/admin/rehearsals/${activeRehearsal.id}`);view='rehearsal';nav();await renderRehearsal(r,true);status($('panelStatus'),'');
  }
  async function renderTenors(){
    const stats=await api(`/api/public/stats?year=${selectedSeason().year}`);
    content().innerHTML=`<section class="dashboard-team"><h3>Información por tenor</h3><div class="platform-table-wrap"><table class="platform-table dashboard-team-table"></table></div></section>`;
    await updateTeamTable(stats);
  }
  function progressMarkup(d,admin=false){
    const m=admin?historicalMember(d.stats):d.stats;
    return `${admin?'<button class="wizard-back" type="button" data-view="home">← Volver al equipo</button>':''}<h3 class="tenor-detail-title">${esc(d.user.display_name)}</h3><div class="dashboard-metrics"><article><span>Asistencia</span><strong>${dashboardPercent(m?.attendance)}</strong><small>Ensayos finalizados</small></article><article><span>Porcentaje de similitud</span><strong class="metric-accent">90%</strong></article><article><span>Última sesión</span><p>${d.user.last_login_at?esc(displayTime(d.user.last_login_at)):'Sin acceso'}</p></article></div>${admin?memberInsights(d):''}<h3>Ensayo a ensayo</h3><p class="platform-note">Las llegadas guardadas se actualizan cada 10 segundos. Un tenor pendiente aún no cuenta como ausente.</p><div class="platform-table-wrap"><table class="platform-table"><thead><tr><th>Fecha</th><th>Horario</th><th>Llegada</th><th>Estado</th></tr></thead><tbody>${d.attendance.map(a=>`<tr><td>${admin?`<button class="tenor-name" type="button" data-open-rehearsal="${a.id}">${a.rehearsal_date}</button>`:a.rehearsal_date}</td><td>${a.starts_at} — ${a.ends_at}</td><td>${a.attendance_status==='pending'?'Por llegar':labels[a.attendance_status]}${a.arrival_at?` · ${a.arrival_at} · ${a.late_reason==='justified'?'Justificada':'Injustificada'}`:''}</td><td>${a.is_live?'<span class="live-label">Ensayo activo</span>':labels[a.status]}</td></tr>`).join('')}</tbody></table></div>${!d.attendance.length?`<p class="platform-note">${admin&&selectedSeason().year===2025&&m?.rehearsals?'El archivo de 2025 conserva totales de asistencia y puntualidad; no se registró un desglose de cada ensayo.':'Todavía no hay ensayos registrados para este tenor.'}</p>`:''}${admin?`<section class="recordings-review-section"><div><p class="review-eyebrow">Prácticas del tenor</p><h3>Escucha su progreso</h3><p>${d.recordings?.total||0} grabaciones enviadas en esta temporada.</p></div><button id="tenorRecordings" class="review-recordings-button" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/></svg>Revisar grabaciones</button></section>`:''}`;
  }
  async function loadTenorProfile(personId){
    let d=await api(`/api/admin/tenors/${personId}?season=${seasonId}`);
    profileSeasons=d.seasons||seasons;
    if(profileSeasons.length&&!profileSeasons.some(s=>s.id===seasonId)){
      seasonId=profileSeasons[0].id;songs=[];await loadSongs();
      d=await api(`/api/admin/tenors/${personId}?season=${seasonId}`);
    }
    renderSeasonPicker();return d;
  }
  async function renderTenor(){
    const d=await loadTenorProfile(selectedTenor);content().innerHTML=progressMarkup(d,true);
    $('platformTitle').textContent=d.user.display_name;
    $('tenorRecordings').onclick=()=>{recordingOwner=d.user.id;recordingOwnerName=d.user.display_name;recordingFilter=null;personalRecordings=false;openPanel('tenor-recordings');};
  }
  async function renderMyProgress(){const d=await api(`/api/my-progress?season=${seasonId}`);content().innerHTML=progressMarkup(d);$('platformTitle').textContent='Mi progreso';}
  function calendarGrid(year,month,selected='',events=[]){
    const start=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=(start.getDay()+6)%7;
    const label=start.toLocaleDateString('es-SV',{month:'long',year:'numeric'});
    return `<div class="brand-calendar-heading"><button type="button" data-month-shift="-1" aria-label="Mes anterior">‹</button><strong>${esc(label)}</strong><button type="button" data-month-shift="1" aria-label="Mes siguiente">›</button></div><div class="brand-calendar-grid">${['L','M','M','J','V','S','D'].map(day=>`<span class="brand-weekday">${day}</span>`).join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:days},(_,i)=>{const day=`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,event=events.some(e=>e.presentation_date===day);return `<button type="button" class="${day===selected?'is-selected':''} ${event?'has-event':''}" data-calendar-date="${day}" aria-label="${day}${event?' · Presentación':''}" aria-pressed="${day===selected}">${i+1}${event?'<i aria-hidden="true"></i>':''}</button>`;}).join('')}</div>`;
  }
  function bindBrandedFields(root){
    root.querySelectorAll('input[data-branded]').forEach(input=>{
      const date=input.dataset.branded==='date',wrapper=document.createElement('div');wrapper.className='branded-field';input.replaceWith(wrapper);wrapper.append(input);
      const toggle=document.createElement('button');toggle.type='button';toggle.className='branded-picker-toggle';toggle.setAttribute('aria-label',date?'Elegir fecha en calendario':'Elegir hora');toggle.setAttribute('aria-expanded','false');toggle.innerHTML=date?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';wrapper.append(toggle);
      const picker=document.createElement('div');picker.className='branded-picker';picker.hidden=true;wrapper.append(picker);
      let year=Number((input.value||`${selectedSeason().year}-01-01`).slice(0,4)),month=Number((input.value||`${selectedSeason().year}-01-01`).slice(5,7))-1;
      const changed=()=>{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
      const draw=()=>{
        if(date){picker.innerHTML=calendarGrid(year,month,input.value);picker.querySelectorAll('[data-calendar-date]').forEach(b=>{b.disabled=(input.getAttribute('min')&&b.dataset.calendarDate<input.getAttribute('min'))||(input.getAttribute('max')&&b.dataset.calendarDate>input.getAttribute('max'));});}
        else{const [h='08',m='00']=input.value.split(':');picker.innerHTML=`<p class="brand-clock-title">Hora · formato de 24 horas</p><div class="brand-clock-hours">${Array.from({length:24},(_,i)=>`<button type="button" data-clock-hour="${String(i).padStart(2,'0')}" class="${Number(h)===i?'is-selected':''}">${String(i).padStart(2,'0')}</button>`).join('')}</div><p class="brand-clock-title">Minutos</p><div class="brand-clock-minutes">${Array.from({length:12},(_,i)=>`<button type="button" data-clock-minute="${String(i*5).padStart(2,'0')}" class="${Number(m)===i*5?'is-selected':''}">${String(i*5).padStart(2,'0')}</button>`).join('')}</div><button type="button" class="brand-picker-done" data-picker-done>Listo</button>`;}
      };
      toggle.onclick=()=>{picker.hidden=!picker.hidden;toggle.setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden){if(date&&/^\d{4}-\d{2}-\d{2}$/.test(input.value)){year=Number(input.value.slice(0,4));month=Number(input.value.slice(5,7))-1;}draw();}};
      picker.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.monthShift){const next=new Date(year,month+Number(b.dataset.monthShift),1);year=next.getFullYear();month=next.getMonth();draw();}if(b.dataset.calendarDate){input.value=b.dataset.calendarDate;changed();picker.hidden=true;toggle.setAttribute('aria-expanded','false');}if(b.dataset.clockHour){input.value=`${b.dataset.clockHour}:${/^\d{2}:\d{2}$/.test(input.value)?input.value.slice(3):'00'}`;changed();draw();}if(b.dataset.clockMinute){input.value=`${/^\d{2}:\d{2}$/.test(input.value)?input.value.slice(0,2):'08'}:${b.dataset.clockMinute}`;changed();draw();}if(b.hasAttribute('data-picker-done')){picker.hidden=true;toggle.setAttribute('aria-expanded','false');}};
      wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();picker.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
    });
  }
  async function renderPresentations(){
    const events=await api(`/api/public/presentations?season=${seasonId}`),year=selectedSeason().year;let month=year===new Date().getFullYear()?new Date().getMonth():0,day='';
    content().innerHTML=`<div class="presentations-heading"><div><h3>Calendario de presentaciones</h3><p class="platform-note">Temporada ${year}</p></div><button id="newPresentation" class="btn" type="button">Registrar presentación</button></div><div class="presentations-workspace"><div id="livePresentationCalendar" class="brand-calendar"></div><div><h3 id="presentationDateTitle">Presentaciones</h3><div id="livePresentationList"></div></div></div><section id="presentationEditor" hidden><h3 id="presentationFormTitle">Nueva presentación</h3><form id="presentationForm" class="platform-form"><input type="hidden" name="id"><label>Título<input name="title" required maxlength="150"></label><label>Fecha<input name="presentation_date" type="text" data-branded="date" placeholder="AAAA-MM-DD" required min="${year}-01-01" max="${year}-12-31"></label><div class="presentation-times"><label>Hora de presentación<input name="starts_at" type="text" data-branded="time" placeholder="HH:MM" required></label><label>Hora de salida<input name="call_at" type="text" data-branded="time" placeholder="HH:MM" required></label></div><label>Lugar<input name="venue" required maxlength="150"></label><label>Ciudad<input name="city" maxlength="100"></label><label>Indicaciones<textarea name="notes" maxlength="2000"></textarea></label><div class="platform-actions"><button class="btn" type="submit">Guardar presentación</button><button id="cancelPresentation" class="chip" type="button">Cancelar</button></div></form></section>`;
    const draw=()=>{$('livePresentationCalendar').innerHTML=calendarGrid(year,month,day,events);const list=events.filter(e=>day?e.presentation_date===day:Number(e.presentation_date.slice(5,7))-1===month);$('presentationDateTitle').textContent=day?`Presentaciones · ${day}`:'Presentaciones del mes';$('livePresentationList').innerHTML=list.map(e=>`<article class="platform-row"><div><strong>${esc(e.title)}</strong><p>${e.presentation_date} · ${e.starts_at} · ${esc(e.venue)}</p><p>Salida ${e.call_at}${e.city?` · ${esc(e.city)}`:''}</p><p>${esc(e.notes)}</p></div><button class="chip" type="button" data-edit-presentation="${e.id}">Editar</button></article>`).join('')||'<p class="platform-note">No hay presentaciones en estas fechas.</p>';};
    const form=$('presentationForm');bindBrandedFields(form);
    const edit=event=>{$('presentationEditor').hidden=false;form.reset();for(const key of ['id','title','presentation_date','starts_at','call_at','venue','city','notes'])form.elements[key].value=event?.[key]||'';if(!event){form.elements.id.value=crypto.randomUUID();form.elements.presentation_date.value=day||`${year}-${String(month+1).padStart(2,'0')}-01`;}$('presentationFormTitle').textContent=event?'Editar presentación':'Nueva presentación';form.elements.title.focus();$('presentationEditor').scrollIntoView({block:'start',behavior:'smooth'});};
    $('newPresentation').onclick=()=>edit();$('cancelPresentation').onclick=()=>{$('presentationEditor').hidden=true;};
    $('livePresentationCalendar').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.monthShift){month=(month+Number(b.dataset.monthShift)+12)%12;day='';}if(b.dataset.calendarDate)day=day===b.dataset.calendarDate?'':b.dataset.calendarDate;draw();};
    $('livePresentationList').onclick=e=>{const b=e.target.closest('[data-edit-presentation]');if(b)edit(events.find(event=>event.id===b.dataset.editPresentation));};
    form.onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api('/api/admin/presentations',{method:'POST',body:{...formData(form),season_id:seasonId}});await syncPresentations();await renderPresentations();status($('panelStatus'),'Presentación guardada y disponible para el equipo.');});};draw();
  }
  async function syncPresentations(){
    if(!seasons.length||typeof window.updateTenoresPresentations!=='function')return;
    const current=seasons.find(s=>s.year===2026);if(current)window.updateTenoresPresentations(2026,await api(`/api/public/presentations?season=${current.id}`));
  }
  function startLiveRefresh(){
    if(liveRefresh)clearInterval(liveRefresh);
    liveRefresh=setInterval(async()=>{if(!me||document.hidden)return;try{await syncPresentations();if(me.role==='admin'){await refreshActiveRehearsal();if(['home','summary'].includes(view)){const stats=await api(`/api/public/stats?year=${selectedSeason().year}`);await updateTeamTable(stats);}if(view==='tenor')await renderTenor();}else if(view==='progress'&&panel().open)await renderMyProgress();await refreshStats();}catch{/* Un fallo temporal no borra la vista ni los formularios. */}},10000);
  }
  async function renderUsers(){
    const [users,members]=await Promise.all([api('/api/admin/users'),api(`/api/admin/memberships?season=${seasonId}`)]);
    content().innerHTML=`<p class="platform-note">Las personas importadas no tienen acceso hasta establecer usuario y contraseña. Desactivar conserva toda su asistencia.</p><div class="platform-columns"><div><h3>Integrantes</h3><div id="usersList">${users.map(u=>`<div class="platform-row"><div><strong>${esc(u.display_name)}</strong><p>${esc(u.username||'Sin credenciales')} · ${u.active?'Activo':'Desactivado'}${u.role==='admin'?' · Jefatura':''}</p></div><button class="chip" type="button" data-edit-user="${u.id}">Editar</button>${u.role==='tenor'?`<label class="platform-check"><input type="checkbox" data-member="${u.id}" ${members.find(m=>m.id===u.id)?.active?'checked':''}> Inscrito en ${selectedSeason().year}</label>`:''}</div>`).join('')}</div></div><div><h3 id="userFormTitle">Crear usuario</h3><form id="userForm" class="platform-form"><input type="hidden" name="id"><label>Nombre<input name="display_name" required maxlength="80"></label><label>Usuario<input name="username" required minlength="3" autocomplete="off" maxlength="50"></label><label>Contraseña nueva<input type="password" name="password" minlength="8" maxlength="128" autocomplete="new-password"><small>Obligatoria al crear o activar por primera vez. Vacía conserva la contraseña.</small></label><label class="platform-check"><input type="checkbox" name="active" checked> Acceso activo</label><button class="btn" type="submit">Guardar usuario</button><button id="resetUserForm" class="chip" type="button">Nuevo usuario</button></form></div></div>`;
    $('usersList').onclick=e=>{const btn=e.target.closest('[data-edit-user]');if(!btn)return;const u=users.find(x=>x.id===btn.dataset.editUser),f=$('userForm');for(const k of ['id','display_name','username'])f.elements[k].value=u[k]||'';f.elements.password.value='';f.elements.password.minLength=u.role==='admin'?12:8;f.elements.active.checked=!!u.active;$('userFormTitle').textContent=`Editar ${u.display_name}`;f.elements.display_name.focus();};
    $('resetUserForm').onclick=()=>{$('userForm').reset();$('userForm').elements.id.value='';$('userForm').elements.password.minLength=8;$('userFormTitle').textContent='Crear usuario';};
    $('usersList').onchange=async e=>{if(!e.target.dataset.member)return;const checked=e.target.checked;e.target.disabled=true;try{await api('/api/admin/memberships',{method:'POST',body:{season_id:seasonId,user_id:e.target.dataset.member,active:checked}});status($('panelStatus'),'Inscripción guardada.');await refreshStats();}catch(err){e.target.checked=!checked;status($('panelStatus'),err.message,true);}finally{e.target.disabled=false;}};
    $('userForm').onsubmit=e=>{e.preventDefault();const b=formData(e.target);b.active=e.target.elements.active.checked;if(!b.id)delete b.id;action(e.submitter,async()=>{await api('/api/admin/users',{method:'POST',body:b});status($('panelStatus'),'Usuario guardado. Inscríbelo en la temporada con la casilla correspondiente.');await renderUsers();});};
  }
  async function renderRehearsal(existing=null,resume=false){
    document.body.classList.add('is-rehearsal');
    const members=existing?existing.attendance:((await api(`/api/admin/memberships?season=${seasonId}`)).filter(m=>m.active&&m.account_active).map(m=>({user_id:m.id,display_name:m.display_name,attendance_status:'pending'})));
    const rehearsalId=existing?.id||crypto.randomUUID();let requestId=crypto.randomUUID(),saveBody=null,saving=false,step=0;
    const dateAt=offset=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/El_Salvador',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000));
    const stepLabels=['Fecha','Horario','Tenores','Revisar'];
    content().innerHTML=`<div class="rehearsal-wizard"><div class="wizard-top"><button id="cancelRehearsal" class="wizard-back" type="button">← Volver al dashboard</button></div><ol class="wizard-steps" aria-label="Pasos del registro">${stepLabels.map((name,i)=>`<li><span class="wizard-step-dot" aria-hidden="true">${i+1}</span><span>${name}</span></li>`).join('')}</ol><form id="rehearsalForm" novalidate><section class="wizard-stage" data-step="0"><p class="wizard-eyebrow">Paso 1 de 4</p><h2 tabindex="-1">¿Qué día fue el ensayo?</h2><p class="wizard-description">Elige la fecha para empezar.</p><label class="wizard-field" for="rehearsalDate">Fecha del ensayo</label><input id="rehearsalDate" name="rehearsal_date" class="wizard-date" type="text" data-branded="date" placeholder="AAAA-MM-DD" required min="${selectedSeason().starts_on||`${selectedSeason().year}-01-01`}" max="${selectedSeason().ends_on||`${selectedSeason().year}-12-31`}" value="${existing?.rehearsal_date||dateAt(0)}"><div class="wizard-shortcuts"><button type="button" data-date-offset="0">Hoy</button><button type="button" data-date-offset="-1">Ayer</button></div></section><section class="wizard-stage" data-step="1" hidden><p class="wizard-eyebrow">Paso 2 de 4</p><h2 tabindex="-1">¿A qué hora ensayaron?</h2><p class="wizard-description">Inicio y cierre del ensayo, en el mismo día.</p><div class="wizard-times"><label>Hora de inicio<input name="starts_at" type="text" data-branded="time" placeholder="HH:MM" required value="${existing?.starts_at||''}"></label><span class="wizard-time-arrow" aria-hidden="true">→</span><label>Hora de cierre<input name="ends_at" type="text" data-branded="time" placeholder="HH:MM" required value="${existing?.ends_at||''}"></label></div><p id="durationLabel" class="wizard-duration" aria-live="polite"></p></section><section id="attendanceStage" class="wizard-stage" data-step="2" hidden><p class="wizard-eyebrow">Paso 3 de 4</p><h2 tabindex="-1">¿Quiénes participaron?</h2><p class="wizard-description">Marca a quienes llegaron a tiempo. Usa <span class="inline-options" aria-label="botón de tres puntos">⋯</span> para registrar <strong>llegadas tardías o ausencias</strong>. Quienes aún no llegan pueden quedar pendientes.</p><div class="wizard-attendance-tools"><span id="attendanceProgress" role="status" aria-live="polite"></span><button id="allOnTime" class="wizard-text-button" type="button" ${members.length?'':'disabled'}>Todos a tiempo</button></div><div class="attendance-list wizard-attendance">${members.map((m,i)=>`<article class="attendance-item" data-user="${m.user_id}"><div class="attendance-check-row"><label class="attendance-check"><input class="attendance-on-time" type="checkbox" name="on-time-${i}" data-on-time="${i}" aria-label="${esc(m.display_name)} llegó a tiempo" ${m.attendance_status==='on_time'?'checked':''}><strong>${esc(m.display_name)}</strong><small class="effective-time"></small></label><details class="attendance-exceptions"><summary aria-label="Otras opciones para ${esc(m.display_name)}">⋯</summary><div class="attendance-exception-options">${[['late','Tarde'],['absent','No asistió'],['pending','Sin marcar']].map(([key,name])=>`<button type="button" data-attendance-index="${i}" data-attendance-status="${key}">${name}</button>`).join('')}</div></details></div><input type="hidden" name="state-${i}" value="${m.attendance_status||'pending'}"><div class="attendance-late wizard-late" ${m.attendance_status==='late'?'':'hidden'}><h3>¿Qué tipo de llegada tardía fue esta?</h3><fieldset class="wizard-choices"><legend class="sr-only">Tipo de tardanza de ${esc(m.display_name)}</legend>${[['justified','Justificada'],['unjustified','Injustificada']].map(([key,name])=>`<label><input type="radio" name="reason-${i}" value="${key}" ${m.late_reason===key?'checked':''}><span>${name}</span></label>`).join('')}</fieldset><label class="wizard-arrival arrival-field" ${m.late_reason?'':'hidden'}>Hora de llegada<input type="text" data-branded="time" placeholder="HH:MM" name="arrival-${i}" value="${m.arrival_at||''}"></label></div><input type="hidden" name="departure-${i}" value="${m.departure_at||''}"></article>`).join('')}</div>${!members.length?'<p class="wizard-feedback is-error">No hay tenores activos e inscritos. Activa e inscribe a tu equipo en Integrantes.</p>':''}</section><section class="wizard-stage" data-step="3" hidden><p class="wizard-eyebrow">Paso 4 de 4</p><h2 tabindex="-1">Todo listo para registrar.</h2><p class="wizard-description">Revisa los datos. Puedes mantener el ensayo activo y completar las llegadas después. Al finalizarlo se actualizará la asistencia.</p><div id="rehearsalSummary" class="wizard-summary"></div></section><p id="wizardFeedback" class="wizard-feedback" role="status" aria-live="polite"></p><div class="wizard-footer"><button id="wizardPrevious" class="wizard-back" type="button" hidden>← Anterior</button><button id="wizardNext" class="btn wizard-primary" type="button">Continuar <span aria-hidden="true">→</span></button><button id="wizardLive" class="btn wizard-live" type="submit" value="active" hidden>Guardar ensayo activo</button><button id="wizardSubmit" class="btn wizard-primary" type="submit" value="final" hidden ${members.length?'':'disabled'}>${existing?.status==='final'?'Guardar cambios':'Finalizar ensayo'}</button></div><button id="wizardDraft" class="wizard-text-button wizard-draft" type="submit" value="draft" hidden ${members.length?'':'disabled'}>Guardar borrador y continuar después</button></form>${existing?.audit?.length?`<details class="wizard-audit"><summary>Historial de cambios</summary>${existing.audit.map(a=>`<p class="platform-note">${esc(a.display_name)} · ${esc(displayTime(a.changed_at))} · ${a.action==='rehearsal_created'?'Creó registro':'Modificó registro'}</p>`).join('')}</details>`:''}</div>`;
    const f=$('rehearsalForm'),stages=[...f.querySelectorAll('.wizard-stage')],dots=[...content().querySelectorAll('.wizard-steps li')];
    const feedback=(message,error=true)=>{status($('wizardFeedback'),message,error);};
    const minute=value=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Completa las horas de inicio y cierre.');const [h,m]=value.split(':').map(Number);return h*60+m;};
    const hours=n=>`${Math.floor(n/60)?`${Math.floor(n/60)} h `:''}${n%60?`${n%60} min`:''}`.trim()||'0 min';
    function validateDate(){const field=f.elements.rehearsal_date,value=field.value;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value<field.getAttribute('min')||value>field.getAttribute('max'))throw new Error(`Elige una fecha dentro de la temporada ${selectedSeason().year}.`);}
    function schedule(){validateDate();const start=minute(f.elements.starts_at.value),end=minute(f.elements.ends_at.value);if(end<=start)throw new Error('La hora de cierre debe ser posterior al inicio, en el mismo día.');return {start,end};}
    function collect(final=false){
      const {start,end}=schedule();
      const attendanceRows=members.map((m,i)=>{
        const state=f.elements[`state-${i}`].value||'pending';let arrival=null,reason=null,minutes=state==='pending'?null:state==='absent'?0:end-start;
        if(state==='late'){
          reason=f.querySelector(`[name="reason-${i}"]:checked`)?.value;if(!reason)throw new Error(`Selecciona el tipo de tardanza de ${m.display_name}.`);
          arrival=f.elements[`arrival-${i}`].value;let when;try{when=minute(arrival);}catch{throw new Error(`Añade la hora de llegada de ${m.display_name}.`);}if(when<=start||when>=end)throw new Error(`La llegada de ${m.display_name} debe estar entre el inicio y el cierre.`);minutes=end-when;
        }
        if(final&&state==='pending')throw new Error(`Falta marcar a ${m.display_name}.`);
        const departure=f.elements[`departure-${i}`].value||null;
        if(departure&&minutes!==null&&state!=='absent'){const left=minute(departure);if(left<=Math.max(start,arrival?minute(arrival):start)||left>end)throw new Error(`Revisa la hora de salida de ${m.display_name}.`);minutes=left-Math.max(start,arrival?minute(arrival):start);}
        return {user_id:m.user_id,attendance_status:state,late_reason:reason||null,arrival_at:arrival,departure_at:departure,effective_minutes:minutes};
      });
      return {id:rehearsalId,season_id:seasonId,version:existing?.version||0,request_id:requestId,rehearsal_date:f.elements.rehearsal_date.value,starts_at:f.elements.starts_at.value,ends_at:f.elements.ends_at.value,attendance:attendanceRows};
    }
    function refreshAttendance(){
      let marked=0;f.querySelectorAll('.attendance-item').forEach((item,i)=>{const state=f.elements[`state-${i}`].value,reason=item.querySelector('[name^="reason-"]:checked')?.value;if(state!=='pending')marked++;item.classList.toggle('is-marked',state!=='pending');f.elements[`on-time-${i}`].checked=state==='on_time';item.querySelector('.attendance-late').hidden=state!=='late';item.querySelector('.arrival-field').hidden=state!=='late'||!reason;item.querySelector('.effective-time').textContent=['late','absent'].includes(state)?labels[state]:'';});
      $('attendanceProgress').textContent=`${marked} de ${members.length} tenores marcados`;
    }
    function review(){
      const b=collect(false),count=state=>b.attendance.filter(a=>a.attendance_status===state).length;
      const day=new Date(`${b.rehearsal_date}T12:00:00-06:00`).toLocaleDateString('es-SV',{timeZone:'America/El_Salvador',weekday:'long',day:'numeric',month:'long',year:'numeric'});
      $('rehearsalSummary').innerHTML=`<div class="wizard-review-date"><strong>${esc(day)}</strong><span>${b.starts_at} — ${b.ends_at} · ${hours(minute(b.ends_at)-minute(b.starts_at))}</span></div><p class="wizard-review-count">${count('on_time')+count('late')} participaron · ${count('late')} llegaron tarde · ${count('absent')} no asistieron · ${count('pending')} pendientes</p><ul class="wizard-review-list">${b.attendance.map((a,i)=>`<li><div><strong>${esc(members[i].display_name)}</strong><span>${labels[a.attendance_status]}${a.attendance_status==='late'?` · ${a.arrival_at} · ${a.late_reason==='justified'?'Justificada':'Injustificada'}`:''}${a.departure_at?` · Salida ${a.departure_at}`:''}</span></div><strong>${a.effective_minutes===null?'Por llegar':hours(a.effective_minutes)}</strong></li>`).join('')}</ul>`;
    }
    function showStep(next){
      step=next;stages.forEach((stage,i)=>stage.hidden=i!==step);dots.forEach((dot,i)=>{dot.classList.toggle('is-current',i===step);dot.classList.toggle('is-complete',i<step);if(i===step)dot.setAttribute('aria-current','step');else dot.removeAttribute('aria-current');});
      $('wizardLive').hidden=step<2||existing?.status==='final';$('wizardLive').textContent=existing?.is_live?'Guardar llegadas':'Guardar ensayo activo';$('wizardPrevious').hidden=step===0;$('wizardNext').hidden=step===3;$('wizardSubmit').hidden=step!==3||members.some((m,i)=>f.elements[`state-${i}`].value==='pending');$('wizardDraft').hidden=step<2;$('wizardNext').disabled=step===2&&!members.length;feedback('',false);stages[step].querySelector('h2').focus({preventScroll:true});content().querySelector('.rehearsal-wizard').scrollIntoView({block:'start',behavior:'instant'});
    }
    function changed(){requestId=crypto.randomUUID();saveBody=null;feedback('',false);const a=f.elements.starts_at.value,b=f.elements.ends_at.value;if(a&&b){try{const n=minute(b)-minute(a);$('durationLabel').textContent=n>0?`${hours(n)} de ensayo`:'El cierre debe ser posterior al inicio.';}catch{$('durationLabel').textContent='';}}else $('durationLabel').textContent='';refreshAttendance();}
    function formChanged(e){if(e.target.matches('input[data-on-time]'))f.elements[`state-${e.target.dataset.onTime}`].value=e.target.checked?'on_time':'pending';changed();}f.oninput=formChanged;f.onchange=formChanged;
    f.onclick=e=>{const date=e.target.closest('[data-date-offset]');if(date){f.elements.rehearsal_date.value=dateAt(Number(date.dataset.dateOffset));changed();}const option=e.target.closest('[data-attendance-status]');if(option){f.elements[`state-${option.dataset.attendanceIndex}`].value=option.dataset.attendanceStatus;option.closest('details').open=false;changed();}};
    $('allOnTime').onclick=()=>{members.forEach((m,i)=>{f.elements[`state-${i}`].value='on_time';});changed();};
    $('wizardNext').onclick=()=>{try{if(step===0)validateDate();if(step===1)schedule();if(step===2)review();showStep(step+1);}catch(e){feedback(e.message);}};
    $('wizardPrevious').onclick=()=>showStep(step-1);
    $('cancelRehearsal').onclick=()=>openPanel('home');
    f.onsubmit=async e=>{
      e.preventDefault();if(saving)return;const mode=e.submitter?.value;if(!['draft','final','active'].includes(mode))return $('wizardNext').click();
      try{
        if(mode==='final'&&step!==3){feedback('Completa los pasos y revisa el ensayo antes de registrar.');return;}
        const b=collect(mode==='final');b.status=mode==='active'?'draft':mode;b.is_live=mode==='active';if(saveBody&&saveBody.status===b.status&&saveBody.is_live===b.is_live)b.request_id=saveBody.request_id;saveBody=b;
        const controls=[...f.elements].map(element=>[element,element.disabled]);let registered=false;saving=true;controls.forEach(([element])=>element.disabled=true);feedback('Registrando ensayo…',false);
        try{await api('/api/admin/rehearsals',{method:'POST',body:b});registered=true;await refreshStats();await refreshActiveRehearsal();view=mode==='active'?'home':'history';nav();if(mode==='active')await renderHome();else await renderHistory();status($('panelStatus'),mode==='active'?'Ensayo activo. Abre el botón verde para actualizar las llegadas.':mode==='draft'?'Borrador guardado. Puedes continuarlo desde Ensayos.':'Ensayo registrado. Las estadísticas del equipo están actualizadas.');}
        catch(error){if(registered)status($('panelStatus'),'El ensayo se guardó. No se pudo cargar el historial; vuelve a abrir Ensayos.',true);else{feedback(`${error.message} Tus datos se conservan; puedes reintentar.`);controls.forEach(([element,disabled])=>element.disabled=disabled);}}
        finally{saving=false;}
      }catch(error){feedback(error.message);}
    };
    bindBrandedFields(f);changed();showStep(resume?2:0);
  }
  async function renderHistory(){
    document.body.classList.remove('is-rehearsal');
    let offset=0;content().innerHTML='<h3>Historial de ensayos</h3><div id="historyList"></div><button id="moreHistory" class="chip" type="button">Cargar más</button>';
    async function more(){const result=await api(`/api/admin/rehearsals?season=${seasonId}&offset=${offset}`);$('historyList').insertAdjacentHTML('beforeend',result.map(r=>`<article class="platform-row"><div><strong>${r.rehearsal_date}</strong><p>${r.starts_at} – ${r.ends_at} · ${r.duration_minutes} min · ${r.is_live?'Ensayo activo':labels[r.status]}</p></div><button class="chip" data-rehearsal="${r.id}" type="button">${r.is_live?'Actualizar llegadas':r.status==='draft'?'Continuar borrador':'Ver / corregir'}</button></article>`).join(''));if(!result.length&&offset===0)$('historyList').textContent='No hay ensayos registrados. El archivo agregado de 2025 sigue en Datos 2025.';offset+=result.length;$('moreHistory').hidden=result.length<30;}
    $('moreHistory').onclick=e=>action(e.target,more);$('historyList').onclick=async e=>{const b=e.target.closest('[data-rehearsal]');if(!b)return;try{const r=await api(`/api/admin/rehearsals/${b.dataset.rehearsal}`);view='rehearsal';nav();await renderRehearsal(r,!!r.is_live);status($('panelStatus'),'Corrige el registro vigente. Las horas se recalculan sin duplicarse.');}catch(err){status($('panelStatus'),err.message,true);}};await more();
  }
  async function renderRecordingTenors(){
    const stats=await api(`/api/public/stats?year=${selectedSeason().year}`);
    content().innerHTML=`<p class="recordings-intro">Elige un tenor para revisar sus prácticas.</p><div class="recording-tenors">${stats.members.map(m=>`<button class="recording-tenor" type="button" data-recording-tenor="${m.id}" data-name="${esc(m.name)}"><span>${esc(m.name)}</span><span class="recording-tenor-action">Revisar grabaciones</span></button>`).join('')||'<p class="platform-note">No hay tenores inscritos en esta temporada.</p>'}</div>`;
  }
  async function renderRecordings(){
    if(me.role==='admin'&&view==='recordings')return renderRecordingTenors();
    if(me.role==='admin'){
      const d=await loadTenorProfile(recordingOwner);recordingOwnerName=d.user.display_name;
      $('platformTitle').textContent=`Grabaciones de ${recordingOwnerName}`;
    }
    const own=personalRecordings||me.role!=='admin',song=recordingFilter?songs.find(s=>s.id===recordingFilter):null;
    let offset=0;content().innerHTML=`${own?'':'<button class="wizard-back" type="button" data-view="recordings">← Volver a los tenores</button>'}<p class="recordings-intro">${own?'Tus prácticas, canción por canción.':`Prácticas de ${esc(recordingOwnerName)} · Temporada ${selectedSeason().year}`}</p><div id="recordingsList" class="recordings-library"></div><button id="moreRecordings" class="chip recordings-more" type="button" hidden>Ver más prácticas</button>`;
    async function more(){const d=await api(`/api/recordings?season=${seasonId}&offset=${offset}${own?`&user=${me.id}`:recordingOwner?`&user=${recordingOwner}`:''}${recordingFilter?`&song=${recordingFilter}`:''}`);if(!d.items.length&&offset===0)$('recordingsList').innerHTML=`<div class="recordings-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/></svg><h3>${own?(song?esc(song.title):'Tu práctica empieza aquí'):`${esc(recordingOwnerName)} aún no ha subido ninguna práctica.`}</h3><p>${own?'Cuando envíes una práctica, podrás volver a escucharla aquí.':'Las prácticas enviadas aparecerán aquí, organizadas por canción.'}</p></div>`;
      for(const r of d.items){let group=$('recordingsList').querySelector(`[data-song-group="${r.song_id}"]`);if(!group){group=document.createElement('section');group.className='recording-group';group.dataset.songGroup=r.song_id;group.innerHTML=`<h3>${esc(r.title)}</h3>`;$('recordingsList').append(group);}const item=document.createElement('article');item.className='audio-history';const date=new Date(r.uploaded_at),day=date.toLocaleDateString('es-SV',{timeZone:'America/El_Salvador',day:'numeric',month:'short',year:'numeric'}),time=date.toLocaleTimeString('es-SV',{timeZone:'America/El_Salvador',hour:'2-digit',minute:'2-digit'});item.innerHTML=`<div class="recording-meta">${!own?`<strong>${esc(r.display_name)}</strong>`:''}<time datetime="${esc(date.toISOString())}">${esc(day)} <span>· ${esc(time)}</span></time></div>${practicePlayerMarkup(`/api/recordings/${r.id}/audio`)}<p class="record-playback-error" role="status" aria-live="polite"></p>`;group.append(item);bindPracticePlayer(item,{seconds:()=>r.duration_seconds,error:message=>{item.querySelector('.record-playback-error').textContent=message;}});}
      offset=d.next_offset;$('moreRecordings').hidden=offset===null;
    }
    $('moreRecordings').onclick=e=>action(e.target,more);await more();
  }
  async function renderSongs(){
    const all=me.role==='admin'?await api(`/api/admin/songs?season=${seasonId}`):songs;
    content().innerHTML=`<h3>Repertorio de ${selectedSeason().year}</h3><div id="songsList">${all.map(s=>`<article class="platform-row"><div><strong>${esc(s.title)}</strong>${me.role==='admin'?`<p>${s.active?'Activa':'Oculta'}</p>`:''}<audio controls preload="none" data-reference="${s.id}" src="${esc(s.reference_audio_key)}"></audio></div><div class="platform-actions"><button class="chip" type="button" data-practice-song="${s.id}">Practicar</button>${me.role==='admin'?`<button class="chip" type="button" data-edit-song="${s.id}">Editar</button>`:''}</div></article>`).join('')}</div><div id="privatePractice"></div>${me.role==='admin'?'<h3 id="songFormTitle">Añadir canción</h3><form id="songForm" class="platform-form"><input type="hidden" name="id"><label>Título<input name="title" required maxlength="150"></label><label>Referencia de la voz de tenores (URL HTTPS)<input name="reference_audio_key" type="url" required maxlength="1000"></label><label>Letra<textarea name="lyrics" maxlength="16000"></textarea></label><label class="platform-check"><input type="checkbox" name="active" checked> Activa</label><button class="btn" type="submit">Guardar canción</button><button id="newSong" class="chip" type="button">Nueva canción</button></form>':''}`;
    $('songsList').onclick=e=>{const edit=e.target.closest('[data-edit-song]'),practice=e.target.closest('[data-practice-song]');if(edit){const s=all.find(s=>s.id===edit.dataset.editSong),f=$('songForm');for(const key of ['id','title','reference_audio_key','lyrics'])f.elements[key].value=s[key]||'';f.elements.active.checked=!!s.active;$('songFormTitle').textContent=`Editar ${s.title}`;f.elements.title.focus();}if(practice){const s=all.find(s=>s.id===practice.dataset.practiceSong);buildRecorder($('privatePractice'),s);$('privatePractice').scrollIntoView({block:'nearest'});}};
    content().querySelectorAll('audio[data-reference]').forEach(a=>a.addEventListener('play',()=>sendEvent('reference_start',a.dataset.reference)));
    if(me.role==='admin'){
      $('newSong').onclick=()=>{$('songForm').reset();$('songForm').elements.id.value='';$('songFormTitle').textContent='Añadir canción';};
      $('songForm').onsubmit=e=>{e.preventDefault();const b=formData(e.target);b.season_id=seasonId;b.active=e.target.elements.active.checked;if(!b.id)delete b.id;action(e.submitter,async()=>{await api('/api/admin/songs',{method:'POST',body:b});await loadSongs();await renderSongs();status($('panelStatus'),'Repertorio guardado.');});};
    }
  }
  async function renderActivity(){
    const d=await api('/api/admin/activity');
    content().innerHTML=`<h3>Actividad web · Últimos ${d.period_days} días</h3><p class="platform-note">Un inicio de reproducción no demuestra que se escuchó la canción completa. Un día activo o un acceso no mide tiempo de práctica. Las reproducciones se deduplican por persona, canción y día.</p><div class="platform-table-wrap"><table class="platform-table"><thead><tr><th>Tenor</th><th>Último acceso</th><th>Accesos</th><th>Días activos</th><th>Grabaciones enviadas</th><th>Días con envíos por canción</th><th>Días de reproducción por canción</th></tr></thead><tbody>${d.users.map(u=>`<tr><td>${esc(u.display_name)}</td><td>${u.last_login_at?esc(new Date(u.last_login_at).toLocaleString('es-SV',{timeZone:'America/El_Salvador'})):'Sin acceso'}</td><td>${u.logins}</td><td>${u.active_days}</td><td>${u.recordings_sent}</td><td>${u.song_submission_days}</td><td>${u.reference_song_days}</td></tr>`).join('')}</tbody></table></div><h3>Actividad por canción</h3>${d.songs.map(s=>`<p class="platform-note">${esc(s.display_name)} · ${esc(s.title)} · ${s.event_type==='reference_start'?'Reproducción iniciada':'Envío de grabación'} · ${s.days} días</p>`).join('')}`;
  }
  async function renderSeasons(){
    const storage=await api(`/api/admin/seasons/${seasonId}/storage`),s=selectedSeason();
    content().innerHTML=`<h3>Administración de temporadas</h3><div class="platform-columns"><form id="seasonForm" class="platform-form"><label>Año<input name="year" type="number" min="2000" max="2200" required></label><label>Fecha de inicio<input name="starts_on" type="date" required></label><label>Fecha de cierre<input name="ends_on" type="date" required></label><button class="btn" type="submit">Crear temporada</button></form><div><h3>Audios de ${s.year}</h3><p>${storage.count} audios · ${(storage.bytes/1e6).toFixed(1)} MB${storage.pending?` · ${storage.pending} pendientes`:''}</p><p class="platform-note">Descarga los audios antes de eliminar. Las asistencias, horas y bitácoras se conservan. El borrado requiere confirmación y se procesa por lotes reanudables.</p><button id="exportRecordings" class="chip" type="button">Exportar audios</button><p id="exportProgress" class="platform-note"></p><div id="exportLinks"></div>${s.status==='active'?`<form id="closeSeasonForm" class="platform-form"><label>Confirmación de borrado<input name="confirmation" required autocomplete="off" placeholder="ELIMINAR AUDIOS ${s.year}"></label><button class="btn btn-ghost" type="submit">Cerrar temporada y eliminar audios</button></form>`:s.status==='closing'?'<button id="cleanupSeason" class="btn" type="button">Continuar eliminación</button>':'<p>Temporada cerrada.</p>'}</div></div>`;
    $('seasonForm').onsubmit=e=>{e.preventDefault();const b=formData(e.target);b.year=Number(b.year);action(e.submitter,async()=>{const created=await api('/api/admin/seasons',{method:'POST',body:b});seasonId=created.id;await loadSeasons();await loadSongs();await renderSeasons();status($('panelStatus'),'Temporada creada. Inscribe integrantes y añade repertorio.');});};
    $('exportRecordings').onclick=e=>action(e.target,async()=>{
      let offset=0;const manifest=[];$('exportLinks').replaceChildren();
      do{const d=await api(`/api/admin/seasons/${seasonId}/export?offset=${offset}`);for(const item of d.items){manifest.push(item);const a=document.createElement('a');a.href=item.audio_url;a.download=`${item.display_name} - ${item.title} - ${item.id}.${item.mime_type.includes('webm')?'webm':item.mime_type.includes('ogg')?'ogg':item.mime_type.includes('mp4')?'m4a':item.mime_type.includes('aac')?'aac':'mp3'}`;a.textContent=`Descargar ${item.display_name} · ${item.title}`;const p=document.createElement('p');p.append(a);$('exportLinks').append(p);}offset=d.next_offset;}while(offset!==null);
      const file=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'});const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=`audios-${s.year}-manifest.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('exportProgress').textContent=`Manifiesto exportado. Descarga y verifica los ${manifest.length} audios usando estos enlaces antes del borrado.`;status($('panelStatus'),'Exportación preparada. Cada descarga contiene el archivo de audio privado.');
    });
    if($('closeSeasonForm'))$('closeSeasonForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api(`/api/admin/seasons/${seasonId}/close`,{method:'POST',body:formData(e.target)});await loadSeasons();await renderSeasons();status($('panelStatus'),'Cierre confirmado. Pulsa Continuar eliminación para procesar lotes.');});};
    if($('cleanupSeason'))$('cleanupSeason').onclick=e=>action(e.target,async()=>{const d=await api(`/api/admin/seasons/${seasonId}/cleanup`,{method:'POST',body:{}});await loadSeasons();await renderSeasons();status($('panelStatus'),d.waiting?'Hay subidas recientes. Espera 15 minutos desde su reserva y continúa.':d.remaining?`Quedan ${d.remaining} audios. Puedes continuar ahora o más tarde.`:'Temporada cerrada. Audios eliminados; asistencia conservada.');});
  }
  async function renderPassword(){
    content().innerHTML='<h3>Cambiar contraseña</h3><form id="passwordForm" class="platform-form"><label>Contraseña actual<input name="current_password" type="password" autocomplete="current-password" required maxlength="128"></label><label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button type="submit" class="btn">Cambiar contraseña</button></form><p class="platform-note">Se cerrarán todas tus sesiones al cambiarla.</p>';
    $('passwordForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api('/api/password',{method:'POST',body:formData(e.target)});me=null;csrf=null;panel().close();updateAccount();showGate();status($('loginStatus'),'Contraseña actualizada. Inicia sesión de nuevo.');});};
  }
  function releaseMedia(){clearInterval(timer);timer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;}
  function discard(){const previous=recorder;if(previous){previous.onstop=null;previous.onerror=null;previous.ondataavailable=null;if(previous.state==='recording')previous.stop();}recorder=null;releaseMedia();if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;blob=null;recordingId=null;recordedSeconds=0;}
  function practicePlayerMarkup(src=''){
    return `<audio data-private class="record-preview" preload="none" ${src?`src="${esc(src)}"`:''} hidden></audio><div class="audio-player record-preview-player"><button class="audio-toggle preview-toggle" type="button" aria-label="Escuchar mi práctica" aria-pressed="false"></button><div class="audio-progress-group"><input class="preview-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posición de la práctica"><div class="audio-times"><span class="preview-current">00:00</span><span class="preview-duration">00:00</span></div></div></div>`;
  }
  function bindPracticePlayer(root,{seconds,error,canPlay=()=>true}){
    const find=selector=>root.querySelector(selector),audio=find('.record-preview'),play=find('.preview-toggle'),seek=find('.preview-seek'),player=find('.record-preview-player');
    const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(Math.floor(value%60)).padStart(2,'0')}`;
    const duration=()=>Math.max(Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:0,Number(seconds())||0);
    function update(){
      const total=duration(),current=Math.min(Math.max(audio.currentTime||0,0),total),playing=!audio.paused&&!audio.ended;
      play.innerHTML=playing?'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
      play.setAttribute('aria-label',playing?'Pausar práctica':'Escuchar práctica');play.setAttribute('aria-pressed',String(playing));play.classList.toggle('is-playing',playing);player.classList.toggle('is-active',playing);
      seek.max=String(total);seek.value=String(current);seek.disabled=total<=0;seek.style.setProperty('--preview-progress',`${total?current/total*100:0}%`);seek.setAttribute('aria-valuetext',`${clock(current)} de ${clock(total)}`);
      find('.preview-current').textContent=clock(current);find('.preview-duration').textContent=clock(total);
    }
    play.onclick=async()=>{if(!canPlay())return;if(!audio.paused){audio.pause();return;}try{document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});await audio.play();}catch(e){if(canPlay()&&e.name!=='AbortError')error('No se pudo reproducir la práctica. Inténtalo de nuevo.');}};
    seek.oninput=()=>{try{audio.currentTime=Math.min(Math.max(Number(seek.value)||0,0),duration());update();}catch{error('Espera a que el audio esté listo para avanzar.');}};
    for(const event of ['loadedmetadata','durationchange','timeupdate','play','pause','ended'])audio.addEventListener(event,update);
    audio.addEventListener('error',()=>{if(canPlay())error('No se pudo cargar la práctica. Comprueba tu conexión e inténtalo de nuevo.');});
    update();return update;
  }
  async function sendEvent(type,song){if(!me)return;try{await api('/api/events',{method:'POST',body:{event_type:type,song_id:song||null}});}catch{/* La analítica nunca bloquea el reproductor. */}}
  function buildRecorder(root,song){
    // El 90% y los segmentos son una muestra visual fija; no se analiza el audio.
    if(!me||!song){root.hidden=true;return;}
    if(recorder?.state==='recording'||isUploading||blob){status($('panelStatus'),'Envía tu práctica antes de cambiar de canción.',true);return;}
    discard();recordingSong=song;root.hidden=false;root.classList.add('practice-recorder');
    root.innerHTML=`<button class="custum-file-upload record-start" type="button"><span class="icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11Z"/></svg></span><span class="text"><span>Subir mi práctica</span></span></button><div class="record-live" hidden><span class="record-state">Grabando tu práctica</span><div class="record-clock">00:00</div><button class="btn btn-ghost record-stop" type="button" disabled>Detener</button></div><section class="record-confirm" aria-label="Revisar práctica antes de enviar" hidden><h3 class="record-confirm-title" tabindex="-1">¿Estás seguro de enviar este audio?</h3><p>Tu jefe de cuerda lo revisará para evaluar tu progreso.</p>${practicePlayerMarkup()}<section class="similarity-preview" aria-label="Similitud de la práctica"><div class="similarity-heading"><span>Porcentaje de similitud</span><strong>90%</strong></div><div class="similarity-timeline" role="img" aria-label="Línea de duración: fragmentos verdes con alta similitud y rojos con baja similitud"><span class="similarity-high" style="width:30%"></span><span class="similarity-low" style="width:4%"></span><span class="similarity-high" style="width:35%"></span><span class="similarity-low" style="width:6%"></span><span class="similarity-high" style="width:25%"></span></div><div class="similarity-duration"><span>00:00</span><span class="similarity-duration-end">00:00</span></div><div class="similarity-legend"><span><i class="high-dot"></i>Alta similitud</span><span><i class="low-dot"></i>Baja similitud</span></div></section><div class="record-controls"><button class="btn record-send" type="button">Enviar</button><button class="chip record-again" type="button">Volver a grabar</button></div></section><p class="platform-feedback" role="status" aria-live="polite"></p>`;
    const find=s=>root.querySelector(s),msg=(text,error=false)=>{find('.platform-feedback').textContent=text;find('.platform-feedback').classList.toggle('danger-text',error);};
    const start=find('.record-start'),stop=find('.record-stop'),send=find('.record-send'),again=find('.record-again'),preview=find('.record-preview'),live=find('.record-live'),confirmation=find('.record-confirm');
    const updatePreview=bindPracticePlayer(root,{seconds:()=>recordedSeconds,error:message=>msg(message,true),canPlay:()=>!!blob});
    function ready(){start.hidden=false;start.disabled=false;live.hidden=true;confirmation.hidden=true;preview.pause();preview.hidden=true;preview.removeAttribute('src');preview.load();stop.disabled=true;find('.record-clock').textContent='00:00';updatePreview();}
    updatePreview();
    let chunks=[],started=0,byteCount=0,starting=false,interrupted=false;
    async function begin(){
      if(starting)return;starting=true;start.disabled=true;msg('Solicitando micrófono…');
      try{
        if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Este navegador no permite grabar. Abre el sitio con HTTPS en un navegador actualizado.');
        preview.pause();discard();ready();start.disabled=true;document.querySelectorAll('audio').forEach(audio=>audio.pause());stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
        // Se almacena el MIME que realmente devuelve MediaRecorder, sin fingir conversiones.
        const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
        recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:64000});
        chunks=[];byteCount=0;elapsed=0;interrupted=false;started=performance.now();recordingId=crypto.randomUUID();
        recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);byteCount+=e.data.size;if(byteCount>limits.audio_bytes && recorder.state==='recording')recorder.stop();}};
        recorder.onerror=()=>{interrupted=true;msg('La grabación se interrumpió. Vuelve a grabar antes de enviarla.',true);releaseMedia();};
        recorder.onstop=()=>{
          recordedSeconds=Math.min((performance.now()-started)/1000,limits.audio_seconds);releaseMedia();
          blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||mime});
          if(!blob.size||blob.size>limits.audio_bytes){msg('La grabación está vacía o supera el tamaño máximo. Vuelve a grabar.',true);blob=null;ready();return;}
          blobUrl=URL.createObjectURL(blob);preview.src=blobUrl;preview.hidden=true;live.hidden=true;confirmation.hidden=false;stop.disabled=true;updatePreview();const similarityEnd=find('.similarity-duration-end');if(similarityEnd)similarityEnd.textContent=`${String(Math.floor(recordedSeconds/60)).padStart(2,'0')}:${String(Math.floor(recordedSeconds%60)).padStart(2,'0')}`;
          find('.record-confirm-title').focus();msg(interrupted?'La grabación se interrumpió. Escúchala antes de enviarla.':'',interrupted);
        };
        stream.getAudioTracks()[0].addEventListener('ended',()=>{if(recorder?.state==='recording'){interrupted=true;msg('El micrófono se desconectó. Revisa la grabación.',true);recorder.stop();}});
        recorder.start(1000);start.hidden=true;live.hidden=false;confirmation.hidden=true;stop.disabled=false;stop.focus();msg('');
        timer=setInterval(()=>{elapsed=(performance.now()-started)/1000;find('.record-clock').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;if(elapsed>=limits.audio_seconds && recorder.state==='recording')recorder.stop();},250);
      }catch(e){releaseMedia();ready();msg(e.name==='NotAllowedError'?'Permiso de micrófono denegado. Habilítalo en los ajustes del navegador.':e.name==='NotFoundError'?'No se encontró un micrófono. Conecta uno y vuelve a intentar.':e.message,true);}finally{starting=false;}
    }
    start.onclick=begin;stop.onclick=()=>{if(recorder?.state==='recording')recorder.stop();};again.onclick=()=>{if(isUploading)return;preview.pause();discard();chunks=[];byteCount=0;ready();msg('');start.focus();};
    send.onclick=async()=>{
      if(!blob || isUploading)return;isUploading=true;send.disabled=true;again.disabled=true;msg('Enviando tu práctica…');
      try{
        const type=blob.type.toLowerCase();const reservation=await api('/api/recordings/reserve',{method:'POST',body:{id:recordingId,song_id:song.id,season_id:song.season_id,duration_seconds:recordedSeconds,file_size:blob.size,mime_type:type}});
        if(reservation.status!=='ready')await api(`/api/recordings/${recordingId}`,{method:'PUT',body:blob,headers:{'Content-Type':type}});
        preview.pause();discard();ready();msg('Práctica enviada. Ya aparece en Mis grabaciones.');
      }catch(e){msg(`${e.message} Tu audio se conserva; pulsa Enviar para reintentar.`,true);}finally{isUploading=false;send.disabled=false;again.disabled=false;}
    };
  }
  function mainRecorder(){
    if(!me||me.role==='admin'){$('practiceCard').hidden=true;return;}
    const key=decodeURIComponent(location.hash.slice(1));const song=publicSongs.find(s=>(s.legacy_key||s.id)===key);
    if(blob||isUploading||recorder?.state==='recording'){
      $('practiceCard').hidden=false;
      if(key!==(recordingSong.legacy_key||recordingSong.id))location.hash=recordingSong.legacy_key||recordingSong.id;
      const feedback=$('practiceCard').querySelector('.platform-feedback');if(feedback)feedback.textContent=`Conservamos la práctica de ${recordingSong.title}. Termínala y envíala antes de cambiar de canción.`;
      return;
    }
    if(song && !panel().open)buildRecorder($('practiceCard'),song);else if(!song)$('practiceCard').hidden=true;
  }
  async function boot(){
    const passwordInput=$('loginPassword'),passwordToggle=$('toggleLoginPassword');
    function hideLoginPassword(){passwordInput.type='password';passwordToggle.setAttribute('aria-pressed','false');passwordToggle.setAttribute('aria-label','Mostrar contraseña');passwordToggle.querySelector('.password-eye-slash')?.setAttribute('hidden','');}
    passwordToggle.onclick=()=>{const show=passwordInput.type==='password';passwordInput.type=show?'text':'password';passwordToggle.setAttribute('aria-pressed',String(show));passwordToggle.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');const slash=passwordToggle.querySelector('.password-eye-slash');if(slash){if(show)slash.removeAttribute('hidden');else slash.setAttribute('hidden','');}};
    $('loginForm').addEventListener('reset',hideLoginPassword);$('accessGate').addEventListener('close',hideLoginPassword);
    $('accessGate').showModal();
    $('accessGate').addEventListener('cancel',e=>e.preventDefault());
    $('guestEntry').onclick=()=>{$('accessGate').close();updateAccount();};
    $('loginForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{const d=await api('/api/login',{method:'POST',body:formData(e.target)});me=d.user;csrf=d.csrf;$('loginForm').reset();$('accessGate').close();updateAccount();await loadSeasons();await loadSongs();if(me.role==='admin'){recordingFilter=null;personalRecordings=false;await openPanel('home');}else mainRecorder();await syncPresentations();startLiveRefresh();sendEvent('active_day');},$('loginStatus'));};
    $('setupForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api('/api/setup',{method:'POST',body:formData(e.target)});$('setupForm').reset();$('setupBox').hidden=true;$('loginForm').elements.username.value='Jefe de cuerda';status($('loginStatus'),'Jefatura creada. Inicia sesión con la contraseña que acabas de establecer.');},$('loginStatus'));};
    $('logoutButton').onclick=e=>action(e.target,async()=>{await api('/api/logout',{method:'POST',body:{}});document.querySelectorAll('audio').forEach(audio=>audio.pause());discard();me=null;csrf=null;panel().close();updateAccount();if(typeof window.refreshTenoresView==='function')window.refreshTenoresView();showGate();},$('loginStatus'));
    $('adminOpen').onclick=()=>openPanel('home');$('practiceOpen').onclick=()=>openMyRecordings();$('adminRegister').onclick=()=>resumeActiveRehearsal();$('myProgressOpen').onclick=()=>openPanel('progress');$('presentationsOpen').onclick=async()=>{await syncPresentations();window.openTenoresPresentations(2026);};$('statsViews').onclick=e=>{const b=e.target.closest('[data-view]');if(b){$('statsViews').open=false;openPanel(b.dataset.view);}};
    $('songRecordingsOpen').onclick=()=>{const key=location.hash.slice(1),song=publicSongs.find(s=>(s.legacy_key||s.id)===key);if(song)openMyRecordings(song.id);};
    $('platformClose').onclick=()=>{if(isUploading||recorder?.state==='recording'||blob){status($('panelStatus'),'Envía tu práctica antes de cerrar.',true);return;}document.querySelectorAll('audio[data-private]').forEach(audio=>audio.pause());panel().close();discard();mainRecorder();};
    panel().addEventListener('cancel',e=>{if(isUploading||recorder?.state==='recording'||blob){e.preventDefault();status($('panelStatus'),'Envía tu práctica antes de cerrar.',true);}else document.querySelectorAll('audio[data-private]').forEach(audio=>audio.pause());});
    $('platformNav').onclick=e=>{const b=e.target.closest('[data-view]');if(b){if(b.dataset.view==='recordings'){recordingFilter=null;recordingOwner=null;personalRecordings=me.role!=='admin';}openPanel(b.dataset.view);}};
    content().addEventListener('click',async e=>{const b=e.target.closest('[data-view]');if(b)openPanel(b.dataset.view);const tenor=e.target.closest('[data-tenor]');if(tenor){selectedTenor=tenor.dataset.tenor;profileSeasons=null;openPanel('tenor');}const recordingTenor=e.target.closest('[data-recording-tenor]');if(recordingTenor){recordingOwner=recordingTenor.dataset.recordingTenor;recordingOwnerName=recordingTenor.dataset.name;profileSeasons=null;personalRecordings=false;recordingFilter=null;openPanel('tenor-recordings');}const rehearsal=e.target.closest('[data-open-rehearsal]');if(rehearsal){try{const r=await api(`/api/admin/rehearsals/${rehearsal.dataset.openRehearsal}`);view='rehearsal';nav();await renderRehearsal(r,!!r.is_live);}catch(error){status($('panelStatus'),error.message,true);}}});
    $('platformSeason').onchange=async()=>{if(me?.role!=='admin'){$('platformSeason').value=seasonId;return;}if(isUploading||recorder?.state==='recording'||blob){$('platformSeason').value=seasonId;status($('panelStatus'),'Envía tu práctica antes de cambiar de temporada.',true);return;}discard();recordingFilter=null;seasonId=$('platformSeason').value;songs=[];await openPanel(view);};
    $('seasonPickerToggle').onclick=()=>{
      const opening=$('seasonPickerMenu').hidden;$('statsViews').open=false;
      $('seasonPickerMenu').hidden=!opening;$('seasonPickerToggle').setAttribute('aria-expanded',String(opening));
      if(opening)$('seasonPickerMenu').querySelector('[aria-selected="true"]')?.focus();
    };
    $('seasonPickerMenu').onclick=e=>{const option=e.target.closest('[data-season]');if(!option)return;closeSeasonPicker();$('seasonPickerToggle').focus();$('platformSeason').value=option.dataset.season;$('platformSeason').onchange();};
    $('seasonPicker').addEventListener('keydown',e=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
      const options=[...$('seasonPickerMenu').querySelectorAll('[data-season]')];if(!options.length)return;
      $('seasonPickerMenu').hidden=false;$('seasonPickerToggle').setAttribute('aria-expanded','true');
      const current=options.indexOf(document.activeElement),index=e.key==='Home'?0:e.key==='End'?options.length-1:(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[index].focus();
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('#statsViews'))$('statsViews').open=false;
      if(!e.target.closest('#seasonPicker'))closeSeasonPicker();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('seasonPickerMenu').hidden){closeSeasonPicker();$('seasonPickerToggle').focus();}if($('statsViews').open){$('statsViews').open=false;$('statsViews').querySelector('summary')?.focus();}}});
    document.addEventListener('focusin',e=>{if(!e.target.closest('#seasonPicker'))closeSeasonPicker();if(!e.target.closest('#statsViews'))$('statsViews').open=false;});
    $('statsViews').addEventListener('toggle',()=>{if($('statsViews').open)closeSeasonPicker();});
    $('publicSeason').onclick=()=>{if(isUploading||recorder?.state==='recording'||blob){recordingNotice('Envía tu práctica antes de abrir los datos públicos.');return;}const year=selectedSeason().year;panel().close();window.openTenoresSeason(year);};
    window.addEventListener('hashchange',mainRecorder);window.addEventListener('beforeunload',e=>{if(blob||recorder?.state==='recording'||isUploading){e.preventDefault();e.returnValue='';}});
    $('audio-track').addEventListener('play',()=>{const key=location.hash.slice(1),song=publicSongs.find(s=>(s.legacy_key||s.id)===key);if(song)sendEvent('reference_start',song.id);});
    try{
      const [s,setup]=await Promise.all([api('/api/session'),api('/api/setup')]);me=s.user;csrf=s.csrf;limits=s.limits||limits;$('setupBox').hidden=!setup.needs_setup;
      if(me){$('accessGate').close();updateAccount();sendEvent('active_day');}
      await loadSeasons();await refreshStats();await loadSongs();await syncPresentations();if(me)startLiveRefresh();if(me?.role==='admin'){recordingFilter=null;personalRecordings=false;await openPanel('home');}else mainRecorder();
    }catch{status($('loginStatus'),'');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
