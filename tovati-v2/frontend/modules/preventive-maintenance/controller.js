import { WorkRepository } from '../../core/repositories/work-repository.js';
import { filterPmTasks, monthState } from './domain.js';

export class PreventiveMaintenanceController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadPage(filters={}){
    const page=await this.repository.listPmTasks({offset:0,limit:200});
    const rows=filterPmTasks(page.items,filters);
    const offset=Math.max(0,Number(filters.offset||0));
    const limit=Math.max(1,Number(filters.limit||50));
    return {
      items:rows.slice(offset,offset+limit).map(x=>({...x,monthState:monthState(x.dueAt)})),
      total:rows.length,offset,limit
    };
  }
}
