import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Only the Mood Travel subpath is changed. TOVATI's root build is untouched.
// Reviewed, self-contained HTML snapshot; verify bytes before writing output.
// V18 keeps one decorative hero photograph and the approved couples logo.
// Result images come from supplier image URLs, load lazily, and are deduplicated
// within each visible screen. Missing/broken pictures have no stock fallback.
// Catalog entries, supplier URLs, dates and prices are unchanged from V17.
const VERSION='18.0.0';
const EXPECTED_SHA='5ea2cf752c1062a0b5c62e1a5ec0e3a3b33b6acce0654a40b1320c6b02743812';
const EXPECTED_BYTES=295822;
const SNAPSHOT='https://txpdbljehqkntdxrpoof.supabase.co/rest/v1/mt_site_releases?version=eq.v18&select=html,sha256,bytes&limit=1';
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
if(sha256!==EXPECTED_SHA||release.sha256!==EXPECTED_SHA||Buffer.byteLength(html)!==EXPECTED_BYTES)throw new Error('Mood V18 integrity check failed');
if(!html.includes('content="18.0.0"')||!html.includes('class="calm-edition"')||html.includes('id="sensoryRail"'))throw new Error('Wrong Mood release');
const dest=path.join(process.cwd(),'public','mood-travel-ai');
await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(dest,'index.html'),html,'utf8');
await fs.writeFile(path.join(dest,'version.json'),JSON.stringify({version:VERSION,sha256,bytes:EXPECTED_BYTES,decorative_photographs:1,logo_preserved:true,result_images:'source_only_no_stock_fallback',duplicate_source_images:'suppressed_per_visible_screen',ui_fixture_checks:58,curated_checked:'2026-09-25',curated_counts:{experiences:20,gifts:18,stays:13,ideas:28},catalog_items_added_this_release:0,curated_refresh:'manual_snapshot',event_refresh:'existing_daily_database_feed',release_storage:'public_mood_only_snapshot'},null,2)+'\n');
console.log('Mood Travel AI V18',EXPECTED_BYTES,'bytes',sha256);
