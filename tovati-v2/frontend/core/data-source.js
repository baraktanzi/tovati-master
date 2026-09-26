import { TOVATI_CONFIG } from '../config/runtime-config.js';

const DB_NAME='tovati-v2-local', STORE='entities', LOCAL_CHANNEL='tovati-v2-local-sync';

export class ConflictError extends Error{
  constructor(message='Version conflict',details={}){
    super(message);
    this.name='ConflictError';
    this.code='VERSION_CONFLICT';
    this.details=details;
  }
}

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

function filterCollectionRows(collection,rows,query={}){
  let out=[...rows];
  const q=String(query.search||'').trim().toLowerCase();

  if(collection==='work-items'){
    out=out.filter(x=>query.departmentId?String(x.department_id||x.departmentId||'')===String(query.departmentId):true)
      .filter(x=>query.section?String(x.section||'')===String(query.section):true)
      .filter(x=>query.operationalPriority?String(x.operational_priority||x.operationalPriority||'')===String(query.operationalPriority):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true)
      .filter(x=>String(query.includeClosed)==='1'?true:!['done','closed','בוצע','סגור'].includes(String(x.status||'').toLowerCase()))
      .filter(x=>!q||[x.title,x.notification_id,x.notificationId,x.order_id,x.orderId,x.permit_id,x.permitId,x.section].join(' ').toLowerCase().includes(q));
  }

  if(collection==='assignments'){
    out=out.filter(x=>query.date?String(x.date||'')===String(query.date):true)
      .filter(x=>query.departmentId?String(x.departmentId||x.department_id||x.snapshot?.departmentId||'')===String(query.departmentId):true)
      .filter(x=>query.section?String(x.section||x.snapshot?.section||'')===String(query.section):true)
      .filter(x=>query.workerId?(x.workerIds||[]).includes(query.workerId):true)
      .filter(x=>x.status!=='cancelled');
  }

  if(collection==='users'){
    out=out.filter(x=>query.departmentId?String(x.dept||x.department_id||'')===String(query.departmentId):true)
      .filter(x=>query.section?String(x.section||'')===String(query.section):true)
      .filter(x=>query.active==null?true:Boolean(x.active)===Boolean(query.active));
  }

  if(collection==='pm-tasks'){
    out=out.filter(x=>query.departmentId?String(x.department_id||x.departmentId||'')===String(query.departmentId):true)
      .filter(x=>query.month?String(x.due_at||x.dueAt||'').slice(0,7)===String(query.month):true)
      .filter(x=>!q||[x.order_id,x.orderId,x.title,x.asset,x.section,x.plan,x.status].join(' ').toLowerCase().includes(q));
  }

  if(collection==='permits'){
    out=out.filter(x=>query.status?String(x.status||'')===String(query.status):true)
      .filter(x=>query.orderId?String(x.order_id||x.orderId||'')===String(query.orderId):true)
      .filter(x=>!q||[x.id,x.order_id,x.orderId,x.title,x.status].join(' ').toLowerCase().includes(q));
  }

  if(collection==='personal-tasks'){
    out=out.filter(x=>query.assigneeId?String(x.assigneeId||x.assignee_id||'')===String(query.assigneeId):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true);
  }

  if(collection==='alerts'){
    out=out.filter(x=>query.userId?String(x.user_id||x.userId||'')===String(query.userId):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true);
  }

  if(collection==='work-delays'){
    out=out.filter(x=>query.workItemId?String(x.workRef||x.work_item_id||'')===String(query.workItemId):true)
      .filter(x=>query.status?String(x.state||x.status||'')===String(query.status):true);
  }

  if(collection==='time-entries'){
    out=out.filter(x=>query.workItemId?String(x.workRef||x.work_item_id||'')===String(query.workItemId):true)
      .filter(x=>query.userId?String(x.workerId||x.user_id||'')===String(query.userId):true);
  }

  if(collection==='work-closures'){
    out=out.filter(x=>query.workItemId?String(x.work_item_id||x.id||'')===String(query.workItemId):true);
  }

  if(collection==='annual-plans'){
    out=out.filter(x=>query.year?String(x.year||'')===String(query.year):true)
      .filter(x=>query.departmentId?String(x.department_id||x.departmentId||'')===String(query.departmentId):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true);
  }

  if(collection==='overhaul-projects'){
    out=out.filter(x=>query.unitId?String(x.unit_id||x.unitId||'')===String(query.unitId):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true);
  }

  if(collection==='overhaul-tasks'){
    out=out.filter(x=>query.projectId?String(x.project_id||x.projectId||'')===String(query.projectId):true)
      .filter(x=>query.departmentId?String(x.department_id||x.departmentId||'')===String(query.departmentId):true)
      .filter(x=>query.status?String(x.status||'')===String(query.status):true);
  }

  return out;
}

export class LocalDataSource{
  kind='local';

  constructor(){
    this.listeners=new Set();
    this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(LOCAL_CHANNEL):null;
    this.channel?.addEventListener('message',event=>{
      const msg=event.data;
      if(msg?.source==='tovati-v2'&&msg.event)this.#emit(msg.event,false);
    });
  }

  subscribe(handler){
    this.listeners.add(handler);
    return()=>this.listeners.delete(handler);
  }

  close(){
    this.channel?.close();
    this.listeners.clear();
  }

  #emit(event,broadcast=true){
    for(const handler of this.listeners){
      try{handler(event);}catch(error){console.error(error);}
    }
    if(broadcast)this.channel?.postMessage({source:'tovati-v2',event});
  }

  async list(collection,query={}){
    const db=await openDb();
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).index('by_collection').getAll(IDBKeyRange.only(collection));
    const stored=await new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
    const rows=filterCollectionRows(collection,stored.map(r=>r.data),query);
    let offset=Math.max(0,Number(query.offset||0));
    let limit=Math.min(Math.max(1,Number(query.limit||TOVATI_CONFIG.pageSize)),TOVATI_CONFIG.maxPageSize);
    return {items:rows.slice(offset,offset+limit),total:rows.length,offset,limit};
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

  async upsert(collection,entity,options={}){
    if(!entity?.id) throw new Error('entity.id required');
    const id=String(entity.id);
    const expected=options.version??entity.version??'*';
    const db=await openDb();

    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      const store=tx.objectStore(STORE);
      let saved=null;
      let settled=false;

      const fail=error=>{
        if(settled)return;
        settled=true;
        try{tx.abort();}catch{}
        reject(error);
      };

      const req=store.get([collection,id]);
      req.onerror=()=>fail(req.error||new Error('IndexedDB read failed'));
      req.onsuccess=()=>{
        const current=req.result?.data||null;
        const currentVersion=Number(current?.version||0);

        if(expected!=='*'&&Number(expected)!==currentVersion){
          fail(new ConflictError('הנתונים השתנו מאז פתיחת הכרטיס',{
            collection,id,
            expectedVersion:Number(expected),
            currentVersion,
            current
          }));
          return;
        }

        const version=currentVersion+1;
        saved={...entity,id,version};
        store.put({
          collection,
          id,
          updatedAt:Date.now(),
          data:saved
        });
      };

      tx.oncomplete=()=>{
        if(settled)return;
        settled=true;
        this.#emit({
          type:'upsert',
          collection,
          id,
          version:saved?.version??null,
          at:Date.now()
        });
        resolve(saved);
      };
      tx.onerror=()=>{
        if(settled)return;
        settled=true;
        reject(tx.error||new Error('IndexedDB write failed'));
      };
      tx.onabort=()=>{
        if(settled)return;
        settled=true;
        reject(tx.error||new Error('IndexedDB transaction aborted'));
      };
    });
  }

  async bulkUpsert(collection,entities=[]){
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE),now=Date.now();
    let count=0;
    for(const entity of entities){
      if(!entity?.id) continue;
      store.put({collection,id:String(entity.id),updatedAt:now,data:{...entity,id:String(entity.id)}});
      count++;
    }
    await waitTx(tx);
    if(count)this.#emit({type:'bulk-upsert',collection,count,at:Date.now()});
    return {count};
  }

  async replaceCollection(collection,entities=[]){
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    const index=store.index('by_collection');
    let count=0;

    await new Promise((resolve,reject)=>{
      const req=index.openCursor(IDBKeyRange.only(collection));
      req.onsuccess=()=>{
        const cursor=req.result;
        if(cursor){
          cursor.delete();
          cursor.continue();
          return;
        }

        const now=Date.now();
        for(const entity of entities){
          if(!entity?.id) continue;
          store.put({
            collection,
            id:String(entity.id),
            updatedAt:now,
            data:{...entity,id:String(entity.id)}
          });
          count++;
        }
        resolve();
      };
      req.onerror=()=>reject(req.error);
    });

    await waitTx(tx);
    this.#emit({type:'replace-collection',collection,count,at:Date.now()});
    return {count};
  }

  async remove(collection,id){
    const db=await openDb();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete([collection,String(id)]);
    await waitTx(tx);
    this.#emit({type:'remove',collection,id:String(id),at:Date.now()});
  }
}

export class LegacyR24DataSource{
  kind='legacy-local';
  #rows(collection){
    const bridge=window.TOVATI_R24_BRIDGE;
    return bridge?.collection?.(collection)||[];
  }

  #filtered(collection,query={}){
    return filterCollectionRows(collection,this.#rows(collection),query);
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
    if(collection==='work-delays'){
      return bridge.saveDelay(entity,String(entity.id||''));
    }
    if(collection==='time-entries'){
      return bridge.saveTime(entity,String(entity.id||''));
    }
    if(collection==='work-closures'){
      bridge.completeWork({
        workRef:String(entity.work_item_id||entity.id||''),
        done:true,
        permitChecked:Boolean(entity.permit_checked??entity.permitChecked),
        text:String(entity.summary||entity.text||'')
      });
      return entity;
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
  kind='company-server';
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
      if(!response.ok){
        const payload=await response.json().catch(()=>({}));
        if(response.status===409){
          throw new ConflictError(payload.error||'הנתונים השתנו בשרת',{
            status:409,
            ...payload
          });
        }
        throw new Error(payload.error||('HTTP '+response.status));
      }
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
    singleton=TOVATI_CONFIG.mode==='company-server'
      ? new HttpDataSource()
      : TOVATI_CONFIG.mode==='legacy-local'
        ? new LegacyR24DataSource()
        : new LocalDataSource();
  }
  return singleton;
}
