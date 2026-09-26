import { TOVATI_CONFIG } from '../config/runtime-config.js';

const DB_NAME='tovati-v2-local', STORE='entities';

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:['collection','id']});
        store.createIndex('by_collection','collection',{unique:false});
        store.createIndex('by_updated_at','updatedAt',{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function waitTx(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}

export class LocalDataSource{
  async list(collection,{offset=0,limit=TOVATI_CONFIG.pageSize}={}){
    const db=await openDb();
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).index('by_collection').getAll(IDBKeyRange.only(collection));
    const rows=await new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
    offset=Math.max(0,Number(offset));
    limit=Math.min(Math.max(1,Number(limit)),TOVATI_CONFIG.maxPageSize);
    return {items:rows.slice(offset,offset+limit).map(r=>r.data),total:rows.length,offset,limit};
  }

  async get(collection,id){
    const db=await openDb();
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get([collection,String(id)]);
    return new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result?.data??null);
      req.onerror=()=>reject(req.error);
    });
  }

  async upsert(collection,entity){
    if(!entity?.id) throw new Error('entity.id required');
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put({
      collection,id:String(entity.id),updatedAt:Date.now(),
      data:{...entity,id:String(entity.id)}
    });
    await waitTx(tx);
    return entity;
  }

  async bulkUpsert(collection,entities=[]){
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE),now=Date.now();
    for(const entity of entities){
      if(!entity?.id) continue;
      store.put({collection,id:String(entity.id),updatedAt:now,data:{...entity,id:String(entity.id)}});
    }
    await waitTx(tx);
    return {count:entities.length};
  }

  async remove(collection,id){
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete([collection,String(id)]);
    await waitTx(tx);
  }
}

export class LegacyR24DataSource{
  #rows(collection){
    const bridge=window.TOVATI_R24_BRIDGE;
    return bridge?.collection?.(collection)||[];
  }

  #filtered(collection,query={}){
    let rows=this.#rows(collection);
    const q=String(query.search||'').trim().toLowerCase();

    if(collection==='work-items'){
      rows=rows.filter(x=>query.departmentId?String(x.department_id||'')===String(query.departmentId):true)
        .filter(x=>query.section?String(x.section||'')===String(query.section):true)
        .filter(x=>query.operationalPriority?String(x.operational_priority||'')===String(query.operationalPriority):true)
        .filter(x=>query.status?String(x.status||'')===String(query.status):true)
        .filter(x=>String(query.includeClosed)==='1'?true:!['done','closed','בוצע','סגור'].includes(String(x.status||'').toLowerCase()))
        .filter(x=>!q||[
          x.title,x.notification_id,x.order_id,x.permit_id,x.section
        ].join(' ').toLowerCase().includes(q));
    }

    if(collection==='assignments'){
      rows=rows.filter(x=>query.date?String(x.date||'')===String(query.date):true)
        .filter(x=>query.departmentId?String(x.departmentId||x.snapshot?.departmentId||'')===String(query.departmentId):true)
        .filter(x=>query.section?String(x.section||x.snapshot?.section||'')===String(query.section):true)
        .filter(x=>query.workerId?(x.workerIds||[]).includes(query.workerId):true)
        .filter(x=>x.status!=='cancelled');
    }

    if(collection==='users'){
      rows=rows.filter(x=>query.departmentId?String(x.dept||x.department_id||'')===String(query.departmentId):true)
        .filter(x=>query.section?String(x.section||'')===String(query.section):true)
        .filter(x=>query.active==null?true:Boolean(x.active)===Boolean(query.active));
    }

    if(collection==='pm-tasks'){
      rows=rows.filter(x=>query.departmentId?String(x.department_id||'')===String(query.departmentId):true)
        .filter(x=>query.month?String(x.due_at||'').slice(0,7)===String(query.month):true)
        .filter(x=>!q||[x.order_id,x.title,x.asset,x.section,x.plan,x.status].join(' ').toLowerCase().includes(q));
    }

    if(collection==='permits'){
      rows=rows.filter(x=>query.status?String(x.status||'')===String(query.status):true)
        .filter(x=>query.orderId?String(x.order_id||'')===String(query.orderId):true)
        .filter(x=>!q||[x.id,x.order_id,x.title,x.status].join(' ').toLowerCase().includes(q));
    }

    if(collection==='personal-tasks'){
      rows=rows.filter(x=>query.assigneeId?String(x.assigneeId||x.assignee_id||'')===String(query.assigneeId):true)
        .filter(x=>query.status?String(x.status||'')===String(query.status):true);
    }

    if(collection==='alerts'){
      rows=rows.filter(x=>query.status?String(x.status||'')===String(query.status):true);
    }

    return rows;
  }

  async list(collection,query={}){
    const rows=this.#filtered(collection,query);
    let offset=Math.max(0,Number(query.offset||0));
    let limit=Math.min(Math.max(1,Number(query.limit||TOVATI_CONFIG.pageSize)),TOVATI_CONFIG.maxPageSize);
    return {items:rows.slice(offset,offset+limit),total:rows.length,offset,limit};
  }

  async get(collection,id){
    return this.#rows(collection).find(x=>String(
      x.id??x.ref??x.order??x['הזמנה']??x.permit??x['היתר']??x['מספר היתר']??''
    )===String(id))||null;
  }

  async upsert(collection,entity){
    const bridge=window.TOVATI_R24_BRIDGE;
    if(collection==='work-items'){
      const id=String(entity.id||entity.ref||'');
      const current=await this.get(collection,id);
      if(!current) throw new Error('Legacy work item not found');
      if(String(entity.operational_priority??'')!==String(current.operational_priority??'')
        || String(entity.planned_for??'')!==String(current.planned_for??'')){
        return bridge.setOperationalPriority(
          id,
          entity.operational_priority??'',
          entity.planned_for??''
        );
      }
      return current;
    }
    if(collection==='assignments'){
      return bridge.saveAssignment(entity,String(entity.id||''));
    }
    throw new Error('Write is not yet migrated for collection: '+collection);
  }

  async bulkUpsert(collection,items=[]){
    const saved=[];
    for(const item of items) saved.push(await this.upsert(collection,item));
    return {count:saved.length,items:saved};
  }

  async remove(collection,id,{reason='בוטל במודול החדש'}={}){
    const bridge=window.TOVATI_R24_BRIDGE;
    if(collection==='assignments'){
      bridge.cancelAssignment(id,reason);
      return null;
    }
    throw new Error('Delete is not yet migrated for collection: '+collection);
  }
}

export class HttpDataSource{
  constructor(){this.base=TOVATI_CONFIG.apiBase.replace(/\/$/,'');}

  async request(path,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TOVATI_CONFIG.requestTimeoutMs);
    try{
      const headers={
        Accept:'application/json',
        ...(options.body?{'Content-Type':'application/json'}:{}),
        ...(options.headers||{})
      };
      const response=await fetch(this.base+path,{
        credentials:'same-origin',
        cache:'no-store',
        ...options,
        headers,
        signal:controller.signal
      });
      if(!response.ok) throw new Error('HTTP '+response.status);
      return response.status===204?null:response.json();
    }finally{clearTimeout(timer);}
  }

  list(collection,query={}){
    const params=new URLSearchParams(query);
    return this.request('/'+encodeURIComponent(collection)+(params.size?'?'+params:''));
  }
  get(collection,id){
    return this.request('/'+encodeURIComponent(collection)+'/'+encodeURIComponent(id));
  }
  upsert(collection,entity,{version='*'}={}){
    return this.request('/'+encodeURIComponent(collection)+'/'+encodeURIComponent(entity.id),{
      method:'PUT',
      headers:{'If-Match':String(version),'Idempotency-Key':crypto.randomUUID()},
      body:JSON.stringify(entity)
    });
  }
  bulkUpsert(collection,items){
    return this.request('/'+encodeURIComponent(collection)+'/bulk',{
      method:'POST',
      headers:{'Idempotency-Key':crypto.randomUUID()},
      body:JSON.stringify({items})
    });
  }
  remove(collection,id,{version='*'}={}){
    return this.request('/'+encodeURIComponent(collection)+'/'+encodeURIComponent(id),{
      method:'DELETE',
      headers:{'If-Match':String(version),'Idempotency-Key':crypto.randomUUID()}
    });
  }
}

let singleton;
export function getDataSource(){
  if(!singleton){
    singleton=TOVATI_CONFIG.mode==='company-server'\n      ? new HttpDataSource()\n      : TOVATI_CONFIG.mode==='legacy-local'\n        ? new LegacyR24DataSource()\n        : new LocalDataSource();
  }
  return singleton;
}
