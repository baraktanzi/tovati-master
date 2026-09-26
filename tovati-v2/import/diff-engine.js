function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object'){
    const out={};
    for(const key of Object.keys(value).sort()){
      if(value[key]!==undefined)out[key]=stableValue(value[key]);
    }
    return out;
  }
  return value;
}

export function stableSerialize(value){
  return JSON.stringify(stableValue(value));
}

export function fingerprint(value){
  const text=stableSerialize(value);
  let h=2166136261;
  for(let i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16).padStart(8,'0');
}

export function diffReport({
  current=[],
  incoming=[],
  idOf=row=>String(row?.id??''),
  sourceOf=row=>row
}={}){
  const before=new Map();
  for(const row of current){
    const id=idOf(row);
    if(!id)continue;
    before.set(id,{row,hash:fingerprint(sourceOf(row))});
  }

  const inserted=[],updated=[],unchanged=[],seen=new Set();
  for(const row of incoming){
    const id=idOf(row);
    if(!id)continue;
    if(seen.has(id))throw new Error('Duplicate source ID in report: '+id);
    seen.add(id);

    const hash=fingerprint(sourceOf(row));
    const prior=before.get(id);
    if(!prior){
      inserted.push({id,row,hash});
      continue;
    }
    if(prior.hash===hash){
      unchanged.push({id,row,hash});
      continue;
    }
    updated.push({
      id,
      before:prior.row,
      row,
      beforeHash:prior.hash,
      hash
    });
  }

  const missing=[];
  for(const [id,prior] of before){
    if(!seen.has(id))missing.push({id,row:prior.row,hash:prior.hash});
  }

  return {
    inserted,
    updated,
    unchanged,
    missing,
    counts:{
      incoming:seen.size,
      inserted:inserted.length,
      updated:updated.length,
      unchanged:unchanged.length,
      missing:missing.length
    }
  };
}

export function changedEvents(entity,diff,serverTime=new Date().toISOString()){
  return [
    ...diff.inserted.map(x=>({topic:entity+'.changed',entity,id:x.id,action:'inserted',serverTime})),
    ...diff.updated.map(x=>({topic:entity+'.changed',entity,id:x.id,action:'updated',serverTime}))
  ];
}
