import { WorkRepository } from '../../core/repositories/work-repository.js';

export class DailyMaintenanceController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadPage(filters={}){
    const query={
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      departmentId:filters.departmentId||'',
      section:filters.section||'',
      operationalPriority:filters.operationalPriority||'',
      status:filters.status||'',
      search:filters.search||'',
      includeClosed:filters.includeClosed?'1':'0'
    };
    return this.repository.listWorkItems(query);
  }

  getCard(id){return this.repository.loadWorkCard(id);}
}
