'use strict';
(() => {
  const VERSION = '1.0.0';
  const MODEL_KEY = 'shear-model-v1';
  const SCENARIO_KEY = 'shear-scenarios-v1';
  const fields = ['area','sails','gsm','years','fleece','selection','processing','productive','allocation','labour','uncertainty'];
  const defaults = Object.freeze({area:90,sails:1,gsm:1000,years:2,fleece:1.2,selection:50,processing:75,productive:70,allocation:50,labour:87.2,uncertainty:25});
  const constraints = {area:[1,10000000],sails:[1,1000000],gsm:[50,10000],years:[1,10000],fleece:[.05,20],selection:[1,100],processing:[1,100],productive:[1,100],allocation:[1,100],labour:[0,10000],uncertainty:[0,50]};
  const $ = id => document.getElementById(id);
  const norm = (key,value) => {const v=Number(value),[lo,hi]=constraints[key];return Number.isFinite(v)&&String(value).trim()!==''?Math.min(hi,Math.max(lo, v)):defaults[key]};
  const read = key => {try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const store = (key,val) => {try{localStorage.setItem(key,JSON.stringify(val));return true}catch{toast('Storage unavailable; export a backup.');return false}};
  const initial = read(MODEL_KEY);
  let state = Object.fromEntries(fields.map(key => [key,norm(key,initial?.[key] ?? defaults[key])]));
  let scenarios = Array.isArray(read(SCENARIO_KEY)) ? read(SCENARIO_KEY).filter(s=>s&&typeof s==='object'&&s.values).slice(0,100) : [];
  let toastTimer;
  function toast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600)}
  function fmt(v,digits=0){return Number(v).toLocaleString('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
  const pct = val=>val/100;
  function calculate(s){
    const area=s.area*s.sails;
    const fabricKg=area*s.gsm/1000;
    const selectedKg=s.fleece*pct(s.selection);
    const usableKg=selectedKg*pct(s.processing);
    const sheepYears=fabricKg/usableKg;
    const flock=sheepYears/(s.years*pct(s.productive)*pct(s.allocation));
    return {area,fabricKg,selectedKg,usableKg,sheepYears,flock,rawKg:sheepYears*s.fleece,labourHours:area*s.labour,perArea:sheepYears/area};
  }
  function rng(seed){return function(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}}
  function simulate(s){
    if(s.uncertainty===0){const x=calculate(s).sheepYears;return{x0:x,p5:x,p50:x,p95:x,x1:x}}
    const r=rng(182774);const spread=s.uncertainty/100;
    const draws=[];
    const vary=(base,lo,hi)=>Math.max(lo,Math.min(hi,base*(1+(r()*2-1)*spread)));
    for(let i=0;i<3000;i++){
      const gsm=vary(s.gsm,1,1e6), fleece=vary(s.fleece,.0001,100),selection=vary(s.selection,1,100),processing=vary(s.processing,1,100);
      draws.push(s.area*s.sails*gsm/1000/(fleece*selection/100*processing/100));
    }
    draws.sort((a,b)=>a-b);
    const q=p=>{const x=p*(draws.length-1),i=Math.floor(x);return draws[i]*(1-(x-i))+draws[Math.min(i+1,draws.length-1)]*(x-i)};
    return{x0:draws[0],p5:q(.05),p50:q(.5),p95:q(.95),x1:draws[draws.length-1]};
  }
  function showTab(tab){
    document.querySelectorAll('.tab').forEach(b=>{const yes=b.dataset.tab===tab;b.classList.toggle('active',yes);b.setAttribute('aria-current',yes?'page':'false')});
    ['model','scenarios','evidence'].forEach(name=>{$('page-'+name).hidden=name!==tab});
    if(tab==='scenarios')renderScenarios();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function render(){
    const o=calculate(state); const bench=200/90;
    $('fleeceValue').textContent=fmt(state.fleece,2)+' kg';
    $('selectedValue').textContent=fmt(o.selectedKg,2)+' kg';
    $('usableValue').textContent=fmt(o.usableKg,2)+' kg';
    $('sheepYears').innerHTML=fmt(Math.ceil(o.sheepYears))+'<span>sheep-years</span>';
    $('flock').textContent=fmt(Math.ceil(o.flock));
    $('mass').textContent=fmt(o.fabricKg,o.fabricKg<10?1:0)+' kg';
    $('rawMass').textContent=fmt(o.rawKg,o.rawKg<10?1:0)+' kg';
    $('hours').textContent=fmt(Math.ceil(o.labourHours))+' h';
    $('perArea').textContent=fmt(o.perArea,2)+' sheep/m²';
    const max=Math.max(bench,o.perArea);
    $('modelBar').style.width=(100*o.perArea/max)+'%';
    $('museumBar').style.width=(100*bench/max)+'%';
    const ratio=o.perArea/bench;
    $('benchmarkNote').textContent=Math.abs(ratio-1)<.03?'Very close to the reference; this is calibration, not independent validation.':ratio>1?'Your model requires '+fmt((ratio-1)*100,0)+'% more wool harvests per m² than the museum benchmark.':'Your model requires '+fmt((1-ratio)*100,0)+'% fewer wool harvests per m² than the museum benchmark.';
    $('uncertaintyLabel').textContent='±'+fmt(state.uncertainty)+'%';
    const u=simulate(state);
    $('p5').textContent=fmt(Math.ceil(u.p5)); $('p50').textContent=fmt(Math.ceil(u.p50));$('p95').textContent=fmt(Math.ceil(u.p95));
    const min=u.x0,maxv=u.x1,den=Math.max(.00001,maxv-min);
    $('rangeFill').style.marginLeft=(100*(u.p5-min)/den)+'%';
    $('rangeFill').style.width=(100*(u.p95-u.p5)/den)+'%';
    $('rangeDot').style.left=`calc(${100*(u.p50-min)/den}% - 8px)`;
    $('scenarioCount').textContent=scenarios.length;
    return o;
  }
  function apply(newState){state=Object.fromEntries(fields.map(key=>[key,norm(key,newState?.[key]??defaults[key])]));fields.forEach(key=>$(key).value=state[key]);store(MODEL_KEY,state);render()}
  fields.forEach(key=>{$(key).value=state[key];$(key).addEventListener('input',()=>{if($(key).value.trim()==='')return;state[key]=norm(key,$(key).value);store(MODEL_KEY,state);render()});$(key).addEventListener('blur',()=>{$(key).value=state[key]})});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $('resetModel').addEventListener('click',()=>{if(confirm('Reset model inputs to the illustrative starting values?')){apply(defaults);toast('Model assumptions reset.')}});
  function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
  function csvEscape(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}
  function csvRow(x){return x.map(csvEscape).join(',')}
  function resultRecord(s,name){const r=calculate(s);return{scenario:name,app_version:VERSION,model:'illustrative_mass_balance',...s,total_area_m2:r.area,fabric_mass_kg:r.fabricKg,selected_wool_per_harvest_kg:r.selectedKg,usable_wool_per_harvest_kg:r.usableKg,sheep_years:r.sheepYears,minimum_standing_flock:r.flock,raw_wool_kg:r.rawKg,weaving_hours:r.labourHours,sheep_years_per_m2:r.perArea,reference_sheep_per_m2:200/90}}
  function exportCSV(){const rec=resultRecord(state,'Current model');const rows=[Object.keys(rec),Object.values(rec)].map(csvRow).join('\r\n');download('SHEAR-result-'+new Date().toISOString().slice(0,10)+'.csv','\ufeff'+rows+'\r\n','text/csv;charset=utf-8');toast('Result CSV exported')}
  $('downloadCsv').addEventListener('click',exportCSV);
  $('saveScenario').addEventListener('click',promptSave);$('saveScenario2').addEventListener('click',promptSave);
  function promptSave(){const d=$('nameDialog');$('scenarioName').value='Sail model — '+fmt(state.area)+' m²';if(typeof d.showModal==='function'){d.showModal();$('scenarioName').focus()}else{const name=prompt('Name this scenario:');if(name)commitSave(name)}}
  $('nameDialog').addEventListener('close',()=>{if($('nameDialog').returnValue==='save'){const name=$('scenarioName').value.trim();if(name)commitSave(name)}});
  function commitSave(name){scenarios.unshift({id:String(Date.now())+'-'+Math.floor(Math.random()*100000),name:String(name).slice(0,80),createdAt:new Date().toISOString(),values:{...state}});scenarios=scenarios.slice(0,100);store(SCENARIO_KEY,scenarios);render();if(!$('page-scenarios').hidden)renderScenarios();toast('Scenario saved to this device');}
  function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function renderScenarios(){
    const list=$('scenariosList');list.innerHTML='';if(!scenarios.length){list.innerHTML='<div class="panel"><h3>No saved scenarios yet</h3><p class="hint">Use “Save current model” to preserve a set of production assumptions. You can revisit and compare them later.</p></div>';return}
    scenarios.forEach(s=>{const r=calculate(Object.fromEntries(fields.map(key=>[key,norm(key,s.values[key]??defaults[key])])));const el=document.createElement('article');el.className='scenario';el.innerHTML=`<div class="scenario-head"><h3>${escapeHtml(s.name)}</h3></div><p>Saved ${escapeHtml(new Date(s.createdAt||Date.now()).toLocaleDateString('en-GB'))} · ${fmt(s.values.sails||1)} sail(s) at ${fmt(s.values.area||90)} m²</p><div class="scenario-stats"><div><span>Sheep-years</span><strong>${fmt(Math.ceil(r.sheepYears))}</strong></div><div><span>Minimum flock</span><strong>${fmt(Math.ceil(r.flock))}</strong></div></div><div class="scenario-actions"><button type="button" data-action="load">Load model</button><button type="button" class="delete" data-action="delete">Delete</button></div>`;el.querySelector('[data-action=load]').addEventListener('click',()=>{apply(s.values);showTab('model');toast('Scenario loaded')});el.querySelector('[data-action=delete]').addEventListener('click',()=>{if(!confirm('Delete "'+s.name+'"?'))return;scenarios=scenarios.filter(x=>x.id!==s.id);store(SCENARIO_KEY,scenarios);render();renderScenarios()});list.append(el)})
  }
  $('exportJson').addEventListener('click',()=>{download('SHEAR-scenarios-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({app:'SHEAR',version:VERSION,exportedAt:new Date().toISOString(),currentModel:state,scenarios},null,2),'application/json');toast('JSON backup exported')});
  $('importJsonButton').addEventListener('click',()=>$('importJson').click());
  $('importJson').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw Error('File too large');const doc=JSON.parse(await file.text());if(doc.app!=='SHEAR'||!Array.isArray(doc.scenarios))throw Error('Not a SHEAR scenarios file');if(!confirm('Import '+doc.scenarios.length+' saved scenarios? Existing scenarios will be preserved.'))return;const incoming=doc.scenarios.filter(s=>s&&s.values&&typeof s.name==='string'&&typeof s.values==='object').map(s=>({id:String(Date.now())+'-'+Math.floor(Math.random()*1e9),name:s.name.slice(0,80),createdAt:s.createdAt||new Date().toISOString(),values:Object.fromEntries(fields.map(key=>[key,norm(key,s.values[key]??defaults[key])]))}));scenarios=[...incoming,...scenarios].slice(0,100);store(SCENARIO_KEY,scenarios);render();renderScenarios();toast('Imported '+incoming.length+' scenarios')}catch(err){toast('Could not import: '+err.message)}finally{event.target.value=''}});
  render();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      if(reg.waiting&&navigator.serviceWorker.controller){$('updateNotice').hidden=false}
      reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){$('updateNotice').hidden=false}})});
      $('updateButton').addEventListener('click',()=>{window.location.reload()});
    }).catch(()=>{});
  }
})();
