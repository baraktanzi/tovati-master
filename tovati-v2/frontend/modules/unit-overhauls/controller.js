import { getDataSource } from '../../core/data-source.js';
import { CAPABILITIES, requireCapability, applyUserScope } from '../../core/authorization.js';

export class UnitOverhaulsController{
  constructor(source=getDataSource(),options={}){this.source=source;this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);}

  listProjects(filters={}){
    requireCapability(this.getCurrentUser(),CAPABILITIES.OVERHAUL_READ,'אין הרשאה לצפייה בשיפוצים');
    return this.source.list('overhaul-projects',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      unitId:filters.unitId||'',
      status:filters.status||''
    });
  }

  listTasks(projectId,filters={}){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.OVERHAUL_READ);
    const scoped=applyUserScope(user,filters);
    return this.source.list('overhaul-tasks',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||100),
      projectId,
      status:filters.status||'',
      departmentId:scoped.departmentId||''
    });
  }

  getProject(id){requireCapability(this.getCurrentUser(),CAPABILITIES.OVERHAUL_READ);return this.source.get('overhaul-projects',id);}
  saveProject(item,options={}){requireCapability(this.getCurrentUser(),CAPABILITIES.OVERHAUL_MANAGE,'אין הרשאה לעריכת שיפוץ');return this.source.upsert('overhaul-projects',item,options);}
  saveTask(item,options={}){requireCapability(this.getCurrentUser(),CAPABILITIES.OVERHAUL_MANAGE,'אין הרשאה לעריכת משימת שיפוץ');return this.source.upsert('overhaul-tasks',item,options);}
}
