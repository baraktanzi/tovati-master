(function(){
'use strict';
const clone=value=>{
  try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
  catch{return null;}
};
const call=(name,fallback)=>{
  try{return typeof globalThis[name]==='function'?globalThis[name]():fallback;}
  catch{return fallback;}
};

function normalizedWorkItems(){
  try{
    if(typeof records!=='function') return [];
    return records().map(r=>{
      let state={};
      try{state=typeof refState==='function'?refState(r.ref)||{}:{};}catch{}
      let dept='',section='';
      try{dept=typeof recordDept==='function'?recordDept(r)||'':r.dept||'';}catch{}
      try{section=typeof recordSection==='function'?recordSection(r)||'':r.section||'';}catch{}
      return {
        id:String(r.ref||r.id||''),
        notification_id:String(r.notification||''),
        order_id:String(r.order||''),
        permit_id:String(r.permit||''),
        title:String(r.title||''),
        department_id:String(dept||''),
        section:String(section||''),
        source:String(r.source||''),
        priority:String(r.priority||''),
        operational_priority:String(state.operational||''),
        planned_for:state.operationalTargetDate||null,
        status:String(state.workerStatus||r.status||''),
        due_at:r.due||null,
        version:Number((typeof db!=='undefined'&&db?.revision)||1),
        legacy_ref:String(r.ref||'')
      };
    }).filter(x=>x.id);
  }catch(error){
    console.warn('TOVATI V2 bridge: work items unavailable',error);
    return [];
  }
}

function legacyAssignments(){
  try{
    const rows=typeof activeAssignments==='function'
      ? activeAssignments()
      : (typeof db!=='undefined'&&Array.isArray(db?.assignments)?db.assignments:[]);
    return clone(rows)||[];
  }catch{return [];}
}

function legacyCollection(name){
  try{
    if(name==='work-items') return normalizedWorkItems();
    if(name==='assignments') return legacyAssignments();
    if(name==='users') return clone(typeof db!=='undefined'?db?.workers||[]:[])||[];
    if(name==='pm-tasks') return clone(typeof db!=='undefined'?db?.pmOrders||[]:[])||[];
    if(name==='orders') return clone(typeof DATASETS!=='undefined'?DATASETS?.orders||[]:[])||[];
    if(name==='permits') return clone(typeof DATASETS!=='undefined'?DATASETS?.permits||[]:[])||[];
    if(name==='notifications') return clone(typeof DATASETS!=='undefined'?DATASETS?.notifications||[]:[])||[];
    return [];
  }catch{return [];}
}

function currentUser(){
  try{return clone(typeof currentTestUser==='function'?currentTestUser():null);}
  catch{return null;}
}

const listeners=new Set();
window.addEventListener('tovati:committed',event=>{
  const payload={type:'committed',detail:clone(event.detail)||{},revision:Number((typeof db!=='undefined'&&db?.revision)||0)};
  for(const fn of listeners){try{fn(payload);}catch{}}
});

window.TOVATI_R24_BRIDGE=Object.freeze({
  version:'r24-compat-1',
  readonly:true,
  currentUser,
  revision:()=>Number((typeof db!=='undefined'&&db?.revision)||0),
  collection:name=>legacyCollection(String(name)),
  workItems:normalizedWorkItems,
  assignments:legacyAssignments,
  subscribe(handler){listeners.add(handler);return()=>listeners.delete(handler);}
});
window.dispatchEvent(new CustomEvent('tovati:r24-bridge-ready'));
})();
