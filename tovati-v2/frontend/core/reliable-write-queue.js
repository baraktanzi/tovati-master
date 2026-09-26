const DB='tovati-v2-outbox';
const STORE='mutations';

function openQueue(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('by_status','status',{unique:false});
        store.createIndex('by_created','createdAt',{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function txDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}

export class ReliableWriteQueue{
  async enqueue({method,path,body=null,headers={},entity='',entityId='',version=null,idempotencyKey=crypto.randomUUID()}){
    const item={
      id:idempotencyKey,
      idempotencyKey,
      method:String(method||'POST').toUpperCase(),
      path:String(path||''),
      body,
      headers:Object.fromEntries(Object.entries(headers).filter(([key])=>key.toLowerCase()!=='authorization')),
      entity:String(entity||''),
      entityId:String(entityId||''),
      version,
      status:'pending',
      attempts:0,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      lastError:''
    };
    const db=await openQueue();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(item);
    await txDone(tx);
    return item;
  }

  async list(status='pending'){
    const db=await openQueue();
    const tx=db.transaction(STORE,'readonly');
    const req=status
      ?tx.objectStore(STORE).index('by_status').getAll(IDBKeyRange.only(status))
      :tx.objectStore(STORE).getAll();
    return new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)));
      req.onerror=()=>reject(req.error);
    });
  }

  async get(id){
    const db=await openQueue();
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get(String(id));
    return new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }

  async update(id,patch){
    const current=await this.get(id);
    if(!current)return null;
    const next={...current,...patch,updatedAt:new Date().toISOString()};
    const db=await openQueue();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(next);
    await txDone(tx);
    return next;
  }

  async remove(id){
    const db=await openQueue();
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(String(id));
    await txDone(tx);
  }

  async flush(executor,{limit=100}={}){
    const pending=(await this.list('pending')).slice(0,limit);
    const result={attempted:0,succeeded:0,conflicts:0,remaining:pending.length};
    for(const item of pending){
      result.attempted++;
      await this.update(item.id,{attempts:Number(item.attempts||0)+1,lastError:''});
      try{
        await executor(item);
        await this.remove(item.id);
        result.succeeded++;
      }catch(error){
        const isConflict=error?.code==='VERSION_CONFLICT'||error?.status===409;
        if(isConflict){
          await this.update(item.id,{status:'conflict',lastError:error.message||'Version conflict'});
          result.conflicts++;
          continue;
        }
        await this.update(item.id,{status:'pending',lastError:error?.message||String(error)});
        // Network/service outage: preserve order and retry later.
        break;
      }
    }
    result.remaining=(await this.list('pending')).length;
    return result;
  }
}
