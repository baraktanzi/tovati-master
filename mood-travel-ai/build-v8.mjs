import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';

// The six transport parts contain readable template/CSS/JS JSON, not executable
// build code. Verify the payload before parsing. Keep TOVATI's root build intact.
const dir=path.dirname(fileURLToPath(import.meta.url));
const original=await fs.readFile(path.join(dir,'index.html'),'utf8');
const match=original.match(/const BG\s*=\s*(\{[\s\S]*?\});/);
if(!match)throw new Error('Existing Mood photo assets not found');
const assets=JSON.parse(match[1]);
assets.logo=(await Promise.all([1,2,3,4,5,6].map(n=>fs.readFile(path.join(dir,'logo-v9-'+n+'.txt'),'utf8')))).join('').trim();
for(const key of ['romantic','relax','nature','party','music','family','food','logo']){
  if(!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(assets[key]||''))throw new Error('Invalid image asset: '+key);
}
const parts=await Promise.all([1,2,3,4,5,6].map(n=>fs.readFile(path.join(dir,'content-v16-'+n+'.b64'),'utf8')));
const payload=brotliDecompressSync(Buffer.from(parts.map(s=>s.trim()).join(''),'base64'));
const digest=createHash('sha256').update(payload).digest('hex');
if(digest!=='a19056cc6143266139a58fc9a61ba73404d0288deb80628904861d99e0ab3082')throw new Error('Mood V16 payload integrity check failed');
const {template,css,js}=JSON.parse(payload.toString('utf8'));
if(![template,css,js].every(v=>typeof v==='string'))throw new Error('Invalid Mood V16 payload');
const html=template.replace('__ASSETS__',()=>JSON.stringify(assets).replace(/</g,'\\u003c')).replace('__APP__',()=>js).replace('__STYLE__',()=>css);
if(/__(ASSETS|APP|STYLE)__/.test(html)||!html.includes('content="16.0.0"'))throw new Error('Incomplete Mood V16 build');
const dest=path.join(process.cwd(),'public','mood-travel-ai');
await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(dest,'index.html'),html,'utf8');
const sha256=createHash('sha256').update(html).digest('hex');
await fs.writeFile(path.join(dest,'version.json'),JSON.stringify({version:'16.0.0',sha256,bytes:Buffer.byteLength(html),curated_checked:'2026-09-25',curated_counts:{experiences:20,gifts:18,stays:13,ideas:28},curated_refresh:'manual_snapshot',event_refresh:'existing_daily_database_feed'},null,2)+'\n');
console.log('Mood Travel AI V16 Couples',Buffer.byteLength(html),'bytes',sha256);
