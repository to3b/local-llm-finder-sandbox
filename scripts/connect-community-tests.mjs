import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.SITE_BASE||'/local-llm-finder-sandbox/';
if(!base.includes('sandbox'))throw new Error('Community tests must stay in the sandbox until approval.');
const knowledge=path.join(root,'knowledge-preview');
const registry=JSON.parse(fs.readFileSync(path.join(knowledge,'references.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let connected=0;
for(const article of registry.articles){
 if(!['Model','Hardware'].includes(article.type)||!article.entityIds?.length)continue;
 const p=new URLSearchParams({[article.type==='Model'?'model':'hardware']:article.entityIds[0],from:article.key});
 const heading=article.type==='Model'?'Have you tried this LLM?':'Have you run a model on this GPU?';
 const description=article.type==='Model'?`Share how ${article.title} ran on your hardware.`:`Share a model you tried on ${article.title}.`;
 const invite=`<aside class="article-test-invite" aria-label="Share your experience"><h2>${heading}</h2><p>${escape(description)} A quick report is enough.</p><a class="doc-button secondary" href="${base}tests/?${escape(p)}">Share a test</a></aside>`;
 const file=path.join(knowledge,article.key,'index.html');let html=fs.readFileSync(file,'utf8');
 if(!html.includes('</article>'))throw new Error(`Missing article container: ${article.key}`);
 html=html.replace('</article>',invite+'</article>');fs.writeFileSync(file,html);connected++;
}
console.log(`Contextual test invitations added to ${connected} model/hardware articles. No global Tests navigation or Finder test actions.`);
