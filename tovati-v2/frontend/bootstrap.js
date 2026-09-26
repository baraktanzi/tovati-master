import { TOVATI_CONFIG } from './config/runtime-config.js';
import { getDataSource } from './core/data-source.js';
import { WorkRepository } from './core/repositories/work-repository.js';
import { RealtimeClient } from './core/realtime-client.js';

const source=getDataSource();
const repository=new WorkRepository(source);
const realtime=new RealtimeClient();

window.TOVATI_V2=Object.freeze({
  version:TOVATI_CONFIG.appVersion,
  mode:TOVATI_CONFIG.mode,
  config:TOVATI_CONFIG,
  data:source,
  work:repository,
  realtime
});

// In local mode connect() is intentionally a no-op.
realtime.connect();
window.dispatchEvent(new CustomEvent('tovati:v2-ready',{detail:{mode:TOVATI_CONFIG.mode,version:TOVATI_CONFIG.appVersion}}));
