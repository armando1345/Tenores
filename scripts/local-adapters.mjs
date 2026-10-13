// Adaptador local y de pruebas. Producción usa los bindings nativos D1/R2.
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
export class LocalD1 {
  constructor(path=':memory:') { this.sqlite=new DatabaseSync(path);this.sqlite.exec('PRAGMA foreign_keys=ON;'); }
  prepare(sql){
    const db=this.sqlite;let args=[];
    const execute=()=>db.prepare(sql);
    return {
      bind(...values){args=values.map(v=>v===undefined?null:v);return this;},
      async first(column){const row=execute().get(...args);return column?row?.[column]??null:row||null;},
      async all(){return {results:execute().all(...args),success:true};},
      async run(){const result=execute().run(...args);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};},
      _runSync(){const result=execute().run(...args);return {success:true,meta:{changes:Number(result.changes)}};}
    };
  }
  async batch(statements){this.sqlite.exec('BEGIN');try{const result=statements.map(s=>s._runSync());this.sqlite.exec('COMMIT');return result;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
  async migrate(){
    this.sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)');
    for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort()){
      if(this.sqlite.prepare('SELECT 1 FROM local_migrations WHERE name=?').get(f))continue;
      this.sqlite.exec('BEGIN');try{this.sqlite.exec(await readFile(`migrations/${f}`,'utf8'));this.sqlite.prepare('INSERT INTO local_migrations VALUES(?)').run(f);this.sqlite.exec('COMMIT');}catch(e){this.sqlite.exec('ROLLBACK');throw e;}
    }
  }
}
export class LocalR2 {
  constructor(directory=null){this.directory=directory;this.memory=new Map();}
  path(key){const p=resolve(this.directory,key);if(!p.startsWith(resolve(this.directory)+sep))throw new Error('Invalid object key');return p;}
  async bytes(key){if(!this.directory)return this.memory.get(key)||null;try{return new Uint8Array(await readFile(this.path(key)));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async put(key,value,{onlyIf}={}){
    if(onlyIf?.etagDoesNotMatch==='*' && await this.bytes(key))return null;
    const bytes=new Uint8Array(value);if(this.directory){const path=this.path(key);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,bytes);}else this.memory.set(key,bytes);
    return {key,size:bytes.length};
  }
  async head(key){const b=await this.bytes(key);return b?{size:b.length}:null;}
  async get(key,{range}={}){
    const b=await this.bytes(key);if(!b)return null;const header=range?.get?.('Range');
    if(header){const [a,z]=header.replace('bytes=','').split('-');let offset=a?Number(a):Math.max(0,b.length-Number(z)),end=a?(z?Number(z):b.length-1):b.length-1;end=Math.min(end,b.length-1);return {size:b.length,range:{offset,length:end-offset+1},body:b.slice(offset,end+1)};}
    return {size:b.length,body:b};
  }
  async delete(key){if(!this.directory){this.memory.delete(key);return;}try{await unlink(this.path(key));}catch(e){if(e.code!=='ENOENT')throw e;}}
}
