import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(process.argv[2]||'site');
const knowledge=path.join(root,'knowledge-preview');
const data=JSON.parse(fs.readFileSync(path.join(knowledge,'references.json'),'utf8'));
await import(pathToFileURL(path.join(root,'dist/catalog-extra.js')));
const {MODELS,GPUs}=await import(pathToFileURL(path.join(root,'dist/data.js')));
const {validateReferences}=await import(pathToFileURL(path.join(root,'dist/references.js')));
const mapping=validateReferences(data);
assert.equal(data.articles.length,280);
assert.equal(data.articles.filter(a=>a.status==='Draft').length,274);
assert.equal(data.articles.filter(a=>a.status==='Published').length,6);
for(const model of MODELS)assert.ok(mapping.has('Model:'+model.id),'Missing model page: '+model.id);
for(const gpu of GPUs)assert.ok(mapping.has('Hardware:'+gpu.id),'Missing GPU page: '+gpu.id);
assert.equal(mapping.size,MODELS.length+GPUs.length);
for(const article of data.articles){
  const html=fs.readFileSync(path.join(knowledge,article.key,'index.html'),'utf8');
  assert.ok(html.includes('content="noindex,nofollow"'),article.key+' must remain unindexed in staging');
  assert.ok(!html.includes('href="https://knowledge.localllmfinder.com/'),article.key+' links must stay in staging');
  assert.ok(!html.includes('&amp;amp;'),article.key+' must preserve URL parameters');
  assert.ok(!html.includes('[['),article.key+' must resolve wiki links');
  if(article.status==='Draft'){
    assert.ok(html.includes('Draft reference'),article.key+' needs a review notice');
    assert.ok(/gid=323200577&amp;range=A\d+:Q\d+/.test(html),article.key+' needs an exact editing link');
    assert.ok(!html.includes('application/ld+json'),article.key+' must not claim published Article markup');
  }
}
assert.ok(!fs.existsSync(path.join(knowledge,'sitemap.xml')));
const index=fs.readFileSync(path.join(knowledge,'index.html'),'utf8');
assert.equal((index.match(/data-reference-status="Draft"/g)||[]).length,274);
assert.equal((index.match(/data-reference-status="Published"/g)||[]).length,6);
assert.ok(index.includes('id="reference-status"'));
console.log('All 280 staging pages passed: 136 models, 142 GPUs, 2 guides; 274 editable drafts; exact entity IDs and isolated noindex routes.');
