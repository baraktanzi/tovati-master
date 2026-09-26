import { getDataSource } from '../../core/data-source.js';
import { CAPABILITIES, requireCapability, isAdmin } from '../../core/authorization.js';

export class PersonalAreaController{
  constructor(source=getDataSource(),options={}){this.source=source;this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);}

  async load(userId,date=''){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.PERSONAL_READ,'אין הרשאה לאזור האישי');
    const target=isAdmin(user)&&userId?String(userId):String(user.id);
    const [tasks,assignments,alerts]=await Promise.all([
      this.source.list('personal-tasks',{offset:0,limit:100,assigneeId:target,status:'open'}),
      this.source.list('assignments',{offset:0,limit:100,workerId:target,date}),
      this.source.list('alerts',{offset:0,limit:100,userId:target,status:'open'})
    ]);
    return {tasks,assignments,alerts};
  }

  saveTask(item,options={}){const user=this.getCurrentUser();requireCapability(user,CAPABILITIES.PERSONAL_READ);return this.source.upsert('personal-tasks',{...item,assignee_id:item.assignee_id||item.assigneeId||user.id},options);}
  saveAlert(item,options={}){const user=this.getCurrentUser();requireCapability(user,CAPABILITIES.PERSONAL_READ);return this.source.upsert('alerts',{...item,user_id:item.user_id||item.userId||user.id},options);}
}
