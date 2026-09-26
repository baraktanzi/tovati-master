import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const names=(await fs.readdir('r24_parts')).filter(x=>x.endsWith('.txt')).sort();
let source='';
for(const name of names) source+=await fs.readFile('r24_parts/'+name,'utf8');

const compatTag='<script src="/architecture-v2/frontend/compat/r24-bridge.js?v=1"></script>';
const moduleTag='<script type="module" src="/architecture-v2/frontend/bootstrap.js?v=1"></script>';
if(!source.includes(compatTag)){
  source=source.replace('</body>',compatTag+'\n'+moduleTag+'\n</body>');
}

await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});

// Architecture branch stays local-only. No legacy external cloud sync is injected.
await fs.writeFile('public/index.html',source,'utf8');

await fs.mkdir('public/architecture-v2',{recursive:true});
await fs.cp('tovati-v2','public/architecture-v2',{recursive:true});

const hash=crypto.createHash('sha256').update(source).digest('hex');
await fs.writeFile('public/build.txt','TOVATI R24 + V2 LOCAL MODULES '+hash+'\n');

await fs.mkdir('public/mood-travel-ai',{recursive:true});
await fs.copyFile('mood-travel-ai/index.html','public/mood-travel-ai/index.html');
console.log('TOVATI R24 + V2 local compatibility build ready',Buffer.byteLength(source),hash);
await import('./mood-travel-ai/build-v8.mjs');
