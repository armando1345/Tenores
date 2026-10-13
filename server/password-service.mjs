import { hashPassword, verifyPassword } from './security.mjs';
import { ensure, HttpError } from './domain.mjs';
async function kdf(env,operation,password,hash,minimumLength=12) {
  if(env.LOCAL===true)return operation==='hash'?hashPassword(password,minimumLength):verifyPassword(password,hash);
  ensure(env.PASSWORDS,'El servicio de contraseñas aún no está configurado.',503);
  const object=env.PASSWORDS.get(env.PASSWORDS.idFromName('tenores-passwords'));
  const r=await object.fetch(new Request('https://passwords.internal/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,password,hash,minimum_length:minimumLength})}));
  const value=await r.json();if(!r.ok)throw new HttpError(r.status,value.error);return value.result;
}
export const passwordHash=(env,password,minimumLength=12)=>kdf(env,'hash',password,undefined,minimumLength);
export const passwordVerify=(env,password,hash)=>kdf(env,'verify',password,hash);
