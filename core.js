(function (root) {
  'use strict';
  const BASE = Object.freeze({lat:22.25426172,lon:-100.9307605});
  const FREQUENCIES = Object.freeze([
    {id:'twr',mhz:'118.850',name:'Torre Potosí'},
    {id:'app',mhz:'127.500',name:'Aproximación Potosí'},
    {id:'c1',mhz:'126.600',name:'México Centro · 1'},
    {id:'c8',mhz:'127.300',name:'México Centro · 8'},
    {id:'c9',mhz:'133.100',name:'México Centro · 9'},
    {id:'fis',mhz:'122.350',name:'Información Potosí'}
  ]);
  const number = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
  const rad = v => v * Math.PI / 180;
  function distance(lat,lon) {
    const q = Math.sin(rad(lat-BASE.lat)/2)**2 + Math.cos(rad(BASE.lat))*Math.cos(rad(lat))*Math.sin(rad(lon-BASE.lon)/2)**2;
    return 6880.13*Math.asin(Math.sqrt(Math.min(1,Math.max(0,q))));
  }
  function bearing(lat,lon) {
    const y=Math.sin(rad(lon-BASE.lon))*Math.cos(rad(lat));
    const x=Math.cos(rad(BASE.lat))*Math.sin(rad(lat))-Math.sin(rad(BASE.lat))*Math.cos(rad(lat))*Math.cos(rad(lon-BASE.lon));
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function estimate(a) {
    if(a.ground && a.distance <= 6) return {ids:['twr'],label:'118.850 · Torre candidata',why:'Posición en tierra próxima a MMSP. No confirma contacto con Torre; podría utilizar otra dependencia.'};
    if(a.altitude === null) return {ids:[],label:'Frecuencia no inferible',why:'Sin altitud suficiente para proponer una dependencia.'};
    if(a.distance<=8 && a.altitude<10500) return {ids:['twr','app'],label:'118.850 / 127.500 · Candidatas',why:'Proximidad y altitud compatibles con Torre o Aproximación. El traspaso real no se conoce.'};
    if(a.distance<=50 && a.altitude<20000) return {ids:['app'],label:'127.500 · Aproximación candidata',why:'Tráfico próximo a MMSP a altitud moderada. Criterio visual heurístico, sin límites ATS oficiales.'};
    if(a.altitude>=20000) return {ids:['c1','c8','c9'],label:'México Centro · Sector indeterminado',why:'Tránsito en altura: 126.600, 127.300 o 133.100 MHz como alternativas. No se puede distinguir el sector con estos datos.'};
    return {ids:[],label:'Frecuencia no inferible',why:'Distancia y altitud no bastan. Información Potosí (122.350) tampoco puede asignarse mediante ADS-B.'};
  }
  function normalize(raw,now) {
    if(!raw || !Array.isArray(raw.ac)) throw new Error('La fuente no devolvió una lista ADS-B válida.');
    let stamp=number(raw.now); if(stamp!==null && stamp<1e12) stamp*=1000;
    const sourceTime=stamp===null?now:stamp;
    if(sourceTime>now+60000) throw new Error('La hora de la fuente no es válida.');
    const ids=new Set();
    const aircraft=raw.ac.map((r,index)=>{
      if(!r || typeof r!=='object') return null;
      const lat=number(r.lat),lon=number(r.lon),age=number(r.seen_pos);
      if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180||age===null||age<0) return null;
      const positionTime=sourceTime-age*1000;
      if(now-positionTime>60000) return null;
      const ground=r.alt_baro==='ground';
      const baro=number(r.alt_baro),geom=number(r.alt_geom);
      const hex=String(r.hex||('unknown-'+index)).slice(0,24);
      if(ids.has(hex)) return null;ids.add(hex);
      const a={hex,call:String(r.flight||'').trim().slice(0,40),registration:String(r.r||'').slice(0,40),type:String(r.t||'').slice(0,40),lat,lon,altitude:ground?0:baro!==null?baro:geom,altitudeKind:baro!==null?'barométrica':'geométrica',ground,speed:number(r.gs),track:number(r.track),verticalRate:number(r.baro_rate),distance:distance(lat,lon),bearing:bearing(lat,lon),positionTime};
      a.estimate=estimate(a);return a;
    }).filter(Boolean);
    return {aircraft,sourceTime};
  }
  function streamURL(value) {
    if(!value.trim()) return '';
    let u;try{u=new URL(value);}catch(e){throw new Error('Escriba una URL HTTPS válida.');}
    if(u.protocol!=='https:') throw new Error('El stream debe usar HTTPS.');
    if(u.username||u.password) throw new Error('No incluya credenciales en la URL.');
    if(/(^|\.)liveatc\.net$/i.test(u.hostname)) throw new Error('LiveATC sólo se abre externamente. Use su propio stream.');
    return u.href;
  }
  const api={BASE,FREQUENCIES,number,distance,bearing,estimate,normalize,streamURL};
  root.AeroCore=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
