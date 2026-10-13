// Exclusivamente contra scripts/dev.mjs --test en 8788: datos y audio efímeros.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),base='http://127.0.0.1:8788',errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const menu=async view=>{await page.getByRole('button',{name:'Abrir menú de opciones',exact:true}).click();await page.locator(`#platformNav [data-view="${view}"]`).click();};
const season=async year=>{await page.locator('#seasonPickerToggle').click();await page.locator('#seasonPickerMenu').getByRole('option',{name:String(year),exact:true}).click();};
const noHome=async()=>{assert(!await page.locator('.admin-hero').isVisible());assert(!await page.locator('#adminRegister').isVisible());};
const screenshot=async name=>page.screenshot({path:`output/playwright/${name}.png`,animations:'disabled',fullPage:true});
try{
  await mkdir('output/playwright',{recursive:true});await page.goto(base);
  await page.getByLabel('Usuario',{exact:true}).fill('prueba-jefatura');await page.getByLabel('Contraseña',{exact:true}).fill('test-only-admin-password');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();
  assert(await page.locator('.admin-hero').isVisible());assert(await page.locator('#adminRegister').isVisible());assert.equal(await page.locator('#homeInsights .dashboard-chart').count(),2);assert.equal(await page.locator('#platformContent .dashboard-insight-columns').count(),0);assert.equal(await page.locator('.dashboard-team-table tr[data-tenor]').count(),8);assert(!await page.locator('#platformSeason').isVisible());
  await screenshot('jefatura-inicio-separado');checks.push('Inicio contiene la misión, registro de ensayo, dos gráficas y ocho tenores');
  await page.locator('#seasonPickerToggle').click();assert(await page.locator('#seasonPickerMenu').isVisible());await page.getByRole('heading',{name:'Similitud del equipo',exact:true}).click();assert(!await page.locator('#seasonPickerMenu').isVisible());
  await page.locator('#seasonPickerToggle').focus();await page.keyboard.press('ArrowDown');assert(await page.locator('#seasonPickerMenu').isVisible());await page.keyboard.press('Escape');assert(!await page.locator('#seasonPickerMenu').isVisible());
  const alignment=await page.locator('#seasonPickerToggle').evaluate(el=>{const b=el.getBoundingClientRect(),year=el.querySelector('span').getBoundingClientRect();return Math.abs((b.left+b.width/2)-(year.left+year.width/2));});assert(alignment<1);checks.push('Selector de temporada verde, centrado, con teclado y cierre exterior');
  await menu('summary');await page.getByRole('heading',{name:'Grupos de desempeño',exact:true}).waitFor();await noHome();assert(await page.getByRole('heading',{name:'Asistencia y puntualidad por tenor',exact:true}).isVisible());
  await page.locator('#statsViews summary').click();assert(await page.locator('#statsViews').evaluate(el=>el.open));await page.locator('#platformTitle').click();assert(!await page.locator('#statsViews').evaluate(el=>el.open));
  await page.locator('#statsViews summary').click();await page.locator('#seasonPickerToggle').click();assert(!await page.locator('#statsViews').evaluate(el=>el.open));await page.keyboard.press('Escape');
  await season(2025);await page.getByText('Nivel superior (100%)',{exact:true}).waitFor();assert.equal(await page.locator('.dashboard-summary-metrics strong').first().innerText(),'78.3%');assert.equal(await page.locator('.dashboard-team-table tr[data-tenor]').count(),9);await screenshot('jefatura-estadisticas-separadas');
  checks.push('Estadísticas detalladas sin misión ni registro, archivo 2025 conservado y vistas cerrables');
  await season(2026);await page.locator('.dashboard-team-table tr[data-tenor]').filter({hasText:'Liam'}).waitFor();await page.locator('.dashboard-team-table tr[data-tenor]').filter({hasText:'Liam'}).locator('td').nth(2).click();await page.getByRole('heading',{name:'Liam',exact:true}).waitFor();await noHome();assert(!await page.locator('#statsViews').isVisible());
  await page.locator('#seasonPickerToggle').click();assert.deepEqual(await page.locator('#seasonPickerMenu [data-season]').allTextContents(),['2026']);await page.getByRole('heading',{name:'Liam',exact:true}).click();assert(!await page.locator('#seasonPickerMenu').isVisible());await screenshot('ficha-liam-limpia');
  await page.getByRole('button',{name:'Revisar grabaciones',exact:true}).click();await page.getByRole('heading',{name:'Liam aún no ha subido ninguna práctica.',exact:true}).waitFor();await noHome();assert(!await page.locator('#statsViews').isVisible());assert(!await page.getByText('Tu práctica empieza aquí',{exact:true}).isVisible());checks.push('Liam muestra solo sus datos, su temporada y su biblioteca con mensaje personalizado');
  await menu('home');await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();await page.locator('.dashboard-team-table tr[data-tenor]').filter({hasText:'Héctor'}).locator('td').nth(1).click();await page.getByRole('heading',{name:'Héctor',exact:true}).waitFor();
  await season(2025);await page.waitForFunction(()=>document.querySelector('.tenor-detail-title')?.textContent==='Héctor'&&document.querySelector('#seasonPickerYear').textContent==='2025'&&document.querySelector('.member-analysis-columns')?.textContent.includes('84.9%'));await noHome();assert(!await page.locator('#statsViews').isVisible());await page.getByRole('button',{name:'Revisar grabaciones',exact:true}).click();await page.getByRole('heading',{name:'Héctor aún no ha subido ninguna práctica.',exact:true}).waitFor();
  await season(2026);await page.getByRole('heading',{name:'Héctor aún no ha subido ninguna práctica.',exact:true}).waitFor();assert.equal(await page.locator('#platformTitle').innerText(),'Grabaciones de Héctor');checks.push('Cambiar temporadas conserva la ficha y las grabaciones del mismo tenor');
  await menu('recordings');await page.getByText('Elige un tenor para revisar sus prácticas.',{exact:true}).waitFor();await noHome();assert.equal(await page.locator('[data-recording-tenor]').count(),8);await page.locator('[data-recording-tenor]').filter({hasText:'Liam'}).click();await page.getByRole('heading',{name:'Liam aún no ha subido ninguna práctica.',exact:true}).waitFor();checks.push('Grabaciones abre la lista de tenores y permite revisar directamente cada biblioteca');
  await menu('presentations');await page.getByRole('button',{name:'Registrar presentación',exact:true}).waitFor();await noHome();assert(!await page.locator('#statsViews').isVisible());assert(!await page.locator('.dashboard-team-table').isVisible());
  for(const view of ['users','songs','seasons']){await menu(view);await page.waitForFunction(()=>!document.getElementById('platformContent').textContent.includes('Cargando…'));await noHome();}
  checks.push('Presentaciones, integrantes, repertorio y temporadas mantienen solo su contenido');
  await menu('home');await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();assert(await page.locator('.admin-hero').isVisible());await page.setViewportSize({width:390,height:844});await screenshot('jefatura-inicio-separado-movil');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.dashboard-team-table tr[data-tenor]').filter({hasText:'Liam'}).locator('td').first().click();await page.getByRole('heading',{name:'Liam',exact:true}).waitFor();await screenshot('ficha-liam-limpia-movil');await noHome();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('Inicio y ficha individual comprobados en móvil');
  const uploader=await browser.newContext();
  try{
    const login=await uploader.request.post(base+'/api/login',{headers:{Origin:base},data:{username:'prueba-tenor-0',password:'test-only-admin-password'}});assert(login.ok());const auth=await login.json(),headers={Origin:base,'X-CSRF-Token':auth.csrf};
    const currentSeason=(await (await uploader.request.get(base+'/api/public/seasons')).json()).find(s=>s.year===2026),songs=await (await uploader.request.get(`${base}/api/public/songs?season=${currentSeason.id}`)).json(),ids=[];
    for(const song of songs.slice(0,2)){
      const meta={id:crypto.randomUUID(),season_id:currentSeason.id,song_id:song.id,duration_seconds:3,file_size:8,mime_type:'audio/webm;codecs=opus'};ids.push(meta.id);
      assert((await uploader.request.post(base+'/api/recordings/reserve',{headers,data:meta})).ok());
      assert((await uploader.request.put(`${base}/api/recordings/${meta.id}`,{headers:{...headers,'Content-Type':meta.mime_type},data:Buffer.from([0x1a,0x45,0xdf,0xa3,1,2,3,4])})).ok());
    }
    await menu('recordings');await page.locator(`[data-recording-tenor="${auth.user.id}"]`).waitFor();await page.locator(`[data-recording-tenor="${auth.user.id}"]`).click();await page.locator('.recording-group').first().waitFor();assert.equal(await page.locator('.recording-group').count(),2);assert.equal(await page.locator('.audio-history .record-preview-player').count(),2);
    for(const id of ids){assert.equal(await page.locator(`audio[data-private][src="/api/recordings/${id}/audio"]`).count(),1);assert((await page.request.get(`${base}/api/recordings/${id}/audio`)).ok());}
    await menu('recordings');await page.locator('[data-recording-tenor]').filter({hasText:'Liam'}).click();await page.getByRole('heading',{name:'Liam aún no ha subido ninguna práctica.',exact:true}).waitFor();assert.equal(await page.locator('.audio-history').count(),0);
    checks.push('Prácticas guardadas visibles por canción con reproductor brandeado y filtradas al tenor correcto');
  }finally{await uploader.close();}
  assert.deepEqual(errors,[]);await writeFile('output/playwright/navigation-result.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks,errors}));
}finally{await context.close();await browser.close();}
