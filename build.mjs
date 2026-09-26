import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const names=(await fs.readdir('r24_parts')).filter(x=>x.endsWith('.txt')).sort();
let source='';
for(const name of names) source+=await fs.readFile('r24_parts/'+name,'utf8');

await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});

// Architecture branch is LOCAL ONLY.
// Do not inject legacy cloud-sync.js and do not contact any external backend.
await fs.writeFile('public/index.html',source,'utf8');

const hash=crypto.createHash('sha256').update(source).digest('hex');
await fs.writeFile('public/build.txt','TOVATI R24 LOCAL ARCHITECTURE '+hash+'\n');

await fs.mkdir('public/architecture-v2',{recursive:true});
await fs.cp('tovati-v2','public/architecture-v2',{recursive:true});

await fs.mkdir('public/mood-travel-ai',{recursive:true});
await fs.copyFile('mood-travel-ai/index.html','public/mood-travel-ai/index.html');
console.log('TOVATI local-only architecture build ready',Buffer.byteLength(source),hash);
await import('./mood-travel-ai/build-v8.mjs');
