import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const names=(await fs.readdir('r24_parts')).filter(x=>x.endsWith('.txt')).sort();
let source='';
for(const name of names) source+=await fs.readFile('r24_parts/'+name,'utf8');

if(source.includes('supabase.co')||source.includes('cloud-sync.js')){
  throw new Error('External backend reference detected in local architecture source');
}

function scriptJson(source,id){
  const marker='<script id="'+id+'" type="application/json">';
  const start=source.indexOf(marker);
  if(start<0)throw new Error('Missing embedded JSON: '+id);
  const contentStart=start+marker.length;
  const end=source.indexOf('</script>',contentStart);
  if(end<0)throw new Error('Unclosed embedded JSON: '+id);
  return {marker,start,contentStart,end,content:source.slice(contentStart,end)};
}

function safeJsJson(value){
  return JSON.stringify(value).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}

// Split the two largest immutable seed blocks out of index.html.
// They remain same-origin static files and are merged back before R24 initializes.
const embedded=scriptJson(source,'tovati-embedded-state');
const snapshot=JSON.parse(embedded.content);
if(snapshot?.format!=='TOVATI-PILOT-BACKUP'||!snapshot?.state)throw new Error('Invalid embedded TOVATI snapshot');

const pmSeed=Array.isArray(snapshot.state.pmOrders)?snapshot.state.pmOrders:[];
const workerPhotos={};
for(const worker of snapshot.state.workers||[]){
  if(worker?.id&&worker?.photo)workerPhotos[String(worker.id)]=String(worker.photo);
  if(worker&&Object.hasOwn(worker,'photo'))worker.photo='';
}
snapshot.state.pmOrders=[];

const slimJson=JSON.stringify(snapshot);
const seedTag=
  '<script src="/architecture-v2/data/pm-seed.js?v=seed-1"></script>\n'+
  '<script src="/architecture-v2/data/worker-photos.js?v=seed-1"></script>';

source=source.slice(0,embedded.contentStart)+slimJson+source.slice(embedded.end);
const snapshotClose=source.indexOf('</script>',embedded.contentStart);
source=source.slice(0,snapshotClose+9)+'\n'+seedTag+source.slice(snapshotClose+9);

const oldEmbeddedFn="function embeddedSnapshot(){try{const el=document.getElementById('tovati-embedded-state');if(!el?.textContent.trim())return null;const x=JSON.parse(el.textContent);return x?.format==='TOVATI-PILOT-BACKUP'&&x?.state?x:null;}catch(e){console.warn('Embedded snapshot ignored',e);return null;}}";
const newEmbeddedFn="function embeddedSnapshot(){try{const el=document.getElementById('tovati-embedded-state');if(!el?.textContent.trim())return null;const x=JSON.parse(el.textContent);if(!(x?.format==='TOVATI-PILOT-BACKUP'&&x?.state))return null;const pm=window.TOVATI_PM_SEED;if(Array.isArray(pm))x.state.pmOrders=pm;const photos=window.TOVATI_WORKER_PHOTOS||{};if(Array.isArray(x.state.workers))x.state.workers=x.state.workers.map(w=>({...w,photo:photos[w.id]||w.photo||''}));return x;}catch(e){console.warn('Embedded snapshot ignored',e);return null;}}";
if(!source.includes(oldEmbeddedFn))throw new Error('embeddedSnapshot implementation changed; seed split must be reviewed');
source=source.replace(oldEmbeddedFn,newEmbeddedFn);

const preload=
  '<link rel="preload" href="/architecture-v2/data/pm-seed.js?v=seed-1" as="script">\n'+
  '<link rel="preload" href="/architecture-v2/data/worker-photos.js?v=seed-1" as="script">';
if(!source.includes('rel="preload" href="/architecture-v2/data/pm-seed.js')){
  source=source.replace('</head>',preload+'\n</head>');
}

const compatTag='<script src="/architecture-v2/frontend/compat/r24-bridge.js?v=2"></script>';
const moduleTag='<script type="module" src="/architecture-v2/frontend/bootstrap.js?v=2"></script>';
if(!source.includes(compatTag)){
  source=source.replace('</body>',compatTag+'\n'+moduleTag+'\n</body>');
}

await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});

// Architecture branch stays local-only. No legacy external cloud sync is injected.
await fs.writeFile('public/index.html',source,'utf8');

await fs.mkdir('public/architecture-v2',{recursive:true});
await fs.cp('tovati-v2','public/architecture-v2',{recursive:true});
await fs.mkdir('public/architecture-v2/data',{recursive:true});

await fs.writeFile(
  'public/architecture-v2/data/pm-seed.js',
  'window.TOVATI_PM_SEED='+safeJsJson(pmSeed)+';\n',
  'utf8'
);
await fs.writeFile(
  'public/architecture-v2/data/worker-photos.js',
  'window.TOVATI_WORKER_PHOTOS='+safeJsJson(workerPhotos)+';\n',
  'utf8'
);

const hash=crypto.createHash('sha256').update(source).digest('hex');
const originalSeedBytes=Buffer.byteLength(embedded.content);
const slimSeedBytes=Buffer.byteLength(slimJson);
const indexBytes=Buffer.byteLength(source);
await fs.writeFile(
  'public/build.txt',
  [
    'TOVATI R24 + V2 LOCAL MODULES '+hash,
    'INDEX_BYTES='+indexBytes,
    'EMBEDDED_SEED_BEFORE='+originalSeedBytes,
    'EMBEDDED_SEED_AFTER='+slimSeedBytes,
    'PM_ROWS='+pmSeed.length,
    'WORKER_PHOTOS='+Object.keys(workerPhotos).length
  ].join('\n')+'\n'
);

await fs.mkdir('public/mood-travel-ai',{recursive:true});
await fs.copyFile('mood-travel-ai/index.html','public/mood-travel-ai/index.html');
console.log('TOVATI local modular build', {
  indexBytes,
  originalSeedBytes,
  slimSeedBytes,
  pmRows:pmSeed.length,
  workerPhotos:Object.keys(workerPhotos).length,
  hash
});
await import('./mood-travel-ai/build-v8.mjs');
