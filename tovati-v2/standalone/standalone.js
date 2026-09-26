import { LocalDataSource } from '../frontend/core/data-source.js';
import { WorkRepository } from '../frontend/core/repositories/work-repository.js';
import { DailyMaintenanceController } from '../frontend/modules/daily-maintenance/controller.js';
import { OperationsController } from '../frontend/modules/operations/controller.js';
import { DepartmentPlanningController } from '../frontend/modules/department-planning/controller.js';
import { PreventiveMaintenanceController } from '../frontend/modules/preventive-maintenance/controller.js';
import { PermitSafetyController } from '../frontend/modules/permits-jsa-ptp/controller.js';
import { AnnualPlansController } from '../frontend/modules/annual-plans/controller.js';
import { UnitOverhaulsController } from '../frontend/modules/unit-overhauls/controller.js';
import { ManagementDashboardController } from '../frontend/modules/management-dashboard/controller.js';
import { PersonalAreaController } from '../frontend/modules/personal-area/controller.js';
import { WorkExecutionController } from '../frontend/modules/work-execution/controller.js';
import { mountV2Preview } from '../frontend/preview/module-preview.js';

const source=new LocalDataSource();
const repository=new WorkRepository(source);
const USER_KEY='tovati.v2.local.user';
let currentUser=null;

const api={
  version:'2.0-local-standalone',
  mode:'local',
  data:source,
  work:repository,
  legacy:{bridge:null,revision:()=>0,user:()=>currentUser},
  modules:{
    dailyMaintenance:new DailyMaintenanceController(repository,{getCurrentUser:()=>currentUser}),
    operations:new OperationsController(repository,{getCurrentUser:()=>currentUser}),
    departmentPlanning:new DepartmentPlanningController(repository,{getCurrentUser:()=>currentUser}),
    preventiveMaintenance:new PreventiveMaintenanceController(repository),
    permitSafety:new PermitSafetyController(repository),
    annualPlans:new AnnualPlansController(source),
    unitOverhauls:new UnitOverhaulsController(source),
    managementDashboard:new ManagementDashboardController(source),
    personalArea:new PersonalAreaController(source),
    workExecution:new WorkExecutionController(source,{getCurrentUser:()=>currentUser})
  }
};

window.TOVATI_V2_LOCAL=api;

const modules=[
  ['daily-maintenance','תחזוקה יומית','עבודות פתוחות, סטטוסים וכרטיסי עבודה','01'],
  ['operations','תפעול ותעדוף','מיידי, להיום, למחר ולילה','02'],
  ['department-planning','תכנון מחלקתי','Backlog, עובדים ולוח עבודה יומי','03'],
  ['preventive-maintenance','תחזוקה מונעת','פקודות PM וחודש ביצוע','04'],
  ['permits-jsa-ptp','היתרים / JSA / PTP','חבילת בטיחות מקושרת לעבודה','05'],
  ['management-dashboard','דשבורד ניהולי','KPIs וחריגות','06'],
  ['personal-area','אזור אישי','המשימות, השיבוצים וההתראות שלי','07'],
  ['annual-plans','תוכניות עבודה שנתיות','תכנון שנתי לפי מחלקות ויעדים','08'],
  ['unit-overhauls','שיפוצי יחידות','פרויקטים, אבני דרך ומשימות שיפוץ','09']
];

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function renderLauncher(){
  const host=document.getElementById('tovatiStandalone');
  const meta=await source.get('system-meta','r24-migration');
  if(!meta){
    host.innerHTML=`<section class="tv2s-empty"><h1>תובתי V2 עדיין לא הוכן במכשיר הזה</h1><p>יש לפתוח פעם אחת את ענף R24 המקומי עם פרמטר ההעתקה. הנתונים יועתקו ל־IndexedDB במכשיר בלבד.</p><code>?v2migrate=1</code><p>לא מתבצע חיבור לשרת.</p></section>`;
    return;
  }

  const users=await source.list('users',{offset:0,limit:200,active:true});
  const saved=localStorage.getItem(USER_KEY)||'';
  currentUser=users.items.find(u=>String(u.id)===saved)||users.items[0]||null;
  if(currentUser)localStorage.setItem(USER_KEY,String(currentUser.id));

  host.innerHTML=`
    <header class="tv2s-top"><div class="tv2s-top-inner">
      <div class="tv2s-brand"><small>מערכת התחזוקה המודולרית</small><h1>תובתי V2 · מקומי</h1></div>
      <label class="tv2s-user"><span>משתמש</span><select id="tv2User">${users.items.map(u=>`<option value="${esc(u.id)}" ${currentUser&&String(currentUser.id)===String(u.id)?'selected':''}>${esc(u.name||u.display_name||u.id)} · ${esc(u.role||'')}</option>`).join('')}</select></label>
    </div></header>
    <main class="tv2s-wrap">
      <section class="tv2s-banner"><div><strong>עבודה מקומית ללא שרת</strong><p>מקור ההעתקה: R24 · revision ${esc(meta.sourceRevision)} · ${esc(meta.migratedAt)}</p></div><span class="tv2s-state">IndexedDB פעיל</span></section>
      <section class="tv2s-grid">
        ${modules.map(([id,title,desc,icon])=>`<a class="tv2s-module" href="?v2module=${id}"><span class="tv2s-icon">${icon}</span><h2>${title}</h2><p>${desc}</p><span>פתיחת מודול ←</span></a>`).join('')}
      </section>
    </main>`;

  host.querySelector('#tv2User').onchange=event=>{
    const id=event.target.value;
    currentUser=users.items.find(u=>String(u.id)===String(id))||null;
    if(currentUser)localStorage.setItem(USER_KEY,String(currentUser.id));
  };
}

const moduleId=new URLSearchParams(location.search).get('v2module');
await renderLauncher();
if(moduleId)await mountV2Preview(moduleId,api);
