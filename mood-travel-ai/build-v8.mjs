import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Mood Travel V17, isolated from the TOVATI root build.
// The reviewed, self-contained release is stored in a dedicated public-read,
// backend-write-only Mood release table. All ten approved photographs are
// embedded. No runtime request to Drive or the release table is needed.
// Readable source and original catalog snapshot are in the supplied V17 archive.
const VERSION='17.0.0';
const EXPECTED_SHA='691319842388fd2b933a25db95b7daffc135c2d634a02d4fe6e8f58094038ca6';
const EXPECTED_BYTES=1373757;
const SNAPSHOT='https://txpdbljehqkntdxrpoof.supabase.co/rest/v1/mt_site_releases?version=eq.v17&select=html,sha256,bytes&limit=1';
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
if(sha256!==EXPECTED_SHA||release.sha256!==EXPECTED_SHA||Buffer.byteLength(html)!==EXPECTED_BYTES)throw new Error('Mood V17 integrity check failed');
if(!html.includes('content="17.0.0"')||!html.includes('id="sensoryRail"'))throw new Error('Wrong Mood release');
const dest=path.join(process.cwd(),'public','mood-travel-ai');
await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(dest,'index.html'),html,'utf8');
await fs.writeFile(path.join(dest,'version.json'),JSON.stringify({version:VERSION,sha256,bytes:EXPECTED_BYTES,embedded_new_photographs:10,ui_checks:42,curated_checked:'2026-09-25',curated_counts:{experiences:20,gifts:18,stays:13,ideas:28},catalog_items_added_this_release:0,curated_refresh:'manual_snapshot',event_refresh:'existing_daily_database_feed',release_storage:'public_mood_only_snapshot'},null,2)+'\n');
console.log('Mood Travel AI V17',EXPECTED_BYTES,'bytes',sha256);
