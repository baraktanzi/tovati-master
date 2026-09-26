# TOVATI V2 migration status

## Safety state
- Production branch `main`: unchanged by V2 work.
- Migration branch: `architecture-v2-local`.
- No external backend is injected into the V2 build.
- Realtime is disabled.
- Future target remains a company-owned same-origin server: `/api/v1` + `/ws`.
- R24 remains available as rollback/reference during migration.

## Performance work completed
- Shared modular `WorkCard`.
- Work-card lists use paging (30 rendered initially in V2 previews).
- Offscreen cards use `content-visibility:auto`.
- Department day-planner is a separate component.
- Large embedded seed was split from the monolithic HTML:
  - 5,346 preventive-maintenance rows → separate static seed file.
  - 267 worker photos → separate static seed file.
- Validation against the current R24 source predicts index.html dropping from about 10.9 MB to about 3.0 MB (~72% reduction).
- Seed assets use content hashes for cache versioning.
- Build fails if the legacy external cloud backend is injected.
- `npm run test:v2` performs build smoke checks.

## Modularized application areas
- Daily maintenance
- Operations prioritization
- Department planning
- Preventive maintenance
- Permits / JSA / PTP
- Work execution: delays, time entries, completion
- Annual plans
- Unit overhauls
- Management dashboard
- Personal area

## Shared infrastructure
- Local IndexedDB DataSource.
- R24 compatibility DataSource.
- Future internal HTTP DataSource.
- Future internal WebSocket client.
- Shared filtering behavior between R24 and IndexedDB modes.
- WorkRepository for linked work/notification/order/permit records.
- PostgreSQL schema and performance indexes.
- Internal API contract.
- Realtime delta-event contract.
- 15-minute server-side report import design.

## R24 compatibility writes currently bridged
- Operational priority changes.
- Assignment create/update/cancel/status.
- Delays.
- Time entries.
- Work completion.
- Morning routing/review API.

## One-time local migration
R24 data can now be copied into V2 IndexedDB with:

`?v2migrate=1`

Collections migrated:
- departments
- users
- notifications
- orders
- permits
- work-items
- pm-tasks
- assignments
- work-delays
- time-entries
- work-closures
- priority-publications
- personal-tasks
- alerts

The migration writes a `system-meta / r24-migration` record containing the source revision and counts.

## Standalone V2
After migration, the local V2 application is available under:

`/architecture-v2/standalone/`

It reads IndexedDB directly and does not require R24 or a server for normal local testing.

Standalone launcher includes:
1. Daily maintenance
2. Operations and prioritization
3. Department planning
4. Preventive maintenance
5. Permits / JSA / PTP
6. Management dashboard
7. Personal area
8. Annual plans
9. Unit overhauls

## Future company-server rules already prepared
- Same-origin internal API and WebSocket only.
- PostgreSQL is never accessed directly from the browser.
- Default page size 50; maximum 200.
- Optimistic version checks prevent silent overwrites.
- Daily planning has a dedicated server-side query.
- Work completion has a transactional endpoint.
- Heavy dashboard aggregation belongs on the server/database.
- Report import runs once on the server every 15 minutes and publishes only changed entities.

## Next steps
1. Build standalone local login/role enforcement beyond the current user selector.
2. Move alerts/personal-task write actions fully into V2.
3. Add annual-plan and overhaul editing screens.
4. Add local performance benchmark with large generated datasets.
5. Add full conflict/offline-recovery behavior in local simulation.
6. Compare V2 behavior against R24 screen-by-screen.
7. Only after company infrastructure is provisioned: implement the internal API/PostgreSQL service and enable realtime.
