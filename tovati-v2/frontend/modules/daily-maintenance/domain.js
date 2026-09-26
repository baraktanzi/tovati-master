export const OPERATIONAL_PRIORITY={
  immediate:{rank:0,label:'מיידי'},
  today:{rank:1,label:'להיום'},
  tomorrow:{rank:2,label:'למחר'},
  night:{rank:3,label:'לילה בלבד'},
  pending:{rank:4,label:'ממתין לתעדוף'}
};

export function normalizeWorkItem(input={}){
  return {
    id:String(input.id??input.ref??''),
    notificationId:String(input.notification_id??input.notificationId??input.notification??''),
    orderId:String(input.order_id??input.orderId??input.order??''),
    permitId:String(input.permit_id??input.permitId??input.permit??''),
    title:String(input.title??input.description??''),
    departmentId:String(input.department_id??input.departmentId??input.dept??''),
    section:String(input.section??''),
    source:String(input.source??''),
    priority:String(input.priority??''),
    operationalPriority:String(input.operational_priority??input.operationalPriority??input.operational??''),
    status:String(input.status??''),
    plannedFor:input.planned_for??input.plannedFor??null,
    dueAt:input.due_at??input.dueAt??input.due??null,
    assignedUserId:String(input.assigned_user_id??input.assignedUserId??''),
    version:Number(input.version??1)
  };
}

export function operationalRank(value){
  return OPERATIONAL_PRIORITY[value]?.rank ?? OPERATIONAL_PRIORITY.pending.rank;
}

export function compareWorkItems(a,b){
  const aa=normalizeWorkItem(a),bb=normalizeWorkItem(b);
  return operationalRank(aa.operationalPriority)-operationalRank(bb.operationalPriority)
    || String(aa.dueAt||'9999').localeCompare(String(bb.dueAt||'9999'))
    || aa.id.localeCompare(bb.id);
}

export function isClosed(item){
  const x=normalizeWorkItem(item);
  return ['done','closed','בוצע','סגור'].includes(x.status.toLowerCase())
    || /(?:^|\s)(?:TECO|CLSD)(?:\s|$)/i.test(x.status);
}

export function filterDailyWork(items=[],filters={}){
  const q=String(filters.search||'').trim().toLowerCase();
  return items
    .map(normalizeWorkItem)
    .filter(x=>!filters.includeClosed? !isClosed(x):true)
    .filter(x=>!filters.departmentId||x.departmentId===filters.departmentId)
    .filter(x=>!filters.section||x.section===filters.section)
    .filter(x=>!filters.operationalPriority||x.operationalPriority===filters.operationalPriority)
    .filter(x=>!q||[x.title,x.notificationId,x.orderId,x.permitId,x.section].join(' ').toLowerCase().includes(q))
    .sort(compareWorkItems);
}
