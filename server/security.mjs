import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { ensure } from './domain.mjs';
const derive = (password, salt, N, r, p) => new Promise((resolve,reject) => scrypt(password,salt,32,{N,r,p,maxmem:64*1024*1024},(e,key)=>e?reject(e):resolve(key)));
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
// OWASP scrypt: N=2^15, r=8, p=3. Nunca reducir costo para sortear límites de CPU.
// Comprobar CPU en Workers Free antes de habilitar producción (docs/DEPLOYMENT.md).
export async function hashPassword(password,minimumLength=12) {
  ensure([4,8,12].includes(minimumLength),'Política de acceso inválida.');
  if(minimumLength===4)ensure(typeof password==='string' && /^[0-9]{4}$/.test(password),'El PIN debe tener exactamente cuatro números.');
  else ensure(typeof password === 'string' && password.length >= minimumLength && password.length <= 128, `La contraseña debe tener entre ${minimumLength} y 128 caracteres.`);
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 32768, 8, 3);
  return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 128 || !hash) return false;
  const [algo,N,r,p,salt,hex] = hash.split('$');
  if(algo!=='scrypt' || N!=='32768' || r!=='8' || p!=='3' || !/^[a-f0-9]{64}$/.test(hex)) return false;
  const key = await derive(password,salt,+N,+r,+p);
  return timingSafeEqual(key,Buffer.from(hex,'hex'));
}
