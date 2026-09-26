import { WorkRepository } from '../../core/repositories/work-repository.js';
import { TOVATI_CONFIG } from '../../config/runtime-config.js';
import { assignmentsForDay, planningCandidates, buildAssignment } from './planning.js';

async function allPages(loader,query={}){
  const rows=[];
  let offset=0;
  while(true){
    const page=await loader({...query,offset,limit:TOVATI_CONFIG.maxPageSize});
    rows.push(...(page.items||[]));
    offset+=page.items?.length||0;
    if(!page.items?.length||offset>=page.total)break;
  }
  return rows;
}

export class DepartmentPlanningController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadDay({date,departmentId='',section='',workerId='',search='',offset=0,limit=50}={}){
    if(TOVATI_CONFIG.mode==='company-server'&&typeof this.repository.source.request==='function'){
      const params=new URLSearchParams({date,departmentId,section,workerId,search,offset:String(offset),limit:String(limit)});
      return this.repository.source.request('/planning/day?'+params.toString());
    }

    const [items,assignmentsRaw]=await Promise.all([
      allPages(q=>this.repository.listWorkItems(q),{departmentId,section,search,includeClosed:'0'}),
      allPages(q=>this.repository.listAssignments(q),{date,departmentId,section,workerId})
    ]);

    const assignments=assignmentsForDay(assignmentsRaw,date,{departmentId,section,workerId});
    const candidates=planningCandidates(items,assignments,date,{departmentId,section,search});
    const from=Math.max(0,Number(offset));
    const size=Math.max(1,Number(limit));
    return {
      date,
      assignments,
      candidates:candidates.slice(from,from+size),
      candidateTotal:candidates.length,
      offset:from,
      limit:size
    };
  }

  async createAssignment(input){
    const card=await this.repository.getWorkItem(input.workItemId);
    if(!card) throw new Error('העבודה לא נמצאה');
    const assignment=buildAssignment({
      id:input.id||crypto.randomUUID(),
      workItem:{
        id:card.id,
        title:card.title||card.description||'',
        orderId:card.order_id||card.orderId||'',
        departmentId:card.department_id||card.departmentId||'',
        section:card.section||''
      },
      date:input.date,
      start:input.start,
      end:input.end,
      workerIds:input.workerIds,
      note:input.note,
      actorId:input.actorId
    });
    return this.repository.saveAssignment(assignment,{version:'*'});
  }
}
