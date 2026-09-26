import { getDataSource } from '../../core/data-source.js';
import { CAPABILITIES, requireCapability, applyUserScope } from '../../core/authorization.js';

export class AnnualPlansController{
  constructor(source=getDataSource(),options={}){this.source=source;this.getCurrentUser=options.getCurrentUser||(()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null);}

  list(filters={}){
    const user=this.getCurrentUser();
    requireCapability(user,CAPABILITIES.ANNUAL_READ,'אין הרשאה לצפייה בתוכניות שנתיות');
    const scoped=applyUserScope(user,filters);
    return this.source.list('annual-plans',{
      offset:Number(filters.offset||0),
      limit:Number(filters.limit||50),
      year:scoped.year||'',
      departmentId:scoped.departmentId||'',
      status:scoped.status||''
    });
  }

  get(id){requireCapability(this.getCurrentUser(),CAPABILITIES.ANNUAL_READ);return this.source.get('annual-plans',id);}
  save(item,options={}){requireCapability(this.getCurrentUser(),CAPABILITIES.ANNUAL_MANAGE,'אין הרשאה לעריכת תוכנית שנתית');return this.source.upsert('annual-plans',item,options);}
}
