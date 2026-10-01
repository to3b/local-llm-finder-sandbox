import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.SITE_BASE||'/local-llm-finder-sandbox/';
if(!base.includes('sandbox'))throw new Error('Community tests must stay in the sandbox until approval.');
const tests=base+'tests/';
const version=(process.env.GITHUB_SHA||'community-tests-1').slice(0,12);
for(const rel of ['index.html','dist/index.html']){
 const p=path.join(root,rel);let h=fs.readFileSync(p,'utf8');
 h=h.replace('</head>',`<meta name="tests-base" content="${tests}"><style>.community-availability{margin-top:24px;padding:16px 0;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;font-size:.85rem;color:var(--muted)}.community-availability a,.share-model-test{color:var(--text);text-underline-offset:4px}.community-availability p{margin:0}.community-actions{display:flex;gap:16px;flex-wrap:wrap}.share-model-test{display:inline-block;font-size:.8rem;margin:10px 0 2px}.site-nav a.community-nav{display:inline!important}@media(max-width:640px){.community-availability{align-items:flex-start;flex-direction:column}}</style></head>`);
 h=h.replace('<nav class="site-nav" aria-label="Site">',`<nav class="site-nav" aria-label="Site"><a class="community-nav" href="${tests}">Tests</a>`);
 h=h.replace('<p class="homepage-trust">',`<aside class="community-availability"><p>Tried a model on this computer?</p><div class="community-actions"><a id="share-test-from-finder" href="${tests}">Share a test</a><a href="${tests}results.html">Reviewed results</a></div></aside><p class="homepage-trust">`);
 h=h.replace('</body>',`<script type="module" src="./test-links.js?v=${version}"></script></body>`);fs.writeFileSync(p,h);
}
const appPath=path.join(root,'dist/app.js');let app=fs.readFileSync(appPath,'utf8');
const needle='${huggingFaceAnchor(model)}</p></div>';
if(!app.includes(needle))throw new Error('Could not locate the model contribution link placement.');
app=app.replace(needle,`${'${huggingFaceAnchor(model)}'}</p><a class="share-model-test" data-share-test="${'${model.id}'}" data-test-quant="${'${quant.name}'}" href="${tests}">Tried this model? Share a test</a></div>`);fs.writeFileSync(appPath,app);
// Keep navigation from article pages inside the sandbox.
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.name.endsWith('.html')){let h=fs.readFileSync(p,'utf8');h=h.replace(/(<nav[^>]*aria-label="Site"[^>]*>)/,`$1<a href="${tests}">Tests</a>`);fs.writeFileSync(p,h);}}}
walk(path.join(root,'knowledge-preview'));
console.log('Community tests connected to the sandbox; production promotion remains gated.');
