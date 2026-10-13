import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import worker from '../server/worker.mjs';
import { LocalD1,LocalR2 } from './local-adapters.mjs';
import { hashPassword } from '../server/security.mjs';
const testMode=process.argv.includes('--test');
await mkdir('.local',{recursive:true});
const DB=new LocalD1(testMode?':memory:':'.local/tenores.sqlite');await DB.migrate();
if(testMode){
  const hash=await hashPassword('test-only-admin-password');
  DB.sqlite.prepare("INSERT INTO users(id,username,display_name,password_hash,role,active) VALUES(?,'prueba-jefatura','Jefatura · prueba local',?,'admin',1)").run(crypto.randomUUID(),hash);
  const members=DB.sqlite.prepare('SELECT user_id FROM season_memberships WHERE season_id=(SELECT id FROM seasons WHERE year=2026) ORDER BY user_id LIMIT 2').all();
  for(const [i,m] of members.entries())DB.sqlite.prepare('UPDATE users SET username=?,password_hash=?,active=1 WHERE id=?').run(`prueba-tenor-${i}`,hash,m.user_id);
}
let setupKey=process.env.BOOTSTRAP_SECRET;
if(!setupKey){try{setupKey=(await readFile('.local/setup-key.txt','utf8')).trim();}catch{setupKey=randomBytes(32).toString('base64url');await writeFile('.local/setup-key.txt',setupKey);}}
const root=resolve('dist'),mimes={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const env={LOCAL:true,DB,RECORDINGS:new LocalR2(testMode?null:'.local/recordings'),BOOTSTRAP_SECRET:setupKey,ASSETS:{async fetch(request){
  const path=decodeURIComponent(new URL(request.url).pathname),file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(root+sep))return new Response('Not found',{status:404});
  try{return new Response(await readFile(file),{headers:{'Content-Type':mimes[file.split('.').at(-1)]||'application/octet-stream','Cache-Control':'no-store'}});}catch{return new Response('Not found',{status:404});}
}}};
const server=createServer(async(req,res)=>{
  try{
    const port=String(process.env.PORT||8787),requestedHost=req.headers.host;
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(requestedHost)){res.writeHead(403);res.end('Local host not allowed');return;}
    const host=`http://${requestedHost}`,request=new Request(host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{res.writeHead(500);res.end('Local server error');}
});
server.listen(Number(process.env.PORT||8787),'127.0.0.1',()=>console.log('Tenores local: http://127.0.0.1:'+ (process.env.PORT||8787)+' · Configuración inicial: clave en .local/setup-key.txt (no versionada). Backend real, adaptadores locales de SQLite y archivos.'));
