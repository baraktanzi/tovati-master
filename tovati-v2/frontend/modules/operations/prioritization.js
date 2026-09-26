import { normalizeWorkItem } from '../daily-maintenance/domain.js';

const ALLOWED=new Set(['','immediate','today','tomorrow','night']);

export function canPrioritize(user){
  if(!user) return false;
  return user.branch==='operations'
    || ['admin','system-admin','מנהל תפעול','מהנדס תפעול','תורן ראשי'].includes(user.role);
}

export function setOperationalPriority(item,value,targetDate=null){
  if(!ALLOWED.has(value)) throw new Error('Unsupported operational priority');
  const current=normalizeWorkItem(item);
  return {
    ...item,
    id:current.id,
    operational_priority:value,
    planned_for:targetDate||item.planned_for||null,
    version:current.version
  };
}

export function groupPriorityPublication(items=[]){
  const groups=new Map();
  for(const raw of items){
    const item=normalizeWorkItem(raw);
    if(!item.departmentId) continue;
    if(!groups.has(item.departmentId)) groups.set(item.departmentId,[]);
    groups.get(item.departmentId).push({
      id:item.id,
      title:item.title,
      notificationId:item.notificationId,
      orderId:item.orderId,
      departmentId:item.departmentId,
      section:item.section,
      operationalPriority:item.operationalPriority
    });
  }
  return [...groups.entries()].map(([departmentId,rows])=>({departmentId,items:rows}));
}

export function publicationDelta(previous=[],next=[]){
  const before=new Map(previous.map(x=>[x.id,JSON.stringify(x)]));
  return next.filter(x=>before.get(x.id)!==JSON.stringify(x));
}
