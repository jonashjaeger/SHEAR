'use strict';
(() => {
  const VERSION='2.0.0', MODEL_KEY='shear-model-v2', SCENARIO_KEY='shear-scenarios-v2';
  const $=id=>document.getElementById(id);
  const numerical=['area','sails','gsm','years','labour','selection','processing','allocation','shareEwe','shareRam','shareWether','shareJuvenile','yieldEwe','yieldRam','yieldWether','yieldJuvenile','seed','iterations'];
  const defaultState={
    area:90,sails:1,gsm:1000,years:2,labour:87.2,
    fleeceProfile:'mixed',selection:50,processing:75,allocation:50,
    shareEwe:50,shareRam:5,shareWether:15,shareJuvenile:30,
    yieldEwe:1.2,yieldRam:1.45,yieldWether:1.15,yieldJuvenile:0,
    seed:18432,iterations:5000,notes:'All starting quantities are hypothetical; replace with context-specific evidence.'
  };
  const limits={area:[1,10000000],sails:[1,1000000],gsm:[50,10000],years:[.1,10000],labour:[0,10000],selection:[1,100],processing:[1,100],allocation:[1,100],shareEwe:[0,100],shareRam:[0,100],shareWether:[0,100],shareJuvenile:[0,100],yieldEwe:[0,20],yieldRam:[0,20],yieldWether:[0,20],yieldJuvenile:[0,20],seed:[1,2147483646],iterations:[1000,10000]};
  const profiles={
    mixed:{selection:50,description:'Mixed undercoat and outer-coat sorting. Not an empirically estimated historical composition.',yieldEwe:1.2,yieldRam:1.45,yieldWether:1.15,yieldJuvenile:0},
    fine:{selection:35,description:'More selective fine-fibre retention. Illustrates a potential trade-off between fibre quality and available mass.',yieldEwe:1.1,yieldRam:1.3,yieldWether:1.1,yieldJuvenile:0},
    long:{selection:45,description:'Longer-staple/outer-coat focused sorting. Hypothetical only; no specific ancient population is implied.',yieldEwe:1.35,yieldRam:1.6,yieldWether:1.45,yieldJuvenile:0}
  };
  const cohorts=[['Ewe','Adult ewe'],['Ram','Adult ram'],['Wether','Wether'],['Juvenile','Juvenile']];
  const distDefs=[
    ['gsm','Fabric density (g/m²)',25],['yieldEwe','Adult ewe wool yield',30],['yieldRam','Adult ram wool yield',30],
    ['yieldWether','Wether wool yield',30],['yieldJuvenile','Juvenile wool yield',30],['selection','Fibre selection retained',20],
    ['processing','Processing retention',15],['allocation','Wool allocated to target',25],['shareJuvenile','Juvenile share',25]
  ];
  const getDefaultDists=()=>Object.fromEntries(distDefs.map(([key,,spread])=>[key,{kind:'triangular',lower:spread,upper:spread}]));
  function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v))}
  function norm(key,value){const [lo,hi]=limits[key],v=Number(value);if(value==null||String(value).trim()===''||!Number.isFinite(v))return defaultState[key];return clamp(v,lo,hi)}
  function safeNotes(text){return String(text??'').slice(0,5000)}
  function normalize(raw){
    const st={...defaultState};for(const k of numerical)st[k]=norm(k,raw?.[k]??defaultState[k]);
    st.iterations=[1000,5000,10000].includes(st.iterations)?st.iterations:5000;
    st.seed=Math.floor(st.seed);st.fleeceProfile=['mixed','fine','long','custom'].includes(raw?.fleeceProfile)?raw.fleeceProfile:'mixed';
    st.notes=safeNotes(raw?.notes??defaultState.notes);return st;
  }
  const normalizeDists=raw=>{
    const d=getDefaultDists();for(const [key] of distDefs){const source=raw?.[key];if(!source||typeof source!=='object')continue;
      d[key]={kind:source.kind==='uniform'?'uniform':'triangular',lower:clamp(Number(source.lower)||0,0,95),upper:clamp(Number(source.upper)||0,200)};
    }return d;
  };
  function loadKey(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
  function setKey(k,value){try{localStorage.setItem(k,JSON.stringify(value));return true}catch{toast('Storage is unavailable; export a backup.');return false}}
  function convertV1(v){
    if(!v||typeof v!=='object')return normalize(defaultState);
    const young=clamp(100-(Number(v.productive)||70),0,100);
    const r={...defaultState,area:v.area,sails:v.sails,gsm:v.gsm,years:v.years,labour:v.labour,selection:v.selection,processing:v.processing,allocation:v.allocation,
      fleeceProfile:'custom',shareEwe:(100-young)*50/70,shareRam:(100-young)*5/70,shareWether:(100-young)*15/70,shareJuvenile:young,
      yieldEwe:v.fleece,yieldRam:v.fleece,yieldWether:v.fleece,yieldJuvenile:0,
      notes:'MIGRATED FROM SHEAR v1: The former productive fraction was translated into juveniles, and adult demographic fractions were assigned illustrative ratios. Recheck demographic assumptions; this is NOT an equivalent mathematical model.'};
    return normalize(r);
  }
  let previous=loadKey(MODEL_KEY),old=loadKey('shear-model-v1');
  let state=previous?normalize(previous.state||previous):(old?convertV1(old):normalize(defaultState));
  let dists=previous?normalizeDists(previous.dists):getDefaultDists();
  let scenarios=loadKey(SCENARIO_KEY);
  let migrated=false;
  if(!Array.isArray(scenarios)){
    const savedV1=loadKey('shear-scenarios-v1');
    scenarios=Array.isArray(savedV1)?savedV1.filter(s=>s&&s.values).slice(0,100).map(s=>({id:'legacy-'+String(s.id||Date.now()),name:String(s.name||'Older scenario').slice(0,80)+' (v1 migrated)',createdAt:s.createdAt||new Date().toISOString(),values:convertV1(s.values),dists:getDefaultDists()})):[];
    migrated=!!(old||scenarios.length);
    setKey(SCENARIO_KEY,scenarios);
  }
  if(migrated)$('migrationNote').hidden=false;
  let sim=null,simStale=true,toastTimeout;
  const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(x,d=0)=>Number(x).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
  const fkg=x=>fmt(x,x<10?2:1)+' kg';
  const frac=x=>x/100;
  const persist=()=>setKey(MODEL_KEY,{state,dists});
  function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4000)}
  function sharesValid(s){const t=cohorts.reduce((n,[code])=>n+s['share'+code],0);return Math.abs(t-100)<.01}
  function calculate(s){
    const area=s.area*s.sails,fabricKg=area*s.gsm/1000;
    const perHeadRaw=cohorts.reduce((acc,[code])=>acc+frac(s['share'+code])*s['yield'+code],0);
    const productiveShare=cohorts.reduce((acc,[code])=>acc+(s['yield'+code]>0?s['share'+code]:0),0)/100;
    const perProducerRaw=productiveShare>0?perHeadRaw/productiveShare:0;
    const perHeadSorted=perHeadRaw*frac(s.selection),perHeadReady=perHeadSorted*frac(s.processing);
    const perHeadAllocated=perHeadReady*frac(s.allocation);
    const valid=sharesValid(s)&&perHeadAllocated>0&&Number.isFinite(perHeadAllocated);
    const flock=valid?fabricKg/(s.years*perHeadAllocated):NaN;
    const producerYears=valid?fabricKg/(perProducerRaw*frac(s.selection)*frac(s.processing)):NaN;
    const totalRaw=valid?flock*s.years*perHeadRaw:NaN;
    return{valid,area,fabricKg,perHeadRaw,perHeadSorted,perHeadReady,perHeadAllocated,productiveShare,perProducerReady:perProducerRaw*frac(s.selection)*frac(s.processing),flock,producerYears,totalRaw,labourHours:area*s.labour};
  }
  function fieldSync(){numerical.forEach(k=>{$(k).value=state[k]});$('fleeceProfile').value=state.fleeceProfile;$('notes').value=state.notes;$('iterations').value=state.iterations}
  function showTab(name){document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')});
    ['model','uncertainty','scenarios','evidence'].forEach(t=>$('page-'+t).hidden=t!==name);if(name==='scenarios')renderScenarios();if(name==='uncertainty'&&(!sim||simStale))runSimulation();window.scrollTo({top:0,behavior:'auto'});}
  function markStale(){simStale=true;$('simNote').textContent='Inputs changed. Rerun the simulation to update results; prior results are now hidden.';$('simulationResults').hidden=true}
  function render(){
    const output=calculate(state);
    const sum=cohorts.reduce((a,[c])=>a+state['share'+c],0);
    $('shareTotal').textContent=fmt(sum,1)+'%';$('shareTotal').style.color=Math.abs(sum-100)<.01?'#174b4b':'#ad573d';$('shareWarning').hidden=sharesValid(state);
    $('fleeceDescription').textContent=profiles[state.fleeceProfile]?.description||'Custom input values — document the source of each assumption in your notes.';
    $('fleeceValue').textContent=fkg(output.perHeadRaw);$('selectedValue').textContent=fkg(output.perHeadSorted);$('usableValue').textContent=fkg(output.perHeadReady);
    $('flock').innerHTML=output.valid?fmt(Math.ceil(output.flock))+'<span>sheep (average)</span>':'—<span>check inputs</span>';
    $('fleecePerHead').textContent=fkg(output.perHeadRaw)+'/yr';$('supplyPerHead').textContent=fkg(output.perHeadAllocated)+'/yr';
    $('sheepYears').textContent=output.valid?fmt(Math.ceil(output.producerYears)):'—';$('mass').textContent=fkg(output.fabricKg);
    $('rawMass').textContent=output.valid?fkg(output.totalRaw):'—';$('hours').textContent=fmt(output.labourHours)+' h';
    $('modelPerProducer').textContent=output.valid?fkg(output.perProducerReady):'—';$('modelBar').style.width=output.valid?Math.min(100,100*output.perProducerReady/Math.max(.5,output.perProducerReady))+'%':'0%';
    $('museumBar').style.width=output.valid?Math.min(100,100*.5/Math.max(.5,output.perProducerReady))+'%':'100%';
    $('resultNote').textContent=output.valid?'Constant-composition standing flock; does not model births, deaths, pasture, or culling. Rounded up to whole sheep.':'Shares must equal 100%, and wool supply must be greater than zero.';
    $('downloadCsv').disabled=!output.valid;$('scenarioCount').textContent=scenarios.length;
    return output;
  }
  function setState(s,d){state=normalize(s);dists=normalizeDists(d||dists);fieldSync();distRender();persist();markStale();render()}
  numerical.forEach(k=>$(k).addEventListener('input',()=>{
    if($(k).value.trim()==='')return;state[k]=norm(k,$(k).value);
    if(k.startsWith('yield')||k==='selection'){
      if(state.fleeceProfile!=='custom'){state.fleeceProfile='custom';$('fleeceProfile').value='custom';}
    }
    persist();markStale();render();
  }));
  numerical.forEach(k=>$(k).addEventListener('blur',()=>{$(k).value=state[k]}));
  $('notes').addEventListener('input',()=>{state.notes=safeNotes($('notes').value);persist()});
  $('fleeceProfile').addEventListener('change',()=>{
    const profile=$('fleeceProfile').value;state.fleeceProfile=profile;
    if(profiles[profile])for(const k of ['selection','yieldEwe','yieldRam','yieldWether','yieldJuvenile'])state[k]=profiles[profile][k];
    fieldSync();persist();markStale();render();
  });
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $('goUncertainty').addEventListener('click',()=>showTab('uncertainty'));
  $('resetModel').addEventListener('click',()=>{if(confirm('Reset model inputs, provenance and uncertainty assumptions? Saved scenarios remain unchanged.')){setState(defaultState,getDefaultDists());toast('Assumptions reset')}});
  const distLabels=Object.fromEntries(distDefs.map(([key,label])=>[key,label]));
  function distRender(){const tbody=$('distTable');tbody.innerHTML='';distDefs.forEach(([key,label])=>{
    const d=dists[key];const tr=document.createElement('tr');tr.innerHTML=`<th scope="row">${escapeHtml(label)}</th><td><select aria-label="${escapeHtml(label)} distribution" data-dkind="${key}"><option value="triangular">Triangular</option><option value="uniform">Uniform</option></select></td><td><input type="number" min="0" max="95" step="5" aria-label="${escapeHtml(label)} below central value percent" data-dlower="${key}"></td><td><input type="number" min="0" max="200" step="5" aria-label="${escapeHtml(label)} above central value percent" data-dupper="${key}"></td>`;
    tr.querySelector('[data-dkind]').value=d.kind;tr.querySelector('[data-dlower]').value=d.lower;tr.querySelector('[data-dupper]').value=d.upper;
    const apply=()=>{d.kind=tr.querySelector('[data-dkind]').value;const lo=tr.querySelector('[data-dlower]').value,hi=tr.querySelector('[data-dupper]').value;
      if(lo.trim()!=='')d.lower=clamp(Number(lo)||0,0,95);if(hi.trim()!=='')d.upper=clamp(Number(hi)||0,0,200);
      persist();markStale();};
    tr.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',apply));tbody.append(tr);
  })}
  $('resetDistributions').addEventListener('click',()=>{if(confirm('Reset all sampling ranges?')){dists=getDefaultDists();distRender();persist();markStale()}});
  function seededRng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function drawInput(center,d,key,random){const [hardMin,hardMax]=limits[key];const low=clamp(center*(1-d.lower/100),hardMin,hardMax),hi=clamp(center*(1+d.upper/100),hardMin,hardMax);
    if(hi<=low)return low;const u=random();if(d.kind==='uniform')return low+(hi-low)*u;
    const c=clamp((center-low)/(hi-low),0,1);return u<c?low+Math.sqrt(u*(hi-low)*(center-low)):hi-Math.sqrt((1-u)*(hi-low)*(hi-center));
  }
  function percentiles(sorted,p){if(!sorted.length)return NaN;const x=p*(sorted.length-1),i=Math.floor(x),t=x-i;return sorted[i]*(1-t)+sorted[Math.min(i+1,sorted.length-1)]*t}
  function pearson(rows,xkey){const n=rows.length;if(n<2)return 0;let sumx=0,sumy=0,sxx=0,syy=0,sxy=0;
    for(const row of rows){const x=row[xkey],y=row.flock;sumx+=x;sumy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y}
    const xVar=sxx-sumx*sumx/n,yVar=syy-sumy*sumy/n;return xVar>1e-12&&yVar>1e-12?(sxy-sumx*sumy/n)/Math.sqrt(xVar*yVar):0;
  }
  function simulate(input,settings,iterations,seed){
    const random=seededRng(seed),rows=[];
    for(let i=0;i<iterations;i++){
      const d={...input};for(const [key] of distDefs)d[key]=drawInput(input[key],settings[key],key,random);
      const adultOriginal=input.shareEwe+input.shareRam+input.shareWether;
      if(adultOriginal>0){const factor=(100-d.shareJuvenile)/adultOriginal;for(const [code] of cohorts.slice(0,3))d['share'+code]=input['share'+code]*factor}
      else d.shareJuvenile=100;
      const output=calculate(d);
      if(output.valid&&Number.isFinite(output.flock))rows.push({index:i+1,...Object.fromEntries(distDefs.map(([key])=>[key,d[key]])),shareEwe:d.shareEwe,shareRam:d.shareRam,shareWether:d.shareWether,flock:output.flock});
    }
    const sorted=rows.map(r=>r.flock).sort((a,b)=>a-b);
    const drivers=distDefs.map(([key])=>({key,label:distLabels[key],correlation:pearson(rows,key)})).sort((a,b)=>Math.abs(b.correlation)-Math.abs(a.correlation));
    return{rows,drivers,q05:percentiles(sorted,.05),q50:percentiles(sorted,.5),q95:percentiles(sorted,.95),sorted,seed,iterations};
  }
  function drawHistogram(values){const el=$('histogram');el.innerHTML='';if(!values.length)return;
    // Use a 2–98 percentile plotting range to prevent distant outliers washing out the centre.
    const low=percentiles(values,.02),high=percentiles(values,.98),maxHigh=high<=low?low+1:high,n=32,bins=Array(n).fill(0);
    for(const v of values){const index=clamp(Math.floor((v-low)/(maxHigh-low)*n),0,n-1);bins[index]++}
    const peak=Math.max(...bins,1);for(const count of bins){const bar=document.createElement('span');bar.className='bin';bar.style.height=(count/peak*100)+'%';bar.title=fmt(count)+' simulated outcomes';el.append(bar)}
    $('histLow').textContent=fmt(Math.round(low));$('histHigh').textContent=fmt(Math.round(maxHigh));
    el.setAttribute('aria-label','Histogram of '+fmt(values.length)+' flock estimates. Plot range '+fmt(Math.round(low))+' to '+fmt(Math.round(maxHigh))+' sheep; tails displayed in the edge bins.');
  }
  function renderSimulation(){if(!sim)return;$('simulationResults').hidden=false;
    $('p5').textContent=fmt(Math.ceil(sim.q05));$('p50').textContent=fmt(Math.ceil(sim.q50));$('p95').textContent=fmt(Math.ceil(sim.q95));
    drawHistogram(sim.sorted);const el=$('drivers');el.innerHTML='';for(const d of sim.drivers.slice(0,7)){
      const line=document.createElement('div');line.className='driver-item';const cor=d.correlation;
      line.innerHTML=`<span>${escapeHtml(d.label)}</span><div class="driver-track"><div class="driver-bar ${cor<0?'negative':''}" style="width:${Math.min(100,Math.abs(cor)*100)}%"></div></div><strong>${cor>=0?'+':''}${fmt(cor,2)}</strong>`;el.append(line);
    }
    $('simNote').textContent=fmt(sim.rows.length)+' valid draws (requested '+fmt(sim.iterations)+'), seed '+sim.seed+'. Conditional, assumption-driven distributions; not archaeological confidence intervals.';
  }
  function runSimulation(){const o=calculate(state);if(!o.valid){$('simulationResults').hidden=true;toast('Correct the flock shares and wool yields first');return}
    sim=simulate(state,dists,state.iterations,state.seed);simStale=false;renderSimulation();toast('Simulation complete: '+fmt(sim.rows.length)+' draws');
  }
  $('runSimulation').addEventListener('click',runSimulation);
  const download=(filename,body,type)=>{const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)};
  const csvEscape=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  const csvRow=values=>values.map(csvEscape).join(',');
  function csvOf(records){if(!records.length)return'';const headers=Object.keys(records[0]);return '\ufeff'+[csvRow(headers),...records.map(rec=>csvRow(headers.map(h=>rec[h])))].join('\r\n')+'\r\n'}
  function outputRecord(s,d,name){const o=calculate(s);const record={scenario:name,version:VERSION,model:'cohort_mass_balance',...s,notes:s.notes,
      distribution_config:JSON.stringify(d),total_area_m2:o.area,finished_textile_kg:o.fabricKg,raw_wool_kg_per_head_year:o.perHeadRaw,
      selected_wool_kg_per_head_year:o.perHeadSorted,usable_wool_kg_per_head_year:o.perHeadReady,allocated_wool_kg_per_head_year:o.perHeadAllocated,
      productive_fraction:o.productiveShare,usable_kg_per_producer_year:o.perProducerReady,producer_year_equivalents:o.producerYears,
      required_standing_flock:o.flock,total_raw_kg_harvested:o.totalRaw,weaving_hours:o.labourHours};return record;
  }
  $('downloadCsv').addEventListener('click',()=>{if(!calculate(state).valid)return;download('SHEAR-v2-model-'+new Date().toISOString().slice(0,10)+'.csv',csvOf([outputRecord(state,dists,'Current model')]),'text/csv;charset=utf-8');toast('Model CSV exported')});
  $('downloadDraws').addEventListener('click',()=>{
    if(!sim||simStale)runSimulation();if(!sim||simStale)return;
    download('SHEAR-v2-MonteCarlo-'+new Date().toISOString().slice(0,10)+'.csv',csvOf(sim.rows.map(row=>({app_version:VERSION,random_seed:sim.seed,...row}))),'text/csv;charset=utf-8');toast('Simulated draws CSV exported');
  });
  const safeScenario=s=>s&&typeof s==='object'&&s.values?{id:String(s.id||Date.now()),name:String(s.name||'Unnamed').slice(0,80),createdAt:s.createdAt||new Date().toISOString(),values:normalize(s.values),dists:normalizeDists(s.dists)}:null;
  function saveScenario(name){scenarios.unshift({id:'s-'+Date.now()+'-'+Math.floor(Math.random()*1e8),name:name.slice(0,80),createdAt:new Date().toISOString(),values:{...state},dists:structuredClone(dists)});scenarios=scenarios.slice(0,100);setKey(SCENARIO_KEY,scenarios);render();if(!$('page-scenarios').hidden)renderScenarios();toast('Scenario saved')}
  function promptSave(){const dlg=$('nameDialog');$('scenarioName').value='Flock scenario — '+fmt(state.area*state.sails)+' m²';if(dlg.showModal){dlg.showModal();$('scenarioName').focus()}else{const name=prompt('Scenario name:');if(name)saveScenario(name)}}
  $('saveScenario').addEventListener('click',promptSave);$('saveScenario2').addEventListener('click',promptSave);
  $('nameDialog').addEventListener('close',()=>{if($('nameDialog').returnValue==='save'&&$('scenarioName').value.trim())saveScenario($('scenarioName').value.trim())});
  function renderScenarios(){const root=$('scenariosList');root.innerHTML='';if(!scenarios.length){root.innerHTML='<div class="panel"><h3>No scenarios yet</h3><p>Save the model to compare an alternative demographic or fleece strategy.</p></div>';return}
    for(const saved of scenarios){const o=calculate(saved.values),el=document.createElement('article');el.className='scenario';el.innerHTML=`<div class="scenario-head"><h3>${escapeHtml(saved.name)}</h3></div><p>Saved ${escapeHtml(new Date(saved.createdAt).toLocaleDateString('en-GB'))} · ${fmt(saved.values.area*saved.values.sails)} m² · ${escapeHtml(saved.values.fleeceProfile)} fleece</p><div class="scenario-stats"><div><span>Standing flock</span><strong>${o.valid?fmt(Math.ceil(o.flock)):'invalid'}</strong></div><div><span>Raw wool/animal/year</span><strong>${fmt(o.perHeadRaw,2)} kg</strong></div></div><div class="scenario-actions"><button type="button" data-action="load">Load model</button><button type="button" class="delete" data-action="delete">Delete</button></div>`;
      el.querySelector('[data-action=load]').addEventListener('click',()=>{setState(saved.values,saved.dists);showTab('model');toast('Loaded '+saved.name)});
      el.querySelector('[data-action=delete]').addEventListener('click',()=>{if(!confirm('Delete '+saved.name+'?'))return;scenarios=scenarios.filter(x=>x.id!==saved.id);setKey(SCENARIO_KEY,scenarios);renderScenarios();render()});root.append(el)}
  }
  $('exportJson').addEventListener('click',()=>{download('SHEAR-v2-scenarios-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({app:'SHEAR',version:VERSION,exportedAt:new Date().toISOString(),currentModel:state,distributions:dists,scenarios},null,2),'application/json');toast('JSON backup exported')});
  $('importJsonButton').addEventListener('click',()=>$('importJson').click());
  $('importJson').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>4000000)throw Error('File too large');const doc=JSON.parse(await file.text());if(doc.app!=='SHEAR'||!Array.isArray(doc.scenarios))throw Error('Not a SHEAR backup');
      if(!confirm('Import '+doc.scenarios.length+' saved scenarios and a copy of the current model? No existing scenarios will be deleted.'))return;
      const incoming=doc.scenarios.slice(0,100).map(s=>doc.version?.startsWith('1.')?{...s,values:convertV1(s.values),dists:getDefaultDists()}:s).map(safeScenario).filter(Boolean);
      if(doc.currentModel){const model=doc.version?.startsWith('1.')?convertV1(doc.currentModel):normalize(doc.currentModel);incoming.unshift({id:'import-'+Date.now(),name:'Imported current model',createdAt:new Date().toISOString(),values:model,dists:normalizeDists(doc.distributions)})}
      scenarios=[...incoming.map(s=>({...s,id:'import-'+Date.now()+'-'+Math.floor(Math.random()*1e8)})),...scenarios].slice(0,100);setKey(SCENARIO_KEY,scenarios);renderScenarios();render();toast('Imported '+incoming.length+' scenarios')
    }catch(err){toast('Import failed: '+err.message)}finally{event.target.value=''}
  });
  fieldSync();distRender();persist();render();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(reg=>{
    function announce(){if(reg.waiting&&navigator.serviceWorker.controller)$('updateNotice').hidden=false}
    announce();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('updateNotice').hidden=false})});
    $('updateButton').addEventListener('click',()=>window.location.reload());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
  }).catch(()=>{})}
})();
