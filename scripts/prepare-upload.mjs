// Preparación local únicamente: no accede a GitHub ni crea recursos Cloudflare.
import {readFile,writeFile,mkdir,copyFile,readdir,lstat,stat,rename,realpath} from 'node:fs/promises';
import {resolve,relative,sep,dirname} from 'node:path';
import {DatabaseSync,backup} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';

const workspace=await realpath(process.cwd()),target=resolve(workspace,'PARA-SUBIR-A-GITHUB');
const inWorkspace=path=>{const full=resolve(path);if(!full.startsWith(workspace+sep))throw new Error('Ruta fuera del proyecto');return full;};
inWorkspace(target);
try{await stat(target);throw new Error('PARA-SUBIR-A-GITHUB ya existe. Conserva esa entrega antes de generar otra.');}catch(e){if(e.code!=='ENOENT')throw e;}
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/El_Salvador',dateStyle:'short',timeStyle:'medium'}).format(new Date()).replaceAll(/[^0-9]/g,'');
const backupDir=inWorkspace(resolve('.local',`respaldo-publicacion-${stamp}-${randomUUID().slice(0,8)}`));
const stage=inWorkspace(resolve('.local',`preparacion-github-${randomUUID()}`));
await mkdir(backupDir,{recursive:true});await mkdir(stage,{recursive:true});

const files=['index.html','styles.css','app.js','platform.css','platform.js','advanced.js','_headers','.gitignore','.gitattributes','package.json','pnpm-lock.yaml','wrangler.jsonc','README.md','assets/letter-banner.svg'];
async function addDirectory(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=`${directory}/${entry.name}`;
    if(entry.isSymbolicLink())throw new Error(`Enlace no permitido: ${path}`);
    if(entry.isDirectory())await addDirectory(path);else if(entry.isFile())files.push(path);
  }
}
for(const directory of ['server','migrations','docs','tests','encuesta','practice'])await addDirectory(directory);
for(const entry of await readdir('scripts',{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('.mjs')&&entry.name!=='seed.mjs')files.push(`scripts/${entry.name}`);
}

const source=new DatabaseSync('.local/tenores.sqlite',{readOnly:true});
let secrets,ready,counts;
try{
  secrets=source.prepare('SELECT password_hash FROM users WHERE password_hash IS NOT NULL').all().map(u=>u.password_hash);
  const people=source.prepare("SELECT display_name FROM users WHERE role='tenor' AND active=1").all();
  secrets.push(...people.map(u=>`${u.display_name}2026`));
  try{secrets.push((await readFile('.local/setup-key.txt','utf8')).trim());}catch(e){if(e.code!=='ENOENT')throw e;}
  await backup(source,resolve(backupDir,'tenores.sqlite'));
}finally{source.close();}

const snapshot=new DatabaseSync(resolve(backupDir,'tenores.sqlite'),{readOnly:true});
try{
  if(snapshot.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('El respaldo SQLite no pasó la comprobación');
  ready=snapshot.prepare("SELECT r2_object_key,file_size FROM recordings WHERE status='ready'").all();
  counts=Object.fromEntries(['users','rehearsals','rehearsal_attendance','recordings','legacy_attendance'].map(table=>[table,snapshot.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
}finally{snapshot.close();}

async function copyTree(sourceDir,destination){
  await mkdir(destination,{recursive:true});
  for(const entry of await readdir(sourceDir,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('Enlace no permitido en respaldo de audios');
    const from=resolve(sourceDir,entry.name),to=inWorkspace(resolve(destination,entry.name));
    if(entry.isDirectory())await copyTree(from,to);else if(entry.isFile())await copyFile(from,to);
  }
}
try{await copyTree('.local/recordings',resolve(backupDir,'recordings'));}catch(e){if(e.code!=='ENOENT'||ready.length)throw e;}
for(const recording of ready){
  const path=resolve(backupDir,'recordings',recording.r2_object_key),audioRoot=resolve(backupDir,'recordings');
  if(!path.startsWith(audioRoot+sep))throw new Error('Clave de audio fuera del respaldo');
  if((await stat(path)).size!==recording.file_size)throw new Error('Audio del respaldo incompleto');
}
await writeFile(resolve(backupDir,'LEEME-PRIVADO.txt'),'RESPALDO PRIVADO DE TENORES. No subir a GitHub.\nContiene cuentas y contraseñas protegidas, historial y audios.\nLa base se creó con el respaldo consistente de SQLite.\n');

const manifest=[];
for(const file of files){
  if(/[\\/](?:\.local|node_modules|\.wrangler|backups|output|dist)(?:[\\/]|$)/.test('/'+file)||/\.(?:sqlite|db|zip|log|mp3|webm|m4a|ogg)$/i.test(file))throw new Error(`Archivo privado o ajeno: ${file}`);
  const sourcePath=inWorkspace(resolve(file));if((await lstat(sourcePath)).isSymbolicLink())throw new Error(`Enlace no permitido: ${file}`);
  const bytes=await readFile(sourcePath),text=bytes.toString('utf8').normalize('NFC');
  if(secrets.some(secret=>secret&&text.includes(secret.normalize('NFC')))||/\bTenores A.{0,2} 2026\b/u.test(text))throw new Error(`Coincidencia con credencial real: ${file}. No se ha generado la carpeta pública.`);
  const destination=inWorkspace(resolve(stage,file));await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);
  manifest.push({file,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const guide=await readFile('docs/SUBIDA-GITHUB.md','utf8');await writeFile(resolve(stage,'LEEME-ANTES-DE-SUBIR.md'),guide);
manifest.push({file:'LEEME-ANTES-DE-SUBIR.md',size:Buffer.byteLength(guide),sha256:createHash('sha256').update(guide).digest('hex')});

// Ambos extremos se validan antes de mover únicamente la entrega recién creada.
inWorkspace(stage);inWorkspace(target);await rename(stage,target);
await mkdir('output',{recursive:true});
const report={repository:'https://github.com/armando1345/Tenores',branch:'plataforma-2026',uploadFolder:relative(workspace,target),privateBackup:relative(workspace,backupDir),files:manifest,totalBytes:manifest.reduce((sum,f)=>sum+f.size,0),backupCounts:counts,backupReadyAudios:ready.length,credentialsScan:'passed',remoteChanges:false};
await writeFile('output/github-preparacion.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({folder:target,files:manifest.length,bytes:report.totalBytes,privateBackup:backupDir,readyAudios:ready.length,credentialsScan:'passed',remoteChanges:false}));
