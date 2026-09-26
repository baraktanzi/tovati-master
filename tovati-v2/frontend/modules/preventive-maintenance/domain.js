export function monthBounds(value){
  const month=String(value||'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y,m]=month.split('-').map(Number);
  const last=new Date(Date.UTC(y,m,0)).getUTCDate();
  return {month,start:month+'-01',end:month+'-'+String(last).padStart(2,'0')};
}

export function monthState(value,today=new Date().toISOString().slice(0,10)){
  const b=monthBounds(value);
  if(!b) return {kind:'unknown',label:'חודש לא ידוע'};
  if(today<b.start) return {kind:'upcoming',label:'מתוכנן',...b};
  if(today>b.end) return {kind:'overdue',label:'באיחור',...b};
  return {kind:'open',label:'לביצוע החודש',...b};
}

export function normalizePmTask(p={}){
  return {
    id:String(p.id||''),
    orderId:String(p.order_id??p.order??''),
    title:String(p.title||''),
    departmentId:String(p.department_id??p.dept??''),
    section:String(p.section||''),
    dueAt:p.due_at??p.due??null,
    asset:String(p.asset||''),
    status:String(p.status||''),
    duration:Number(p.duration||1),
    workHours:Number(p.work_hours??p.workHours??0),
    actualHours:Number(p.actual_hours??p.actualHours??0),
    maintenanceItem:String(p.maintenance_item??p.maintenanceItem??''),
    plan:String(p.plan||''),
    cycle:String(p.cycle||''),
    priority:String(p.priority||'רגיל'),
    version:Number(p.version||1)
  };
}

export function filterPmTasks(rows=[],filters={}){
  const q=String(filters.search||'').trim().toLowerCase();
  return rows.map(normalizePmTask)
    .filter(x=>!filters.month||String(x.dueAt||'').slice(0,7)===filters.month)
    .filter(x=>!filters.departmentId||x.departmentId===filters.departmentId)
    .filter(x=>!q||[x.orderId,x.title,x.asset,x.section,x.plan,x.status].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>String(a.dueAt||'9999').localeCompare(String(b.dueAt||'9999'))||a.id.localeCompare(b.id));
}
