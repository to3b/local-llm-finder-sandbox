import { GPUs } from './data.js';
const base=new URL(document.querySelector('meta[name="tests-base"]').content,location.origin);
const form=document.querySelector('#finder-form');
function parameters(modelId,quant){const p=new URLSearchParams();const mode=form.elements.device.value;p.set('device',mode);if(modelId)p.set('model',modelId);if(quant)p.set('quant',quant);if(mode==='gpu'){const label=form.elements.gpu.value.trim().toLowerCase();const gpu=GPUs.find(g=>`${g.name} — ${g.vramGB} GB`.toLowerCase()===label);if(gpu)p.set('hardware',gpu.id);}else if(mode==='mac')p.set('memory',form.elements.macMemory.value);else p.set('memory',form.elements.unsureMemory.value);return p;}
function update(){const link=document.querySelector('#share-test-from-finder');if(link)link.href=base.href+'?'+parameters();}
update();form.addEventListener('change',update);form.addEventListener('input',update);
document.addEventListener('click',event=>{const banner=event.target.closest('#share-test-from-finder');if(banner){event.preventDefault();location.href=base.href+'?'+parameters();return;}const source=event.target.closest('[data-share-test]');if(!source)return;event.preventDefault();location.href=base.href+'?'+parameters(source.dataset.shareTest,source.dataset.testQuant);});
