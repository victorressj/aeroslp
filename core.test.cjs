const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const now=Date.parse('2026-09-26T04:00:00Z');
const plane={hex:'abc123',flight:'TEST123 ',lat:C.BASE.lat,lon:C.BASE.lon,alt_baro:8000,gs:0,track:0,seen_pos:1};
test('missing, invalid, duplicate and stale positions are not current traffic',()=>{
  const r=C.normalize({now:now/1000,ac:[plane,{...plane},{...plane,hex:'stale',seen_pos:61},{...plane,hex:'unknown',seen_pos:undefined},{...plane,hex:'bad',lat:100}]},now);
  assert.equal(r.aircraft.length,1);assert.equal(r.aircraft[0].call,'TEST123');assert.equal(r.aircraft[0].speed,0);assert.equal(r.aircraft[0].track,0);assert.ok(r.aircraft[0].distance<0.001);
});
test('source timestamp is part of position freshness',()=>{assert.equal(C.normalize({now:(now-70000)/1000,ac:[plane]},now).aircraft.length,0);});
test('unknown altitude is not ground and high traffic has no invented sector',()=>{
  const unknown=C.normalize({now,ac:[{...plane,alt_baro:undefined}]},now).aircraft[0];assert.equal(unknown.altitude,null);assert.equal(unknown.ground,false);assert.deepEqual(unknown.estimate.ids,[]);
  const high=C.normalize({now,ac:[{...plane,alt_baro:35000}]},now).aircraft[0];assert.deepEqual(high.estimate.ids,['c1','c8','c9']);
  const ground=C.normalize({now,ac:[{...plane,alt_baro:'ground'}]},now).aircraft[0];assert.equal(ground.ground,true);
});
test('geometric altitude fallback is explicitly identified',()=>{const a=C.normalize({now,ac:[{...plane,alt_baro:undefined,alt_geom:12000}]},now).aircraft[0];assert.equal(a.altitude,12000);assert.equal(a.altitudeKind,'geométrica');});
test('only HTTPS streams without credentials and outside LiveATC are accepted',()=>{
  assert.equal(C.streamURL('https://radio.example/atc.mp3'),'https://radio.example/atc.mp3');
  for(const s of ['http://radio.example/a','javascript:alert(1)','https://user:secret@radio.example/a','https://liveatc.net/a','https://d.liveatc.net/a'])assert.throws(()=>C.streamURL(s));
});
test('malformed response cannot silently become an empty successful feed',()=>assert.throws(()=>C.normalize({message:'failure'},now)));
