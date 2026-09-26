const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opLabel={immediate:'מיידי',today:'להיום',tomorrow:'למחר',night:'לילה בלבד','':'ממתין'};
const opTone={immediate:'red',today:'orange',tomorrow:'green',night:'blue','':'neutral'};

export function normalizeCardItem(raw={}){
  return {
    id:String(raw.id??raw.ref??''),
    notificationId:String(raw.notification_id??raw.notificationId??raw.notification??''),
    orderId:String(raw.order_id??raw.orderId??raw.order??''),
    permitId:String(raw.permit_id??raw.permitId??raw.permit??''),
    title:String(raw.title??raw.description??''),
    departmentId:String(raw.department_id??raw.departmentId??raw.dept??''),
    section:String(raw.section??''),
    priority:String(raw.priority??'רגיל'),
    operationalPriority:String(raw.operational_priority??raw.operationalPriority??raw.operational??''),
    status:String(raw.status??''),
    workerStatus:String(raw.workerStatus??raw.worker_status??''),
    blocker:String(raw.blocker??''),
    assignedTo:String(raw.assignedTo??raw.assigned_to??''),
    dueAt:raw.due_at??raw.dueAt??raw.due??null
  };
}

function statusTone(status=''){
  const s=String(status).toLowerCase();
  if(/בוצע|סגור|done|closed|teco|clsd/.test(s)) return 'done';
  if(/ממתין|עיכוב|חסם|hold|wait/.test(s)) return 'wait';
  if(/בטיפול|בביצוע|progress/.test(s)) return 'active';
  return 'normal';
}

function idButton(label,value,kind){
  const disabled=!value;
  return `<button type="button" class="twc-id ${disabled?'is-missing':''}" data-card-detail="${kind}" ${disabled?'disabled':''}>
    <span>${esc(label)}</span><bdi>${esc(value||'—')}</bdi>
  </button>`;
}

export function workCardHTML(raw,{showPriorityActions=false,compact=false}={}){
  const x=normalizeCardItem(raw);
  const op=x.operationalPriority||'';
  const status=x.workerStatus||x.status||'ללא סטטוס';
  return `<article class="twc-card op-${esc(op||'pending')} status-${statusTone(status)} ${compact?'is-compact':''}" data-work-id="${esc(x.id)}">
    <div class="twc-accent" aria-hidden="true"></div>
    <header class="twc-top">
      ${idButton('הודעה',x.notificationId,'notification')}
      ${idButton('הזמנה',x.orderId,'order')}
      ${idButton('היתר',x.permitId,'permit')}
      <button type="button" class="twc-id twc-status" data-card-detail="status">
        <span>סטטוס</span><strong>${esc(status)}</strong>
      </button>
    </header>

    <section class="twc-main">
      <div class="twc-title" title="${esc(x.title)}">${esc(x.title||'ללא תיאור')}</div>
      <div class="twc-route"><strong>${esc(x.departmentId||'ללא מחלקה')}</strong>${x.section?`<span>ק.מ. ${esc(x.section)}</span>`:''}</div>
      <div class="twc-meta">
        <span class="twc-priority">${esc(x.priority||'רגיל')}</span>
        <span class="twc-op tone-${opTone[op]||'neutral'}">${esc(opLabel[op]||op||'ממתין לתעדוף')}</span>
        ${x.dueAt?`<span class="twc-due">יעד ${esc(String(x.dueAt).slice(0,10))}</span>`:''}
      </div>
      <div class="twc-note">${esc(x.blocker||x.assignedTo||'')}</div>
    </section>

    ${showPriorityActions?`<footer class="twc-actions">
      <button type="button" data-priority="immediate">מיידי</button>
      <button type="button" data-priority="today">להיום</button>
      <button type="button" data-priority="tomorrow">למחר</button>
      <button type="button" data-priority="night">לילה</button>
      <button type="button" data-priority="">נקה</button>
    </footer>`:''}
  </article>`;
}

export function workCardElement(raw,options={}){
  const t=document.createElement('template');
  t.innerHTML=workCardHTML(raw,options).trim();
  return t.content.firstElementChild;
}
