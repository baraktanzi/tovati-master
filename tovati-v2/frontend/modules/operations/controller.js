import { WorkRepository } from '../../core/repositories/work-repository.js';
import { setOperationalPriority, groupPriorityPublication, canPrioritize } from './prioritization.js';

export class OperationsController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  loadQueue(filters={}){
    return this.repository.listWorkItems({
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      departmentId:filters.departmentId||'',
      operationalPriority:filters.operationalPriority||'',
      search:filters.search||'',
      includeClosed:'0'
    });
  }

  async changePriority(id,value,targetDate=null,version='*',user=window.TOVATI_R24_BRIDGE?.currentUser?.()||null){
    if(!canPrioritize(user)) throw new Error('אין הרשאה לתעדוף תפעולי');
    const card=await this.repository.getWorkItem(id);
    if(!card) throw new Error('העבודה לא נמצאה');
    const next=setOperationalPriority(card,value,targetDate);
    return this.repository.saveWorkItem(next,{version});
  }

  async buildDepartmentBriefing(limit=200){
    const page=await this.repository.listWorkItems({offset:0,limit,includeClosed:'0'});
    return groupPriorityPublication(page.items);
  }
}
