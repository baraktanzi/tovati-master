import { getDataSource } from '../../core/data-source.js';

export class PersonalAreaController{
  constructor(source=getDataSource()){this.source=source;}

  async load(userId,date=''){
    const [tasks,assignments,alerts]=await Promise.all([
      this.source.list('personal-tasks',{offset:0,limit:100,assigneeId:userId,status:'open'}),
      this.source.list('assignments',{offset:0,limit:100,workerId:userId,date}),
      this.source.list('alerts',{offset:0,limit:100,userId,status:'open'})
    ]);
    return {tasks,assignments,alerts};
  }

  saveTask(item,options={}){return this.source.upsert('personal-tasks',item,options);}
  saveAlert(item,options={}){return this.source.upsert('alerts',item,options);}
}
