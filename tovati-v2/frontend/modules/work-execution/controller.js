import { getDataSource } from '../../core/data-source.js';

function required(value,label){
  const v=String(value??'').trim();
  if(!v)throw new Error('חסר '+label);
  return v;
}

export class WorkExecutionController{
  constructor(source=getDataSource()){this.source=source;}

  async load(workItemId){
    const [work,delays,timeEntries,closures,assignments]=await Promise.all([
      this.source.get('work-items',workItemId),
      this.source.list('work-delays',{offset:0,limit:200,workItemId}),
      this.source.list('time-entries',{offset:0,limit:200,workItemId}),
      this.source.list('work-closures',{offset:0,limit:20,workItemId}),
      this.source.list('assignments',{offset:0,limit:200})
    ]);

    return {
      work,
      delays:delays.items,
      timeEntries:timeEntries.items,
      closure:closures.items[0]||null,
      assignments:assignments.items.filter(a=>String(a.workRef||a.work_item_id||'')===String(workItemId))
    };
  }

  async saveDelay(input){
    const item={
      id:String(input.id||crypto.randomUUID()),
      work_item_id:required(input.workItemId||input.work_item_id,'עבודה'),
      delay_type:required(input.type||input.delay_type,'סוג עיכוב'),
      owner_user_id:String(input.ownerUserId||input.owner_user_id||''),
      owner:String(input.owner||input.ownerName||''),
      details:required(input.details||input.text,'פירוט עיכוב'),
      follow_up_date:required(input.followUpDate||input.follow_up_date||input.due,'תאריך מעקב'),
      status:String(input.status||'open'),
      version:Number(input.version||1)
    };
    return this.source.upsert('work-delays',item,{version:input.version??'*'});
  }

  async saveTimeEntry(input){
    const hours=Number(input.hours);
    if(!(hours>0&&hours<=24))throw new Error('מספר השעות חייב להיות גדול מאפס ועד 24');
    const item={
      id:String(input.id||crypto.randomUUID()),
      work_item_id:required(input.workItemId||input.work_item_id,'עבודה'),
      user_id:required(input.userId||input.user_id,'עובד'),
      work_date:required(input.date||input.work_date,'תאריך'),
      hours,
      description:required(input.description||input.text,'תיאור ביצוע'),
      status:String(input.status||'draft'),
      voided:Boolean(input.voided),
      version:Number(input.version||1)
    };
    return this.source.upsert('time-entries',item,{version:input.version??'*'});
  }

  async completeWork(input){
    const workItemId=required(input.workItemId||input.work_item_id,'עבודה');
    const summary=required(input.summary||input.text,'סיכום ביצוע');
    if(!input.permitChecked&&!input.permit_checked)throw new Error('יש לאשר שבוצעה בדיקת היתר');

    if(this.source.kind==='company-server'&&typeof this.source.request==='function'){
      return this.source.request('/work-items/'+encodeURIComponent(workItemId)+'/complete',{
        method:'POST',
        headers:{'Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({
          summary,
          permitChecked:true,
          userId:String(input.userId||input.completed_by||''),
          version:input.version??null
        })
      });
    }

    const closure={
      id:workItemId,
      work_item_id:workItemId,
      completed:true,
      summary,
      completed_by:String(input.userId||input.completed_by||''),
      completed_at:new Date().toISOString(),
      permit_checked:true,
      version:Number(input.version||1)
    };

    const saved=await this.source.upsert('work-closures',closure,{version:input.version??'*'});

    // Local standalone mode mirrors the server transaction so the UI remains coherent.
    if(this.source.kind==='local'){
      const work=await this.source.get('work-items',workItemId);
      if(work)await this.source.upsert('work-items',{...work,status:'done',closed_at:closure.completed_at});

      const assignments=await this.source.list('assignments',{offset:0,limit:200});
      for(const a of assignments.items.filter(x=>String(x.workRef||x.work_item_id||'')===workItemId&&x.status!=='cancelled')){
        await this.source.upsert('assignments',{...a,status:'done',updatedAt:new Date().toISOString()});
      }
    }

    return saved;
  }
}
