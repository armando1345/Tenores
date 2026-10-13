import { mkdir, copyFile, cp, stat } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','styles.css','app.js','platform.css','platform.js','_headers']) await copyFile(name,`dist/${name}`);
await cp('assets','dist/assets',{recursive:true,filter: async src=> !(await stat(src)).isFile() || /\.(svg|png|jpg|webp)$/i.test(src)});
await mkdir('dist/encuesta',{recursive:true});
for(const name of ['index.html','styles.css','encuesta.js','config.js']) await copyFile(`encuesta/${name}`,`dist/encuesta/${name}`);
console.log('Static Assets preparados; no se publican SQL, servidor, copias ni secretos.');
