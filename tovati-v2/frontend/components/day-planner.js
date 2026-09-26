const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function minutes(value='00:00'){
  const [h,m]=String(value).split(':').map(Number);
  return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);
}

function laneAssignments(items=[]){
  const sorted=[...items].sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
  const laneEnds=[],out=[];
  for(const item of sorted){
    const start=minutes(item.start),end=minutes(item.end);
    let lane=laneEnds.findIndex(x=>x<=start);
    if(lane<0) lane=laneEnds.length;
    laneEnds[lane]=end;
    out.push({item,lane});
  }
  return {items:out,lanes:Math.max(1,laneEnds.length)};
}

function candidateHTML(x,selected){
  const id=String(x.id||x.workRef||'');
  return `<button type="button" class="tdp-candidate ${selected===id?'is-selected':''}" data-candidate="${esc(id)}">
    <span><bdi>${esc(x.orderId||x.order_id||x.notificationId||x.notification_id||id)}</bdi><em>${esc(x.operationalPriority||x.operational_priority||x.priority||'')}</em></span>
    <strong>${esc(x.title||'ללא תיאור')}</strong>
    <small>${esc([x.departmentId||x.department_id,x.section].filter(Boolean).join(' · '))}</small>
  </button>`;
}

export class DayPlanner{
  constructor({host,onAssignRequest=null,onOpenAssignment=null,onOpenWork=null}={}){
    this.host=host;
    this.onAssignRequest=onAssignRequest;
    this.onOpenAssignment=onOpenAssignment;
    this.onOpenWork=onOpenWork;
    this.data={date:'',assignments:[],candidates:[],workers:[]};
    this.selected='';
    this.startHour=6;
    this.endHour=20;
  }

  setData(data={}){
    this.data={...this.data,...data};
    const starts=(this.data.assignments||[]).map(x=>Math.floor(minutes(x.start)/60));
    const ends=(this.data.assignments||[]).map(x=>Math.ceil(minutes(x.end)/60));
    this.startHour=Math.min(6,...starts.filter(Number.isFinite));
    this.endHour=Math.max(20,...ends.filter(Number.isFinite));
    this.render();
  }

  render(){
    const {date,assignments=[],candidates=[]}=this.data;
    const hours=[];
    for(let h=this.startHour;h<=this.endHour;h++)hours.push(h);
    const lane=laneAssignments(assignments);
    const pxPerMinute=1.25;
    const height=(this.endHour-this.startHour)*60*pxPerMinute;

    this.host.innerHTML=`<section class="tdp-board">
      <aside class="tdp-backlog">
        <header><div><small>עבודות ממתינות</small><strong>${candidates.length}</strong></div></header>
        <div class="tdp-candidates">${candidates.map(x=>candidateHTML(x,this.selected)).join('')||'<div class="tdp-empty">אין עבודות ממתינות לשיבוץ</div>'}</div>
      </aside>

      <section class="tdp-day">
        <header><div><small>לוח עבודה יומי</small><strong>${esc(date||'')}</strong></div><span>${assignments.length} שיבוצים</span></header>
        <div class="tdp-scroll">
          <div class="tdp-hours" style="height:${height}px">
            ${hours.slice(0,-1).map(h=>`<button type="button" class="tdp-hour" style="top:${(h-this.startHour)*60*pxPerMinute}px" data-hour="${String(h).padStart(2,'0')}:00"><span>${String(h).padStart(2,'0')}:00</span></button>`).join('')}
            <div class="tdp-events">
              ${lane.items.map(({item,lane:laneIndex})=>{
                const top=(minutes(item.start)-this.startHour*60)*pxPerMinute;
                const itemHeight=Math.max(38,(minutes(item.end)-minutes(item.start))*pxPerMinute-4);
                const left=laneIndex*100/lane.lanes;
                const width=100/lane.lanes;
                return `<button type="button" class="tdp-event" data-assignment="${esc(item.id||'')}" style="top:${top+2}px;height:${itemHeight}px;inset-inline-start:calc(${left}% + 3px);width:calc(${width}% - 6px)">
                  <span><bdi>${esc(item.start)}–${esc(item.end)}</bdi><em>${esc(item.status||'מתוכנן')}</em></span>
                  <strong>${esc(item.snapshot?.title||item.title||item.workRef||'')}</strong>
                  ${itemHeight>65?`<small>${esc((item.workerNames||item.workerIds||[]).join(' · '))}</small>`:''}
                </button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </section>
    </section>`;

    this.host.querySelectorAll('[data-candidate]').forEach(button=>button.onclick=()=>{
      this.selected=button.dataset.candidate;
      this.render();
      const row=candidates.find(x=>String(x.id||x.workRef||'')===this.selected);
      this.onOpenWork?.(row);
    });

    this.host.querySelectorAll('[data-hour]').forEach(button=>button.onclick=()=>{
      if(!this.selected)return;
      const item=candidates.find(x=>String(x.id||x.workRef||'')===this.selected);
      if(!item)return;
      const start=button.dataset.hour;
      const startMin=minutes(start),endMin=startMin+120;
      const end=String(Math.floor(endMin/60)).padStart(2,'0')+':'+String(endMin%60).padStart(2,'0');
      this.onAssignRequest?.({workItem:item,date,start,end});
    });

    this.host.querySelectorAll('[data-assignment]').forEach(button=>button.onclick=()=>{
      const item=assignments.find(x=>String(x.id||'')===button.dataset.assignment);
      if(item)this.onOpenAssignment?.(item);
    });
  }
}
