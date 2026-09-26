import { WorkRepository } from '../../core/repositories/work-repository.js';
import { normalizePmTask, monthState } from './domain.js';

export class PreventiveMaintenanceController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadPage(filters={}){
    const offset=Math.max(0,Number(filters.offset||0));
    const limit=Math.max(1,Number(filters.limit||50));
    const page=await this.repository.listPmTasks({
      offset,
      limit,
      month:filters.month||'',
      departmentId:filters.departmentId||'',
      search:filters.search||''
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
