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
