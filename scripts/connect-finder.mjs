import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.KNOWLEDGE_BASE||'https://knowledge.localllmfinder.com/';
const version=(process.env.GITHUB_SHA||'connections-1').slice(0,12);
for(const rel of ['index.html','dist/index.html']){
 const file=path.join(root,rel);let s=fs.readFileSync(file,'utf8');
 if(!s.includes('references.js'))s=s.replace('</head>',`<meta name="knowledge-base" content="${base}"><link rel="stylesheet" href="./references.css?v=1"></head>`).replace('</body>','<script type="module" src="./references.js?v=1"></script></body>');
 s=s.replace(/<section class="content-section knowledge-preview"[\s\S]*?<\/section>/,'<aside class="knowledge-availability">Read the requirements behind the results in <a href="https://knowledge.localllmfinder.com/">Knowledge</a>.</aside>').replace('Model and hardware references are in preparation.','Read the requirements behind the results in');
 s=s.replaceAll('>Knowledge preview →</a>','>Knowledge →</a>').replaceAll('>Knowledge preview</a>','>Knowledge</a>');
 if(!base.startsWith('/')) s=s.replace(/\.\/app\.js\?v=[^"']+/g,`./app.js?v=references-${version}`);
 fs.writeFileSync(file,s);
}
for(const rel of ['dist/app.js','dist/journeys.js','dist/recommend.js']){
 if(base.startsWith('/')) continue; // The sandbox preparation owns its coordinated preload URLs.
 const file=path.join(root,rel);let s=fs.readFileSync(file,'utf8');
 s=s.replace(/\.\/recommend\.js\?v=[^"']+/g,`./recommend.js?v=references-${version}`).replace(/\.\/journeys\.js\?v=[^"']+/g,`./journeys.js?v=references-${version}`);
 fs.writeFileSync(file,s);
}
const legacy=path.join(root,'knowledge.html');
if(fs.existsSync(legacy)) {let s=fs.readFileSync(legacy,'utf8');if(!s.includes('http-equiv="refresh"'))s=s.replace('</head>',`<meta http-equiv="refresh" content="0; url=${base}"></head>`);fs.writeFileSync(legacy,s);}
for(const rel of ['dist/app.js','dist/journeys.js']){
 const file=path.join(root,rel);let s=fs.readFileSync(file,'utf8');
 if(!s.includes('data-reference-id')){
 s=s.replace('<strong>${model.name}</strong>','<strong>${model.name}</strong><span class="reference-slot" data-reference-id="${model.id}" hidden></span>');
 s=s.replace('<h3>${item.model.name}</h3>','<h3>${item.model.name}</h3><span class="reference-slot" data-reference-id="${item.model.id}" hidden></span>');
 s=s.replace('<h3>${candidate.model.name}</h3>','<h3>${candidate.model.name}</h3><span class="reference-slot" data-reference-id="${candidate.model.id}" hidden></span>');
 }
 fs.writeFileSync(file,s);
}
