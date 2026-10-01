import { API_BASE } from './config.js';
import { normalizeSubmission, parseTestOutput, BASELINE_PROMPTS } from './submissions.js';

const form=document.querySelector('#test-form'),error=document.querySelector('#form-error'),submit=document.querySelector('#submit-test');
const fields=['hardware','model','generationTps','runtime','quant','contextTokens','memoryGB','runtimeVersion','nickname','testScenario','note'];
const key='llf-test-draft-v1';
let catalogue={models:[],hardware:[]},benchmark=null,id=uuid();
function uuid(){if(crypto.randomUUID)return crypto.randomUUID();return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
function stored(k){try{return localStorage.getItem(k);}catch{return null;}}
function save(k,v){try{localStorage.setItem(k,v);}catch{}}
const storedClientId=stored('llf-test-client-v1');const clientId=/^[a-f0-9-]{36}$/i.test(storedClientId||'')?storedClientId:uuid();save('llf-test-client-v1',clientId);
const canonical=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
function selected(list,value){return list.find(x=>x.name.toLowerCase()===value.trim().toLowerCase())||list.find(x=>canonical(x.name)===canonical(value));}
function getValues(){const values=Object.fromEntries(fields.map(f=>[f,form.elements[f].value]));values.outcome=form.elements.outcome.value;values.benchmark=benchmark;return values;}
function remember(){save(key,JSON.stringify({...getValues(),id}));}
function apply(values){for(const f of fields)if(values[f]!==undefined)form.elements[f].value=values[f]??'';if(values.outcome){const r=form.querySelector(`input[name="outcome"][value="${values.outcome}"]`);if(r)r.checked=true;}if(values.benchmark)benchmark=values.benchmark;syncOutcome();}
function syncOutcome(){const unable=form.elements.outcome.value==='unable';document.querySelector('#speed-entry').hidden=unable;form.elements.generationTps.disabled=unable;if(unable){benchmark=null;form.elements.generationTps.value='';}}
function clearError(){error.hidden=true;error.textContent='';form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));}
function showError(message){error.textContent=message;error.hidden=false;}

try{const draft=JSON.parse(stored(key)||'null');if(draft){apply(draft);id=/^[a-f0-9-]{36}$/i.test(draft.id||'')?draft.id:id;}}catch{}
form.addEventListener('input',()=>{clearError();syncOutcome();remember();});
form.addEventListener('change',()=>{syncOutcome();remember();});
form.addEventListener('submit',async event=>{
 event.preventDefault();clearError();
 const raw=getValues();if(raw.outcome==='unable')raw.generationTps='';
 const hardware=selected(catalogue.hardware,raw.hardware),model=selected(catalogue.models,raw.model);
 if(hardware)raw.hardware=hardware.name;if(model)raw.model=model.name;
 let report;
 try{report=normalizeSubmission({...raw,hardwareId:hardware?.id,modelId:model?.id});}catch(e){showError(e.message);const first=!raw.hardware.trim()?form.elements.hardware:!raw.model.trim()?form.elements.model:!raw.outcome?form.querySelector('[name="outcome"]'):form.elements.generationTps;first?.setAttribute('aria-invalid','true');first?.focus();return;}
 submit.disabled=true;submit.textContent='Saving your report…';remember();
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  let response;try{response=await fetch(API_BASE+'/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...report,id,clientId,website:form.elements.website.value}),signal:controller.signal});}finally{clearTimeout(timeout);}
  const data=await response.json();if(!response.ok||!data.id)throw new Error(data.error||'We could not save your report. Please try again.');
  form.hidden=true;const success=document.querySelector('#success');success.hidden=false;document.querySelector('#receipt').textContent=`Reference ${data.id.slice(0,8)} · ${data.duplicate?'This report was already received.':'Saved for review.'}`;success.focus();
  try{localStorage.removeItem(key);}catch{}id=uuid();
 }catch(e){showError(e.name==='AbortError'?'Saving took too long. Your details are still here; please try again.':e.message==='Failed to fetch'?'We could not reach test storage. Your details are still here; please try again.':e.message);}
 finally{submit.disabled=false;submit.textContent='Submit for review';}
});
document.querySelector('#another').addEventListener('click',()=>{form.reset();benchmark=null;syncOutcome();clearError();form.hidden=false;document.querySelector('#success').hidden=true;document.querySelector('#extra-details').open=false;document.querySelector('.import-panel').open=false;form.elements.hardware.focus();});

function readOutput(text){const status=document.querySelector('#import-status');try{const parsed=parseTestOutput(text);if(!parsed.recognized){status.textContent='We couldn’t find a generation-speed result. You can enter the speed yourself or send a quick report below.';return;}const model=selected(catalogue.models,parsed.model||'');if(model)parsed.model=model.name;apply(parsed);remember();status.textContent=parsed.benchmark?`Imported ${parsed.benchmark.samples.length} repeated runs. Check the hardware and model below, then submit.`:'Found a generation-speed result. Check the details below, then choose how it ran.';document.querySelector('#test-output').value='';}catch(e){status.textContent=e.message;}}
document.querySelector('#read-output').addEventListener('click',()=>readOutput(document.querySelector('#test-output').value));
document.querySelector('#output-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;if(file.size>100000){document.querySelector('#import-status').textContent='Choose a test output file under 100 KB.';return;}readOutput(await file.text());event.target.value='';});

try{
 const response=await fetch('./catalogue.json');if(response.ok)catalogue=await response.json();
 for(const [key,selector]of [['hardware','#hardware-options'],['models','#model-options']]){const parent=document.querySelector(selector);for(const item of catalogue[key]){const option=document.createElement('option');option.value=item.name;parent.append(option);}}
 const p=new URLSearchParams(location.search),h=catalogue.hardware.find(x=>x.id===p.get('hardware')),m=catalogue.models.find(x=>x.id===p.get('model'));
 if(h)form.elements.hardware.value=h.name;else if(p.get('device')==='mac')form.elements.hardware.value=`Mac · ${p.get('memory')||''} GB unified memory`;else if(p.get('device')==='unsure'&&p.get('memory'))form.elements.hardware.value=`PC · ${p.get('memory')} GB RAM`;
 if(m)form.elements.model.value=m.name;if(p.get('quant'))form.elements.quant.value=p.get('quant').slice(0,40);
 const from=p.get('from');if(/^(models|hardware)\/[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(from||'')){const link=document.querySelector('#article-return');link.href='../knowledge-preview/'+from+'/';link.hidden=false;}
 // Finder context is a planning input, not a measured runtime setting. Do not prefill it as evidence.
 if(m||h)remember();
}catch{/* Free-text reports remain available if catalogue suggestions cannot load. */}

for(const baseline of BASELINE_PROMPTS){
 const section=document.createElement('section');section.className='baseline-prompt';const title=document.createElement('h3');title.textContent=baseline.title;const prompt=document.createElement('blockquote');prompt.textContent=baseline.prompt;
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Copy '+baseline.title.toLowerCase();button.addEventListener('click',async()=>{const status=document.querySelector('#baseline-status');try{await navigator.clipboard.writeText(baseline.prompt);form.elements.testScenario.value=baseline.id;remember();status.textContent=baseline.title+' copied. The test type is selected below. Paste it into a fresh chat in your app.';}catch{form.elements.testScenario.value=baseline.id;remember();status.textContent='Copy the prompt text above into your app. The test type is selected below.';}});section.append(title,prompt,button);document.querySelector('#baseline-prompts').append(section);
}
document.querySelectorAll('a[href="#test-guide"]').forEach(link=>link.addEventListener('click',()=>{document.querySelector('#test-guide').open=true;}));
if(location.hash==='#test-guide')document.querySelector('#test-guide').open=true;

const context=document.modelContext;
if(context?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(context.registerTool({name:'prepare_test_report',title:'Prepare a test report',description:'Fill a local-model test report for the user to review. Does not submit.',inputSchema:{type:'object',properties:{hardware:{type:'string'},model:{type:'string'},outcome:{type:'string',enum:['runs','slow','unable']},generationTps:{type:'number'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Provide report fields.');for(const [k,v]of Object.entries(input)){if(!['hardware','model','outcome','generationTps'].includes(k))throw new Error('Unsupported report field.');if(k==='generationTps'){if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>10000)throw new Error('Use a positive generation speed.');}else if(typeof v!=='string'||v.length>200)throw new Error('Use a short text value.');if(k==='outcome'&&!['runs','slow','unable'].includes(v))throw new Error('Choose a valid outcome.');}apply(input);remember();return {prepared:true,submitted:false,hardware:form.elements.hardware.value,model:form.elements.model.value,outcome:form.elements.outcome.value};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
