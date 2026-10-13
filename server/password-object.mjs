import { hashPassword, verifyPassword } from './security.mjs';
// Un único objeto, accesible solo por binding. SQLite-backed para Workers Free;
// no persiste datos, no utiliza alarmas, timers ni sockets que lo mantengan activo.
export class PasswordHasher {
  constructor(state) { this.state=state; }
  async fetch(request) {
    return this.state.blockConcurrencyWhile(async()=>{
      try {
        const b=await request.json();
        if(b.operation==='hash')return Response.json({result:await hashPassword(b.password,b.minimum_length??12)});
        if(b.operation==='verify')return Response.json({result:await verifyPassword(b.password,b.hash)});
        return Response.json({error:'Operación inválida.'},{status:400});
      }catch(e){return Response.json({error:e.status===400?e.message:'No se pudo verificar la contraseña.'},{status:e.status===400?400:503});}
    });
  }
}
