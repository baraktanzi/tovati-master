export const TOVATI_CONFIG=Object.freeze({
  mode:'local', // local | company-server
  apiBase:'/api/v1',
  realtimePath:'/ws',
  realtimeEnabled:false,
  pageSize:50,
  maxPageSize:200,
  queryCacheMs:15000,
  reportImportMinutes:15,
  requestTimeoutMs:10000,
  appVersion:'2.0-architecture'
});
