// Read-only bridge used while screens are migrated from R24.
// It does not connect to any server and it does not alter source SAP/report data.

export function readR24Snapshot(){
  try{
    if(window.TOVATI_PILOT && typeof window.TOVATI_PILOT.state==='function'){
      const value=window.TOVATI_PILOT.state();
      return typeof structuredClone==='function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    }
  }catch(error){
    console.warn('TOVATI V2: unable to read public R24 state',error);
  }
  return null;
}

export function legacyAvailable(){
  return !!(window.TOVATI_PILOT && typeof window.TOVATI_PILOT.state==='function');
}

export function normalizeLegacyId(value){
  return String(value??'').trim();
}
