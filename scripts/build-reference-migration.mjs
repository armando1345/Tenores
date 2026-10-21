// Uso: node scripts/build-reference-migration.mjs <carpeta-de-curvas>
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const CHUNK=90000;
const dir=process.argv[2];
if(!dir){console.error('Uso: node scripts/build-reference-migration.mjs <carpeta-de-curvas>');process.exit(1);}
const q=s=>s.replaceAll("'","''");
const files=(await readdir(dir)).filter(f=>f.endsWith('.json')&&f!=='index.json').sort();
const out=['-- Generado por scripts/build-reference-migration.mjs; no editar a mano.'];
for(const file of files){
  const id=file.slice(0,-5),json=JSON.stringify(JSON.parse(await readFile(join(dir,file),'utf8')));
  const source=JSON.parse(json).source;
  if(!source)throw new Error(`${file} no tiene source`);
  const chunks=[];for(let i=0;i<json.length;i+=CHUNK)chunks.push(json.slice(i,i+CHUNK));
  out.push(`INSERT INTO song_references(song_id,source,reference) SELECT id, '${q(source)}', '${q(chunks[0])}' FROM songs WHERE legacy_key='${q(id)}' AND reference_audio_key='${q(source)}';`);
  for(const c of chunks.slice(1))out.push(`UPDATE song_references SET reference = reference || '${q(c)}' WHERE song_id=(SELECT id FROM songs WHERE legacy_key='${q(id)}' AND reference_audio_key='${q(source)}');`);
}
await writeFile(join(dirname(fileURLToPath(import.meta.url)),'..','migrations','0007_song_references_data.sql'),out.join('\n')+'\n');
console.log(`${files.length} curvas escritas`);
