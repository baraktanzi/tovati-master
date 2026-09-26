import { getDataSource } from '../data-source.js';

export class WorkRepository {
  constructor(source=getDataSource()){ this.source=source; }

  listWorkItems(query={}){ return this.source.list('work-items',query); }
  getWorkItem(id){ return this.source.get('work-items',id); }
  saveWorkItem(item,options={}){ return this.source.upsert('work-items',item,options); }

  listNotifications(query={}){ return this.source.list('notifications',query); }
  listOrders(query={}){ return this.source.list('orders',query); }
  listPermits(query={}){ return this.source.list('permits',query); }
  listPmTasks(query={}){ return this.source.list('pm-tasks',query); }
  listAssignments(query={}){ return this.source.list('assignments',query); }
  saveAssignment(item,options={}){ return this.source.upsert('assignments',item,options); }
  listJsa(query={}){ return this.source.list('jsa',query); }
  getJsa(id){ return this.source.get('jsa',id); }
  saveJsa(item,options={}){ return this.source.upsert('jsa',item,options); }
  listPtp(query={}){ return this.source.list('ptp',query); }
  getPtp(id){ return this.source.get('ptp',id); }
  savePtp(item,options={}){ return this.source.upsert('ptp',item,options); }

  async loadWorkCard(id){
    const work=await this.getWorkItem(id);
    if(!work) return null;
    const [notification,order,permit]=await Promise.all([
      work.notification_id?this.source.get('notifications',work.notification_id):null,
      work.order_id?this.source.get('orders',work.order_id):null,
      work.permit_id?this.source.get('permits',work.permit_id):null
    ]);
    return {work,notification,order,permit};
  }
}
