import { WorkRepository } from '../../core/repositories/work-repository.js';
import { normalizePermit, normalizeJsa, normalizePtp, permitValidity, safetyPackageStatus } from './domain.js';

export class PermitSafetyController{
  constructor(repository=new WorkRepository()){this.repository=repository;}

  async loadPermits(filters={}){
    const offset=Math.max(0,Number(filters.offset||0));
    const limit=Math.max(1,Number(filters.limit||50));
    const page=await this.repository.listPermits({
      offset,
      limit,
      status:filters.status||'',
      search:filters.search||''
    });

    return {
      ...page,
      items:(page.items||[]).map(normalizePermit).map(x=>({...x,validity:permitValidity(x)}))
    };
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
