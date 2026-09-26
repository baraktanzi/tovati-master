import { WorkRepository } from '../../core/repositories/work-repository.js';
import { normalizePermit, normalizeJsa, normalizePtp, permitValidity, safetyPackageStatus } from './domain.js';

export class PermitSafetyController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadPermits(filters={}){
    const page=await this.repository.listPermits({offset:0,limit:200});
    const q=String(filters.search||'').trim().toLowerCase();
    const rows=page.items.map(normalizePermit)
      .filter(x=>!filters.status||x.status===filters.status)
      .filter(x=>!q||[x.id,x.orderId,x.title,x.status].join(' ').toLowerCase().includes(q))
      .map(x=>({...x,validity:permitValidity(x)}));

    const offset=Math.max(0,Number(filters.offset||0));
    const limit=Math.max(1,Number(filters.limit||50));
    return {items:rows.slice(offset,offset+limit),total:rows.length,offset,limit};
  }

  async loadPackage({permitId,workItemId=''}){
    const permit=normalizePermit(await this.repository.source.get('permits',permitId)||{id:permitId});
    const [jsaPage,ptpPage]=await Promise.all([
      this.repository.listJsa({offset:0,limit:50,permitId,workItemId}),
      this.repository.listPtp({offset:0,limit:50,permitId,workItemId})
    ]);
    const jsa=jsaPage.items.map(normalizeJsa).find(x=>x.permitId===permitId&&(!workItemId||x.workItemId===workItemId))||null;
    const ptp=ptpPage.items.map(normalizePtp).find(x=>x.permitId===permitId&&(!workItemId||x.workItemId===workItemId))||null;
    return {permit,jsa,ptp,status:safetyPackageStatus({permit,jsa,ptp})};
  }
}
