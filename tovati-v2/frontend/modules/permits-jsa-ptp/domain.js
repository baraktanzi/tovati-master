export function normalizePermit(p={}){
  return {
    id:String(p.id??p.permit??''),
    orderId:String(p.order_id??p.orderId??p.order??''),
    title:String(p.title??''),
    status:String(p.status??''),
    validFrom:p.valid_from??p.validFrom??null,
    validUntil:p.valid_until??p.validUntil??null,
    version:Number(p.version??1),
    sourceIndex:Number.isFinite(Number(p.source_index))?Number(p.source_index):null
  };
}

export function permitValidity(permit,at=new Date()){
  const p=normalizePermit(permit);
  const now=at.getTime();
  const from=p.validFrom?Date.parse(p.validFrom):NaN;
  const until=p.validUntil?Date.parse(p.validUntil+'T23:59:59'):NaN;

  if(Number.isFinite(until)&&until<now) return {kind:'expired',label:'תוקף ההיתר חלף'};
  if(Number.isFinite(from)&&from>now) return {kind:'future',label:'ההיתר טרם נכנס לתוקף'};
  if(!p.validUntil) return {kind:'unknown',label:'תוקף לא ידוע'};
  return {kind:'within-reported-window',label:'בתוך חלון התוקף המדווח'};
}

export function normalizeJsa(x={}){
  return {
    id:String(x.id||''),
    permitId:String(x.permit_id??x.permitId??''),
    workItemId:String(x.work_item_id??x.workItemId??''),
    status:String(x.status||'draft'),
    content:x.content&&typeof x.content==='object'?x.content:{},
    version:Number(x.version||1),
    approvedBy:String(x.approved_by??x.approvedBy??''),
    approvedAt:x.approved_at??x.approvedAt??null
  };
}

export function normalizePtp(x={}){
  return {
    id:String(x.id||''),
    permitId:String(x.permit_id??x.permitId??''),
    workItemId:String(x.work_item_id??x.workItemId??''),
    jsaId:String(x.jsa_id??x.jsaId??''),
    status:String(x.status||'draft'),
    content:x.content&&typeof x.content==='object'?x.content:{},
    version:Number(x.version||1),
    approvedBy:String(x.approved_by??x.approvedBy??''),
    approvedAt:x.approved_at??x.approvedAt??null
  };
}

export function safetyPackageStatus({permit,jsa,ptp}){
  const validity=permitValidity(permit);
  const missing=[];
  if(!permit?.id) missing.push('permit');
  if(!jsa?.id) missing.push('jsa');
  if(!ptp?.id) missing.push('ptp');

  return {
    validity,
    missing,
    complete:missing.length===0,
    // "complete" means documents are linked, not that work is safe/authorized.
    humanApprovalRequired:true
  };
}
