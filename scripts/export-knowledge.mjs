import fs from 'node:fs';
import path from 'node:path';
const source = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
if (!process.argv[2] || !process.argv[3] || source === output) throw new Error('Usage: node scripts/export-knowledge.mjs CLEAN_KNOWLEDGE_CHECKOUT EMPTY_OUTPUT_DIRECTORY');
if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error('Output must be empty.');
fs.mkdirSync(output,{recursive:true});
for (const item of fs.readdirSync(source,{withFileTypes:true})) {
 if (item.name === '.git') continue;
 fs.cpSync(path.join(source,item.name),path.join(output,item.name),{recursive:true});
}
fs.copyFileSync(new URL('../overrides/dist/sandbox-refine.css',import.meta.url),path.join(output,'sandbox-refine.css'));
for (const [rel,href] of [['index.html','./sandbox-refine.css?v=cleanup-1'],['scripts/build-articles.mjs','../../sandbox-refine.css?v=cleanup-1']]) {
 const file = path.join(output,rel);
 const text = fs.readFileSync(file,'utf8');
 if (!text.includes('</head>')) throw new Error('Missing document head in '+rel);
 fs.writeFileSync(file,text.replace('</head>',`<link rel="stylesheet" href="${href}"></head>`));
}
console.log('Knowledge stylesheet candidate prepared. Publishing and live-sheet logic preserved. No commit or deployment performed.');
