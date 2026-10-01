import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site'),base='/local-llm-finder-sandbox/';
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||e.name==='node_modules')continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html'))files.push(p);}}
walk(root);
for(const file of files){
 const html=fs.readFileSync(file,'utf8'),label=path.relative(root,file);
 const pageUrl=new URL(base+label.replaceAll(path.sep,'/'),'https://sandbox.invalid'),baseHref=html.match(/<base\b[^>]*href="([^"]+)"/)?.[1],pageBase=baseHref?new URL(baseHref,pageUrl):pageUrl;
 const links=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]);
 assert.ok(links.at(-1)?.includes('data-sandbox-design'),label+' must end with the shared design');
 assert.ok(html.includes('<meta name="theme-color" content="#151719">'),label+' must share the theme');
 assert.ok(html.includes('content="noindex,nofollow"'),label+' must stay unindexed');
 for(const link of links){const href=link.match(/href="([^"]+)"/)?.[1];if(!href)continue;const resolved=new URL(href,pageBase);if(resolved.origin!==pageUrl.origin)continue;assert.ok(resolved.pathname.startsWith(base),label+' styles must remain in the sandbox');const local=path.join(root,resolved.pathname.slice(base.length));assert.ok(fs.existsSync(local),label+' has missing stylesheet '+href);}
 assert.ok(!/<nav\b[^>]*aria-label="Site"[^>]*>[\s\S]*?>Tests<\/a>[\s\S]*?<\/nav>/.test(html),label+' must not promote Tests in global navigation');
}
for(const rel of ['index.html','dist/index.html','knowledge-preview/index.html']){const html=fs.readFileSync(path.join(root,rel),'utf8');assert.ok(!html.includes('share-model-test')&&!html.includes('community-availability')&&!html.includes('test-links.js'),rel+' must keep tests contextual');}
const registry=JSON.parse(fs.readFileSync(path.join(root,'knowledge-preview/references.json'),'utf8'));let invitations=0;
for(const a of registry.articles){const html=fs.readFileSync(path.join(root,'knowledge-preview',a.key,'index.html'),'utf8');const has=html.includes('class="article-test-invite"');assert.equal(has,['Model','Hardware'].includes(a.type)&&!!a.entityIds?.length,a.key+' must have the right contextual invitation');if(has){const match=html.match(/class="doc-button secondary" href="([^"]*tests\/\?[^"]+)"/);assert.ok(match,a.key+' needs a contribution link');const url=new URL(match[1].replaceAll('&amp;','&'),'https://to3b.github.io');assert.equal(url.searchParams.get(a.type==='Model'?'model':'hardware'),a.entityIds[0]);assert.equal(url.searchParams.get('from'),a.key);invitations++;}}
const form=fs.readFileSync(path.join(root,'tests/index.html'),'utf8');assert.ok(!/<(?:input|textarea)[^>]*(?:id|name)="(?:response|reply|answer)"/.test(form));assert.ok(form.includes('id="baseline-prompts"')&&form.includes('128-token reply limit')&&form.includes('4096-token context'));assert.ok(form.includes('value="custom"'),'Own tests must remain available');
assert.ok(form.indexOf('id="test-guide"')>form.indexOf('<form')&&form.indexOf('id="test-guide"')<form.indexOf('</form>'),'Prompt guide must be part of the form');
assert.ok(!form.includes('class="test-nav"')&&!form.includes('href="./results.html"'),'Submission flow must not lead into a separate results search');
const shared=fs.readFileSync(path.join(root,'dist/sandbox-design.css'),'utf8');assert.ok(shared.includes('border-radius: 0 !important'));
console.log(`Design/source audit passed for all ${files.length} HTML pages: shared last stylesheet, square-corner policy, valid assets, no global Tests navigation, ${invitations} contextual invitations and response-free baseline guidance.`);
