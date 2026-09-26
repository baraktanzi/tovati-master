import { PagedWorkList } from '../components/paged-work-list.js';
import { DayPlanner } from '../components/day-planner.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opLabel={immediate:'מיידי',today:'להיום',tomorrow:'למחר',night:'לילה בלבד','':'ממתין לתעדוף'};

function shell(title){
  for(const href of [
    '/architecture-v2/frontend/preview/module-preview.css?v=2',
    '/architecture-v2/frontend/components/work-card.css?v=1',
    '/architecture-v2/frontend/components/day-planner.css?v=1'
  ]){
    if(document.querySelector('link[href="'+href+'"]')) continue;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }

  const root=document.createElement('div');
  root.id='tovatiV2Preview';
  root.innerHTML=`<header class="v2-top"><h1>${esc(title)}</h1><small>V2 · מצב מקומי</small><button type="button" data-v2-close>חזרה ל-R24</button></header><main class="v2-wrap"><div class="v2-status">ללא שרת · קורא ושומר דרך מנגנון R24 המקומי</div><div id="v2Error" hidden class="v2-error"></div><div id="v2Body"></div></main>`;
  document.body.appendChild(root);
  root.querySelector('[data-v2-close]').onclick=()=>{
    const u=new URL(location.href);u.searchParams.delete('v2module');location.href=u.toString();
  };
  return root;
}

function showError(root,error){
  const el=root.querySelector('#v2Error');
  el.hidden=!error;el.textContent=error?'שגיאה: '+(error.message||error):'';
}

function objectRows(value={}){
  const source=value?.raw&&typeof value.raw==='object'?value.raw:value||{};
  return Object.entries(source)
    .filter(([,v])=>v!==null&&v!==undefined&&v!==''&&typeof v!=='object')
    .slice(0,60)
    .map(([k,v])=>`<div class="v2-detail-field"><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
    .join('');
}

async function openExecutionForm(root,api,item,kind,onSaved){
  let dialog=document.getElementById('v2ExecutionDialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='v2ExecutionDialog';
    dialog.className='v2-detail-dialog';
    document.body.appendChild(dialog);
  }

  const currentUser=api.legacy?.user?.()||null;
  const today=new Date().toISOString().slice(0,10);
  let body='';

  if(kind==='delay'){
    body=`<form id="v2ExecForm" class="v2-exec-form">
      <label><span>סוג עיכוב</span><select name="type" required><option value="">בחר</option><option>ממתין להיתר</option><option>ממתין לחלפים</option><option>ממתין לקבלן</option><option>ממתין לציוד</option><option>ממתין לתפעול</option><option>אחר</option></select></label>
      <label><span>אחראי למעקב</span><input name="owner" value="${esc(currentUser?.name||currentUser?.display_name||'')}" required></label>
      <label><span>תאריך מעקב</span><input name="due" type="date" value="${today}" required></label>
      <label class="wide"><span>פירוט</span><textarea name="details" required maxlength="1500"></textarea></label>
      <div class="v2-planner-sheet-actions wide"><button type="button" data-cancel>ביטול</button><button type="submit">שמירת עיכוב</button></div>
    </form>`;
  }

  if(kind==='time'){
    const users=await api.data.list('users',{offset:0,limit:200,active:true});
    body=`<form id="v2ExecForm" class="v2-exec-form">
      <label><span>עובד</span><select name="user" required><option value="">בחר עובד</option>${users.items.map(u=>`<option value="${esc(u.id)}" ${currentUser&&String(currentUser.id)===String(u.id)?'selected':''}>${esc(u.name||u.display_name||u.id)}</option>`).join('')}</select></label>
      <label><span>תאריך</span><input name="date" type="date" value="${today}" required></label>
      <label><span>שעות</span><input name="hours" type="number" min="0.25" max="24" step="0.25" value="1" required></label>
      <label class="wide"><span>תיאור ביצוע</span><textarea name="description" required maxlength="1500"></textarea></label>
      <div class="v2-planner-sheet-actions wide"><button type="button" data-cancel>ביטול</button><button type="submit">שמירת שעות</button></div>
    </form>`;
  }

  if(kind==='complete'){
    body=`<form id="v2ExecForm" class="v2-exec-form">
      <label class="wide"><span>סיכום העבודה</span><textarea name="summary" required minlength="10" maxlength="2500"></textarea></label>
      <label class="wide v2-check"><input name="permit" type="checkbox" required><span>בדקתי את הטיפול בהיתר ובתנאי העבודה</span></label>
      <div class="v2-planner-sheet-actions wide"><button type="button" data-cancel>ביטול</button><button type="submit">סגירת העבודה</button></div>
    </form>`;
  }

  dialog.innerHTML=`<header class="v2-detail-head"><h2>${kind==='delay'?'רישום עיכוב':kind==='time'?'דיווח שעות':'סגירת עבודה'}</h2><button type="button" data-cancel>×</button></header><div class="v2-detail-body">${body}</div>`;
  dialog.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>dialog.close());
  dialog.querySelector('#v2ExecForm').onsubmit=async event=>{
    event.preventDefault();
    showError(root,'');
    const fd=new FormData(event.currentTarget);
    const submit=event.currentTarget.querySelector('[type=submit]');
    submit.disabled=true;
    try{
      if(kind==='delay'){
        await api.modules.workExecution.saveDelay({
          workItemId:item.id,
          type:fd.get('type'),
          owner:fd.get('owner'),
          details:fd.get('details'),
          followUpDate:fd.get('due')
        });
      }
      if(kind==='time'){
        await api.modules.workExecution.saveTimeEntry({
          workItemId:item.id,
          userId:fd.get('user'),
          date:fd.get('date'),
          hours:fd.get('hours'),
          description:fd.get('description')
        });
      }
      if(kind==='complete'){
        await api.modules.workExecution.completeWork({
          workItemId:item.id,
          userId:currentUser?.id||'',
          summary:fd.get('summary'),
          permitChecked:fd.get('permit')==='on'
        });
      }
      dialog.close();
      await onSaved?.();
    }catch(e){showError(root,e);}
    finally{if(submit.isConnected)submit.disabled=false;}
  };
  dialog.showModal();
}

async function openLocalWorkDetail(root,api,item,initial='status'){
  showError(root,'');
  try{
    const [card,execution]=await Promise.all([
      api.work.loadWorkCard(item.id),
      api.modules.workExecution?.load(item.id).catch(()=>null)
    ]);
    if(!card)throw new Error('כרטיס העבודה לא נמצא');

    let dialog=document.getElementById('v2WorkDetailDialog');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='v2WorkDetailDialog';
      dialog.className='v2-detail-dialog';
      document.body.appendChild(dialog);
    }

    const panes={
      notification:{label:'הודעה',value:card.notification},
      order:{label:'הזמנה',value:card.order},
      permit:{label:'היתר',value:card.permit},
      status:{label:'סטטוס',value:card.work}
    };
    let active=panes[initial]?.value?initial:'status';

    const render=()=>{
      const pane=panes[active];
      const execSummary=active==='status'&&execution?`
        <section class="v2-exec-summary">
          <div><b>${execution.delays?.filter(x=>(x.state||x.status)==='open').length||0}</b><span>עיכובים פתוחים</span></div>
          <div><b>${execution.timeEntries?.filter(x=>!x.voided).reduce((s,x)=>s+Number(x.hours||0),0)||0}</b><span>שעות מדווחות</span></div>
          <div><b>${execution.assignments?.filter(x=>x.status!=='cancelled'&&x.status!=='done').length||0}</b><span>שיבוצים פעילים</span></div>
        </section>
        <div class="v2-exec-actions">
          <button type="button" data-exec="delay">רישום עיכוב</button>
          <button type="button" data-exec="time">דיווח שעות</button>
          <button type="button" data-exec="complete" ${execution.closure?.completed?'disabled':''}>סגירת עבודה</button>
        </div>`:'' ;

      dialog.innerHTML=`<header class="v2-detail-head"><h2>${esc(card.work?.title||card.work?.description||'כרטיס עבודה')}</h2><button type="button" data-close>×</button></header>
      <div class="v2-detail-body">
        <div class="v2-detail-tabs">${Object.entries(panes).map(([key,p])=>`<button type="button" data-tab="${key}" class="${active===key?'active':''}" ${p.value?'':'disabled'}>${p.label}</button>`).join('')}</div>
        <div class="v2-detail-grid">${pane.value?objectRows(pane.value):'<div class="v2-empty">אין נתונים מקושרים</div>'}</div>
        ${execSummary}
      </div>`;
      dialog.querySelector('[data-close]').onclick=()=>dialog.close();
      dialog.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{
        active=button.dataset.tab;
        render();
      });
      dialog.querySelectorAll('[data-exec]').forEach(button=>button.onclick=async()=>{
        const kind=button.dataset.exec;
        dialog.close();
        await openExecutionForm(root,api,item,kind,()=>openLocalWorkDetail(root,api,item,'status'));
      });
    };

    render();
    if(!dialog.open)dialog.showModal();
  }catch(e){showError(root,e);}
}

function cardHtml(x,withPriority=false){
  const id=esc(x.id),op=esc(x.operational_priority||'');
  return `<article class="v2-card" data-id="${id}" data-op="${op}">
    <div class="v2-card-head"><span class="v2-code"><bdi>${esc(x.order_id||x.notification_id||x.id)}</bdi></span><span class="v2-chip">${esc(opLabel[x.operational_priority||'']||x.priority||'רגיל')}</span></div>
    <h3>${esc(x.title||'ללא תיאור')}</h3>
    <p>${esc([x.department_id,x.section].filter(Boolean).join(' · ')||'ללא שיוך')}</p>
    <p>${esc(x.status||'')}</p>
    ${withPriority?`<div class="v2-actions">
      <button data-priority="immediate">מיידי</button>
      <button data-priority="today">להיום</button>
      <button data-priority="tomorrow">למחר</button>
      <button data-priority="night">לילה</button>
      <button data-priority="">נקה</button>
    </div>`:''}
  </article>`;
}

async function mountDaily(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML=`<div class="v2-toolbar">
    <input type="search" placeholder="חיפוש הודעה / הזמנה / תיאור" data-search>
    <select data-op><option value="">כל התעדופים</option><option value="immediate">מיידי</option><option value="today">להיום</option><option value="tomorrow">למחר</option><option value="night">לילה בלבד</option></select>
    <button data-load>רענון</button>
  </div><div id="v2Results" class="tv2-work-list"></div>`;

  const host=body.querySelector('#v2Results');
  const list=new PagedWorkList({
    host,
    pageSize:30,
    loadPage:({offset,limit})=>api.modules.dailyMaintenance.loadPage({
      offset,limit,
      search:body.querySelector('[data-search]').value,
      operationalPriority:body.querySelector('[data-op]').value
    }),
    onCard:(item,kind)=>openLocalWorkDetail(root,api,item,kind)
  });

  const reload=()=>list.reset().catch(e=>showError(root,e));
  body.querySelector('[data-load]').onclick=reload;
  body.querySelector('[data-op]').onchange=reload;
  let timer;
  body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(reload,220);};
  await reload();
}

async function mountOperations(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML=`<div class="v2-toolbar">
    <input type="search" placeholder="חיפוש עבודות לתעדוף" data-search>
    <button data-load>רענון</button>
  </div><div id="v2Results" class="tv2-work-list"></div>`;

  const host=body.querySelector('#v2Results');
  const list=new PagedWorkList({
    host,
    pageSize:30,
    loadPage:({offset,limit})=>api.modules.operations.loadQueue({
      offset,limit,search:body.querySelector('[data-search]').value
    }),
    cardOptions:()=>({showPriorityActions:true}),
    onCard:(item,kind)=>openLocalWorkDetail(root,api,item,kind),
    onPriority:async(item,value,button)=>{
      button.disabled=true;
      showError(root,'');
      try{
        await api.modules.operations.changePriority(item.id,value);
        await list.reset();
      }catch(e){showError(root,e);}
      finally{button.disabled=false;}
    }
  });

  const reload=()=>list.reset().catch(e=>showError(root,e));
  body.querySelector('[data-load]').onclick=reload;
  let timer;
  body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(reload,220);};
  await reload();
}

async function mountPlanning(root,api){
  const body=root.querySelector('#v2Body');
  const today=new Date().toISOString().slice(0,10);
  body.innerHTML=`<div class="v2-toolbar">
    <input type="date" value="${today}" data-date>
    <input type="search" placeholder="חיפוש עבודה לתכנון" data-search>
    <button data-load>רענון</button>
  </div>
  <div id="v2AssignHost"></div>
  <div id="v2Planner"></div>`;

  const plannerHost=body.querySelector('#v2Planner');
  const assignHost=body.querySelector('#v2AssignHost');
  let workers=[];

  const planner=new DayPlanner({
    host:plannerHost,
    onAssignRequest:request=>openAssignForm(request),
    onOpenAssignment:item=>{
      assignHost.innerHTML=`<div class="v2-assignment-info"><strong>${esc(item.snapshot?.title||item.workRef||'שיבוץ')}</strong><span>${esc(item.start)}–${esc(item.end)}</span><small>${esc((item.workerNames||item.workerIds||[]).join(' · '))}</small></div>`;
      assignHost.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  });

  function openAssignForm(request){
    const options=workers.map(w=>`<option value="${esc(w.id)}">${esc(w.name||w.display_name||w.id)} · ${esc(w.section||'')}</option>`).join('');
    assignHost.innerHTML=`<form class="v2-planner-sheet" id="v2AssignForm">
      <div class="v2-planner-sheet-head"><div><small>שיבוץ עבודה</small><strong>${esc(request.workItem.title||'')}</strong></div><button type="button" data-close>×</button></div>
      <div class="v2-planner-sheet-grid">
        <label><span>תאריך</span><input name="date" type="date" value="${esc(request.date)}" required></label>
        <label><span>התחלה</span><input name="start" type="time" value="${esc(request.start)}" required></label>
        <label><span>סיום</span><input name="end" type="time" value="${esc(request.end)}" required></label>
        <label class="wide"><span>עובד</span><select name="worker" required><option value="">בחר עובד</option>${options}</select></label>
        <label class="wide"><span>הערה</span><input name="note" maxlength="500" placeholder="הערת תכנון"></label>
      </div>
      <div class="v2-planner-sheet-actions"><button type="button" data-close>ביטול</button><button type="submit">שמירת שיבוץ</button></div>
    </form>`;
    assignHost.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>assignHost.replaceChildren());
    assignHost.querySelector('#v2AssignForm').onsubmit=async event=>{
      event.preventDefault();
      showError(root,'');
      const fd=new FormData(event.currentTarget);
      const submit=event.currentTarget.querySelector('[type=submit]');
      submit.disabled=true;
      try{
        await api.modules.departmentPlanning.createAssignment({
          workItemId:request.workItem.id,
          date:fd.get('date'),
          start:fd.get('start'),
          end:fd.get('end'),
          workerIds:[fd.get('worker')].filter(Boolean),
          note:fd.get('note')||''
        });
        assignHost.replaceChildren();
        await load();
      }catch(e){showError(root,e);}
      finally{if(submit.isConnected)submit.disabled=false;}
    };
  }

  const load=async()=>{
    showError(root,'');
    try{
      const date=body.querySelector('[data-date]').value;
      const [day,userPage]=await Promise.all([
        api.modules.departmentPlanning.loadDay({
          date,
          search:body.querySelector('[data-search]').value,
          limit:80
        }),
        api.data.list('users',{offset:0,limit:200,active:true})
      ]);
      workers=userPage.items.filter(u=>u.active!==false&&(!u.branch||u.branch==='maintenance'));
      const workerNames=new Map(workers.map(w=>[String(w.id),w.name||w.display_name||w.id]));
      planner.setData({
        ...day,
        assignments:day.assignments.map(a=>({
          ...a,
          workerNames:(a.workerIds||[]).map(id=>workerNames.get(String(id))||String(id))
        })),
        workers
      });
    }catch(e){showError(root,e);}
  };

  body.querySelector('[data-load]').onclick=load;
  body.querySelector('[data-date]').onchange=load;
  let timer;
  body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
  await load();
}

async function mountPreventive(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML=`<div class="v2-toolbar"><input type="search" placeholder="חיפוש פקודה / ציוד / תוכנית" data-search><input type="month" data-month><button data-load>רענון</button></div><div id="v2Results"></div>`;
  const load=async()=>{
    showError(root,'');
    try{
      const page=await api.modules.preventiveMaintenance.loadPage({
        search:body.querySelector('[data-search]').value,
        month:body.querySelector('[data-month]').value,
        limit:50
      });
      body.querySelector('#v2Results').innerHTML=page.items.length?`<div class="v2-grid">${page.items.map(x=>`<article class="v2-card"><div class="v2-card-head"><span class="v2-code"><bdi>${esc(x.orderId||x.id)}</bdi></span><span class="v2-chip">${esc(x.monthState?.label||'')}</span></div><h3>${esc(x.title)}</h3><p>${esc([x.departmentId,x.section,x.asset].filter(Boolean).join(' · '))}</p><p>${esc([x.plan,x.cycle,x.status].filter(Boolean).join(' · '))}</p></article>`).join('')}</div>`:'<div class="v2-empty">אין פקודות תחזוקה מונעת בסינון שנבחר</div>';
    }catch(e){showError(root,e);}
  };
  body.querySelector('[data-load]').onclick=load;
  body.querySelector('[data-month]').onchange=load;
  let timer;body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
  await load();
}

async function mountPermits(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML=`<div class="v2-toolbar"><input type="search" placeholder="חיפוש היתר / הזמנה / תיאור" data-search><button data-load>רענון</button></div><div id="v2Results"></div>`;
  const load=async()=>{
    showError(root,'');
    try{
      const page=await api.modules.permitSafety.loadPermits({search:body.querySelector('[data-search]').value,limit:50});
      body.querySelector('#v2Results').innerHTML=page.items.length?`<div class="v2-grid">${page.items.map(x=>`<article class="v2-card"><div class="v2-card-head"><span class="v2-code"><bdi>${esc(x.id)}</bdi></span><span class="v2-chip">${esc(x.status||'ללא סטטוס')}</span></div><h3>${esc(x.title||'היתר עבודה')}</h3><p>הזמנה <bdi>${esc(x.orderId||'—')}</bdi></p><p>${esc(x.validity?.label||'')}</p><div class="v2-actions"><button data-package="${esc(x.id)}">בדיקת חבילת JSA/PTP</button></div></article>`).join('')}</div>`:'<div class="v2-empty">אין היתרים תואמים</div>';
      body.querySelectorAll('[data-package]').forEach(btn=>btn.onclick=async()=>{
        try{
          const pack=await api.modules.permitSafety.loadPackage({permitId:btn.dataset.package});
          const missing=pack.status.missing.length?pack.status.missing.join(', '):'אין';
          alert('מסמכים חסרים: '+missing+'\nאישור אנושי מוסמך נדרש לפני ביצוע.');
        }catch(e){showError(root,e);}
      });
    }catch(e){showError(root,e);}
  };
  body.querySelector('[data-load]').onclick=load;
  let timer;body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
  await load();
}

async function mountDashboard(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML='<div id="v2Results"></div>';
  showError(root,'');
  try{
    const data=await api.modules.managementDashboard.load();
    const k=data.kpis||{};
    body.querySelector('#v2Results').innerHTML=`<div class="v2-metrics">
      <div><b>${esc(k.openWork||0)}</b><span>עבודות פתוחות</span></div>
      <div><b>${esc(k.urgentWork||0)}</b><span>מיידי / להיום</span></div>
      <div><b>${esc(k.preventiveOverdue||0)}</b><span>מונעת באיחור</span></div>
      <div><b>${esc(k.expiredPermits||0)}</b><span>היתרים שתוקפם חלף בדוח</span></div>
      <div><b>${esc(k.activeAssignments||0)}</b><span>שיבוצים פעילים</span></div>
    </div><section class="v2-panel"><h2>עבודות פתוחות לפי מחלקה</h2><div class="v2-list">${Object.entries(data.byDepartment||{}).map(([k,v])=>`<div class="v2-row"><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join('')}</div></section>`;
  }catch(e){showError(root,e);}
}

async function mountPersonal(root,api){
  const body=root.querySelector('#v2Body');
  const user=api.legacy?.user?.();
  if(!user){
    body.innerHTML='<div class="v2-empty">לא נבחר משתמש</div>';
    return;
  }
  const today=new Date().toISOString().slice(0,10);
  showError(root,'');
  try{
    const data=await api.modules.personalArea.load(user.id,today);
    const tasks=data.tasks.items||[],assignments=data.assignments.items||[],alerts=data.alerts.items||[];
    body.innerHTML=`<div class="v2-metrics">
      <div><b>${tasks.length}</b><span>משימות פתוחות</span></div>
      <div><b>${assignments.length}</b><span>שיבוצים להיום</span></div>
      <div><b>${alerts.length}</b><span>התראות</span></div>
    </div>
    <div class="v2-columns">
      <section class="v2-panel"><h2>השיבוצים שלי</h2><div class="v2-list">${assignments.map(a=>`<div class="v2-row"><bdi>${esc(a.start||'')}–${esc(a.end||'')}</bdi><strong>${esc(a.snapshot?.title||a.workRef||'')}</strong><small>${esc(a.status||'')}</small></div>`).join('')||'<div class="v2-empty">אין שיבוצים להיום</div>'}</div></section>
      <section class="v2-panel"><h2>משימות והתראות</h2><div class="v2-list">${tasks.map(t=>`<div class="v2-row"><strong>${esc(t.title||'משימה')}</strong><small>${esc(t.due_at||t.dueAt||'')}</small></div>`).join('')}${alerts.map(a=>`<div class="v2-row"><strong>${esc(a.title||'התראה')}</strong><small>${esc(a.message||'')}</small></div>`).join('')||(!tasks.length?'<div class="v2-empty">אין משימות או התראות פתוחות</div>':'')}</div></section>
    </div>`;
  }catch(e){showError(root,e);}
}

async function mountAnnualPlans(root,api){
  const body=root.querySelector('#v2Body');
  const year=new Date().getFullYear();
  showError(root,'');
  try{
    const page=await api.modules.annualPlans.list({year,offset:0,limit:100});
    body.innerHTML=`<div class="v2-toolbar"><strong>תוכנית עבודה שנתית · ${year}</strong></div><div class="v2-list">${page.items.map(x=>`<div class="v2-row"><strong>${esc(x.title||x.id)}</strong><small>${esc([x.department_id||x.departmentId,x.status].filter(Boolean).join(' · '))}</small></div>`).join('')||'<div class="v2-empty">עדיין לא נטענו תוכניות עבודה שנתיות ל־V2</div>'}</div>`;
  }catch(e){showError(root,e);}
}

async function mountOverhauls(root,api){
  const body=root.querySelector('#v2Body');
  showError(root,'');
  try{
    const page=await api.modules.unitOverhauls.listProjects({offset:0,limit:100});
    body.innerHTML=`<div class="v2-toolbar"><strong>שיפוצי יחידות</strong></div><div class="v2-list">${page.items.map(x=>`<div class="v2-row"><strong>${esc(x.title||x.id)}</strong><small>${esc([x.unit_id||x.unitId,x.status,(x.progress??0)+'%'].filter(Boolean).join(' · '))}</small></div>`).join('')||'<div class="v2-empty">עדיין לא נטענו פרויקטי שיפוץ ל־V2</div>'}</div>`;
  }catch(e){showError(root,e);}
}

export async function mountV2Preview(moduleId,api){
  const titles={
    'daily-maintenance':'ניהול תחזוקה יומי',
    operations:'תפעול ותעדוף',
    'department-planning':'תכנון מחלקתי',
    'preventive-maintenance':'תחזוקה מונעת',
    'permits-jsa-ptp':'היתרים / JSA / PTP',
    'management-dashboard':'דשבורד ניהולי',
    'personal-area':'אזור אישי',
    'annual-plans':'תוכניות עבודה שנתיות',
    'unit-overhauls':'שיפוצי יחידות'
  };
  const root=shell(titles[moduleId]||'תובתי V2');
  if(moduleId==='operations') return mountOperations(root,api);
  if(moduleId==='department-planning') return mountPlanning(root,api);
  if(moduleId==='preventive-maintenance') return mountPreventive(root,api);
  if(moduleId==='permits-jsa-ptp') return mountPermits(root,api);
  if(moduleId==='management-dashboard') return mountDashboard(root,api);
  if(moduleId==='personal-area') return mountPersonal(root,api);
  if(moduleId==='annual-plans') return mountAnnualPlans(root,api);
  if(moduleId==='unit-overhauls') return mountOverhauls(root,api);
  return mountDaily(root,api);
}
