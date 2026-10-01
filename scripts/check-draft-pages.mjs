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
const drafts=data.articles.filter(a=>a.status==='Draft').length;
const published=data.articles.filter(a=>a.status==='Published').length;
assert.equal(drafts+published,data.articles.length,'Unknown reference status');
const modelCoverage=MODELS.filter(m=>mapping.has('Model:'+m.id)).length;
const gpuCoverage=GPUs.filter(g=>mapping.has('Hardware:'+g.id)).length;
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
assert.equal((index.match(/data-reference-status="Draft"/g)||[]).length,drafts);
assert.equal((index.match(/data-reference-status="Published"/g)||[]).length,published);
assert.ok(index.includes('id="reference-status"'));
console.log(`All ${data.articles.length} staging pages passed: ${drafts} editable drafts, ${published} published references; model coverage ${modelCoverage}/${MODELS.length}, GPU coverage ${gpuCoverage}/${GPUs.length}; exact IDs and isolated noindex routes.`);
