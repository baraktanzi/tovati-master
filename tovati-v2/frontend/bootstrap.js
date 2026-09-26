import { TOVATI_CONFIG } from './config/runtime-config.js';
import { getDataSource } from './core/data-source.js';
import { WorkRepository } from './core/repositories/work-repository.js';
import { RealtimeClient } from './core/realtime-client.js';
import { DailyMaintenanceController } from './modules/daily-maintenance/controller.js';
import { OperationsController } from './modules/operations/controller.js';
import { DepartmentPlanningController } from './modules/department-planning/controller.js';
import { PreventiveMaintenanceController } from './modules/preventive-maintenance/controller.js';
import { PermitSafetyController } from './modules/permits-jsa-ptp/controller.js';
import { AnnualPlansController } from './modules/annual-plans/controller.js';
import { UnitOverhaulsController } from './modules/unit-overhauls/controller.js';
import { ManagementDashboardController } from './modules/management-dashboard/controller.js';
import { PersonalAreaController } from './modules/personal-area/controller.js';

const source=getDataSource();
const repository=new WorkRepository(source);
const realtime=new RealtimeClient();

const api={
  version:TOVATI_CONFIG.appVersion,
  mode:TOVATI_CONFIG.mode,
  config:TOVATI_CONFIG,
  data:source,
  work:repository,
  realtime,
  modules:{
    dailyMaintenance:new DailyMaintenanceController(repository),
    operations:new OperationsController(repository),
    departmentPlanning:new DepartmentPlanningController(repository),
    preventiveMaintenance:new PreventiveMaintenanceController(repository),
    permitSafety:new PermitSafetyController(repository),
    annualPlans:new AnnualPlansController(source),
    unitOverhauls:new UnitOverhaulsController(source),
    managementDashboard:new ManagementDashboardController(source),
    personalArea:new PersonalAreaController(source)
  },
  legacy:{
    bridge:window.TOVATI_R24_BRIDGE||null,
    revision:()=>window.TOVATI_R24_BRIDGE?.revision?.()||0,
    user:()=>window.TOVATI_R24_BRIDGE?.currentUser?.()||null
  }
};

window.TOVATI_V2=Object.freeze(api);

// In legacy-local and local modes connect() is intentionally a no-op.
realtime.connect();

window.dispatchEvent(new CustomEvent('tovati:v2-ready',{
  detail:{mode:TOVATI_CONFIG.mode,version:TOVATI_CONFIG.appVersion}
}));

const previewModule=new URLSearchParams(location.search).get('v2module');
if(previewModule){
  import('./preview/module-preview.js')
    .then(m=>m.mountV2Preview(previewModule,api))
    .catch(error=>console.error('TOVATI V2 preview failed',error));
}
