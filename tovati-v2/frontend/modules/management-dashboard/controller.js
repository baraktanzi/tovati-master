import { getDataSource } from '../../core/data-source.js';
import { TOVATI_CONFIG } from '../../config/runtime-config.js';
import { CAPABILITIES, requireCapability, applyUserScope } from '../../core/authorization.js';

function countBy(rows,key){
  const out={};
  for(const row of rows){
    const k=String(row[key]||'לא מוגדר');
    out[k]=(out[k]||0)+1;
  }
  return out;
}

async function allRows(source,collection,query={}){
  const rows=[];
  let offset=0;
  while(true){
    const page=await source.list(collection,{...query,offset,limit:TOVATI_CONFIG.maxPageSize});
    rows.push(...page.items);
    offset+=page.items.length;
    if(!page.items.length||offset>=page.total) break;
  }
  return rows;
}

export class ManagementDashboardController{
  constructor(source=getDataSource(),options={}){this.source=source;this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);}

  async load(filters={}){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.DASHBOARD_READ,'אין הרשאה לדשבורד הניהולי');
    filters=applyUserScope(user,filters);
    if(TOVATI_CONFIG.mode==='company-server'&&typeof this.source.request==='function'){
      const params=new URLSearchParams();
      if(filters.departmentId) params.set('departmentId',filters.departmentId);
      if(filters.from) params.set('from',filters.from);
      if(filters.to) params.set('to',filters.to);
      return this.source.request('/dashboard/kpis'+(params.size?'?'+params:''));
    }
    return this.loadLocalSnapshot(filters);
  }

  async loadLocalSnapshot(filters={}){
    const [work,pm,permits,assignments]=await Promise.all([
      allRows(this.source,'work-items',{includeClosed:'1',departmentId:filters.departmentId||''}),
      allRows(this.source,'pm-tasks',{departmentId:filters.departmentId||''}),
      allRows(this.source,'permits',{}),
      allRows(this.source,'assignments',{departmentId:filters.departmentId||''})
    ]);

    const open=work.filter(x=>!['done','closed','בוצע','סגור'].includes(String(x.status||'').toLowerCase()));
    const urgent=open.filter(x=>['immediate','today'].includes(String(x.operational_priority||'')));
    const today=new Date().toISOString().slice(0,10);
    const pmOverdue=pm.filter(x=>x.due_at&&String(x.due_at).slice(0,10)<today&&!/סגור|בוצע|TECO|CLSD/i.test(String(x.status||'')));
    const permitExpired=permits.filter(x=>x.valid_until&&String(x.valid_until).slice(0,10)<today);

    return {
      source:'local-full-snapshot',
      partial:false,
      kpis:{
        openWork:open.length,
        urgentWork:urgent.length,
        preventiveOverdue:pmOverdue.length,
        expiredPermits:permitExpired.length,
        activeAssignments:assignments.filter(a=>a.status!=='cancelled'&&a.status!=='done').length
      },
      byDepartment:countBy(open,'department_id'),
      byStatus:countBy(open,'status')
    };
  }
}
