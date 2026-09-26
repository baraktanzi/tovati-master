import { performance } from 'node:perf_hooks';
import { diffReport, changedEvents } from '../import/diff-engine.js';
import { filterDailyWork } from '../frontend/modules/daily-maintenance/domain.js';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function workRow(i){
  const op=['','immediate','today','tomorrow','night'][i%5];
  return {
    id:'work-'+i,
    notification_id:'N'+String(100000+i),
    order_id:'O'+String(200000+i),
    title:'עבודת תחזוקה '+i+' משאבה מנוע שסתום',
    department_id:'G'+String(50+(i%6)),
    section:'07'+(i%8)+'-'+String(100+i%30),
    priority:i%11===0?'דחוף':'רגיל',
    operational_priority:op,
    status:i%17===0?'done':'open',
    due_at:'2026-'+String(1+(i%12)).padStart(2,'0')+'-'+String(1+(i%27)).padStart(2,'0'),
    version:1
  };
}

function reportRow(i){
  return {
    id:'pm-'+i,
    order:'P'+String(300000+i),
    title:'PM '+i,
    section:'075-'+String(100+i%40),
    status:i%9===0?'סגור':'פתוח',
    due:'2026-'+String(1+(i%12)).padStart(2,'0')+'-01',
    duration:1+(i%8),
    plan:'PLAN-'+(i%80)
  };
}

class VersionedMemoryStore{
  constructor(rows=[]){
    this.rows=new Map(rows.map(x=>[x.id,{...x}]));
  }
  read(id){
    const row=this.rows.get(id);
    return row?structuredClone(row):null;
  }
  write(entity,expectedVersion){
    const current=this.rows.get(entity.id);
    const version=Number(current?.version||0);
    if(Number(expectedVersion)!==version){
      const error=new Error('VERSION_CONFLICT');
      error.code='VERSION_CONFLICT';
      throw error;
    }
    const next={...entity,version:version+1};
    this.rows.set(entity.id,next);
    return structuredClone(next);
  }
}

const timings={};

// 1. Large work-list filtering.
const work=Array.from({length:20_000},(_,i)=>workRow(i));
let t=performance.now();
let totalFound=0;
for(let i=0;i<100;i++){
  const rows=filterDailyWork(work,{
    departmentId:'G'+String(50+(i%6)),
    operationalPriority:['','immediate','today','tomorrow','night'][i%5],
    search:i%2?'משאבה':'מנוע',
    includeClosed:false
  });
  totalFound+=rows.length;
}
timings.filter100=Math.round((performance.now()-t)*10)/10;
assert(totalFound>0,'Daily filtering returned no results');

// 2. 15-minute report diff: 5,346 PM rows, 100 updates, 25 inserts.
const current=Array.from({length:5_346},(_,i)=>reportRow(i));
const incoming=current.map(x=>({...x}));
for(let i=0;i<100;i++)incoming[i*17%incoming.length].status='שונה-'+i;
for(let i=0;i<25;i++)incoming.push({...reportRow(10_000+i),id:'pm-new-'+i});

t=performance.now();
const diff=diffReport({
  current,
  incoming,
  idOf:x=>x.id,
  sourceOf:x=>x
});
timings.diff5346=Math.round((performance.now()-t)*10)/10;
assert(diff.counts.inserted===25,'Expected 25 inserted report rows');
assert(diff.counts.updated===100,'Expected 100 updated report rows');
assert(diff.counts.unchanged===5_246,'Unexpected unchanged count');
const events=changedEvents('pm-tasks',diff);
assert(events.length===125,'Realtime must publish only 125 changed entities');

// 3. 100 stale-write conflicts. First writer wins; second stale writer must fail.
const store=new VersionedMemoryStore(
  Array.from({length:100},(_,i)=>({id:'conflict-'+i,value:0,version:1}))
);
let conflicts=0;
t=performance.now();
for(let i=0;i<100;i++){
  const id='conflict-'+i;
  const userA=store.read(id);
  const userB=store.read(id);
  store.write({...userA,value:1},userA.version);
  try{
    store.write({...userB,value:2},userB.version);
  }catch(error){
    if(error.code==='VERSION_CONFLICT')conflicts++;
    else throw error;
  }
}
timings.conflicts100=Math.round((performance.now()-t)*10)/10;
assert(conflicts===100,'All stale second writes must conflict');
assert([...store.rows.values()].every(x=>x.value===1&&x.version===2),'Conflict simulation lost data');

// Generous regression guards, not hardware scoring.
assert(timings.filter100<15_000,'Filtering regression: '+timings.filter100+'ms');
assert(timings.diff5346<5_000,'Report diff regression: '+timings.diff5346+'ms');

console.log(JSON.stringify({
  status:'PASS',
  dataset:{
    workItems:work.length,
    pmRows:current.length,
    simulatedConcurrentConflicts:100
  },
  reportDiff:diff.counts,
  realtimeEvents:events.length,
  conflicts,
  timingsMs:timings
},null,2));
