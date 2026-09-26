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
    singleton=TOVATI_CONFIG.mode==='company-server'
      ? new HttpDataSource()
      : new LocalDataSource();
  }
  return singleton;
}
