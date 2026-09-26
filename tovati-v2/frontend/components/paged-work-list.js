import { workCardElement } from './work-card.js';

export class PagedWorkList{
  constructor({host,loadPage,pageSize=30,cardOptions=()=>({}),onCard=null,onPriority=null}){
    this.host=host;
    this.loadPage=loadPage;
    this.pageSize=pageSize;
    this.cardOptions=cardOptions;
    this.onCard=onCard;
    this.onPriority=onPriority;
    this.offset=0;
    this.total=0;
    this.loading=false;
    this.done=false;
    this.token=0;
    this.items=[];
    this.observer=null;
  }

  async reset(){
    this.token++;
    this.offset=0;this.total=0;this.done=false;this.items=[];
    this.observer?.disconnect();
    this.host.replaceChildren();
    await this.more();
  }

  async more(){
    if(this.loading||this.done)return;
    this.loading=true;
    const token=this.token;
    const marker=document.createElement('div');
    marker.className='tv2-list-loading';
    marker.textContent='טוען…';
    this.host.append(marker);
    try{
      const page=await this.loadPage({offset:this.offset,limit:this.pageSize});
      if(token!==this.token)return;
      marker.remove();
      this.total=Number(page.total||0);
      const frag=document.createDocumentFragment();
      for(const item of page.items||[]){
        this.items.push(item);
        const el=workCardElement(item,this.cardOptions(item));
        el.querySelectorAll('[data-card-detail]').forEach(btn=>btn.addEventListener('click',()=>this.onCard?.(item,btn.dataset.cardDetail,el)));
        el.querySelectorAll('[data-priority]').forEach(btn=>btn.addEventListener('click',()=>this.onPriority?.(item,btn.dataset.priority,btn,el)));
        frag.append(el);
      }
      this.host.append(frag);
      this.offset+=Number(page.items?.length||0);
      this.done=this.offset>=this.total||!page.items?.length;
      this.#footer();
    }finally{
      this.loading=false;
      marker.remove();
    }
  }

  #footer(){
    this.host.querySelector('.tv2-list-footer')?.remove();
    const footer=document.createElement('div');
    footer.className='tv2-list-footer';
    if(this.done){
      footer.textContent=this.total? `${this.total} עבודות נטענו`:'אין עבודות להצגה';
      this.host.append(footer);
      return;
    }
    footer.innerHTML=`<button type="button">הצג עוד</button><span>${this.offset} מתוך ${this.total}</span><i data-sentinel></i>`;
    footer.querySelector('button').onclick=()=>this.more();
    this.host.append(footer);

    const sentinel=footer.querySelector('[data-sentinel]');
    this.observer?.disconnect();
    this.observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting))this.more();
    },{rootMargin:'500px 0px'});
    this.observer.observe(sentinel);
  }

  destroy(){
    this.token++;
    this.observer?.disconnect();
    this.host.replaceChildren();
  }
}
