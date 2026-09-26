export const dynamic = 'force-dynamic';
const ORIGIN = 'https://victorressj.github.io';
const allowed = new Set(['40','80','140','200']);
const saved = new Map<string,{body:string;until:number}>();
const pending = new Map<string,Promise<string>>();
const cors = {'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
function reply(body:string,status=200){return new Response(body,{status,headers:cors});}
export async function OPTIONS(){return new Response(null,{status:204,headers:cors});}
async function upstream(radius:string):Promise<string>{
  const cached=saved.get(radius);if(cached&&cached.until>Date.now())return cached.body;
  const existing=pending.get(radius);if(existing)return existing;
  const job=(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
    try{
      const response=await fetch('https://api.adsb.lol/v2/lat/22.25426172/lon/-100.9307605/dist/'+radius,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
      if(!response.ok)throw new Error('upstream '+response.status);
      const body=await response.text();if(body.length>2000000)throw new Error('response too large');
      const data=JSON.parse(body);if(!Array.isArray(data.ac)||typeof data.now!=='number')throw new Error('invalid response');
      const now=data.now<1e12?data.now*1000:data.now;if(Date.now()-now>120000||now>Date.now()+60000)throw new Error('stale response');
      saved.set(radius,{body,until:Date.now()+10000});return body;
    }finally{clearTimeout(timer);}
  })();pending.set(radius,job);
  try{return await job;}finally{pending.delete(radius);}
}
export async function GET(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==ORIGIN)return reply(JSON.stringify({error:'Origen no autorizado.'}),403);
  const radius=new URL(request.url).searchParams.get('radius')||'140';
  if(!allowed.has(radius))return reply(JSON.stringify({error:'Radio no válido. Use 40, 80, 140 o 200 NM.'}),400);
  try{return reply(await upstream(radius));}catch(error){return reply(JSON.stringify({error:'El proveedor ADS-B no está disponible temporalmente. Reintente en unos segundos.'}),502);}
}
