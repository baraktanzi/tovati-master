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

function normalizedPmTasks(){
  try{
    const rows=typeof db!=='undefined'&&Array.isArray(db?.pmOrders)?db.pmOrders:[];
    return rows.map(p=>({
      id:String(p.id||('pmorder:'+p.order)||''),
      order_id:String(p.order||''),
      title:String(p.title||''),
      department_id:String(p.dept||(typeof deptForCenter==='function'?deptForCenter(p.section):'')||''),
      section:String(p.section||''),
      due_at:p.due||null,
      asset:String(p.asset||''),
      status:String(p.status||''),
      duration:Number(p.duration||1),
      work_hours:Number(p.workHours||0),
      actual_hours:Number(p.actualHours||0),
      maintenance_item:String(p.maintenanceItem||''),
      plan:String(p.plan||''),
      cycle:String(p.cycle||''),
      priority:String(p.priority||'רגיל'),
      version:Number((typeof db!=='undefined'&&db?.revision)||1)
    })).filter(x=>x.id);
  }catch{return [];}
}

function normalizedPermits(){
  try{
    const rows=typeof DATASETS!=='undefined'?DATASETS?.permits||[]:[];
    return rows.map((p,index)=>{
      const permit=typeof val==='function'&&typeof ALIASES!=='undefined'?String(val(p,ALIASES.permit)||''):String(p.id||p.permit||'');
      const order=typeof val==='function'&&typeof ALIASES!=='undefined'?String(val(p,ALIASES.order)||''):String(p.order||'');
      const status=typeof val==='function'&&typeof ALIASES!=='undefined'?String(val(p,ALIASES.permitStatus)||''):String(p.status||'');
      const title=typeof val==='function'?String(val(p,['תיאור היתר','תאור היתר','תיאור',...(typeof ALIASES!=='undefined'?ALIASES.description||[]:[])])||''):String(p.title||'');
      const until=typeof val==='function'?String(val(p,['תקף עד-','תקף עד','תאריך סיום תוקף'])||'').slice(0,10):String(p.valid_until||'').slice(0,10);
      return {
        id:permit||String(index),
        source_index:index,
        order_id:order,
        title,
        status,
        valid_until:until||null,
        raw:clone(p)
      };
    });
  }catch{return [];}
}

function legacyCollection(name){
  try{
    if(name==='work-items') return normalizedWorkItems();
    if(name==='assignments') return legacyAssignments();
    if(name==='users') return clone(typeof db!=='undefined'?db?.workers||[]:[])||[];
    if(name==='pm-tasks') return normalizedPmTasks();
    if(name==='orders') return clone(typeof DATASETS!=='undefined'?DATASETS?.orders||[]:[])||[];
    if(name==='permits') return normalizedPermits();
    if(name==='notifications') return clone(typeof DATASETS!=='undefined'?DATASETS?.notifications||[]:[])||[];
    if(name==='personal-tasks') return clone(typeof db!=='undefined'?db?.personalTasks||[]:[])||[];
    if(name==='alerts'){
      try{
        const rows=typeof rules==='function'?rules():[];
        return clone(rows.map(x=>({
          id:String(x.id||''),
          title:String(x.title||''),
          message:String(x.detail||x.message||''),
          status:x.seen?'read':'open',
          severity:String(x.severity||'info'),
          work_item_id:String(x.workRef||'')
        })))||[];
      }catch{return [];}
    }
    if(['annual-plans','overhaul-projects','overhaul-tasks','jsa','ptp'].includes(name)) return [];
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

  setOperationalPriority(ref,value,targetDate=''){
    if(typeof Store==='undefined'||typeof Store?.set!=='function') throw new Error('R24 Store is unavailable');
    Store.set(String(ref),{operational:String(value||'')});
    if(targetDate!==undefined) Store.set(String(ref),{operationalTargetDate:String(targetDate||'')});
    try{if(typeof refreshMainScheduling==='function') refreshMainScheduling();}catch{}
    return normalizedWorkItems().find(x=>x.id===String(ref))||null;
  },

  saveAssignment(input,id=''){
    if(!window.TOVATI_PILOT?.saveAssignment) throw new Error('R24 assignment API is unavailable');
    return clone(window.TOVATI_PILOT.saveAssignment({
      workRef:String(input.workRef||input.work_item_id||''),
      date:String(input.date||''),
      start:String(input.start||''),
      end:String(input.end||''),
      workerIds:Array.isArray(input.workerIds)?input.workerIds:[],
      note:String(input.note||'')
    },String(id||'')));
  },

  cancelAssignment(id,reason='בוטל במודול תכנון'){
    if(!window.TOVATI_PILOT?.cancelAssignment) throw new Error('R24 assignment API is unavailable');
    return window.TOVATI_PILOT.cancelAssignment(String(id),String(reason));
  },

  setAssignmentStatus(id,status,confirmed=false){
    if(!window.TOVATI_PILOT?.setAssignmentStatus) throw new Error('R24 assignment API is unavailable');
    return window.TOVATI_PILOT.setAssignmentStatus(String(id),String(status),Boolean(confirmed));
  },

  completeWork(input){
    if(!window.TOVATI_PILOT?.completeWork) throw new Error('R24 completion API is unavailable');
    return window.TOVATI_PILOT.completeWork(input);
  },

  routeWork(input){
    if(!window.TOVATI_PILOT?.saveReview) throw new Error('R24 routing API is unavailable');
    return clone(window.TOVATI_PILOT.saveReview(input));
  },

  subscribe(handler){listeners.add(handler);return()=>listeners.delete(handler);}
});
window.dispatchEvent(new CustomEvent('tovati:r24-bridge-ready'));
})();
