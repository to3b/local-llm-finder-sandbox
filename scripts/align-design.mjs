import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.SITE_BASE||'/local-llm-finder-sandbox/';
if(!base.includes('sandbox'))throw new Error('The shared sandbox design must not alter production exports.');
const version=(process.env.GITHUB_SHA||'article-tests-2').slice(0,12);
let count=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(entry.name.startsWith('.')||entry.name==='node_modules')continue;
 const file=path.join(dir,entry.name);
 if(entry.isDirectory())walk(file);
 else if(entry.name.endsWith('.html')){
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<meta name="theme-color" content="[^"]*">/g,'');
  html=html.replace(/src="\.\/(tests|results)\.js"/g,(_,module)=>`src="./${module}.js?v=${version}"`);
  html=html.replace(/href="\.\/tests\.css(?:\?[^"]*)?"/g,`href="./tests.css?v=${version}"`);
  html=html.replace('</head>',`<meta name="theme-color" content="#151719"><link rel="stylesheet" href="${base}dist/sandbox-design.css?v=${version}" data-sandbox-design></head>`);
  fs.writeFileSync(file,html);count++;
 }
}}
walk(root);
for(const rel of ['tests/tests.js','tests/results.js']){const file=path.join(root,rel);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace("from './submissions.js';",`from './submissions.js?v=${version}';`));}
console.log(`Shared square-corner design applied last on all ${count} sandbox HTML pages.`);
