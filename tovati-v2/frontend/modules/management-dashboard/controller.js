import { getDataSource } from '../../core/data-source.js';
import { TOVATI_CONFIG } from '../../config/runtime-config.js';

function countBy(rows,key){
  const out={};
  for(const row of rows){
    const k=String(row[key]||'לא מוגדר');
    out[k]=(out[k]||0)+1;
  }
  return out;
}

export class ManagementDashboardController{
  constructor(source=getDataSource()){this.source=source;}

  async loadLocalSnapshot(){
    // Local/legacy mode only. The future company server will expose aggregated KPI endpoints.
    const [work,pm,permits,assignments]=await Promise.all([
      this.source.list('work-items',{offset:0,limit:TOVATI_CONFIG.maxPageSize,includeClosed:'1'}),
      this.source.list('pm-tasks',{offset:0,limit:TOVATI_CONFIG.maxPageSize}),
      this.source.list('permits',{offset:0,limit:TOVATI_CONFIG.maxPageSize}),
      this.source.list('assignments',{offset:0,limit:TOVATI_CONFIG.maxPageSize})
    ]);

    const open=work.items.filter(x=>!['done','closed','בוצע','סגור'].includes(String(x.status||'').toLowerCase()));
    const urgent=open.filter(x=>['immediate','today'].includes(String(x.operational_priority||'')));
    const today=new Date().toISOString().slice(0,10);
    const pmOverdue=pm.items.filter(x=>x.due_at&&String(x.due_at).slice(0,10)<today&&!/סגור|בוצע|TECO|CLSD/i.test(String(x.status||'')));
    const permitExpired=permits.items.filter(x=>x.valid_until&&String(x.valid_until).slice(0,10)<today);

    return {
      source:'local-snapshot',
      partial:work.total>TOVATI_CONFIG.maxPageSize||pm.total>TOVATI_CONFIG.maxPageSize,
      kpis:{
        openWork:open.length,
        urgentWork:urgent.length,
        preventiveOverdue:pmOverdue.length,
        expiredPermits:permitExpired.length,
        activeAssignments:assignments.items.filter(a=>a.status!=='cancelled'&&a.status!=='done').length
      },
      byDepartment:countBy(open,'department_id'),
      byStatus:countBy(open,'status')
    };
  }
}
