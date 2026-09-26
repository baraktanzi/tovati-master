import { WorkRepository } from '../../core/repositories/work-repository.js';
import { setOperationalPriority, groupPriorityPublication } from './prioritization.js';
import { CAPABILITIES, requireCapability } from '../../core/authorization.js';

export class OperationsController{
  constructor(repository=new WorkRepository(),options={}){
    this.repository=repository;
    this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);
  }

  loadQueue(filters={}){
    requireCapability(this.getCurrentUser(),CAPABILITIES.OPERATIONS_PRIORITIZE,'מסך התעדוף זמין לתפעול בלבד');
    return this.repository.listWorkItems({
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      departmentId:filters.departmentId||'',
      operationalPriority:filters.operationalPriority||'',
      search:filters.search||'',
      includeClosed:'0'
    });
  }

  async changePriority(id,value,targetDate=null,version=null,user=this.getCurrentUser()){
    requireCapability(user,CAPABILITIES.OPERATIONS_PRIORITIZE,'אין הרשאה לתעדוף תפעולי');
    const card=await this.repository.getWorkItem(id);
    if(!card) throw new Error('העבודה לא נמצאה');
    const next=setOperationalPriority(card,value,targetDate);
    const expectedVersion=version??card.version??'*';
    return this.repository.saveWorkItem(next,{version:expectedVersion});
  }

  async buildDepartmentBriefing(limit=200){
    const page=await this.repository.listWorkItems({offset:0,limit,includeClosed:'0'});
    return groupPriorityPublication(page.items);
  }
}
