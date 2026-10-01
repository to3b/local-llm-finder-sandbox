export const PROTOCOL = 'llf-ollama-v1';
export const OUTCOMES = ['runs', 'slow', 'unable'];
const clean = (value, max=200) => typeof value==='string' ? value.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,max) : '';
const number = (v,max) => v!=='' && v!=null && Number.isFinite(Number(v)) && Number(v)>0 && Number(v)<=max ? Number(v) : null;
const median = values => { const s=[...values].sort((a,b)=>a-b),n=s.length; return n ? (s[Math.floor(n/2)]+s[Math.floor((n-1)/2)])/2 : null; };

export function normalizeSubmission(input) {
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Check your report and try again.');
  const hardware=clean(input.hardware), model=clean(input.model);
  if(!hardware) throw new Error('Add your hardware, for example RTX 3060 12 GB or Mac M2 16 GB.');
  if(!model) throw new Error('Add the model you tried.');
  if(!OUTCOMES.includes(input.outcome)) throw new Error('Choose how the model ran.');
  for(const [field,label,max] of [['generationTps','Generation speed',10000],['memoryGB','Memory usage',4096],['contextTokens','Context length',4000000]]) {
    if(input[field]!=='' && input[field]!=null && number(input[field],max)===null) throw new Error(`${label} needs a positive number within the supported range.`);
  }
  const run=normalizeRun(input.benchmark);
  const result={version:1,hardware,model,
    hardwareId:/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(input.hardwareId||'') ? input.hardwareId : null,
    modelId:/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(input.modelId||'') ? input.modelId : null,
    outcome:input.outcome,generationTps:run?.generationTps??number(input.generationTps,10000),memoryGB:number(input.memoryGB,4096),contextTokens:run?.contextTokens??number(input.contextTokens,4000000),
    quant:clean(input.quant,40),runtime:clean(input.runtime,80),runtimeVersion:clean(input.runtimeVersion,80),note:clean(input.note,600),nickname:clean(input.nickname,40),benchmark:run,source:run?'benchmark_import':'quick_report',calibrationEligible:false,
  };
  if(run){result.quant=run.quant||result.quant;result.runtime='Ollama';result.runtimeVersion=run.runtimeVersion;}
  result.calibrationEligible=!!(run && result.hardwareId && result.modelId && run.modelDigest && run.runtimeVersion && run.samples.length>=3 && run.quant && run.numPredict && run.offload==='all_on_gpu' && run.samples.every(s=>s.outputTokens>=64 && s.promptTokens) && result.outcome!=='unable');
  return result;
}

function normalizeRun(input) {
  if(!input || typeof input!=='object' || input.protocol!==PROTOCOL) return null;
  const samples=(Array.isArray(input.samples)?input.samples:[]).slice(0,10).map(s=>({outputTokens:number(s.outputTokens,1000000),generationSeconds:number(s.generationSeconds,86400),promptTokens:number(s.promptTokens,4000000)})).filter(s=>s.outputTokens && s.generationSeconds);
  if(!samples.length) throw new Error('The benchmark file has no completed measurements.');
  const contextTokens=number(input.contextTokens,4000000);
  if(!contextTokens) throw new Error('The benchmark file is missing its context setting.');
  return {protocol:PROTOCOL,testedAt:clean(input.testedAt,40),modelName:clean(input.modelName||input.model),runtimeVersion:clean(input.runtimeVersion,80),modelDigest:/^[a-z0-9:]{16,100}$/i.test(input.modelDigest||'')?input.modelDigest:'',quant:clean(input.quant,40),contextTokens,numPredict:number(input.numPredict,1000000),samples,generationTps:median(samples.map(s=>s.outputTokens/s.generationSeconds)),loadedVramGB:number(input.loadedVramGB,4096),offload:clean(input.offload,80)};
}

export function parseTestOutput(text) {
  if(typeof text!=='string' || text.length>100000) throw new Error('Use a test output file under 100 KB.');
  let p;try{p=JSON.parse(text);}catch{}
  if(p?.protocol===PROTOCOL){const b=normalizeRun(p);return {hardware:clean(p.hardware),model:clean(p.model),quant:b.quant,runtime:'Ollama',runtimeVersion:b.runtimeVersion,generationTps:b.generationTps,contextTokens:b.contextTokens,benchmark:b,outcome:'runs',recognized:true};}
  if(p?.eval_count && p?.eval_duration) return {generationTps:p.eval_count/(p.eval_duration/1e9),runtime:'Ollama',recognized:true};
  if(Array.isArray(p)){const tg=p.filter(r=>r.n_gen>0 && r.n_prompt===0 && r.avg_ts>0);if(tg.length)return {generationTps:median(tg.map(r=>r.avg_ts)),runtime:'llama.cpp',runtimeVersion:clean(tg[0].build_commit,80),recognized:true};}
  // Do not mistake prompt-processing speed for generation speed.
  const lines=text.split(/\r?\n/).filter(line=>!/(?:prompt\s+eval|prompt\s+processing|prefill)/i.test(line));
  const s=lines.join('\n');
  const m=s.match(/(?:eval rate|generation(?:\s+speed)?|tokens?\s*\/\s*(?:sec(?:ond)?s?|s)|tok\/s)\s*[:=]?\s*([\d.]+)/i)||s.match(/([\d.]+)\s*(?:tokens?\s*\/\s*(?:sec(?:ond)?s?|s)|tok\/s|t\/s)/i);
  if(m && number(m[1],10000))return {generationTps:Number(m[1]),runtime:/eval rate/i.test(s)?'Ollama':'',recognized:true};
  return {recognized:false};
}

export function publicReport(row) {const p=typeof row.payload==='string'?JSON.parse(row.payload):row.payload;return {id:row.id,createdAt:row.created_at,verification:row.verification,reviewerNote:row.reviewer_note||'',useForCalibration:!!row.use_for_calibration,...p};}

export function calibrationCandidates(reports) {
  const groups=new Map();
  for(const r of reports){
    if(!r.useForCalibration || !r.calibrationEligible || !r.benchmark || r.outcome==='unable')continue;
    const b=r.benchmark,promptTokens=median(b.samples.map(s=>s.promptTokens).filter(Boolean)),key=JSON.stringify([r.hardwareId,r.modelId,b.modelDigest,b.quant,b.runtimeVersion,b.contextTokens,b.numPredict,b.offload,promptTokens]);
    const g=groups.get(key)||{hardwareId:r.hardwareId,modelId:r.modelId,modelDigest:b.modelDigest,quant:b.quant,runtime:'Ollama',runtimeVersion:b.runtimeVersion,contextTokens:b.contextTokens,promptTokens,offload:b.offload,protocol:b.protocol,evidence:[],sources:new Map()};
    g.evidence.push({id:r.id,generationTps:b.generationTps,verification:r.verification,samples:b.samples.length});
    const source=r._sourceGroup||r.id;g.sources.set(source,[...(g.sources.get(source)||[]),b.generationTps]);groups.set(key,g);
  }
  return [...groups.values()].map(({sources,...g})=>({...g,generationTps:median([...sources.values()].map(median)),rangeTps:[Math.min(...g.evidence.map(e=>e.generationTps)),Math.max(...g.evidence.map(e=>e.generationTps))],evidenceCount:g.evidence.length,sourceCount:sources.size,confidence:sources.size>=3?'multiple reviewed reporting sources':'limited evidence',automaticApplication:false}));
}
