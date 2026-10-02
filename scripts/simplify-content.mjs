import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.SITE_BASE||'/local-llm-finder-sandbox/';
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,s)=>fs.writeFileSync(path.join(root,rel),s);
const intro='Choose your hardware, main use and priority.';
for(const rel of ['index.html','dist/index.html']){
 let s=read(rel).replace(/<p class="eyebrow">Local model compatibility<\/p>/,'').replace(/<div class="tier-start"[^>]*>[\s\S]*?<\/div>/,'');
 s=s.replace('Choose your hardware and workload to compare local models by estimated memory use, context length and task fit. Speed estimates are available for supported GPUs.',intro);
 s=s.replace('VRAM affects fit. Card model improves speed estimates.','Choose a card name for speed estimates.').replace('<p class="field-help">This gets the most weight.</p>','');
 s=s.replace('Memory estimates fit. Exact Mac speed is not estimated yet.','Memory fit only; Mac speed is not estimated.').replace('Secondary uses influence ranking; main use stays primary.','Optional; your main use has more weight.').replace('How much text the estimate should account for, including prompt, pasted text and reply.','Includes chat history, input and reply.');
 s=s.replace('Automatic picks the best-fitting option. Fixed choices can exclude models.','Automatic checks the available sizes.').replace('Estimated quantized size before runtime/context overhead.','Weights only; excludes cache and runtime memory.').replace('<p class="field-help">Leave open for the best overall match.</p>','');
 s=s.replace(/<aside class="knowledge-availability">[\s\S]*?<\/aside>/,'');
 s=s.replace(/<p class="homepage-trust">[\s\S]*?<\/p>/,`<p class="homepage-trust">Estimates, not benchmarks. Verify the download, licence and runtime before buying hardware. <a href="./methodology.html">How estimates work</a></p>`);
 write(rel,s);
}
for(const rel of ['dist/copy-tune.js','dist/journeys.js']){
 let s=read(rel).replaceAll('Choose your hardware and workload to compare local models by estimated memory use, context length and task fit. Speed estimates are available for supported GPUs.',intro).replaceAll('VRAM affects fit. Card model improves speed estimates.','Choose a card name for speed estimates.');
 s=s.replace("if (taskHelp) taskHelp.textContent = 'This gets the most weight.';","taskHelp?.remove();").replace('Optional. Only set this if you need a hard speed floor.','Exclude models below this estimated speed.');
 s=s.replace('Capability and performance comparisons are planning estimates, not benchmark-grade measurements.','Comparisons use estimates, not measured benchmarks.').replace('Capacity-only simulation: compute, bandwidth, price and real benchmarks still matter.','Memory comparison only; speed and price are not compared.');
 write(rel,s);
}
// Result cards show each fact once; ranking rationale lives inside the disclosure.
let app=read('dist/app.js');
const replaceCard=(before,after)=>{if(!app.includes(before))throw new Error('Result cleanup source changed: '+before.slice(0,70));app=app.replace(before,after);};
replaceCard('<span>${fitLabel(quality)} ${taskShortNames[primaryUse]} fit · ${memoryContext} · ranks highest for ${preferenceLabel} priority</span>', '<span>Ranks highest for your ${preferenceLabel.toLowerCase()} priority.</span>');
replaceCard('${whyTop}</summary>', '</summary>');
replaceCard('<div class="model-details"><p>${why} ${speedText}</p><p class="estimate-context">Context used for this estimate: ${(Number(form.elements.context.value) * 1000).toLocaleString(\'en-US\')} tokens.</p><div class="detail-grid">', '<div class="model-details">${whyTop}<div class="detail-grid"><div><span class="detail-label">Context used for this estimate</span><strong>${(Number(form.elements.context.value) * 1000).toLocaleString(\'en-US\')} tokens</strong></div>');
replaceCard('<span>Memory</span><strong>${fmt(requiredGB)} GB</strong>', '<span>Estimated memory</span><strong>${fmt(requiredGB)} GB</strong>');
write('dist/app.js',app);
let index=read('knowledge-preview/index.html');
index=index.replace('Model and hardware references','Knowledge').replace('Requirements, quantization, context and practical hardware guidance. Drafts are available to read while their sources and details are reviewed.','Model requirements, hardware and setup guides. Drafts still need source checks.');
index=index.replace(/(<li data-reference-status=[\s\S]*?<\/li>)/g,item=>item.replace(/<p>[\s\S]*?<\/p>/,''));
write('knowledge-preview/index.html',index);
// Keep article facts readable. Fold navigation and editorial scaffolding, not the article.
const registry=JSON.parse(read('knowledge-preview/references.json'));
for(const a of registry.articles){
 const rel='knowledge-preview/'+a.key+'/index.html';let s=read(rel);
 s=s.replace(/<p class="eyebrow">(?:Model|Hardware|Guide) reference<\/p>/,'');
 s=s.replace(/<nav class="article-contents"([^>]*)><strong>On this page<\/strong>([\s\S]*?)<\/nav>/,'<details class="article-contents"><summary>On this page</summary><nav$1>$2</nav></details>');
 if(a.status==='Draft'){
  s=s.replace(/<p class="doc-lede">[\s\S]*?<\/p>/,'');
  s=s.replace('<strong>Draft reference</strong><p>Catalogue details and planning guidance are awaiting source review.</p>','<strong>Draft reference</strong><p>Planning inputs; not yet checked against publisher sources.</p>');
  s=s.replace(/<h2 id="(section-\d+)">What to verify before publication<\/h2>(\s*<ul>[\s\S]*?<\/ul>)/,'<details class="editor-checklist" id="$1"><summary>Source checks for this draft</summary>$2</details>');
  s=s.replace('>What to verify before publication</a>', '>Source checks for this draft</a>');
  // Repeated opening boilerplate adds no facts beyond the visible draft notice.
  s=s.replace(/<p>This draft covers[\s\S]*?<\/p>/,'');
 }
 s=s.replace(/<section class="doc-section article-sources">\s*<h2(?: id="([^"]+)")?>Sources<\/h2>([\s\S]*?)<\/section>/,(_m,id,body)=>`<details class="doc-section article-sources"${id?` id="${id}"`:''}><summary>Sources</summary>${body}</details>`);
 // Merge related and incoming references instead of repeating the same destinations.
 const connection=/<section class="doc-section"><h2>(?:Related references|Referenced by)<\/h2>[\s\S]*?<\/section>/g;
 const sections=[...s.matchAll(connection)],links=new Map();
 for(const match of sections)for(const l of match[0].matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g))links.set(l[1],l[2]);
 if(sections.length){let first=true;s=s.replace(connection,()=>{if(!first)return '';first=false;return `<details class="doc-section related-reading"><summary>Related reading</summary><ul>${[...links].map(([href,label])=>`<li><a href="${href}">${label}</a></li>`).join('')}</ul></details>`;});}
 write(rel,s);
}
let methodology=read('dist/methodology.html').replaceAll('Knowledge preview','Knowledge');
methodology=methodology.replace(/<section class="doc-hero"[\s\S]*?(?=<footer class="doc-footer")/,`<article><header class="doc-hero"><h1 id="page-heading">How estimates work</h1><p class="doc-lede">Use the Finder to shortlist models, then check them in your runtime. The results are estimates, not measured benchmarks.</p></header>
<div class="doc-body"><section class="doc-section"><h2>Will it fit?</h2><p>Estimated weights, context cache and runtime memory must fit within the available budget. Some memory is reserved for other applications and the operating system.</p></section>
<section class="doc-section"><h2>Which model ranks highest?</h2><p>Your main use and speed-versus-quality priority determine the order. Task-fit labels come from catalogue ranking inputs, not standardized benchmark scores.</p></section>
<section class="doc-section"><h2>How fast will it run?</h2><p>Known GPUs get a speed range based on bandwidth and model-size assumptions. Mac and RAM-only setups get memory-fit estimates without exact-device speed predictions.</p></section>
<details class="doc-section"><summary>Ranking details and filters</summary><p>Your main use receives 65% of task weighting; secondary uses share 35%. Stronger priorities favour task fit. Speed matters more at faster priorities and can break ties.</p><p>Top matches use engine scores; near-equal scores and task-fit inputs can share first place. An optional minimum speed removes slower estimates from the shortlist.</p><p>Quantization, family, file-size and memory filters restrict the candidates. They do not improve compatibility. File-size limits cover weights, not total runtime memory.</p></details>
<details class="doc-section"><summary>Memory and speed assumptions</summary><p>Mac and RAM-only budgets reserve system memory. GPU estimates account for model weights, cache, runtime overhead and a reserve.</p><p>Mixture-of-experts models can use active-weight hints for speed, but attention, routing, shared layers and runtime overhead still cost time. Speed ranges are capped accordingly.</p></details>
<section class="doc-section"><h2>Before you download or buy</h2><p>Check the publisher’s model card, licence, file format, context limit and runtime support. Model links use a verified publisher repository where available; otherwise they use a search.</p><p>Hardware tests can improve future estimates after review. Catalogue scores and speed assumptions still need more sourced measurements.</p></section></div><div class="doc-actions"><a class="doc-button primary" href="${base}">Use the Finder</a><a class="doc-button secondary" href="${base}knowledge-preview/">Knowledge</a></div></article>
`);
write('dist/methodology.html',methodology);
// Fragment links into disclosures must reveal their destination, including Back/Forward.
const articleScript=`function reveal(){const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const target=document.getElementById(id);if(!target)return;for(let e=target;e;e=e.parentElement)if(e.tagName==='DETAILS')e.open=true;target.scrollIntoView();}addEventListener('hashchange',reveal);reveal();document.querySelectorAll('.article-contents a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.article-contents').open=false;}));`;
write('knowledge-preview/reading.js',articleScript);
for(const a of registry.articles){const rel='knowledge-preview/'+a.key+'/index.html';write(rel,read(rel).replace('</body>',`<script type="module" src="../../reading.js?v=${(process.env.GITHUB_SHA||'readability').slice(0,12)}"></script></body>`));}
console.log('Reader-focused copy and secondary disclosures applied to Finder, Knowledge, methodology and all articles. Legal pages left unchanged.');
