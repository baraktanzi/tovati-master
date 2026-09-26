import { WorkRepository } from '../../core/repositories/work-repository.js';
import { CAPABILITIES, requireCapability, applyUserScope } from '../../core/authorization.js';

export class DailyMaintenanceController{
  constructor(repository=new WorkRepository(),options={}){
    this.repository=repository;
    this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);
  }

  async loadPage(filters={}){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.DAILY_READ,'אין הרשאה לצפייה בתחזוקה היומית');
    const scoped=applyUserScope(user,filters);
    const query={
      offset:Number(scoped.offset||0),
      limit:Number(scoped.limit||50),
      departmentId:scoped.departmentId||'',
      section:scoped.section||'',
      operationalPriority:scoped.operationalPriority||'',
      status:scoped.status||'',
      search:scoped.search||'',
      includeClosed:scoped.includeClosed?'1':'0'
    };
    return this.repository.listWorkItems(query);
  }

  async getCard(id){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.DAILY_READ);
    const card=await this.repository.loadWorkCard(id);
    if(!card)return null;
    const scoped=applyUserScope(user,{});
    if(scoped.departmentId&&String(card.work?.department_id||'')!==scoped.departmentId)return null;
    if(scoped.section&&String(card.work?.section||'')!==scoped.section)return null;
    return card;
  }
}
