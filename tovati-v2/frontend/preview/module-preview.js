const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opLabel={immediate:'מיידי',today:'להיום',tomorrow:'למחר',night:'לילה בלבד','':'ממתין לתעדוף'};

function shell(title){
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='/architecture-v2/frontend/preview/module-preview.css?v=1';
  document.head.appendChild(link);

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
  body.innerHTML=`<div class="v2-toolbar"><input type="search" placeholder="חיפוש הודעה / הזמנה / תיאור" data-search><select data-op><option value="">כל התעדופים</option><option value="immediate">מיידי</option><option value="today">להיום</option><option value="tomorrow">למחר</option><option value="night">לילה בלבד</option></select><button data-load>רענון</button></div><div id="v2Results"></div>`;
  const load=async()=>{
    showError(root,'');
    try{
      const page=await api.modules.dailyMaintenance.loadPage({
        search:body.querySelector('[data-search]').value,
        operationalPriority:body.querySelector('[data-op]').value,
        limit:50
      });
      body.querySelector('#v2Results').innerHTML=page.items.length?`<div class="v2-grid">${page.items.map(x=>cardHtml(x,false)).join('')}</div>`:'<div class="v2-empty">אין עבודות תואמות</div>';
    }catch(e){showError(root,e);}
  };
  body.querySelector('[data-load]').onclick=load;
  body.querySelector('[data-op]').onchange=load;
  let timer;body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
  await load();
}

async function mountOperations(root,api){
  const body=root.querySelector('#v2Body');
  body.innerHTML=`<div class="v2-toolbar"><input type="search" placeholder="חיפוש עבודות לתעדוף" data-search><button data-load>רענון</button></div><div id="v2Results"></div>`;
  const load=async()=>{
    showError(root,'');
    try{
      const page=await api.modules.operations.loadQueue({search:body.querySelector('[data-search]').value,limit:50});
      const host=body.querySelector('#v2Results');
      host.innerHTML=page.items.length?`<div class="v2-grid">${page.items.map(x=>cardHtml(x,true)).join('')}</div>`:'<div class="v2-empty">אין עבודות תואמות</div>';
      host.querySelectorAll('[data-priority]').forEach(btn=>btn.onclick=async()=>{
        const card=btn.closest('[data-id]');
        btn.disabled=true;
        try{
          await api.modules.operations.changePriority(card.dataset.id,btn.dataset.priority||'');
          await load();
        }catch(e){showError(root,e);}
        finally{btn.disabled=false;}
      });
    }catch(e){showError(root,e);}
  };
  body.querySelector('[data-load]').onclick=load;
  let timer;body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
  await load();
}

async function mountPlanning(root,api){
  const body=root.querySelector('#v2Body');
  const today=new Date().toISOString().slice(0,10);
  body.innerHTML=`<div class="v2-toolbar"><input type="date" value="${today}" data-date><input type="search" placeholder="חיפוש עבודה לתכנון" data-search><button data-load>רענון</button></div><div id="v2Results"></div>`;

  const load=async()=>{
    showError(root,'');
    try{
      const date=body.querySelector('[data-date]').value;
      const [day,users]=await Promise.all([
        api.modules.departmentPlanning.loadDay({date,search:body.querySelector('[data-search]').value,limit:50}),
        api.data.list('users',{offset:0,limit:200,active:true})
      ]);
      const userOptions=users.items.filter(u=>u.active!==false).map(u=>`<option value="${esc(u.id)}">${esc(u.name||u.display_name||u.id)}</option>`).join('');
      const assignments=day.assignments.length?day.assignments.map(a=>`<div class="v2-row"><bdi>${esc(a.start)}–${esc(a.end)}</bdi><strong>${esc(a.snapshot?.title||a.workRef)}</strong><small>${esc((a.workerIds||[]).join(' · '))}</small></div>`).join(''):'<div class="v2-empty">אין שיבוצים ליום זה</div>';
      const candidates=day.candidates.length?day.candidates.map(x=>`<div class="v2-row" data-work="${esc(x.id)}"><span class="v2-code"><bdi>${esc(x.orderId||x.notificationId||x.id)}</bdi></span><strong>${esc(x.title)}</strong><small>${esc([x.departmentId,x.section].filter(Boolean).join(' · '))}</small><form class="v2-assign-form"><input name="start" type="time" value="08:00" required><input name="end" type="time" value="10:00" required><select name="worker" required><option value="">בחר עובד</option>${userOptions}</select><button type="submit">שבץ לעבודה</button></form></div>`).join(''):'<div class="v2-empty">אין עבודות ממתינות לשיבוץ</div>';
      body.querySelector('#v2Results').innerHTML=`<div class="v2-columns"><section class="v2-panel"><h2>עבודות לתכנון · ${day.candidateTotal}</h2><div class="v2-list">${candidates}</div></section><section class="v2-panel"><h2>שיבוצים ליום</h2><div class="v2-list">${assignments}</div></section></div>`;
      body.querySelectorAll('.v2-assign-form').forEach(form=>form.onsubmit=async e=>{
        e.preventDefault();
        const row=form.closest('[data-work]'),fd=new FormData(form);
        try{
          await api.modules.departmentPlanning.createAssignment({
            workItemId:row.dataset.work,date,
            start:fd.get('start'),end:fd.get('end'),
            workerIds:[fd.get('worker')].filter(Boolean)
          });
          await load();
        }catch(err){showError(root,err);}
      });
    }catch(e){showError(root,e);}
  };

  body.querySelector('[data-load]').onclick=load;
  body.querySelector('[data-date]').onchange=load;
  let timer;body.querySelector('[data-search]').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,220);};
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

export async function mountV2Preview(moduleId,api){
  const titles={
    'daily-maintenance':'ניהול תחזוקה יומי',
    operations:'תפעול ותעדוף',
    'department-planning':'תכנון מחלקתי',
    'preventive-maintenance':'תחזוקה מונעת',
    'permits-jsa-ptp':'היתרים / JSA / PTP',
    'management-dashboard':'דשבורד ניהולי'
  };
  const root=shell(titles[moduleId]||'תובתי V2');
  if(moduleId==='operations') return mountOperations(root,api);
  if(moduleId==='department-planning') return mountPlanning(root,api);
  if(moduleId==='preventive-maintenance') return mountPreventive(root,api);
  if(moduleId==='permits-jsa-ptp') return mountPermits(root,api);
  if(moduleId==='management-dashboard') return mountDashboard(root,api);
  return mountDaily(root,api);
}
