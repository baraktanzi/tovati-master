# TOVATI internal API contract

Future base path: `/api/v1` on the same internal company hostname as the frontend.

## Collections
notifications, orders, permits, work-items, pm-tasks, assignments, jsa, ptp, users, departments.

## Paging
GET /api/v1/{collection}?offset=0&limit=50
Maximum limit: 200.

## Single entity
GET /api/v1/{collection}/{id}

## Save
PUT /api/v1/{collection}/{id}
Headers:
- If-Match: current version
- Idempotency-Key: unique operation ID

A stale edit returns HTTP 409 rather than silently overwriting another user's change.

## Delete
DELETE /api/v1/{collection}/{id}

## Bulk import/upsert
POST /api/v1/{collection}/bulk
Used by server-side services only; ordinary screens should use paged queries.

## Import state
GET /api/v1/imports/status

## Health
GET /api/v1/health

The API implementation will live on the company server. No external endpoint is hard-coded into the frontend.


## Management dashboard
GET /api/v1/dashboard/kpis

Optional query: departmentId, from, to.

The internal server performs aggregation in PostgreSQL and returns compact KPI totals/groupings. The production dashboard must not download all work rows merely to calculate totals in the browser.


## Department planning
GET /api/v1/planning/day

Query:
- date
- departmentId
- section
- workerId
- search
- offset
- limit

The company server returns the selected day's assignments plus a paged candidate backlog. Filtering and exclusion of already-assigned work happen in PostgreSQL/server logic, not by downloading all work items to the browser.

## Complete work transaction
POST /api/v1/work-items/{id}/complete

Body:
```json
{
  "summary": "work completion summary",
  "permitChecked": true,
  "userId": "employee-id",
  "version": 12
}
```

The internal server completes this as one transaction:
1. validate authorization and optimistic version;
2. create/update the work closure;
3. mark the work item completed;
4. close active assignments for the work item;
5. resolve local delays according to the approved business rule;
6. write the audit log;
7. commit;
8. publish one compact realtime change event.

A partial completion is never committed.
