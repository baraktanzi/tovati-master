import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const names=(await fs.readdir('r24_parts')).filter(x=>x.endsWith('.txt')).sort();
let source='';
for(const name of names) source+=await fs.readFile('r24_parts/'+name,'utf8');
const tag='<script src="/cloud-sync.js?v=cloud-2"></script>';
const html=source.includes(tag)?source:source.replace('</body>',tag+'\n</body>');
await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});
await fs.writeFile('public/index.html',html,'utf8');
await fs.copyFile('cloud-sync.js','public/cloud-sync.js');
const hash=crypto.createHash('sha256').update(source).digest('hex');
await fs.writeFile('public/build.txt','TOVATI R24 DRIVE MASTER '+hash+'\n');

await fs.mkdir('public/mood-travel-ai',{recursive:true});
await fs.copyFile('mood-travel-ai/index.html','public/mood-travel-ai/index.html');
console.log('Mood Travel AI public subpath ready');
console.log('TOVATI exact R24 master ready',Buffer.byteLength(source),hash);
