import { getDataSource } from '../../core/data-source.js';

export class AnnualPlansController{
  constructor(source=getDataSource()){this.source=source;}

  list(filters={}){
    return this.source.list('annual-plans',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      year:filters.year||'',
      departmentId:filters.departmentId||'',
      status:filters.status||''
    });
  }

  get(id){return this.source.get('annual-plans',id);}
  save(item,options={}){return this.source.upsert('annual-plans',item,options);}
}
