// Solo datos efímeros de scripts/dev.mjs --test en 8788; audio simulado por Chrome.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const admin=await browser.newContext(),tenor=await browser.newContext({permissions:['microphone'],viewport:{width:1280,height:900}}),page=await tenor.newPage(),base='http://127.0.0.1:8788',errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  const login=await admin.request.post(base+'/api/login',{headers:{Origin:base},data:{username:'prueba-jefatura',password:'test-only-admin-password'}});assert(login.ok());const csrf=(await login.json()).csrf;
  const read=async path=>{const r=await admin.request.get(base+path);assert(r.ok());return r.json();};
  const post=async(path,data)=>{const r=await admin.request.post(base+path,{headers:{Origin:base,'X-CSRF-Token':csrf},data});const result=await r.json();assert(r.ok(),JSON.stringify(result));return result;};
  const season=(await read('/api/public/seasons')).find(s=>s.year===2026).id;
  const person=(await read('/api/admin/users')).find(u=>u.username==='prueba-tenor-0');assert(person);
  const members=(await read(`/api/admin/memberships?season=${season}`)).filter(m=>m.active&&m.account_active);assert.equal(members.length,2);
  let rehearsal={id:crypto.randomUUID(),request_id:crypto.randomUUID(),season_id:season,rehearsal_date:'2026-07-18',starts_at:'08:00',ends_at:'12:00',status:'draft',is_live:true,version:0,attendance:members.map(m=>({user_id:m.id,attendance_status:m.id===person.id?'pending':'on_time'}))};
  const previous=(await read(`/api/admin/rehearsals?season=${season}`)).find(r=>r.rehearsal_date===rehearsal.rehearsal_date&&r.starts_at===rehearsal.starts_at);if(previous){rehearsal.id=previous.id;rehearsal.version=previous.version;}
  await post('/api/admin/rehearsals',rehearsal);
  await page.goto(base);await page.getByLabel('Usuario',{exact:true}).fill('prueba-tenor-0');await page.locator('#loginPassword').fill('1357');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.locator('#accessGate').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Abrir menú de opciones',exact:true}).click();await page.getByRole('button',{name:'Mi progreso',exact:true}).click();await page.getByRole('heading',{name:'Ensayo a ensayo',exact:true}).waitFor();const row=page.locator('#platformContent tr').filter({hasText:'2026-07-18'});assert((await row.innerText()).includes('Por llegar'));
  rehearsal={...rehearsal,version:rehearsal.version+1,request_id:crypto.randomUUID(),attendance:rehearsal.attendance.map(a=>a.user_id===person.id?{...a,attendance_status:'late',late_reason:'justified',arrival_at:'09:00'}:a)};
  await post('/api/admin/rehearsals',rehearsal);
  await page.waitForFunction(()=>[...document.querySelectorAll('#platformContent tr')].some(tr=>tr.textContent.includes('2026-07-18')&&tr.textContent.includes('09:00')&&tr.textContent.includes('Justificada')),{},{timeout:16000});
  await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/progreso-actualizado.png',animations:'disabled'});checks.push('La llegada guardada por jefatura aparece automáticamente en la cuenta del tenor dentro de 10 segundos');
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();await page.goto(base+'/#fum');await page.getByRole('button',{name:'Practicar con guía',exact:true}).waitFor();assert(!/90\s?%/.test(await page.locator('#practiceCard').innerText()));await page.getByRole('button',{name:'Practicar con guía',exact:true}).click();await page.locator('.practice-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('.practice-panel h2').first().innerText(),'Fum Fum Fum');assert(!/90\s?%|similitud/i.test(await page.locator('.practice-panel').innerText()));assert.equal(await page.locator('.similarity-preview, .similarity-high, .similarity-low').count(),0);
  await page.screenshot({path:'output/playwright/practica-con-guia.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/practica-con-guia-movil.png',animations:'disabled'});await page.setViewportSize({width:1280,height:900});
  await page.locator('.practice-close').click();await page.locator('.practice-panel').waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'Practicar con guía',exact:true}).isVisible());checks.push('«Practicar con guía» abre el panel de práctica de la canción sin ningún 90% fijo y al cerrarlo vuelve a la tarjeta');
  await post('/api/admin/rehearsals',{...rehearsal,status:'final',is_live:false,version:rehearsal.version+1,request_id:crypto.randomUUID()});
  assert.deepEqual(errors,[]);checks.push('Sin errores de JavaScript y sin usar el micrófono personal');
  await writeFile('output/playwright/live-result.json',JSON.stringify({checks,passed:checks.length,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await tenor.close();await admin.close();await browser.close();}
