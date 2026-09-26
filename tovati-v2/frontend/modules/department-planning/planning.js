import { normalizeWorkItem, compareWorkItems, isClosed } from '../daily-maintenance/domain.js';

function active(a){ return a && a.status!=='cancelled'; }

export function assignmentsForDay(assignments=[],date,filters={}){
  return assignments
    .filter(active)
    .filter(a=>a.date===date)
    .filter(a=>!filters.departmentId||a.departmentId===filters.departmentId)
    .filter(a=>!filters.section||a.section===filters.section)
    .filter(a=>!filters.workerId||(a.workerIds||[]).includes(filters.workerId))
    .sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
}

export function planningCandidates(items=[],assignments=[],date,filters={}){
  const busy=new Set(assignments.filter(a=>active(a)&&a.date===date).map(a=>String(a.workRef??a.work_item_id??'')));
  const q=String(filters.search||'').trim().toLowerCase();
  return items
    .map(normalizeWorkItem)
    .filter(x=>x.id&&!isClosed(x)&&!busy.has(x.id))
    .filter(x=>!filters.departmentId||x.departmentId===filters.departmentId)
    .filter(x=>!filters.section||x.section===filters.section)
    .filter(x=>!q||[x.title,x.notificationId,x.orderId,x.section].join(' ').toLowerCase().includes(q))
    .sort(compareWorkItems);
}

export function validateAssignment(input={}){
  const start=String(input.start||''),end=String(input.end||'');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) throw new Error('שעת התחלה אינה תקינה');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) throw new Error('שעת סיום אינה תקינה');
  if(end<=start) throw new Error('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
  if(!String(input.workRef??input.work_item_id??'')) throw new Error('חסרה עבודה לשיבוץ');
  if(!(input.workerIds||[]).length) throw new Error('יש לבחור לפחות עובד אחד');
  return true;
}

export function buildAssignment({id,workItem,date,start,end,workerIds,note='',actorId=''}) {
  validateAssignment({workRef:workItem.id,date,start,end,workerIds});
  const now=new Date().toISOString();
  return {
    id:String(id),
    work_item_id:String(workItem.id),
    workRef:String(workItem.id),
    date,start,end,
    workerIds:[...workerIds],
    note:String(note),
    status:'planned',
    actorId:String(actorId),
    snapshot:{
      title:workItem.title,
      order:workItem.orderId,
      departmentId:workItem.departmentId,
      section:workItem.section
    },
    createdAt:now,
    updatedAt:now,
    version:1
  };
}
