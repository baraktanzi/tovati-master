import fs from 'node:fs/promises';

const mustExist=[
  'public/index.html',
  'public/build.txt',
  'public/architecture-v2/data/pm-seed.js',
  'public/architecture-v2/data/worker-photos.js',
  'public/architecture-v2/standalone/index.html',
  'public/architecture-v2/standalone/standalone.js'
];

for(const path of mustExist){
  await fs.access(path).catch(()=>{throw new Error('Missing build artifact: '+path);});
}

const [html,build,pm,photos]=await Promise.all([
  fs.readFile('public/index.html','utf8'),
  fs.readFile('public/build.txt','utf8'),
  fs.readFile('public/architecture-v2/data/pm-seed.js','utf8'),
  fs.readFile('public/architecture-v2/data/worker-photos.js','utf8')
]);

const indexBytes=Buffer.byteLength(html);
if(indexBytes>4_500_000)throw new Error('V2 index.html is too large: '+indexBytes);
if(html.includes('supabase.co')||html.includes('cloud-sync.js'))throw new Error('External cloud reference found in local build');
if(!html.includes('/architecture-v2/frontend/bootstrap.js'))throw new Error('V2 bootstrap is not loaded');
if(!html.includes('/architecture-v2/data/pm-seed.js'))throw new Error('PM seed is not externalized');
if(!html.includes('/architecture-v2/data/worker-photos.js'))throw new Error('Worker photos are not externalized');
if(!pm.startsWith('window.TOVATI_PM_SEED='))throw new Error('Invalid PM seed output');
if(!photos.startsWith('window.TOVATI_WORKER_PHOTOS='))throw new Error('Invalid worker-photo seed output');

const pmRows=Number(build.match(/PM_ROWS=(\d+)/)?.[1]||0);
const workerPhotos=Number(build.match(/WORKER_PHOTOS=(\d+)/)?.[1]||0);
const pmPayload=JSON.parse(pm.slice('window.TOVATI_PM_SEED='.length).replace(/;\s*$/,''));
const photoPayload=JSON.parse(photos.slice('window.TOVATI_WORKER_PHOTOS='.length).replace(/;\s*$/,''));

if(!Array.isArray(pmPayload)||pmPayload.length!==pmRows)throw new Error('PM seed count mismatch');
if(!photoPayload||typeof photoPayload!=='object'||Object.keys(photoPayload).length!==workerPhotos)throw new Error('Worker photo count mismatch');

console.log('TOVATI V2 smoke OK',{
  indexBytes,
  pmRows,
  workerPhotos,
  pmSeedBytes:Buffer.byteLength(pm),
  workerPhotoBytes:Buffer.byteLength(photos)
});
