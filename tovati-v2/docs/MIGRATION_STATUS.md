# TOVATI V2 migration status

## Safety state
- Production branch `main`: unchanged by V2 work.
- Migration branch: `architecture-v2-local`.
- Runtime mode: `legacy-local`.
- External cloud sync: not injected.
- Realtime: disabled.
- Future server target: company-owned same-origin `/api/v1` + `/ws`.

## Modularized
- Daily maintenance domain + controller
- Operations prioritization domain + controller
- Department planning domain + controller
- Preventive maintenance domain + controller
- Permits / JSA / PTP domain + controller
- Annual plans controller
- Unit overhauls controller
- Management dashboard controller
- Personal area controller
- Shared WorkRepository
- R24 compatibility bridge
- Local IndexedDB data source
- Future internal HTTP data source
- Future internal realtime client
- PostgreSQL schema + performance indexes
- 15-minute report-import contract
- Internal API + realtime contracts

## R24 write operations currently bridged
- Operational priority changes
- Assignment create/update
- Assignment cancel
- Assignment status
- Work completion
- Morning routing/review API is exposed by the bridge

## Opt-in preview screens
The standard R24 screen remains the default. On a build of this branch, modular previews can be opened with:
- `?v2module=daily-maintenance`
- `?v2module=operations`
- `?v2module=department-planning`
- `?v2module=preventive-maintenance`
- `?v2module=permits-jsa-ptp`
- `?v2module=management-dashboard`

## Next migration steps
1. Move the real R24 visual components for daily maintenance into V2 shared components.
2. Replace legacy card rendering with a virtualized/paged work-card list.
3. Move department calendar rendering and editing into the V2 planning screen.
4. Add local IndexedDB migration for mutable data after behavior comparison.
5. Migrate remaining writes (delays, hours, closures, personal tasks, alerts).
6. Performance test locally with large generated datasets.
7. Only after company infrastructure exists: implement internal server API/PostgreSQL and enable realtime.
