// Usar exclusivamente con una vista previa nueva: scripts/dev.mjs --test en 8788.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);}
const {chromium}=playwright;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],base='http://127.0.0.1:8788';
page.on('pageerror',error=>errors.push(error.message));
const menu=async view=>{await page.getByRole('button',{name:'Abrir menú de opciones',exact:true}).click();await page.locator(`#platformNav [data-view="${view}"]`).click();};
const chooseSeason=async year=>{await page.locator('#seasonPickerToggle').click();await page.locator('#seasonPickerMenu').getByRole('option',{name:String(year),exact:true}).click();};
try{
  await mkdir('output/playwright',{recursive:true});await page.goto(base);
  await page.getByLabel('Usuario',{exact:true}).fill('prueba-jefatura');await page.locator('#loginPassword').fill('test-only-admin-password');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();
  await page.waitForFunction(()=>document.getElementById('loginStatus').textContent==='');
  const mission=await page.locator('.admin-hero h1').innerText();assert(mission.includes('Tu misión es servir al equipo de tenores.'));assert(mission.includes('Dentro de tus posibilidades, encárgate ahora mismo de que cada miembro del equipo sea al menos un poco mejor'));
  assert.deepEqual(await page.locator('#platformSeason option').allTextContents(),['2026','2025']);
  const session=await (await page.request.get(base+'/api/session')).json(),headers={Origin:base,'X-CSRF-Token':session.csrf};
  const season=await page.locator('#platformSeason').inputValue(),members=(await (await page.request.get(`${base}/api/admin/memberships?season=${season}`)).json()).filter(m=>m.active&&m.account_active);
  const rehearsal={id:crypto.randomUUID(),request_id:crypto.randomUUID(),season_id:season,rehearsal_date:'2026-07-17',starts_at:'08:00',ends_at:'12:00',status:'final',version:0,attendance:members.map((m,i)=>i===0?{user_id:m.id,attendance_status:'on_time'}:{user_id:m.id,attendance_status:'late',late_reason:'unjustified',arrival_at:'08:35'})};
  const saved=await page.request.post(base+'/api/admin/rehearsals',{headers,data:rehearsal});assert(saved.ok());await page.reload();await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();await menu('summary');await page.getByRole('heading',{name:'Grupos de desempeño',exact:true}).waitFor();
  for(const name of ['Asistencia de tenores','Nota de práctica del equipo','Grupos de desempeño','Observaciones'])assert(await page.getByRole('heading',{name,exact:true}).isVisible());
  assert.equal(await page.locator('.dashboard-team-table .tenor-name').filter({hasText:'↗'}).count(),0);
  const stats=await (await page.request.get(base+'/api/public/stats?year=2026')).json();assert.equal(await page.locator('.dashboard-summary-metrics strong').first().innerText(),`${stats.overview.averageAttendance.toFixed(1)}%`);
  await page.locator('#adminDashboard').screenshot({path:'output/playwright/dashboard-ampliado-2026.png',animations:'disabled'});
  await chooseSeason(2025);await page.getByText('Nivel superior (100%)',{exact:true}).waitFor();
  const historical=await page.evaluate(()=>window.getTenoresSeasonSnapshot(2025));assert.equal(await page.locator('.dashboard-summary-metrics strong').first().innerText(),'78.3%');
  for(const person of historical.members){const row=page.locator('.dashboard-team-table tr[data-tenor]').filter({has:page.getByRole('button',{name:`Ver datos de ${person.name}`,exact:true})});assert.equal(await row.locator('td').nth(1).innerText(),`${person.attendance.toLocaleString('es-SV',{maximumFractionDigits:1})}%`);}
  assert.equal(await page.locator('.dashboard-observations li').count(),historical.overview.observations.length);assert((await page.locator('.dashboard-insights').innerText()).includes('6 de septiembre - 22 de noviembre'));assert.equal(await page.locator('.dashboard-team-table tr[data-tenor]').count(),9);
  await page.locator('#adminDashboard').screenshot({path:'output/playwright/dashboard-ampliado-2025.png',animations:'disabled'});
  const caleb=page.locator('.dashboard-team-table tr[data-tenor]').filter({hasText:'Caleb'});await caleb.locator('td').nth(2).click();await page.getByRole('heading',{name:'Ensayo a ensayo',exact:true}).waitFor();
  assert((await page.locator('.member-analysis-columns').innerText()).includes('50% fueron justificadas.'));assert((await page.locator('#platformContent').innerText()).includes('no se registró un desglose de cada ensayo'));
  const cta=page.getByRole('button',{name:'Revisar grabaciones',exact:true});assert(await cta.isVisible());assert.equal(await page.locator('.recordings-review-section').evaluate(el=>getComputedStyle(el).marginTop),'48px');
  await page.locator('#platformContent').screenshot({path:'output/playwright/ficha-tenor-ampliada.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.locator('#platformContent').screenshot({path:'output/playwright/ficha-tenor-ampliada-movil.png',animations:'disabled'});
  await cta.click();await page.getByText('Prácticas de Caleb · Temporada 2025',{exact:true}).waitFor();assert(await page.locator('#recordingsList').isVisible());
  await menu('summary');await page.getByRole('heading',{name:'Progreso del equipo',exact:true}).waitFor();await page.locator('#adminDashboard').screenshot({path:'output/playwright/dashboard-ampliado-movil.png',animations:'disabled'});
  await page.getByRole('button',{name:'Abrir menú de opciones',exact:true}).click();await page.getByRole('button',{name:'Salir',exact:true}).click();await page.locator('#accessGate').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('loginStatus').textContent==='');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({historic_dashboard_matches_public:true,live_dashboard_has_charts_groups_observations:true,individual_time_attendance_tardiness_and_similarity:true,premium_recording_review_opens:true,no_login_success_message:true,plain_season_labels:true,no_name_arrows:true,mobile_checked:true,javascript_errors:errors}));
}finally{await context.close();await browser.close();}
