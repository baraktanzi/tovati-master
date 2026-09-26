# Realtime contract

Future endpoint: /ws on the same internal company hostname.

Example event:
```json
{
  "topic":"orders.changed",
  "entity":"orders",
  "id":"450123",
  "action":"updated",
  "version":18,
  "changedFields":["priority","status"],
  "serverTime":"2026-09-26T18:00:00Z"
}
```

Topics:
- notifications.changed
- orders.changed
- permits.changed
- work-items.changed
- pm-tasks.changed
- assignments.changed
- jsa.changed
- ptp.changed
- import.completed
- alerts.changed

Rule: clients update/invalidate only affected records and queries. Never broadcast the complete database after a small change.
