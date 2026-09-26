import { LocalDataSource } from '../core/data-source.js';

const COLLECTIONS=[
  'departments',
  'users',
  'notifications',
  'orders',
  'permits',
  'work-items',
  'pm-tasks',
  'assignments',
  'work-delays',
  'time-entries',
  'work-closures',
  'priority-publications',
  'personal-tasks',
  'alerts'
];

function ensureIds(collection,rows=[]){
  return rows.map((row,index)=>{
    if(row?.id) return row;
    if(collection==='users'&&row?.code) return {...row,id:String(row.code)};
    return {...row,id:collection+'-'+index};
  });
}

export async function migrateR24ToIndexedDb({onProgress=()=>{}}={}){
  const bridge=window.TOVATI_R24_BRIDGE;
  if(!bridge?.collection) throw new Error('R24 bridge is unavailable');

  const target=new LocalDataSource();
  const summary={};
  let step=0;

  for(const collection of COLLECTIONS){
    const rows=ensureIds(collection,bridge.collection(collection)||[]);
    onProgress({
      phase:'collection',
      collection,
      step,
      total:COLLECTIONS.length,
      rows:rows.length
    });
    const result=await target.replaceCollection(collection,rows);
    summary[collection]=result.count;
    step++;
  }

  const meta={
    id:'r24-migration',
    migratedAt:new Date().toISOString(),
    sourceRevision:Number(bridge.revision?.()||0),
    schemaVersion:1,
    summary
  };
  await target.replaceCollection('system-meta',[meta]);

  onProgress({phase:'done',step:COLLECTIONS.length,total:COLLECTIONS.length,summary,meta});
  return meta;
}

export async function migrationStatus(){
  const target=new LocalDataSource();
  return target.get('system-meta','r24-migration');
}
