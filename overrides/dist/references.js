import {GPUs} from './data.js';
export function validateReferences(data) {
  if(data?.version!==1 || !Array.isArray(data.articles)) throw Error('Invalid reference index');
  const map=new Map();
  for(const a of data.articles){
    const directory={Model:'models',Hardware:'hardware',Guide:'guides'}[a.type];
    if(!directory||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)||a.key!==`${directory}/${a.slug}`||a.url!==`https://knowledge.localllmfinder.com/${directory}/${a.slug}/`||!Array.isArray(a.entityIds)) throw Error('Invalid reference URL');
    for(const id of a.entityIds){const key=`${a.type}:${id}`;if(!/^[a-z0-9-]+$/.test(id)||map.has(key))throw Error('Invalid reference ID');map.set(key,a);}
  }
  return map;
}
if(typeof document!=='undefined') {
  const root=document.querySelector('main'), form=document.querySelector('#finder-form');
  const base=new URL(document.querySelector('meta[name="knowledge-base"]')?.content||'https://knowledge.localllmfinder.com/',location.href);
  let references=new Map();
  const hardware=document.createElement('p');hardware.className='hardware-reference';hardware.hidden=true;
  form?.querySelector('.computer-section')?.append(hardware);
  function populate(slot,type,id,label){
    const article=references.get(`${type}:${id}`);const key=article?.key||'';
    if(slot.dataset.loadedReference===key)return;
    slot.dataset.loadedReference=key;slot.replaceChildren();slot.hidden=!article;
    if(article){const a=document.createElement('a');a.href=new URL(article.key+'/',base).href;a.textContent=label;slot.append(a);}
  }
  function update(){
    root?.querySelectorAll('[data-reference-id]').forEach(slot=>populate(slot,'Model',slot.dataset.referenceId,'Model reference'));
    const value=document.querySelector('#gpu-input')?.value.trim().toLowerCase();
    const gpu=GPUs.find(g=>`${g.name} — ${g.vramGB} GB`.toLowerCase()===value);
    populate(hardware,'Hardware',form?.elements.device.value==='gpu'?gpu?.id:'','Hardware reference');
  }
  const observer=new MutationObserver(update);if(root)observer.observe(root,{childList:true,subtree:true});
  form?.addEventListener('input',update);form?.addEventListener('change',update);
  async function load(){
    const urls=[new URL('references.json',base).href];
    if(base.origin!==location.origin)urls.push('https://raw.githubusercontent.com/to3b/local-llm-finder-knowledge/main/references.json');
    for(const url of urls){try{const response=await fetch(url,{signal:AbortSignal.timeout(5000),cache:'no-store'});if(!response.ok)continue;references=validateReferences(await response.json());update();return;}catch{/* Reference availability must never interrupt recommendations. */}}
  }
  load();
}
