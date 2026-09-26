import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Mood Travel V20 only. TOVATI root build is untouched.
// The release snapshot is public-read and backend-write-only; verify integrity before publish.
const VERSION='20.0.0';
const EXPECTED_SHA='9bc5d4b4e2c362b4f0e0dbb2325f39dac5c3d7e187af2341cd499c340c8fafb7';
const EXPECTED_BYTES=1348747;
const SNAPSHOT='https://txpdbljehqkntdxrpoof.supabase.co/rest/v1/mt_site_releases?version=eq.v20&select=html,sha256,bytes&limit=1';
const PUBLIC_KEY='sb_publishable_ug2_CfqwXNVUoWaVtq-KQA_W7BtaTcS';
let release,lastError;
for(let attempt=0;attempt<3;attempt++){
  try{
    const response=await fetch(SNAPSHOT,{headers:{apikey:PUBLIC_KEY,Accept:'application/json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Mood snapshot HTTP '+response.status);
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].html!=='string')throw new Error('Invalid Mood snapshot');
    release=rows[0];break;
  }catch(error){lastError=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));}
}
if(!release)throw lastError||new Error('Mood snapshot unavailable');
const html=release.html;
const sha256=createHash('sha256').update(html,'utf8').digest('hex');
if(sha256!==EXPECTED_SHA||release.sha256!==EXPECTED_SHA||Buffer.byteLength(html)!==EXPECTED_BYTES)throw new Error('Mood V20 integrity check failed');
if(!html.includes('content="20.0.0"')||!html.includes('sensory_balcony')||html.includes('<small>תמונת אווירה</small>'))throw new Error('Wrong Mood release');
const dest=path.join(process.cwd(),'public','mood-travel-ai');
await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(dest,'index.html'),html,'utf8');
await fs.writeFile(path.join(dest,'version.json'),JSON.stringify({
  version:VERSION,sha256,bytes:EXPECTED_BYTES,
  unique_category_photos:true,
  repeated_card_images:'suppressed_per_visible_screen',
  image_labels_on_photos:false,
  enlarged_images:true,
  curated_checked:'2026-09-25',
  curated_counts:{experiences:20,gifts:18,stays:13,ideas:28},
  event_refresh:'existing_daily_database_feed'
},null,2)+'\n');
console.log('Mood Travel AI V20',EXPECTED_BYTES,'bytes',sha256);
