// Datos
const SONGS={
  fum:{
    title:'Fum Fum Fum',
    explain:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760051384/fum_fum_fum_explicacion_hcsfzy.mp3',
    track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760051700/fum_fum_fum_cancion_c7zzyg.wav',
    lyrics:`Veinticinco de diciembre
Fum, fum, fum
Veinticinco de diciembre
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Carita de rosa
Parece una flor hermosa
Fum, fum, fum

Sopla el viento por las calles
Fum, fum, fum
Y la virgen tiene frío
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Quieres niño mío
En mi corazón nacer
Fum, fum, fum

Cierren todos ya sus puertas
Fum, fum, fum
Y hasta el cielo se durmió
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Telas de oro y plata
Yo te haré un buen colchón
Fum, fum, fum`
  },
  adeste:{title:'Adeste Fideles',explain:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760100617/adeste_explicacion_g74foi.wav',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760051838/adeste_cancion_kefxux.wav'},
  dona:{title:'Dona Nobis Pacem',explain:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760101534/dona_nobis_pacem___explicacion_3_rmnjay.mp3',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760054240/dona_nobis_pacem___cancion_hsep4p.wav'},
  fuentecilla:{title:'Fuentecilla que corres',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760998122/fuentecilla_que_corres_cancion__qhqna2.mp3'},
  campanas:{title:'Canto de las campanas',explain:'',track:'https://res.cloudinary.com/dul66qlpq/video/upload/v1760142195/canto_de_las_campanas_cancion_tq94nl.mp3'},
  estrella:{title:'Estrella Errante',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997189/estrella_errante_cancion_m6bcdm.mp3'},
  paz:{title:'Himno a la paz',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997237/himno_a_la_paz_cancion_avurel.mp3'},
  merry:{title:'We wish you a merry christmas',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997255/we_wish_you_cancion_pgz1i2.mp3'},
  kling:{title:'Kling Glöckchen, klingelingeling',explain:'',track:'https://res.cloudinary.com/dul66qlpq/video/upload/v1761827592/kling_cancion_xawypb.mp3'},
  tannenbaum:{title:'O Tannenbaum',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1761968289/oh_thanenbaum_kkhmya.mp3'}
};

const TEAM_OVERVIEW={
  totalMinutes:1920,
  totalHours:32,
  totalMembers:9,
  averageMinutes:1422.8,
  averageAttendance:74,
  rehearsals:9,
  timeframe:'Periodo analizado',
  observations:[
    'Carlos (100%) y Santiago (98%) sostienen la asistencia m\u00e1s alta del equipo.',
    'Nivel alto (H\u00e9ctor, Marco y Diego) se mantiene por arriba del 80% aunque acumula retrasos frecuentes.',
    'Mario e Isa\u00edas integran el nivel medio con entre 630 y 721 minutos por recuperar.',
    'Oswaldo y Caleb se encuentran por debajo del 50% del plan y concentran el foco rojo.',
    'Marco justifica el 67% de sus retrasos; H\u00e9ctor y Diego registran retardos sin justificaci\u00f3n.'
  ],
  levels:[
    {label:'Nivel superior (98%-100%)',members:['Carlos','Santiago']},
    {label:'Nivel alto (80%-81%)',members:['H\u00e9ctor','Marco','Diego']},
    {label:'Nivel medio (62%-67%)',members:['Mario','Isa\u00edas']},
    {label:'Nivel bajo (48%-49%)',members:['Oswaldo','Caleb']}
  ]
};

const TENOR_MEMBERS_DATA=[
  {id:'caleb',name:'Caleb',minutes:930,attendance:48,minutesLost:990,rehearsalsAttended:5,tardyPct:40,tardyCount:2,tardyJustifiedPct:0,level:'Nivel Bajo (48%-49%)',note:'Requiere recuperar 990 minutos para alcanzar la carga total.'},
  {id:'carlos',name:'Carlos',minutes:1920,attendance:100,minutesLost:0,rehearsalsAttended:9,tardyPct:0,tardyCount:0,tardyJustifiedPct:0,level:'Nivel Superior (98%-100%)',note:'Asistencia perfecta en los 9 ensayos analizados.'},
  {id:'diego',name:'Diego',minutes:1528.8,attendance:80,minutesLost:391.2,rehearsalsAttended:8,tardyPct:38,tardyCount:3,tardyJustifiedPct:0,level:'Nivel Alto (80%-81%)',note:'80% del tiempo cubierto pero con 3 llegadas tarde sin justificar.'},
  {id:'hector',name:'H\u00e9ctor',minutes:1557.6,attendance:81,minutesLost:362.4,rehearsalsAttended:7,tardyPct:43,tardyCount:3,tardyJustifiedPct:0,level:'Nivel Alto (80%-81%)',note:'Buena asistencia, aunque 43% de sus ensayos comenz\u00f3 tarde.'},
  {id:'isaias',name:'Isa\u00edas',minutes:1198.8,attendance:62,minutesLost:721.2,rehearsalsAttended:6,tardyPct:33,tardyCount:2,tardyJustifiedPct:0,level:'Nivel Medio (62%-67%)',note:'Debe recuperar 721 minutos y reducir sus retrasos (33%).'},
  {id:'marco',name:'Marco',minutes:1545,attendance:80,minutesLost:375,rehearsalsAttended:8,tardyPct:75,tardyCount:6,tardyJustifiedPct:67,level:'Nivel Alto (80%-81%)',note:'75% de sus ensayos inicia tarde, aunque 67% tiene justificaci\u00f3n.'},
  {id:'mario',name:'Mario',minutes:1290,attendance:67,minutesLost:630,rehearsalsAttended:null,tardyPct:null,tardyCount:null,tardyJustifiedPct:null,level:'Nivel Medio (62%-67%)',note:'Se ubica en el nivel medio con 630 minutos perdidos; falta desglose por ensayo.'},
  {id:'oswaldo',name:'Oswaldo',minutes:945,attendance:49,minutesLost:975,rehearsalsAttended:null,tardyPct:null,tardyCount:null,tardyJustifiedPct:null,level:'Nivel Bajo (48%-49%)',note:'Pierde 975 minutos frente a la meta y requiere plan de recuperaci\u00f3n.'},
  {id:'santiago',name:'Santiago',minutes:1890,attendance:98,minutesLost:30,rehearsalsAttended:null,tardyPct:null,tardyCount:null,tardyJustifiedPct:null,level:'Nivel Superior (98%-100%)',note:'98% de asistencia; faltan 30 minutos para igualar el total del coro.'}
];

const CALENDAR_MONTHS=['2025-11','2025-12'];
const PRESENTATION_EVENTS=[
  {id:'nov-20-incaf',date:'2025-11-20',title:'Coro Polif\u00f3nico',startTime:'5:00 pm',callTime:'03:00 pm',venue:'INCAF',city:'San Salvador',meetingPoint:'Recepci\u00f3n principal',summary:'Actuaci\u00f3n oficial del Coro Polif\u00f3nico en INCAF.',instructions:'Salida programada a las 03:00 pm desde la fundaci\u00f3n.',tag:'Presentaci\u00f3n'},
  {id:'nov-21-quimicos',date:'2025-11-21',title:'Coro Polif\u00f3nico',startTime:'6:00 pm',callTime:'04:00 pm',venue:'Colegio de Qu\u00edmicos Farmac\u00e9uticos',city:'San Salvador',meetingPoint:'Parqueo lateral',summary:'Presentaci\u00f3n para el Colegio de Qu\u00edmicos Farmac\u00e9uticos.',instructions:'Salida coordinada a las 04:00 pm.',tag:'Presentaci\u00f3n'},
  {id:'nov-29-fepade',date:'2025-11-29',title:'Show navide\u00f1o (bandas y coro)',startTime:'4:00 pm',callTime:'02:00 pm',venue:'FEPADE',city:'San Salvador',meetingPoint:'Acceso principal',summary:'Show navide\u00f1o junto a bandas invitadas en FEPADE.',instructions:'Salida general a las 02:00 pm.',tag:'Show'},
  {id:'dec-01-alfa',date:'2025-12-01',title:'Coro Polif\u00f3nico',startTime:'7:00 pm',callTime:'04:30 pm',venue:'ALFA / Milenium Plaza',city:'Antiguo Cuscatl\u00e1n',meetingPoint:'Lobby principal',summary:'Concierto del coro en ALFA / Milenium Plaza.',instructions:'Salida prevista a las 04:30 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-02-alfa',date:'2025-12-02',title:'Coro Polif\u00f3nico',startTime:'7:00 pm',callTime:'04:30 pm',venue:'ALFA / Milenium Plaza',city:'Antiguo Cuscatl\u00e1n',meetingPoint:'Lobby principal',summary:'Segunda fecha en ALFA / Milenium Plaza.',instructions:'Mantener salida a las 04:30 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-05-nunciatura',date:'2025-12-05',title:'Coro Polif\u00f3nico',startTime:'6:30 pm',callTime:'04:30 pm',venue:'Nunciatura Apost\u00f3lica',city:'San Salvador',meetingPoint:'Entrada principal',summary:'Participaci\u00f3n protocolaria en la Nunciatura Apost\u00f3lica.',instructions:'Salida puntual a las 04:30 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-06-binaes',date:'2025-12-06',title:'Show navide\u00f1o: Escuela Ancalmo, bandas, ensambles y coro',startTime:'4:00 pm',callTime:'02:00 pm',venue:'BINAES',city:'San Salvador',meetingPoint:'Vest\u00edbulo BINAES',summary:'Show navide\u00f1o con la Escuela Ancalmo y ensambles invitados.',instructions:'Salida general a las 02:00 pm.',tag:'Show'},
  {id:'dec-07-bosques',date:'2025-12-07',title:'Coro Polif\u00f3nico',startTime:'7:00 pm',callTime:'04:00 pm',venue:'Bosques de la Paz',city:'San Salvador',meetingPoint:'\u00c1rea de estacionamiento',summary:'Presentaci\u00f3n comunitaria en Bosques de la Paz.',instructions:'Salida prevista a las 04:00 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-11-ateneo',date:'2025-12-11',title:'Coro Polif\u00f3nico',startTime:'7:00 pm',callTime:'04:30 pm',venue:'Ateneo',city:'San Salvador',meetingPoint:'Pasillo principal',summary:'Recital del coro en el Ateneo.',instructions:'Salida a las 04:30 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-13-merliot',date:'2025-12-13',title:'Coro Polif\u00f3nico',startTime:'10:30 am',callTime:'08:00 pm',venue:'Ni\u00f1os de Merliot',city:'Santa Tecla',meetingPoint:'Cancha techada',summary:'Actividad matutina con Ni\u00f1os de Merliot.',instructions:'Salida indicada a las 08:00 pm.',tag:'Presentaci\u00f3n'},
  {id:'dec-14-osicala',date:'2025-12-14',title:'Coro Polif\u00f3nico',startTime:'1:00 pm',callTime:'06:00 am',venue:'Osicala',city:'Osicala',meetingPoint:'Casa de la Cultura',summary:'Viaje especial para la comunidad de Osicala.',instructions:'Salida temprana a las 06:00 am.',tag:'Gira'},
  {id:'dec-16-ancalmo',date:'2025-12-16',title:'Coro Polif\u00f3nico',startTime:'1:00 pm',callTime:'10:30 am',venue:'Ancalmo',city:'San Salvador',meetingPoint:'Recepci\u00f3n central',summary:'Presentaci\u00f3n interna en Ancalmo.',instructions:'Salida a las 10:30 am.',tag:'Presentaci\u00f3n'},
  {id:'dec-20-poma',date:'2025-12-20',title:'Coro Polif\u00f3nico',startTime:'5:00 pm',callTime:'03:00 pm',venue:'Teatro Poma',city:'San Salvador',meetingPoint:'Acceso artistas',summary:'Cierre de temporada en el Teatro Poma.',instructions:'Salida programada a las 03:00 pm.',tag:'Presentaci\u00f3n'}
];
const DAY_NAMES=['L','M','X','J','V','S','D'];

const TENOR_LOOKUP=TENOR_MEMBERS_DATA.reduce((map,member)=>{map[member.id]=member;return map;},Object.create(null));
const TENOR_MEMBERS=[...TENOR_MEMBERS_DATA].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
// Refs
const $home=document.getElementById('home');
const $songView=document.getElementById('song-view');
const $title=document.getElementById('song-title');
const $meta=document.getElementById('song-meta');
const $exp=document.getElementById('audio-explain');
const $trk=document.getElementById('audio-track');
const $dlExp=document.getElementById('dl-explain');
const $dlTrk=document.getElementById('dl-track');
const $lblExp=document.getElementById('lbl-explain');
const $lblTrk=document.getElementById('lbl-track');
const $lyrics=document.getElementById('lyrics');
const $wrap=document.getElementById('lyrics-wrap');
const $toggle=document.getElementById('toggle-lyrics');
const $fontUp=document.getElementById('fontUp');
const $fontDown=document.getElementById('fontDown');

const $grid=document.getElementById('grid');
const $q=document.getElementById('q');
const $suggest=document.getElementById('suggest');

const $mini=document.getElementById('mini');
const $miniToggle=document.getElementById('mini-toggle');
const $miniLoop=document.getElementById('mini-loop');
const $miniClose=document.getElementById('mini-close');
const $miniTitle=document.getElementById('mini-title');
const $miniSub=document.getElementById('mini-sub');
const $miniBar=document.getElementById('mini-bar');
const $miniProg=document.getElementById('mini-prog');
const $miniMeta=document.getElementById('mini-meta');
const $dataToggle=document.getElementById('dataToggle');
const $dataPanel=document.getElementById('dataPanel');
const $dataCards=document.getElementById('dataCards');
const $dataDetail=document.getElementById('dataDetail');
const $dataClose=document.getElementById('dataClose');
const $overviewDetail=document.getElementById('overviewDetail');
const $dataOverview=document.getElementById('dataOverview');
const $dataTenors=document.getElementById('dataTenors');
const $tenorListView=document.getElementById('tenorListView');
const $tenorDetailView=document.getElementById('tenorDetailView');
const $tenorBack=document.getElementById('tenorBack');
const $menuToggle=document.getElementById('menuToggle');
const $quickMenu=document.getElementById('quickMenu');
const $presentationsPanel=document.getElementById('presentationsPanel');
const $presentationsList=document.getElementById('presentationsList');
const $presentationsClose=document.getElementById('presentationsClose');
const $presentationsCalendar=document.getElementById('presentationsCalendar');
const $calendarPopover=document.getElementById('calendarPopover');
const $calendarPopoverBody=document.getElementById('calendarPopoverBody');
const $calendarPopoverDate=document.getElementById('calendarPopoverDate');
const $calendarPopoverTitle=document.getElementById('calendarPopoverTitle');
const $calendarPopoverClose=document.getElementById('calendarPopoverClose');

let currentSongId=null, currentAudio=null, currentLabel='', plainLyrics='';

// Velocidad global
const SPEEDS=[1,1.25,1.5,2];
let gSpeed=1;
let dataCardsReady=false,currentDataMemberId=null,currentDataTab='overview',dataPanelTimer=null,presentationsTimer=null,isMenuOpen=false,selectedPresentationDate=null;

// Helpers
function setActiveCard(id){
  document.querySelectorAll('[data-song]').forEach(a=>{
    const is=a.getAttribute('data-song')===id;
    a.classList.toggle('active',is);
    if(is) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
function setLoading(btn,on,labelEl){
  if(on){btn.classList.add('is-loading');btn.setAttribute('aria-disabled','true'); if(labelEl)labelEl.textContent='Descargando�';}
  else{btn.classList.remove('is-loading');btn.setAttribute('aria-disabled','false');}
}
function extFromUrl(url){
  try{const u=new URL(url),p=u.pathname,i=p.lastIndexOf('.');return i!==-1?p.slice(i+1).toUpperCase():'MP3';}
  catch{const m=url.match(/\.([a-z0-9]+)(?:$|\?)/i);return m?m[1].toUpperCase():'MP3';}
}
function fileExt(url){
  try{const u=new URL(url),p=u.pathname,i=p.lastIndexOf('.');return i!==-1?p.slice(i):'.mp3';}
  catch{const m=url.match(/\.([a-z0-9]+)(?:$|\?)/i);return m?'.'+m[1]:'.mp3';}
}
function cleanName(s){return s.replace(/[^a-z0-9\- _\.]/gi,'_')}
async function forceDownload(url,filename,btn,labelEl){
  try{
    setLoading(btn,true,labelEl);
    const res=await fetch(url,{mode:'cors'}); const blob=await res.blob();
    const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=filename;
    document.body.appendChild(link); link.click(); URL.revokeObjectURL(link.href); link.remove();
  }catch{window.open(url,'_blank')}
  finally{setLoading(btn,false,labelEl); if(labelEl)labelEl.textContent=labelEl.dataset.default||'Descargar';}
}
function escapeHtml(s){return s.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function formatLyrics(s){
  if(!s) return '<em>Letra no disponible a\u00fan.</em>';
  const safe=escapeHtml(s.trim());
  return safe.split(/\n{2,}/).map(b=>`<p>${b.replace(/\n/g,'<br>')}</p>`).join('');
}
function setLyrics(text){
  plainLyrics=text||'';
  $lyrics.innerHTML=formatLyrics(plainLyrics);
  requestAnimationFrame(()=>{
    const tooTall=$wrap.scrollHeight>520 || (plainLyrics.length>700 && window.innerWidth<840);
    $wrap.classList.toggle('is-collapsed', tooTall);
    $toggle.hidden=!tooTall;
    $toggle.textContent=tooTall?'Ver m\u00e1s':' ';
  });
}

function formatClock(sec,fallback='00:00'){
  if(!Number.isFinite(sec) || sec<0) return fallback;
  const minutes=Math.floor(sec/60);
  const seconds=Math.floor(sec%60);
  return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
}
function createPlayerUI({id,audio,label}){
  const root=document.querySelector('.audio-player[data-player="'+id+'"]');
  if(!root||!audio) return null;
  const toggle=root.querySelector('[data-role="toggle"]');
  const progress=root.querySelector('[data-role="progress"]');
  const fill=root.querySelector('[data-role="fill"]');
  const current=root.querySelector('[data-role="current"]');
  const duration=root.querySelector('[data-role="duration"]');
  let scrubbing=false;

  function update(){
    const total=audio.duration;
    const pct=total && Number.isFinite(total)?(audio.currentTime/total)*100:0;
    if(fill) fill.style.width=`${pct}%`;
    if(progress){
      progress.setAttribute('aria-valuenow',String(Math.round(pct)));
      const desc=formatClock(audio.currentTime||0,'00:00')+' de '+formatClock(total,'--:--');
      progress.setAttribute('aria-valuetext',desc);
    }
    if(current) current.textContent=formatClock(audio.currentTime||0,'00:00');
    if(duration) duration.textContent=formatClock(total,'--:--');
    if(toggle){
      const playing=!audio.paused && !audio.ended;
      root.classList.toggle('is-active',playing);
      toggle.classList.toggle('is-playing',playing);
      toggle.innerHTML=playing?iconPause():iconPlay();
      const labelText=label.toLowerCase();
      toggle.setAttribute('aria-label',playing?'Pausar '+labelText:'Reproducir '+labelText);
    }
  }
  function reset(){
    root.classList.remove('is-active');
    if(fill) fill.style.width='0%';
    if(progress){
      progress.setAttribute('aria-valuenow','0');
      progress.setAttribute('aria-valuetext',formatClock(0)+' de --:--');
    }
    if(current) current.textContent='00:00';
    if(duration) duration.textContent='--:--';
    if(toggle){
      toggle.classList.remove('is-playing');
      toggle.innerHTML=iconPlay();
      toggle.setAttribute('aria-label','Reproducir '+label.toLowerCase());
    }
  }
  if(toggle){
    toggle.addEventListener('click',()=>{
      if(audio.paused){ audio.play().catch(()=>{}); }
      else audio.pause();
    });
  }
  function seek(ev){
    if(!progress||!audio.duration||!Number.isFinite(audio.duration)) return;
    const rect=progress.getBoundingClientRect();
    if(!rect.width) return;
    const pct=Math.min(1,Math.max(0,(pointX(ev)-rect.left)/rect.width));
    audio.currentTime=pct*audio.duration;
    update();
  }
  if(progress){
    progress.addEventListener('mousedown',ev=>{scrubbing=true;seek(ev);});
    window.addEventListener('mousemove',ev=>{if(scrubbing)seek(ev);});
    window.addEventListener('mouseup',()=>{scrubbing=false;});
    progress.addEventListener('touchstart',ev=>{scrubbing=true;seek(ev);},{passive:true});
    window.addEventListener('touchmove',ev=>{if(scrubbing)seek(ev);},{passive:true});
    window.addEventListener('touchend',()=>{scrubbing=false;});
    progress.addEventListener('keydown',ev=>{
      if(!audio.duration||!Number.isFinite(audio.duration)) return;
      const step=Math.min(5,audio.duration/20);
      if(ev.key==='ArrowLeft'||ev.key==='ArrowDown'){
        audio.currentTime=Math.max(0,audio.currentTime-step);
        ev.preventDefault(); update();
      }else if(ev.key==='ArrowRight'||ev.key==='ArrowUp'){
        audio.currentTime=Math.min(audio.duration,audio.currentTime+step);
        ev.preventDefault(); update();
      }else if(ev.key==='Home'){
        audio.currentTime=0; ev.preventDefault(); update();
      }else if(ev.key==='End'){
        audio.currentTime=audio.duration; ev.preventDefault(); update();
      }
    });
  }
  audio.addEventListener('timeupdate',update);
  audio.addEventListener('play',update);
  audio.addEventListener('pause',update);
  audio.addEventListener('loadedmetadata',update);
  audio.addEventListener('ended',update);
  reset();
  return {reset,update,audio,label};
}
const players=[
  createPlayerUI({id:'exp',audio:$exp,label:'Explicaci�n'}),
  createPlayerUI({id:'trk',audio:$trk,label:'Canci�n'})
].filter(Boolean);
players.forEach(player=>{
  if(!player) return;
  player.audio.addEventListener('play',()=>{
    players.forEach(other=>{
      if(other!==player && other?.audio && !other.audio.paused){
        try{other.audio.pause();}catch{}
      }
    });
  });
});
function resetPlayers(){ players.forEach(p=>p?.reset()); }

// Render
function renderHome(){
  $home.hidden=false; $songView.hidden=true; setActiveCard('');
  [$exp,$trk].forEach(a=>{ if(!currentAudio||a!==currentAudio){ try{a.pause();a.currentTime=0}catch{} }});
  resetPlayers();
  document.title='Tenores';
}
function renderSong(id){
  const s=SONGS[id]; if(!s) return renderHome();
  currentSongId=id;
  $title.textContent=s.title;
  $meta.textContent='El curso que te convertirá en "El Buen Tenor"';
  $exp.src=s.explain||''; $trk.src=s.track||'';
  [$exp,$trk].forEach(a=>{a.playbackRate=gSpeed;a.loop=false;});
  resetPlayers();
  const hasExplain=!!s.explain, hasTrack=!!s.track;
  $dlExp.setAttribute('aria-disabled',String(!hasExplain));
  $dlTrk.setAttribute('aria-disabled',String(!hasTrack));
  $lblExp.textContent=hasExplain?`Descargar ${extFromUrl(s.explain)}`:'Descargar';
  $lblTrk.textContent=hasTrack?`Descargar ${extFromUrl(s.track)}`:'Descargar';
  setLyrics(s.lyrics||''); $home.hidden=true; $songView.hidden=false; setActiveCard(id);
  document.title=`Tenores - ${s.title}`; window.scrollTo({top:0,behavior:'smooth'});
}

// Router
function route(){ const h=(location.hash||'').replace('#','').trim(); if(!h) return renderHome(); renderSong(h); }

// Downloads
if($lblExp) $lblExp.dataset.default=$lblExp.textContent;
if($lblTrk) $lblTrk.dataset.default=$lblTrk.textContent;
if($dlExp) $dlExp.addEventListener('click',e=>{e.preventDefault(); if(!currentSongId) return; const s=SONGS[currentSongId]; if(!s.explain) return; const ext=fileExt(s.explain); forceDownload(s.explain,cleanName(`${s.title} - explicacion${ext}`),$dlExp,$lblExp);});
if($dlTrk) $dlTrk.addEventListener('click',e=>{e.preventDefault(); if(!currentSongId) return; const s=SONGS[currentSongId]; if(!s.track) return; const ext=fileExt(s.track); forceDownload(s.track,cleanName(`${s.title} - cancion${ext}`),$dlTrk,$lblTrk);});

// Sticky mini
function showMini(){ $mini.hidden=false; }
function hideMini(){ $mini.hidden=true; $mini.classList.remove('mini--hidden'); $miniProg.style.width='0%'; }
function bindToMini(audio,label){
  currentAudio=audio; currentLabel=label; currentAudio.loop=false;
  $miniLoop.classList.remove('active'); $miniLoop.setAttribute('aria-label','Activar repetici\u00f3n continua');
  $miniTitle.textContent=SONGS[currentSongId]?.title||'�'; $miniSub.textContent=label;
  currentAudio.playbackRate=gSpeed; showMini(); updateMini();
}
function iconPlay(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="8,5 19,12 8,19 8,5"></polygon></svg>`}
function iconPause(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/></svg>`}
function updateMini(){
  const paused=!currentAudio||currentAudio.paused;
  $miniToggle.innerHTML=paused?iconPlay():iconPause();
  $miniToggle.setAttribute('aria-label', paused?'Reproducir':'Pausar');
  $miniLoop.classList.toggle('active', currentAudio && currentAudio.loop);
  if(!currentAudio||!currentAudio.duration){$miniProg.style.width='0%';return;}
  const pct=(currentAudio.currentTime/currentAudio.duration)*100;
  $miniProg.style.width=`${pct}%`; $miniBar.setAttribute('aria-valuenow',String(Math.round(pct)));
}
[$exp,$trk].forEach((el,idx)=>{
  const label=idx===0?'Explicaci�n':'Canci�n';
  el.addEventListener('play',()=>{bindToMini(el,label)});
  el.addEventListener('pause',updateMini);
  el.addEventListener('timeupdate',updateMini);
  el.addEventListener('ended',()=>{updateMini(); /* no se oculta si cambias de vista; se oculta solo con X o al terminar y estar pausado */});
});
$miniToggle.addEventListener('click',()=>{if(!currentAudio) return; currentAudio.paused?currentAudio.play():currentAudio.pause(); updateMini();});
$miniLoop.addEventListener('click',()=>{if(!currentAudio) return; currentAudio.loop=!currentAudio.loop; $miniLoop.classList.toggle('active',currentAudio.loop); $miniLoop.setAttribute('aria-label',currentAudio.loop?'Desactivar repetici\u00f3n continua':'Activar repetici\u00f3n continua'); updateMini();});
$miniClose.addEventListener('click',()=>{ if(currentAudio){try{currentAudio.pause();}catch{}} hideMini();});

// Scrub barra mini
let scrubbing=false;
function pointX(ev){return ev.touches?ev.touches[0].clientX:ev.clientX}
function scrubTo(ev){ if(!currentAudio||!currentAudio.duration) return; const rect=$miniBar.getBoundingClientRect(); const pct=Math.min(1,Math.max(0,(pointX(ev)-rect.left)/rect.width)); currentAudio.currentTime=pct*currentAudio.duration; updateMini(); }
$miniBar.addEventListener('mousedown',ev=>{scrubbing=true;scrubTo(ev)});
window.addEventListener('mousemove',ev=>{if(scrubbing)scrubTo(ev)});
window.addEventListener('mouseup',()=>{scrubbing=false});
$miniBar.addEventListener('touchstart',ev=>{scrubbing=true;scrubTo(ev)},{passive:true});
window.addEventListener('touchmove',ev=>{if(scrubbing)scrubTo(ev)},{passive:true});
window.addEventListener('touchend',()=>{scrubbing=false});

// Scroll-hide mini
let lastY=window.scrollY;
window.addEventListener('scroll',()=>{
  if($mini.hidden) return;
  const y=window.scrollY;
  if(y>lastY+8) $mini.classList.add('mini--hidden');
  else if(y<lastY-8) $mini.classList.remove('mini--hidden');
  lastY=y;
},{passive:true});
$miniMeta.addEventListener('click',()=>{if(currentSongId) location.hash=currentSongId;});

// Buscador + fix teclado móvil
function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
const items=[...document.querySelectorAll('#grid [data-song]')].map(a=>({el:a,id:a.getAttribute('data-song'),title:normalize(a.querySelector('.mini-title').textContent)}));
function applyFilter(q){
  const n=normalize(q); let shown=0;
  items.forEach(({el,title})=>{const match=title.includes(n); el.hidden=!match; if(match) shown++;});
  $suggest.hidden=!n; $suggest.textContent=n ? (shown?`${shown} resultado${shown>1?'s':''}`:'Sin resultados') : '';
  if(n && shown){
    const first=items.find(i=>!i.el.hidden)?.el;
    if(first){ first.scrollIntoView({block:'center'}); setTimeout(()=>first.scrollIntoView({block:'center'}),140); }
  }
}
$q.addEventListener('input',()=>applyFilter($q.value));
$q.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $q.value=''; applyFilter(''); $q.blur(); }});

// Letras zoom
function getZoom(){const z=parseFloat(localStorage.getItem('lyricsZoom')||'1'); return isNaN(z)?1:Math.min(1.6,Math.max(0.8,z));}
function setZoom(z){document.documentElement.style.setProperty('--lyrics-zoom', z); localStorage.setItem('lyricsZoom', z);}
$fontUp.addEventListener('click',()=>setZoom(Math.min(1.6, getZoom()+0.1)));
$fontDown.addEventListener('click',()=>setZoom(Math.max(0.8, getZoom()-0.1)));
const $toggleBtn=document.getElementById('toggle-lyrics');
$toggleBtn.addEventListener('click',()=>{const isNow=$wrap.classList.toggle('is-collapsed'); $toggleBtn.textContent=isNow?'Ver m\u00e1s':'Ver menos';});

// Velocidad: menu (delegacion)
function applySpeedAll(){
  [$exp,$trk,currentAudio].forEach(a=>{ if(a) a.playbackRate=gSpeed; });
  document.querySelectorAll('.speed').forEach(btn=>{
    btn.classList.toggle('active', parseFloat(btn.dataset.speed)===gSpeed);
  });
}
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.classList.contains('dots')){
    const key=t.dataset.menu;
    document.querySelectorAll('.speed-menu').forEach(m=>m.hidden=true);
    const menu=document.querySelector(`.speed-menu[data-for="${key}"]`);
    if(menu){ menu.hidden=false; }
  }else if(t.classList.contains('speed')){
    gSpeed=parseFloat(t.dataset.speed); applySpeedAll();
    document.querySelectorAll('.speed-menu').forEach(m=>m.hidden=true);
  }else{
    if(!t.closest('.more')) document.querySelectorAll('.speed-menu').forEach(m=>m.hidden=true);
  }
});

function formatPlainNumber(value,decimals=0){
  if(value===null||value===undefined) return 'Sin dato';
  const num=Number(value);
  if(Number.isNaN(num)) return 'Sin dato';
  return num.toLocaleString('es-MX',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}
function formatMinutes(value){
  if(value===null||value===undefined) return 'Sin dato';
  const num=Number(value);
  if(Number.isNaN(num)) return 'Sin dato';
  const decimals=Number.isInteger(num)?0:1;
  return `${num.toLocaleString('es-MX',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})} min`;
}
function formatPercent(value){
  if(value===null||value===undefined) return 'Sin dato';
  const num=Number(value);
  if(Number.isNaN(num)) return 'Sin dato';
  const decimals=Number.isInteger(num)?0:1;
  return `${num.toLocaleString('es-MX',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}%`;
}
function clampPercent(value){
  if(typeof value!=='number'||Number.isNaN(value)) return 0;
  return Math.max(0,Math.min(100,value));
}
function ensureDataCards(){
  if(dataCardsReady||!$dataCards) return;
  renderDataCards();
  dataCardsReady=true;
}
function renderDataCards(){
  if(!$dataCards) return;
  const cards=[...TENOR_MEMBERS];
  const frag=document.createDocumentFragment();
  cards.forEach(card=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='data-card';
    btn.dataset.target=card.id;
    const pct=clampPercent(typeof card.attendance==='number'?card.attendance:TEAM_OVERVIEW.averageAttendance);
    const meta=card.level||`${formatPercent(card.attendance)} asistencia`;
    btn.innerHTML=`<span class="data-card__name">${card.name}<small>${formatPercent(card.attendance)}</small></span><span class="data-card__meta">${meta}</span><span class="data-card__bar"><span style="--value:${pct}%;"></span></span>`;
    frag.appendChild(btn);
  });
  $dataCards.innerHTML='';
  $dataCards.appendChild(frag);
  setActiveDataCard(currentDataMemberId);
}
function setActiveDataCard(id){
  if(!$dataCards) return;
  const activeId=id||'';
  $dataCards.querySelectorAll('.data-card').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.target===activeId);
  });
}
function renderDataDetail(id){
  if(!$dataDetail) return;
  if(!id||!TENOR_LOOKUP[id]){
    $dataDetail.innerHTML='<p class="data-panel__empty">Selecciona un tenor para consultar sus datos.</p>';
    return;
  }
  renderMemberDetail(TENOR_LOOKUP[id]);
}
function renderTeamDetail(){
  if(!$overviewDetail) return;
  const heroMinutePct=TEAM_OVERVIEW.totalMinutes?clampPercent((TEAM_OVERVIEW.averageMinutes/TEAM_OVERVIEW.totalMinutes)*100):0;
  const metrics=[
    {value:formatMinutes(TEAM_OVERVIEW.totalMinutes),label:'Tiempo total',note:`Equivalente a ${formatPlainNumber(TEAM_OVERVIEW.totalHours)} h de ensayo`},
    {value:formatMinutes(TEAM_OVERVIEW.averageMinutes),label:'Promedio por tenor',note:'Media hist\u00f3rica de la secci\u00f3n'},
    {value:formatPlainNumber(TEAM_OVERVIEW.rehearsals),label:'Ensayos registrados',note:'Total de ensayos considerados'},
    {value:formatPercent(TEAM_OVERVIEW.averageAttendance),label:'Asistencia promedio',note:'Cuatro integrantes bajo el promedio'}
  ].map(metric=>`<article class="metric-card"><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.note}</small></article>`).join('');
  const attendanceRows=TENOR_MEMBERS.map(member=>{
    const pct=clampPercent(member.attendance);
    return `<div class="tenor-stat"><div class="tenor-stat__meta"><strong>${member.name}</strong><span>${member.level}</span></div><div class="tenor-stat__meter"><span style="--value:${pct}%;"></span></div><span class="tenor-stat__value">${formatPercent(member.attendance)}</span></div>`;
  }).join('');
  const levelHtml=(TEAM_OVERVIEW.levels||[]).map(level=>`<div class="level-chip"><strong>${level.label}</strong><span>${level.members.join(', ')}</span></div>`).join('');
  const obsHtml=(TEAM_OVERVIEW.observations||[]).map(item=>`<li>${item}</li>`).join('')||'<li>Sin datos destacados.</li>';
  $overviewDetail.innerHTML=`<div class="data-detail__stack">
    <article class="data-detail__hero overview-hero">
      <div class="data-hero-text">
        <p class="kicker">Equipo Tenores</p>
        <h3>Salud general</h3>
        <div class="data-legend">
          <span class="badge">${formatPlainNumber(TEAM_OVERVIEW.rehearsals)} ensayos</span>
          <span class="badge badge--ghost">${formatPlainNumber(TEAM_OVERVIEW.totalMembers)} miembros</span>
          <span class="badge badge--ghost">Tiempo ensayado ${formatPercent(heroMinutePct)}</span>
        </div>
      </div>
      <div class="dial dial--xl" style="--percent:${heroMinutePct}%;"><div class="dial-value"><strong>${formatPercent(heroMinutePct)}</strong><span>minutos</span></div><span class="dial-label">Tiempo ensayado</span></div>
    </article>
    <div class="overview-grid">${metrics}</div>
    <div class="overview-columns">
      <section class="data-panel-box">
        <h4>Grupos de desempe\u00f1o</h4>
        <div class="level-grid">${levelHtml}</div>
      </section>
      <section class="data-panel-box">
        <h4>Observaciones clave</h4>
        <ul class="detail-list">${obsHtml}</ul>
      </section>
    </div>
    <section class="data-panel-box data-panel-box--table">
      <div class="table-header">
        <div>
          <h4>Asistencia por tenor</h4>
        </div>
        <span class="badge badge--ghost">${formatPlainNumber(TEAM_OVERVIEW.totalMembers)} integrantes</span>
      </div>
      <div class="tenor-stats">${attendanceRows}</div>
    </section>
  </div>`;
}
function renderMemberDetail(member){
  if(!$dataDetail) return;
  const hasRehearsals=member.rehearsalsAttended!==null&&member.rehearsalsAttended!==undefined;
  const freqValue=hasRehearsals?`${member.rehearsalsAttended} / ${TEAM_OVERVIEW.rehearsals}`:'Sin registro';
  const freqLabel=hasRehearsals?'Ensayos cubiertos':'Sin desglose por ensayo';
  const minutePct=clampPercent((member.minutes/TEAM_OVERVIEW.totalMinutes)*100);
  const missingMinutes=Math.max(0,TEAM_OVERVIEW.totalMinutes-Number(member.minutes||0));
  const minutesNarrative=missingMinutes>0?`Le faltan ${formatMinutes(missingMinutes)} para igualar los ${formatMinutes(TEAM_OVERVIEW.totalMinutes)}.`:'Complet\u00f3 el total de minutos planificado.';
  const pendingBadge=missingMinutes>0?`${formatMinutes(missingMinutes)} pendientes`:'Sin minutos pendientes';
  const hasTardy=member.tardyPct!==null&&member.tardyPct!==undefined;
  const tardyWidth=hasTardy?clampPercent(member.tardyPct):0;
  let tardyNote='Sin registro en Hoja 2.';
  if(hasTardy){
    tardyNote=member.tardyPct===0?'Ingreso puntual en todos los ensayos registrados.':`${formatPercent(member.tardyPct)} de los ensayos asistidos comenzaron tarde.`;
  }
  let tardyExtra='';
  if(hasTardy){
    if(typeof member.tardyJustifiedPct==='number'){
      tardyExtra=member.tardyJustifiedPct>0?`${formatPercent(member.tardyJustifiedPct)} de los retrasos fueron justificados.`:'No hubo retrasos justificados.';
    }else{
      tardyExtra='No hay detalle de justificaci\u00f3n.';
    }
  }
  const bulletItems=[
    member.note,
    hasRehearsals?`Cubre ${member.rehearsalsAttended} de ${TEAM_OVERVIEW.rehearsals} ensayos analizados.`:'Sin registro completo de frecuencia en Hoja 2.',
    hasTardy
      ? (member.tardyPct===0?'Mantiene puntualidad perfecta en los ensayos registrados.':`${formatPercent(member.tardyPct)} de sus participaciones tuvieron llegada tarde.`)
      : 'No hay datos de puntualidad para este tenor en Hoja 2.'
  ].filter(Boolean);
  const bulletList=bulletItems.length?bulletItems.map(item=>`<li>${item}</li>`).join(''):'<li>Sin datos adicionales.</li>';
  const metrics=[
    {value:formatMinutes(member.minutes),label:'Tiempo activo',note:'Meta 1920 min'},
    {value:formatMinutes(member.minutesLost),label:'Minutos perdidos',note:pendingBadge},
    {value:formatPercent(minutePct),label:'Tiempo ensayado',note:member.level},
    {value:freqValue,label:'Cobertura de ensayos',note:freqLabel}
  ].map(metric=>`<article class="metric-card"><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.note}</small></article>`).join('');
  const tardyLegend=hasTardy?`${member.tardyCount||0} eventos registrados`:'En espera de registro en Hoja 2.';
  $dataDetail.innerHTML=`<div class="data-detail__stack">
    <article class="data-detail__hero member-hero">
      <div class="data-hero-text">
        <p class="kicker">${member.level}</p>
        <h3>${member.name}</h3>
        <div class="data-legend">
          <span class="badge">Tiempo ensayado ${formatPercent(minutePct)}</span>
          <span class="badge badge--ghost">${pendingBadge}</span>
        </div>
      </div>
      <div class="dial dial--xl" style="--percent:${minutePct}%;"><div class="dial-value"><strong>${formatPercent(minutePct)}</strong><span>minutos</span></div></div>
    </article>
    <div class="member-metrics">${metrics}</div>
    <div class="member-columns">
      <section class="data-panel-box member-panel">
        <h4>Ritmo de minutos</h4>
        <div class="data-legend" style="margin-bottom:10px">
          <span class="badge badge--ghost">${formatMinutes(member.minutes)} activos</span>
          <span class="badge badge--ghost">Meta ${formatMinutes(TEAM_OVERVIEW.totalMinutes)}</span>
        </div>
        <div class="attendance-bar"><span style="--value:${minutePct}%;"></span></div>
        <p class="stat-card__note">${minutesNarrative}</p>
      </section>
      <section class="data-panel-box member-panel">
        <h4>Puntualidad</h4>
        <div class="data-legend" style="margin-bottom:10px">
          <span class="badge badge--ghost">${hasTardy?formatPercent(member.tardyPct):'Sin dato'}</span>
          <span class="badge badge--ghost">${tardyLegend}</span>
        </div>
        <div class="attendance-bar"><span style="--value:${tardyWidth}%;"></span></div>
        <p class="stat-card__note">${tardyNote}${tardyExtra?` ${tardyExtra}`:''}</p>
      </section>
    </div>
    <section class="data-panel-box data-panel-box--notes member-panel">
      <h4>Notas clave</h4>
      <ul class="detail-list">${bulletList}</ul>
    </section>
  </div>`;
}
function updateTenorView(){
  if(!$tenorListView||!$tenorDetailView) return;
  const hasSelection=currentDataMemberId&&TENOR_LOOKUP[currentDataMemberId];
  $tenorListView.hidden=!!hasSelection;
  $tenorDetailView.hidden=!hasSelection;
  renderDataDetail(hasSelection?currentDataMemberId:null);
  setActiveDataCard(hasSelection?currentDataMemberId:null);
  if(hasSelection){$tenorDetailView.scrollTop=0;}
  else if($tenorListView){$tenorListView.scrollTop=0;}
}
function showTenorDetail(id){
  if(!TENOR_LOOKUP[id]) return;
  currentDataMemberId=id;
  setDataTab('tenors');
}
function resetTenorView(){
  currentDataMemberId=null;
  updateTenorView();
}
function setDataTab(tab){
  if(!$dataPanel) return;
  const normalized=tab==='overview'?'overview':'tenors';
  currentDataTab=normalized;
  const sections={overview:$dataOverview,tenors:$dataTenors};
  document.querySelectorAll('[data-tab-target]').forEach(btn=>{
    const is=btn.dataset.tabTarget===normalized;
    btn.classList.toggle('is-active',is);
    btn.setAttribute('aria-selected',is?'true':'false');
  });
  Object.entries(sections).forEach(([key,section])=>{
    if(section) section.hidden=key!==normalized;
  });
  if(normalized==='tenors') updateTenorView();
}

function renderPresentations(){
  renderCalendar();
  renderUpcomingList();
}

function renderUpcomingList(){
  if(!$presentationsList) return;
  const upcoming=getUpcomingEvents(3);
  if(!upcoming.length){
    $presentationsList.innerHTML='<p class="presentations-empty">Sin presentaciones registradas.</p>';
    return;
  }
  $presentationsList.innerHTML=upcoming.map(event=>{
    const tag=event.tag?`<div class="upcoming-card__tag">${event.tag}</div>`:'';
    return `<article class="upcoming-card">
      <div>
        <p class="calendar-eyebrow">${formatCalendarDate(event.date)}</p>
        <h4>${event.title}</h4>
      </div>
      <div class="upcoming-card__meta">
        <span>${event.startTime}</span>
        <span>Salida ${event.callTime}</span>
        <span>${event.venue}</span>
      </div>
      <p class="upcoming-card__summary">${event.summary}</p>
      ${tag}
    </article>`;
  }).join('');
}

function renderCalendar(){
  if(!$presentationsCalendar) return;
  ensureSelectedPresentationDate();
  const monthsHtml=CALENDAR_MONTHS.map(month=>buildCalendarMonth(month)).join('');
  $presentationsCalendar.innerHTML=monthsHtml;
  if(!$presentationsCalendar.dataset.bound){
    $presentationsCalendar.addEventListener('click',ev=>{
      const btn=ev.target.closest('.calendar-day');
      if(!btn||!btn.dataset.date) return;
      selectedPresentationDate=btn.dataset.date;
      updateCalendarSelection();
      openCalendarPopover(selectedPresentationDate,rectToObject(btn.getBoundingClientRect()));
    });
    $presentationsCalendar.dataset.bound='true';
  }
  updateCalendarSelection();
  if($calendarPopover&&!$calendarPopover.hidden) positionCalendarPopover();
}

function buildCalendarMonth(monthKey){
  const [yearStr,monthStr]=monthKey.split('-');
  const year=Number(yearStr);
  const monthIndex=Number(monthStr)-1;
  const baseDate=new Date(year,monthIndex,1);
  const monthLabel=baseDate.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const niceLabel=monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1);
  const totalDays=new Date(year,monthIndex+1,0).getDate();
  const firstDayOffset=(baseDate.getDay()+6)%7;
  const dayNameRow=DAY_NAMES.map(name=>`<span class="calendar-dayname">${name}</span>`).join('');
  let dayCells='';
  for(let i=0;i<firstDayOffset;i++){
    dayCells+='<span class="calendar-day calendar-day--empty" aria-hidden="true"></span>';
  }
  for(let day=1;day<=totalDays;day++){
    const dateStr=`${monthKey}-${String(day).padStart(2,'0')}`;
    const hasEvent=getEventsOnDate(dateStr).length>0;
    const classes=['calendar-day'];
    if(hasEvent) classes.push('has-event');
    else classes.push('is-empty');
    if(dateStr===selectedPresentationDate) classes.push('is-selected');
    const ariaLabel=formatCalendarDate(dateStr);
    dayCells+=`<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" aria-label="${ariaLabel}">${day}</button>`;
  }
  return `<article class="calendar-month">
    <div class="calendar-month__title">${niceLabel}</div>
    <div class="calendar-grid">${dayNameRow}${dayCells}</div>
  </article>`;
}

function updateCalendarSelection(){
  if(!$presentationsCalendar) return;
  $presentationsCalendar.querySelectorAll('.calendar-day').forEach(btn=>{
    if(!btn.dataset.date) return;
    btn.classList.toggle('is-selected',btn.dataset.date===selectedPresentationDate);
  });
}

function rectToObject(rect){
  if(!rect) return null;
  return {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,width:rect.width,height:rect.height};
}

function getActiveCalendarDayRect(){
  if(!$presentationsCalendar) return null;
  const active=$presentationsCalendar.querySelector('.calendar-day.is-selected');
  return active?rectToObject(active.getBoundingClientRect()):null;
}

function openCalendarPopover(date,anchorRect){
  if(!$calendarPopover||!$calendarPopoverBody) return;
  const anchor=anchorRect?rectToObject(anchorRect):null;
  const events=getEventsOnDate(date);
  const dateLabel=formatCalendarDate(date);
  if($calendarPopoverDate) $calendarPopoverDate.textContent=dateLabel;
  if(!events.length){
    if($calendarPopoverTitle) $calendarPopoverTitle.textContent='Sin presentaciones';
    $calendarPopoverBody.innerHTML='<p class="presentations-empty">No hay presentaciones registradas para esta fecha.</p>';
  }else{
    if($calendarPopoverTitle) $calendarPopoverTitle.textContent='Concierto';
    $calendarPopoverBody.innerHTML=events.map(event=>{
      return `<section class="calendar-popover__event">
        <p>${event.venue}, ${event.city}</p>
        <div class="calendar-detail__meta">
          <div><small>Hora</small><span>${event.startTime}</span></div>
          <div><small>Salida</small><span>${event.callTime}</span></div>
          <div><small>Lugar</small><span>${event.venue}</span></div>
        </div>
      </section>`;
    }).join('');
  }
  $calendarPopover.hidden=false;
  requestAnimationFrame(()=>{
    $calendarPopover.classList.add('is-visible');
    positionCalendarPopover(anchor);
  });
}

function closeCalendarPopover(){
  if(!$calendarPopover||$calendarPopover.hidden) return;
  $calendarPopover.classList.remove('is-visible');
  const card=$calendarPopover.querySelector('.calendar-popover__card');
  if(card){
    card.style.top='';
    card.style.left='';
  }
  setTimeout(()=>{ if($calendarPopover) $calendarPopover.hidden=true; },220);
}

function positionCalendarPopover(anchorRect){
  if(!$calendarPopover||$calendarPopover.hidden) return;
  const card=$calendarPopover.querySelector('.calendar-popover__card');
  if(!card) return;
  let rect=anchorRect||getActiveCalendarDayRect();
  if(!rect){
    rect={top:window.innerHeight/2,bottom:window.innerHeight/2,left:window.innerWidth/2,width:0,height:0};
  }
  const cardWidth=card.offsetWidth;
  const cardHeight=card.offsetHeight;
  const offset=16;
  let top=(rect.bottom||rect.top||0)+offset;
  if(top+cardHeight>window.innerHeight-offset){
    top=(rect.top||rect.bottom||0)-cardHeight-offset;
  }
  if(top<offset) top=offset;
  let left=(rect.left||0)+(rect.width||0)/2-cardWidth/2;
  if(left<offset) left=offset;
  const maxLeft=window.innerWidth-cardWidth-offset;
  if(left>maxLeft) left=maxLeft;
  card.style.top=`${Math.round(top)}px`;
  card.style.left=`${Math.round(left)}px`;
}

function getEventsOnDate(date){
  if(!date) return [];
  return PRESENTATION_EVENTS.filter(event=>event.date===date);
}

function getUpcomingEvents(limit){
  const sorted=[...PRESENTATION_EVENTS].sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(typeof limit==='number') return sorted.slice(0,limit);
  return sorted;
}

function ensureSelectedPresentationDate(){
  if(selectedPresentationDate&&getEventsOnDate(selectedPresentationDate).length) return;
  const upcoming=getUpcomingEvents(1);
  if(upcoming.length) selectedPresentationDate=upcoming[0].date;
  else selectedPresentationDate=CALENDAR_MONTHS[0]?`${CALENDAR_MONTHS[0]}-01`:null;
}

function formatCalendarDate(dateStr){
  if(!dateStr) return 'Sin fecha';
  const date=new Date(`${dateStr}T00:00:00`);
  if(Number.isNaN(date.getTime())) return dateStr;
  const label=date.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return label.charAt(0).toUpperCase()+label.slice(1);
}

function openPresentationsPanel(){
  if(!$presentationsPanel) return;
  if(document.body.classList.contains('data-panel-open')) closeDataPanel();
  if(presentationsTimer){clearTimeout(presentationsTimer);presentationsTimer=null;}
  closeCalendarPopover();
  renderPresentations();
  $presentationsPanel.hidden=false;
  requestAnimationFrame(()=>document.body.classList.add('presentations-panel-open'));
}
function closePresentationsPanel(){
  if(!$presentationsPanel||$presentationsPanel.hidden) return;
  if(presentationsTimer){clearTimeout(presentationsTimer);presentationsTimer=null;}
  closeCalendarPopover();
  document.body.classList.remove('presentations-panel-open');
  presentationsTimer=setTimeout(()=>{
    $presentationsPanel.hidden=true;
    presentationsTimer=null;
  },320);
}

function setupPresentationsPanel(){
  if(!$presentationsPanel) return;
  $presentationsPanel.hidden=true;
  renderPresentations();
  if($presentationsClose) $presentationsClose.addEventListener('click',closePresentationsPanel);
  $presentationsPanel.addEventListener('click',ev=>{
    if(ev.target&&ev.target.dataset&&ev.target.dataset.role==='close-presentations') closePresentationsPanel();
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&document.body.classList.contains('presentations-panel-open')) closePresentationsPanel();
  });
}

function setupCalendarPopover(){
  if(!$calendarPopover) return;
  if($calendarPopoverClose) $calendarPopoverClose.addEventListener('click',closeCalendarPopover);
  $calendarPopover.addEventListener('click',ev=>{
    if(ev.target&&ev.target.dataset&&ev.target.dataset.role==='close-calendar') closeCalendarPopover();
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&!$calendarPopover.hidden) closeCalendarPopover();
  });
  window.addEventListener('resize',()=>{ if($calendarPopover&&!$calendarPopover.hidden) positionCalendarPopover(); });
  window.addEventListener('scroll',()=>{ if($calendarPopover&&!$calendarPopover.hidden) positionCalendarPopover(); },{passive:true});
}

function setMenuState(open){
  if(!$menuToggle||!$quickMenu) return;
  isMenuOpen=!!open;
  $menuToggle.setAttribute('aria-expanded',isMenuOpen?'true':'false');
  $quickMenu.hidden=!isMenuOpen;
}

function setupMenu(){
  if(!$menuToggle||!$quickMenu) return;
  setMenuState(false);
  $menuToggle.addEventListener('click',()=>setMenuState(!isMenuOpen));
  document.addEventListener('click',ev=>{
    if(!isMenuOpen) return;
    if(ev.target.closest('#menuToggle')||ev.target.closest('#quickMenu')) return;
    setMenuState(false);
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&isMenuOpen) setMenuState(false);
  });
  $quickMenu.addEventListener('click',ev=>{
    const btn=ev.target.closest('.quick-menu__item');
    if(!btn) return;
    const action=btn.dataset.action;
    setMenuState(false);
    if(action==='data'){ setDataTab('tenors'); openDataPanel();}
    else if(action==='presentations') openPresentationsPanel();
  });
}

function openDataPanel(targetId){
  if(!$dataPanel) return;
  if(document.body.classList.contains('presentations-panel-open')) closePresentationsPanel();
  ensureDataCards();
  const isValidTarget=targetId&&TENOR_LOOKUP[targetId];
  if(isValidTarget) currentDataMemberId=targetId;
  if(dataPanelTimer){clearTimeout(dataPanelTimer);dataPanelTimer=null;}
  $dataPanel.hidden=false;
  requestAnimationFrame(()=>document.body.classList.add('data-panel-open'));
  if($dataToggle) $dataToggle.setAttribute('aria-expanded','true');
  setDataTab(currentDataTab||'overview');
}
function closeDataPanel(){
  if(!$dataPanel||$dataPanel.hidden) return;
  if(dataPanelTimer){clearTimeout(dataPanelTimer);dataPanelTimer=null;}
  document.body.classList.remove('data-panel-open');
  if($dataToggle) $dataToggle.setAttribute('aria-expanded','false');
  dataPanelTimer=setTimeout(()=>{
    $dataPanel.hidden=true;
    dataPanelTimer=null;
  },320);
}
function setupDataPanel(){
  if(!$dataPanel) return;
  $dataPanel.hidden=true;
  if($dataToggle){
    $dataToggle.setAttribute('aria-expanded','false');
    $dataToggle.addEventListener('click',()=>{
      const isOpen=document.body.classList.contains('data-panel-open') && !$dataPanel.hidden;
      if(isOpen) closeDataPanel(); else openDataPanel();
    });
  }
  if($dataClose) $dataClose.addEventListener('click',closeDataPanel);
  $dataPanel.addEventListener('click',ev=>{
    if(ev.target&&ev.target.dataset&&ev.target.dataset.role==='close-panel') closeDataPanel();
  });
  if($dataCards){
    $dataCards.addEventListener('click',ev=>{
      const btn=ev.target.closest('.data-card');
      if(!btn) return;
      const id=btn.dataset.target||null;
      if(!id) return;
      showTenorDetail(id);
    });
  }
  if($tenorBack) $tenorBack.addEventListener('click',resetTenorView);
  const tabButtons=$dataPanel.querySelectorAll('[data-tab-target]');
  tabButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      setDataTab(btn.dataset.tabTarget);
    });
  });
  setDataTab(currentDataTab);
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&!$dataPanel.hidden) closeDataPanel();
  });
}
setupDataPanel();
renderTeamDetail();
setupPresentationsPanel();
setupCalendarPopover();
setupMenu();
// Navegación
function routerInit(){ setZoom(getZoom()); route(); }
window.addEventListener('hashchange',route);
window.addEventListener('DOMContentLoaded',routerInit);

// Back link
document.querySelector('.back').addEventListener('click',e=>{e.preventDefault(); history.replaceState(null,'',location.pathname+location.search); route();});

// Confeti AÚ AÚ
(function(){
  const btn=document.getElementById('auBtn');
  function burst(){
    const N=50;
    for(let i=0;i<N;i++){
      const d=document.createElement('div'); d.className='confetti';
      const sx=Math.random()*window.innerWidth; const drift=(Math.random()*2-1)*120; const rot=(Math.random()*360).toFixed(0)+'deg';
      d.style.left=sx+'px'; d.style.setProperty('--x',drift+'px'); d.style.setProperty('--r',rot);
      const w=6+Math.random()*6,h=8+Math.random()*10; d.style.width=w+'px'; d.style.height=h+'px';
      d.style.background=['#0FFC7E','#19e58a','#13c971','#12b866'][i%4]; d.style.opacity=(0.75+Math.random()*0.25).toFixed(2);
      d.style.animationDelay=(Math.random()*300)+'ms'; document.body.appendChild(d); setTimeout(()=>d.remove(),1200);
    }
  }
  let t=null;
  btn.addEventListener('click',()=>{
    burst(); clearInterval(t);
    const start=Date.now();
    t=setInterval(()=>{burst(); if(Date.now()-start>3000) clearInterval(t)},600);
  });
})();

// Tests básicos
(function tests(){
  console.group('%cTests Tenores','color:#0ffc7e');
  console.assert(typeof SONGS.fum==='object' && !!SONGS.fum.track,'fum ok');
  console.assert(escapeHtml('<>&"\'' ).includes('&lt;'),'escape ok');
  console.assert(formatLyrics('a\n\nb').includes('<p>'),'format ok');
  console.groupEnd();
})();
