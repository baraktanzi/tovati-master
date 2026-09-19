(()=>{"use strict";
const frame=document.getElementById("tovatiApp");
const MAP={1:"חירום",2:"דחוף",3:"רגיל",4:"לא דחוף",5:"הפסקת יחידה",6:"הפסקת יחידה"};
const CODES={"חירום":"1","דחוף":"2","רגיל":"3","לא דחוף":"4","הפסקת יחידה":"5–6"};
const ORDER=["חירום","דחוף","רגיל","לא דחוף","הפסקת יחידה"];
function norm(v){
  let s=String(v??"").trim().replace(/[\u200e\u200f]/g,"");
  if(!s)return "רגיל";
  const m=s.match(/^0*([1-6])(?:\.0+)?(?:\s|[-–—:]|$)/);
  if(m)return MAP[+m[1]]||"רגיל";
  s=s.replace(/^עדיפות(?: SAP)?\s*:?\s*/i,"").trim();
  if(s==="חרום"||s==="חירום")return "חירום";
  if(s==="דחוף")return "דחוף";
  if(s==="רגיל")return "רגיל";
  if(s==="לא דחוף")return "לא דחוף";
  if(["הפסקת יחידה","להפסקת יחידה","הפסקה קצרה"].includes(s))return "הפסקת יחידה";
  return "רגיל";
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon=name=>({
 emergency:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 8v5"/><path d="M12 17h.01"/><path d="M10.3 3.4 2.9 16.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0z"/></svg>',
 urgent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.4 2.9 16.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0z"/></svg>',
 regular:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h5"/></svg>',
 low:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M8 8l8 8"/></svg>',
 outage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v7"/><path d="m8 13-2 2v4h12v-4l-2-2"/><path d="M9 19v-4h6v4"/></svg>'
}[name]||"");
const CLS={"חירום":"emergency","דחוף":"urgent","רגיל":"regular","לא דחוף":"low","הפסקת יחידה":"outage"};
const css=`
#mobileSummaryBox{padding:7px 8px 10px!important}
#mobileSummaryBox .r20-report-top{gap:7px!important;margin:0 0 7px!important}
#mobileSummaryBox .r20-report-main{gap:8px!important}
#mobileSummaryBox .r20-report-badge{width:38px!important;height:38px!important;flex-basis:38px!important;border-radius:12px!important}
#mobileSummaryBox .r20-report-badge svg{width:20px!important;height:20px!important}
#mobileSummaryBox .summary-title{font-size:19px!important;line-height:1.15!important}
#mobileSummaryBox .r20-report-stamp{margin-top:3px!important;font-size:12px!important;gap:5px!important}
#mobileSummaryBox .r11-report-light{width:9px!important;height:9px!important;box-shadow:0 0 0 2px rgba(99,212,163,.14)!important}
#mobileSummaryBox .r15-summary-toggle{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;flex-basis:32px!important;border-radius:10px!important}
#mobileSummaryBox .r20-report-body{gap:8px!important}
#mobileSummaryBox .r20-summary-card{padding:10px!important;border-radius:18px!important}
#mobileSummaryBox .r20-card-head{margin-bottom:8px!important;gap:8px!important;align-items:center!important}
#mobileSummaryBox .r20-card-lead{gap:7px!important}
#mobileSummaryBox .r20-card-icon{width:34px!important;height:34px!important;flex-basis:34px!important;border-radius:11px!important}
#mobileSummaryBox .r20-card-icon svg{width:18px!important;height:18px!important}
#mobileSummaryBox .r20-card-head h3{font-size:18px!important}
#mobileSummaryBox .r20-total-block{min-width:82px!important}
#mobileSummaryBox .r20-total-block span{font-size:12px!important;margin-bottom:0!important}
#mobileSummaryBox .r20-total-block strong{font-size:29px!important}
#mobileSummaryBox .r20-mini-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}
#mobileSummaryBox .r20-mini-card{min-height:54px!important;padding:7px!important;gap:6px!important;border-radius:13px!important}
#mobileSummaryBox .r20-mini-icon{width:31px!important;height:31px!important;flex-basis:31px!important;border-radius:9px!important}
#mobileSummaryBox .r20-mini-icon svg{width:17px!important;height:17px!important}
#mobileSummaryBox .r20-mini-copy{gap:0!important}
#mobileSummaryBox .r20-mini-copy span{font-size:12.5px!important;line-height:1.15!important;color:#567184!important;font-weight:700!important}
#mobileSummaryBox .r20-mini-copy b{font-size:21px!important;line-height:1!important;margin-top:2px!important}
#mobileSummaryBox .r20-mini-copy small{font-size:9px!important}
#mobileSummaryBox .r20-percent-card{padding:8px 10px!important;gap:9px!important;min-height:76px!important}
#mobileSummaryBox .r20-percent-ring{width:68px!important;height:68px!important;flex-basis:68px!important}
#mobileSummaryBox .r20-percent-inner{width:51px!important;height:51px!important;font-size:18px!important}
#mobileSummaryBox .r20-percent-copy{gap:1px!important}
#mobileSummaryBox .r20-percent-copy strong{font-size:14px!important;line-height:1.2!important}
#mobileSummaryBox .r20-percent-copy span{font-size:12px!important}
#mobileSummaryBox .r20-percent-copy small{display:none!important}
#mobileSummaryBox .r20-target-icon{width:34px!important;height:34px!important;flex-basis:34px!important}
#mobileSummaryBox .r20-group-grid .r20-mini-card{min-height:49px!important}
#mobileSummaryBox.r15-report-folded{padding-top:7px!important;padding-bottom:7px!important}
@media(max-width:355px){
 #mobileSummaryBox .r20-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #mobileSummaryBox .r20-mini-copy span{font-size:12px!important}
}
`;
let busy=false;
function records(w){
  try{return (w.TOVATI_PILOT?.records?.()||[]).filter(r=>r&&r.source==="הודעה");}catch{return[]}
}
function reportRows(w){
  let rows=records(w),dept=w.TOVATI_DAILY_REPORT?.department||"";
  if(dept)rows=rows.filter(r=>String(r.dept||"")===String(dept));
  return rows;
}
function patchReport(w,d){
  const box=d.getElementById("mobileSummaryBox");
  if(!box||!box.querySelector(".r20-main-card"))return;
  const rows=reportRows(w); if(!rows.length)return;
  const counts=Object.fromEntries(ORDER.map(k=>[k,0]));
  rows.forEach(r=>counts[norm(r.priority)]++);
  const total=rows.length,urgent=(counts["חירום"]||0)+(counts["דחוף"]||0),pct=total?100*urgent/total:0;
  const grid=box.querySelector(".r20-main-card .r20-mini-grid");
  if(grid){
    grid.innerHTML=ORDER.map(name=>`<article class="r20-mini-card is-${CLS[name]}"><div class="r20-mini-icon">${icon(CLS[name])}</div><div class="r20-mini-copy"><span>${esc(CODES[name]+" · "+name)}</span><b>${counts[name].toLocaleString("he-IL")}</b></div></article>`).join("");
  }
  const totalEl=box.querySelector(".r20-total-block strong"); if(totalEl)totalEl.textContent=total.toLocaleString("he-IL");
  const percent=box.querySelector(".r20-percent-card");
  if(percent){
    percent.style.setProperty("--r20-progress",pct.toFixed(1));
    const inner=percent.querySelector(".r20-percent-inner"); if(inner)inner.textContent=pct.toFixed(1)+"%";
    const span=percent.querySelector(".r20-percent-copy span"); if(span)span.textContent=urgent.toLocaleString("he-IL")+" מתוך "+total.toLocaleString("he-IL");
  }
  box.dataset.r21Priority="1";
}
function patchCards(d){
  d.querySelectorAll(".work-card .priority").forEach(el=>{
    const raw=(el.textContent||"").replace(/^.*?:\s*/,"").trim();
    const name=norm(raw),code=CODES[name];
    el.textContent="עדיפות SAP: "+code+" · "+name;
    const card=el.closest(".work-card");
    if(card){
      card.classList.remove("p-emergency","p-urgent","p-outage","p-regular","p-low","p-missing");
      card.classList.add({emergency:"p-emergency",urgent:"p-urgent",outage:"p-outage",regular:"p-regular",low:"p-low"}[CLS[name]]||"p-regular");
    }
  });
}
function apply(){
 if(busy)return;busy=true;
 try{
  const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return;
  if(!d.getElementById("r21CompactStyle")){const s=d.createElement("style");s.id="r21CompactStyle";s.textContent=css;d.head.appendChild(s);}
  patchReport(w,d);patchCards(d);
 }finally{busy=false}
}
function start(){
 const d=frame.contentDocument;if(!d)return;
 apply();
 const mo=new MutationObserver(()=>requestAnimationFrame(apply));
 mo.observe(d.documentElement,{subtree:true,childList:true,characterData:true});
 setInterval(apply,1500);
}
frame.addEventListener("load",()=>setTimeout(start,80));
})();