import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site');
const base=process.env.KNOWLEDGE_BASE||'https://knowledge.localllmfinder.com/';
for(const rel of ['index.html','dist/index.html']){
 const file=path.join(root,rel);let s=fs.readFileSync(file,'utf8');
 if(!s.includes('references.js'))s=s.replace('</head>',`<meta name="knowledge-base" content="${base}"><link rel="stylesheet" href="./references.css?v=1"></head>`).replace('</body>','<script type="module" src="./references.js?v=1"></script></body>');
 s=s.replace(/<section class="content-section knowledge-preview"[\s\S]*?<\/section>/,'<aside class="knowledge-availability">Read the requirements behind the results in <a href="https://knowledge.localllmfinder.com/">Knowledge</a>.</aside>').replace('Model and hardware references are in preparation.','Read the requirements behind the results in');
 s=s.replaceAll('>Knowledge preview →</a>','>Knowledge →</a>').replaceAll('>Knowledge preview</a>','>Knowledge</a>');
 fs.writeFileSync(file,s);
}
for(const rel of ['dist/app.js','dist/journeys.js']){
 const file=path.join(root,rel);let s=fs.readFileSync(file,'utf8');
 if(!s.includes('data-reference-id')){
 s=s.replace('<strong>${model.name}</strong>','<strong>${model.name}</strong><span class="reference-slot" data-reference-id="${model.id}" hidden></span>');
 s=s.replace('<h3>${item.model.name}</h3>','<h3>${item.model.name}</h3><span class="reference-slot" data-reference-id="${item.model.id}" hidden></span>');
 s=s.replace('<h3>${candidate.model.name}</h3>','<h3>${candidate.model.name}</h3><span class="reference-slot" data-reference-id="${candidate.model.id}" hidden></span>');
 }
 fs.writeFileSync(file,s);
}
