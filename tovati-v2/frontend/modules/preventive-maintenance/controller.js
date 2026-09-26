import { WorkRepository } from '../../core/repositories/work-repository.js';
import { normalizePmTask, monthState } from './domain.js';
import { CAPABILITIES, requireCapability, applyUserScope } from '../../core/authorization.js';

export class PreventiveMaintenanceController{
  constructor(repository=new WorkRepository(),options={}){this.repository=repository;this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);}

  async loadPage(filters={}){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.PM_READ,'אין הרשאה לצפייה בתחזוקה מונעת');
    const scoped=applyUserScope(user,filters);
    const offset=Math.max(0,Number(filters.offset||0));
    const limit=Math.max(1,Number(filters.limit||50));
    const page=await this.repository.listPmTasks({
      offset,
      limit,
      month:scoped.month||'',
      departmentId:scoped.departmentId||'',
      search:scoped.search||''
    });

    return {
      ...page,
      items:(page.items||[]).map(x=>{
        const item=normalizePmTask(x);
        return {...item,monthState:monthState(item.dueAt)};
      })
    };
  }
}
