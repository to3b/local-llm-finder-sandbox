import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const source = path.resolve(process.argv[2]);
const destination = path.resolve(process.argv[3]);
if (!process.argv[2] || !process.argv[3] || source === destination) throw new Error('Usage: node scripts/export-production.mjs CLEAN_FINDER_CHECKOUT EMPTY_OUTPUT_DIRECTORY');
if (fs.existsSync(destination) && fs.readdirSync(destination).length) throw new Error('Output must be empty.');
fs.mkdirSync(destination, {recursive:true});
for (const item of fs.readdirSync(source, {withFileTypes:true})) {
 if (item.name === '.git') continue;
 fs.cpSync(path.join(source,item.name), path.join(destination,item.name), {recursive:true});
}
fs.copyFileSync(new URL('../overrides/dist/sandbox-refine.css',import.meta.url),path.join(destination,'dist/sandbox-refine.css'));
execFileSync(process.execPath,[new URL('./prepare-sandbox.mjs',import.meta.url).pathname,destination],{stdio:'inherit',env:{...process.env,SITE_BASE:'/'}});
execFileSync('npm',['test'],{cwd:destination,stdio:'inherit'});
console.log('Production candidate generated and tested. No commit or deployment performed.');
