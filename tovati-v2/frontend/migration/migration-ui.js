import { migrateR24ToIndexedDb } from './r24-to-indexeddb.js';

const labels={
  departments:'מחלקות',
  users:'משתמשים',
  notifications:'הודעות',
  orders:'הזמנות',
  permits:'היתרים',
  'work-items':'כרטיסי עבודה',
  'pm-tasks':'תחזוקה מונעת',
  assignments:'שיבוצים',
  'work-delays':'עיכובים',
  'time-entries':'דיווחי שעות',
  'work-closures':'סגירות',
  'priority-publications':'פרסומי תעדוף',
  'personal-tasks':'משימות אישיות',
  alerts:'התראות'
};

export async function runMigrationOverlay(){
  const root=document.createElement('div');
  root.id='tovatiV2Migration';
  root.style.cssText='position:fixed;inset:0;z-index:2147483600;background:#eef6f9;display:grid;place-items:center;padding:20px;direction:rtl;font-family:Arial,sans-serif';
  root.innerHTML='<section style="width:min(520px,100%);background:#fff;border:1px solid #c9dce5;border-radius:22px;padding:24px;box-shadow:0 18px 55px #123f6220"><h1 style="margin:0 0 8px;color:#123f62">הכנת תובתי V2 מקומי</h1><p style="color:#617d8d">העתקה חד־פעמית של נתוני R24 ל־IndexedDB במכשיר הזה. אין חיבור לשרת.</p><div style="height:12px;background:#e7eef2;border-radius:999px;overflow:hidden"><i id="v2MigBar" style="display:block;height:100%;width:0;background:#1786bd;transition:.2s"></i></div><strong id="v2MigText" style="display:block;margin-top:12px;color:#244d65">מתחיל…</strong><small id="v2MigCount" style="display:block;margin-top:6px;color:#738b98"></small><div id="v2MigDone" style="display:none;margin-top:16px"><a href="/architecture-v2/standalone/" style="display:block;text-align:center;text-decoration:none;background:#147eaf;color:#fff;font-weight:800;padding:12px;border-radius:12px">פתיחת V2 המקומי</a></div></section>';
  document.body.appendChild(root);

  const bar=root.querySelector('#v2MigBar'),text=root.querySelector('#v2MigText'),count=root.querySelector('#v2MigCount');
  try{
    const meta=await migrateR24ToIndexedDb({
      onProgress:info=>{
        if(info.phase==='collection'){
          const pct=Math.round((info.step/info.total)*100);
          bar.style.width=pct+'%';
          text.textContent='מעתיק '+(labels[info.collection]||info.collection);
          count.textContent=(info.rows||0)+' רשומות';
        }else if(info.phase==='done'){
          bar.style.width='100%';
          text.textContent='ההעתקה הסתיימה בהצלחה';
          count.textContent='גרסת מקור: '+info.meta.sourceRevision;
        }
      }
    });
    root.querySelector('#v2MigDone').style.display='block';
    return meta;
  }catch(error){
    text.textContent='ההעתקה נכשלה';
    count.textContent=error.message||String(error);
    throw error;
  }
}
