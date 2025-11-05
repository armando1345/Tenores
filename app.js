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
  kling:{title:'Kling GlÃ¶ckchen, klingelingeling',explain:'',track:'https://res.cloudinary.com/dul66qlpq/video/upload/v1761827592/kling_cancion_xawypb.mp3'},
  tannenbaum:{title:'O Tannenbaum',explain:'',track:'https://res.cloudinary.com/dcwx23x5o/video/upload/v1761968289/oh_thanenbaum_kkhmya.mp3'}
};

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

let currentSongId=null, currentAudio=null, currentLabel='', plainLyrics='';

// Velocidad global
const SPEEDS=[1,1.25,1.5,2];
let gSpeed=1;

// Helpers
function setActiveCard(id){
  document.querySelectorAll('[data-song]').forEach(a=>{
    const is=a.getAttribute('data-song')===id;
    a.classList.toggle('active',is);
    if(is) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
function setLoading(btn,on,labelEl){
  if(on){btn.classList.add('is-loading');btn.setAttribute('aria-disabled','true'); if(labelEl)labelEl.textContent='Descargando…';}
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
  createPlayerUI({id:'exp',audio:$exp,label:'Explicación'}),
  createPlayerUI({id:'trk',audio:$trk,label:'Canción'})
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
  $miniTitle.textContent=SONGS[currentSongId]?.title||'—'; $miniSub.textContent=label;
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
  const label=idx===0?'Explicación':'Canción';
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

// Buscador + fix teclado mÃ³vil
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

// NavegaciÃ³n
function routerInit(){ setZoom(getZoom()); route(); }
window.addEventListener('hashchange',route);
window.addEventListener('DOMContentLoaded',routerInit);

// Back link
document.querySelector('.back').addEventListener('click',e=>{e.preventDefault(); history.replaceState(null,'',location.pathname+location.search); route();});

// Confeti AÃš AÃš
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

// Tests bÃ¡sicos
(function tests(){
  console.group('%cTests Tenores','color:#0ffc7e');
  console.assert(typeof SONGS.fum==='object' && !!SONGS.fum.track,'fum ok');
  console.assert(escapeHtml('<>&"\'' ).includes('&lt;'),'escape ok');
  console.assert(formatLyrics('a\n\nb').includes('<p>'),'format ok');
  console.groupEnd();
})();

