// Divide scripts SQLite sin cortar literales multilínea ni cuerpos de triggers.
export function sqlStatements(source){
  const result=[];let buffer='',word='',quote=null,lineComment=false,blockComment=false,depth=0;
  const finishWord=()=>{if(!word)return;const w=word.toUpperCase();if(w==='BEGIN'||w==='CASE')depth++;else if(w==='END')depth=Math.max(0,depth-1);word='';};
  for(let i=0;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(lineComment){if(c==='\n'){lineComment=false;buffer+='\n';}continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){buffer+=c;if(c===quote){if(next===quote){buffer+=next;i++;}else quote=null;}continue;}
    if(c==='-'&&next==='-'){finishWord();lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){finishWord();blockComment=true;i++;continue;}
    buffer+=c;
    if(c==="'"||c==='"'){finishWord();quote=c;continue;}
    if(/[a-zA-Z_]/.test(c)){word+=c;continue;}
    finishWord();
    if(c===';'&&depth===0){if(buffer.trim())result.push(buffer.trim());buffer='';}
  }
  if(buffer.trim())result.push(buffer.trim());return result;
}
