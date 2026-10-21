import { mkdir, copyFile, realpath, rm, cp, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const workspace=await realpath(process.cwd()),output=resolve(workspace,'dist');
if(!output.startsWith(workspace+sep))throw new Error('El build debe permanecer dentro del proyecto');
try{if(await realpath(output)!==output)throw new Error('dist no puede ser un enlace a otra carpeta');}catch(e){if(e.code!=='ENOENT')throw e;}
await rm(output,{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const name of ['index.html','styles.css','app.js','platform.css','platform.js','advanced.js','_headers']) await copyFile(name,`dist/${name}`);
await mkdir('dist/assets',{recursive:true});
await copyFile('assets/letter-banner.svg','dist/assets/letter-banner.svg');
await mkdir('dist/encuesta',{recursive:true});
for(const name of ['index.html','styles.css','encuesta.js','config.js']) await copyFile(`encuesta/${name}`,`dist/encuesta/${name}`);
await cp('practice','dist/practice',{recursive:true,filter: async src=> !(await stat(src)).isFile() || /\.(js|css)$/i.test(src)});
console.log('Static Assets preparados; no se publican SQL, servidor, copias ni secretos.');
