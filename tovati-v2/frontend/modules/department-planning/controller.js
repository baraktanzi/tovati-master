import { WorkRepository } from '../../core/repositories/work-repository.js';
import { assignmentsForDay, planningCandidates, buildAssignment } from './planning.js';

export class DepartmentPlanningController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadDay({date,departmentId='',section='',workerId='',search='',offset=0,limit=50}={}){
    const [workPage,assignmentPage]=await Promise.all([
      this.repository.listWorkItems({offset:0,limit:200,departmentId,section,search,includeClosed:'0'}),
      this.repository.listAssignments({offset:0,limit:200,date,departmentId,section,workerId})
    ]);

    const assignments=assignmentsForDay(assignmentPage.items,date,{departmentId,section,workerId});
    const candidates=planningCandidates(workPage.items,assignments,date,{departmentId,section,search});
    return {
      date,
      assignments,
      candidates:candidates.slice(Number(offset),Number(offset)+Number(limit)),
      candidateTotal:candidates.length
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
