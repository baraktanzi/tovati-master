const MAINT_MANAGERS=new Set([
  'מנהל מחלקה',
  'ראש תחום',
  'ראש מדור',
  'מתכנן תובתי מחלקתי'
]);

const OPS_MANAGERS=new Set([
  'מנהל תפעול',
  'סגן מנהל תפעול',
  'מהנדס תפעול',
  'רכז תפעול',
  'תורן ראשי'
]);

export const CAPABILITIES=Object.freeze({
  DAILY_READ:'daily.read',
  OPERATIONS_PRIORITIZE:'operations.prioritize',
  PLANNING_READ:'planning.read',
  PLANNING_SCHEDULE:'planning.schedule',
  AUTO_PLANNING_MANAGE:'planning.auto.manage',
  PM_READ:'pm.read',
  PERMITS_READ:'permits.read',
  EXECUTION_WRITE:'execution.write',
  DASHBOARD_READ:'dashboard.read',
  ANNUAL_READ:'annual.read',
  ANNUAL_MANAGE:'annual.manage',
  OVERHAUL_READ:'overhaul.read',
  OVERHAUL_MANAGE:'overhaul.manage',
  PERSONAL_READ:'personal.read'
});

export function isActiveUser(user){
  return !!user&&user.active!==false;
}

export function isAdmin(user){
  return !!user&&(
    user.admin===true||
    user.isAdmin===true||
    ['admin','system-admin','מנהל מערכת'].includes(String(user.role||''))
  );
}

export function hasCapability(user,capability){
  if(isAdmin(user))return true;
  if(!isActiveUser(user))return false;

  const branch=String(user.branch||'');
  const role=String(user.role||'');

  switch(capability){
    case CAPABILITIES.DAILY_READ:
    case CAPABILITIES.PERSONAL_READ:
    case CAPABILITIES.PERMITS_READ:
      return true;

    case CAPABILITIES.OPERATIONS_PRIORITIZE:
      return branch==='operations';

    case CAPABILITIES.PLANNING_READ:
      return branch==='maintenance'||branch==='operations';

    case CAPABILITIES.PLANNING_SCHEDULE:
    case CAPABILITIES.EXECUTION_WRITE:
      return branch==='maintenance';

    case CAPABILITIES.AUTO_PLANNING_MANAGE:
      return branch==='operations'||MAINT_MANAGERS.has(role);

    case CAPABILITIES.PM_READ:
      return branch==='maintenance'||branch==='operations';

    case CAPABILITIES.DASHBOARD_READ:
      return branch==='operations'||MAINT_MANAGERS.has(role);

    case CAPABILITIES.ANNUAL_READ:
    case CAPABILITIES.OVERHAUL_READ:
      return branch==='maintenance'||branch==='operations';

    case CAPABILITIES.ANNUAL_MANAGE:
    case CAPABILITIES.OVERHAUL_MANAGE:
      return branch==='operations'||MAINT_MANAGERS.has(role)||OPS_MANAGERS.has(role);

    default:
      return false;
  }
}

export function requireCapability(user,capability,message='אין הרשאה לפעולה הזאת'){
  if(!hasCapability(user,capability)){
    const error=new Error(message);
    error.code='FORBIDDEN';
    error.capability=capability;
    throw error;
  }
  return true;
}

export function userScope(user){
  if(!isActiveUser(user)||isAdmin(user)||user.viewScope==='all'){
    return {all:true,departmentId:'',section:''};
  }
  if(user.branch!=='maintenance'){
    return {all:true,departmentId:'',section:''};
  }
  return {
    all:false,
    departmentId:String(user.dept||user.department_id||''),
    section:user.viewScope==='section'?String(user.section||''):''
  };
}

export function applyUserScope(user,filters={}){
  const scope=userScope(user);
  if(scope.all)return {...filters};
  return {
    ...filters,
    departmentId:scope.departmentId||filters.departmentId||'',
    section:scope.section||filters.section||''
  };
}
