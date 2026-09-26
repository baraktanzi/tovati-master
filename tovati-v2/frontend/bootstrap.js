import { TOVATI_CONFIG } from './config/runtime-config.js';
import { getDataSource } from './core/data-source.js';
import { WorkRepository } from './core/repositories/work-repository.js';
import { RealtimeClient } from './core/realtime-client.js';
import { DailyMaintenanceController } from './modules/daily-maintenance/controller.js';
import { OperationsController } from './modules/operations/controller.js';
import { DepartmentPlanningController } from './modules/department-planning/controller.js';

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
    departmentPlanning:new DepartmentPlanningController(repository)
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
