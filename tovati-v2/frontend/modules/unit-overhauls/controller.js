import { getDataSource } from '../../core/data-source.js';

export class UnitOverhaulsController{
  constructor(source=getDataSource()){this.source=source;}

  listProjects(filters={}){
    return this.source.list('overhaul-projects',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      unitId:filters.unitId||'',
      status:filters.status||''
    });
  }

  listTasks(projectId,filters={}){
    return this.source.list('overhaul-tasks',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||100),
      projectId,
      status:filters.status||'',
      departmentId:filters.departmentId||''
    });
  }

  getProject(id){return this.source.get('overhaul-projects',id);}
  saveProject(item,options={}){return this.source.upsert('overhaul-projects',item,options);}
  saveTask(item,options={}){return this.source.upsert('overhaul-tasks',item,options);}
}
