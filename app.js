(function(){
  'use strict';
  const C=window.AeroCore, F=C.FREQUENCIES, $=id=>document.getElementById(id);
  const state={channel:'app',radius:140,aircraft:[],selected:null,sourceTime:null,received:null,error:'',busy:false,request:0,failures:0};
  let timer=null,controller=null,canvasPoints=[],toastTimer=null,returnFocus=null;
  const storage={read(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch(e){return fallback;}},write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,unit)=>v===null?'N/D':Math.round(v).toLocaleString('es-MX')+unit;
  const identity=a=>a.call||a.registration||a.hex.toUpperCase();
  const altitude=a=>a.ground?'En tierra':fmt(a.altitude,' ft');
  const channel=()=>F.find(f=>f.id===state.channel);
  function visible(){return state.aircraft.filter(a=>a.distance<=state.radius && Date.now()-a.positionTime<=60000).sort((a,b)=>a.distance-b.distance);}
  function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
  function selectChannel(id){if(!F.some(f=>f.id===id))return;state.channel=id;renderChannels();applyAudio();renderTraffic();renderDetail();}
  function renderChannels(){
    $('channels').innerHTML=F.map(f=>'<button class="channel" data-channel="'+f.id+'" aria-pressed="'+(f.id===state.channel)+'"><b>'+f.mhz+'</b><span>'+f.name+'</span></button>').join('');
    $('channel-context').textContent='Escucha seleccionada: '+channel().mhz+' MHz. El radar conserva todas las aeronaves.';
  }
  function choose(hex,scroll){state.selected=hex;renderTraffic();renderDetail();drawRadar();if(scroll&&window.matchMedia('(max-width:760px)').matches)$('detail-title').scrollIntoView({behavior:'auto',block:'start'});}
  function renderTraffic(){
    const rows=visible();$('aircraft-count').textContent=rows.length;
    if(!rows.length){$('traffic-list').innerHTML='<p class="empty-state">'+(state.received?'No hay posiciones recientes dentro de '+state.radius+' NM. Esto no demuestra ausencia de tráfico.':state.error?'No se pudo obtener tráfico real. Puede usar las frecuencias y la bitácora, o reintentar la consulta.':'Esperando la primera consulta de tráfico real…')+'</p>';return;}
    $('traffic-list').innerHTML=rows.map(a=>'<button class="traffic-card" data-aircraft="'+esc(a.hex)+'" aria-pressed="'+(a.hex===state.selected)+'"><span class="traffic-top"><strong>'+esc(identity(a))+'</strong><span class="distance">'+a.distance.toFixed(1)+' NM</span></span><div class="traffic-id">'+esc(a.registration||'Matrícula N/D')+' · '+esc(a.type||'Tipo N/D')+'</div><div class="traffic-values"><span>'+altitude(a)+'</span><span>'+fmt(a.speed,' kt')+'</span><span>Track '+fmt(a.track,'°')+'</span></div><span class="traffic-estimate">Estimación: '+esc(a.estimate.label)+'</span></button>').join('');
  }
  function renderDetail(){
    const a=visible().find(x=>x.hex===state.selected);
    if(!a){$('detail-title').textContent=state.selected?'Posición caducada':'Explore el radar';$('detail-subtitle').textContent=state.selected?'Seleccione una aeronave con datos recientes.':'Toque una aeronave o elija una de la lista.';$('aircraft-detail').innerHTML='<p class="empty-detail">Callsign, matrícula, tipo y datos de vuelo aparecerán aquí cuando seleccione una posición real.</p>';return;}
    $('detail-title').textContent=identity(a);$('detail-subtitle').textContent=(a.registration||'Matrícula N/D')+' · '+(a.type||'Tipo N/D')+' · ICAO '+a.hex.toUpperCase();
    const fields=[['Altitud '+(a.ground?'':a.altitudeKind),altitude(a)],['Velocidad sobre suelo',fmt(a.speed,' kt')],['Track sobre suelo',fmt(a.track,'°')],['Distancia a MMSP',a.distance.toFixed(1)+' NM'],['Marcación desde MMSP',Math.round(a.bearing)+'°'],['Ascenso / descenso',fmt(a.verticalRate,' ft/min')]];
    $('aircraft-detail').innerHTML='<dl class="metrics">'+fields.map(f=>'<div><dt>'+f[0]+'</dt><dd>'+f[1]+'</dd></div>').join('')+'</dl><div class="estimate"><b>Frecuencia estimada · no oficial</b>'+esc(a.estimate.label)+'<p>'+esc(a.estimate.why)+'</p></div><button id="log-selected" class="primary">Registrar escucha de '+esc(identity(a))+'</button>';
  }
  function drawRadar(){
    const canvas=$('radar'),ctx=canvas.getContext('2d');if(!ctx)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
    const pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const cx=w/2,cy=h/2-5,R=Math.min(w-66,h-66)/2;canvasPoints=[];if(R<=0)return;
    ctx.font='11px -apple-system, sans-serif';ctx.textAlign='center';
    for(let i=1;i<=4;i++){ctx.strokeStyle=i===4?'#325869':'#1a3c4e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R*i/4,0,Math.PI*2);ctx.stroke();if(i<4){ctx.fillStyle='#8babbd';ctx.fillText(state.radius*i/4+' NM',cx+5,cy-R*i/4-5);}}
    for(let d=0;d<360;d+=30){let angle=(d-90)*Math.PI/180;ctx.strokeStyle='#173646';ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*10,cy+Math.sin(angle)*10);ctx.lineTo(cx+Math.cos(angle)*R,cy+Math.sin(angle)*R);ctx.stroke();}
    ['N','E','S','O'].forEach((s,i)=>{let angle=(i*90-90)*Math.PI/180;ctx.fillStyle='#b4cbd6';ctx.fillText(s,cx+Math.cos(angle)*(R+16),cy+Math.sin(angle)*(R+16)+4);});
    ctx.fillStyle='#edf5fb';ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8eaebe';ctx.fillText('MMSP',cx,cy+18);
    visible().forEach(a=>{const t=(a.bearing-90)*Math.PI/180,r=a.distance/state.radius*R,x=cx+Math.cos(t)*r,y=cy+Math.sin(t)*r,selected=a.hex===state.selected;
      canvasPoints.push({x,y,hex:a.hex});ctx.save();ctx.translate(x,y);ctx.rotate((a.track||0)*Math.PI/180);ctx.strokeStyle=selected?'#ffce86':'#65e5e8';ctx.fillStyle=selected?'#ffce86':'#65e5e8';ctx.lineWidth=1.5;
      if(a.track===null){ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.stroke();}else{ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,2);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();}ctx.restore();
      if(selected){ctx.strokeStyle='#ffce86';ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();}
      if(selected||w>600){ctx.font=(selected?'bold ':'')+'11px -apple-system, sans-serif';let label=identity(a);const tw=ctx.measureText(label).width;const lx=Math.min(Math.max(x+12,4),w-tw-4),ly=Math.max(14,y-8);ctx.fillStyle='#06131ee8';ctx.fillRect(lx-3,ly-11,tw+6,15);ctx.textAlign='left';ctx.fillStyle=selected?'#ffce86':'#c2dce3';ctx.fillText(label,lx,ly);ctx.textAlign='center';}
    });
  }
  function renderStatus(){
    const old=state.sourceTime!==null&&Date.now()-state.sourceTime>60000;
    const live=state.received!==null&&!state.error&&!old;
    $('live-state').textContent=state.busy?'Actualizando':live?'ADS-B activo':state.error?'Sin conexión':old?'Datos caducados':'Conectando';
    $('live-state').className='live-state'+(live?' live':'');
    $('refresh').disabled=state.busy;
    $('updated').textContent=state.sourceTime?'Hora de fuente: '+new Date(state.sourceTime).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Sin posiciones recibidas';
    $('connection-message').className='connection'+(state.error||old?' error':'');
    $('connection-message').textContent=state.error|| (old?'La fuente devolvió datos antiguos. No se muestran como tráfico actual.':state.received?'Consulta cada 20 s mientras la app está visible. Posiciones de más de 60 s se retiran.':'Consultando la red ADSB.lol…');
  }
  function render(){renderStatus();renderTraffic();renderDetail();drawRadar();}
  async function refresh(){
    clearTimeout(timer);if(controller)controller.abort();
    const token=++state.request;controller=new AbortController();const ctl=controller;state.busy=true;renderStatus();
    const timeout=setTimeout(()=>ctl.abort(),12000);
    try{
      const url='https://aeroslp-traffic.vmtsj.chatgpt.site/api/aircraft?radius='+state.radius;
      const response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal});
      if(!response.ok)throw new Error(response.status===429?'La fuente limitó temporalmente las consultas. Reintentaremos automáticamente.':'El proveedor ADS-B respondió con error '+response.status+'.');
      const data=C.normalize(await response.json(),Date.now());if(token!==state.request)return;
      state.aircraft=data.aircraft;state.sourceTime=data.sourceTime;state.received=Date.now();state.error='';state.failures=0;
    }catch(error){if(token!==state.request)return;state.failures++;state.error=error.name==='AbortError'?'La consulta ADS-B agotó el tiempo de espera. Reintentaremos automáticamente.':error instanceof TypeError?'No se pudo conectar con el servicio ADS-B. Revise su conexión; reintentaremos automáticamente.':error.message;}
    finally{clearTimeout(timeout);if(token===state.request){state.busy=false;render();if(!document.hidden)timer=setTimeout(refresh,state.failures?Math.min(120000,30000*state.failures):20000);}}
  }
  function openDialog(id){returnFocus=document.activeElement;const d=$(id);if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');}
  function closeDialog(id){const d=$(id);if(typeof d.close==='function')d.close();else d.removeAttribute('open');if(returnFocus&&returnFocus.isConnected)returnFocus.focus();}
  function logs(){const x=storage.read('aeroslp.logs',[]);return Array.isArray(x)?x.filter(v=>v&&typeof v==='object'):[];}
  function updateLogCount(){$('log-count').textContent=logs().length;}
  function renderLogs(){const entries=logs();updateLogCount();$('export-log').disabled=!entries.length;$('log-entries').innerHTML=entries.length?entries.map((l,i)=>'<article class="log-entry"><strong>'+esc(l.call||'Sin identificador')+'</strong><p>'+esc(l.freq||'')+' MHz</p><p>'+esc(l.note||'Sin nota')+'</p><small>'+esc(new Date(l.time).toLocaleString('es-MX'))+'</small><br><button class="quiet" data-delete="'+i+'">Eliminar registro</button></article>').join(''):'<p class="muted">Aún no hay escuchas guardadas.</p>';}
  function openLog(){const a=visible().find(x=>x.hex===state.selected);$('log-call').value=a?identity(a):'';$('log-frequency').value=state.channel;$('log-note').value='';$('log-feedback').textContent='';renderLogs();openDialog('log-dialog');}
  function saveLog(event){event.preventDefault();const call=$('log-call').value.trim();if(!call){$('log-call').focus();return;}const f=F.find(x=>x.id===$('log-frequency').value);const entries=logs();entries.unshift({time:new Date().toISOString(),call,freq:f.mhz,note:$('log-note').value.trim()});if(!storage.write('aeroslp.logs',entries)){$('log-feedback').textContent='No se pudo guardar. El almacenamiento está bloqueado o lleno; no cierre su nota.';return;}$('log-feedback').textContent='Escucha guardada en este navegador.';$('log-note').value='';renderLogs();}
  function exportLogs(){const cell=s=>'"'+String(s==null?'':s).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const csv='\uFEFF'+[['Fecha ISO','Callsign o matrícula','Frecuencia MHz','Nota'],...logs().map(l=>[l.time,l.call,l.freq,l.note])].map(row=>row.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='AeroSLP_bitacora_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function audioConfig(){const c=storage.read('aeroslp.audio.'+state.channel,{});return c&&typeof c==='object'?c:{};}
  function applyAudio(){const a=$('audio');a.pause();a.removeAttribute('src');a.hidden=true;a.load();const config=audioConfig();try{const url=C.streamURL(String(config.url||''));if(url){a.src=url;a.hidden=false;$('audio-status').textContent=(config.label||'Receptor propio')+' · '+channel().mhz+' MHz';}else $('audio-status').textContent='Sin stream para '+channel().mhz+' MHz';}catch(e){$('audio-status').textContent='Revise la URL configurada: '+e.message;}}
  function openAudio(){const config=audioConfig();$('audio-channel').textContent=channel().mhz+' MHz · '+channel().name;$('audio-url').value=config.url||'';$('audio-name').value=config.label||'';$('audio-feedback').textContent='';openDialog('audio-dialog');}
  function saveAudio(event){event.preventDefault();try{const url=C.streamURL($('audio-url').value.trim());if(!storage.write('aeroslp.audio.'+state.channel,{url,label:$('audio-name').value.trim()}))throw new Error('No se pudo guardar el ajuste en este navegador.');applyAudio();closeDialog('audio-dialog');notify(url?'Receptor configurado. Pulse reproducir para escucharlo.':'Conexión retirada.');}catch(e){$('audio-feedback').textContent=e.message;}}
  $('channels').addEventListener('click',e=>{const b=e.target.closest('[data-channel]');if(b)selectChannel(b.dataset.channel);});
  $('traffic-list').addEventListener('click',e=>{const b=e.target.closest('[data-aircraft]');if(b)choose(b.dataset.aircraft,true);});
  $('aircraft-detail').addEventListener('click',e=>{if(e.target.closest('#log-selected'))openLog();});
  $('radar').addEventListener('click',e=>{const r=$('radar').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const nearest=canvasPoints.map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(nearest&&nearest.d<=25)choose(nearest.hex,false);});
  $('radius').addEventListener('change',()=>{state.radius=Number($('radius').value);$('scale-caption').textContent='RADIO '+state.radius+' NM';render();refresh();});
  $('refresh').addEventListener('click',refresh);$('open-log').addEventListener('click',openLog);$('log-form').addEventListener('submit',saveLog);$('export-log').addEventListener('click',exportLogs);
  $('log-entries').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(!b)return;if(!window.confirm('¿Eliminar este registro de su bitácora?'))return;const list=logs();list.splice(Number(b.dataset.delete),1);if(storage.write('aeroslp.logs',list))renderLogs();else $('log-feedback').textContent='No se pudo eliminar el registro.';});
  $('open-audio').addEventListener('click',openAudio);$('audio-form').addEventListener('submit',saveAudio);$('remove-audio').addEventListener('click',()=>{$('audio-url').value='';$('audio-name').value='';$('audio-form').requestSubmit();});
  $('audio').addEventListener('error',()=>{if($('audio').getAttribute('src'))$('audio-status').textContent='No se pudo reproducir. Revise HTTPS, disponibilidad y formato del stream.';});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d.id);}}));
  window.addEventListener('resize',drawRadar);window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);if(controller)controller.abort();}else refresh();});
  setInterval(()=>{if(!document.hidden)render();},10000);
  $('log-frequency').innerHTML=F.map(f=>'<option value="'+f.id+'">'+f.mhz+' · '+f.name+'</option>').join('');
  renderChannels();updateLogCount();applyAudio();drawRadar();refresh();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
