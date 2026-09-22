import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const source=await fs.readFile('index.html','utf8');
const tag='<script src="/cloud-sync.js?v=cloud-1"></script>';
const html=source.includes(tag)?source:source.replace('</body>',tag+'\n</body>');

await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});
await fs.writeFile('public/index.html',html,'utf8');
await fs.copyFile('cloud-sync.js','public/cloud-sync.js');

const hash=crypto.createHash('sha256').update(html).digest('hex');
await fs.writeFile('public/build.txt','TOVATI CLOUD '+hash+'\n');
console.log('TOVATI CLOUD ready',Buffer.byteLength(html),hash);
