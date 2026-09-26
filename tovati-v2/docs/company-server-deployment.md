# Company-hosted TOVATI topology

No external application/data service is required by this design.

```
~100 browsers
      |
      v
Company internal HTTPS / reverse proxy
      |
      +---- /              static frontend
      +---- /api/v1        internal TOVATI application service
      +---- /ws            internal WebSocket realtime service
                                |
                                v
                         PostgreSQL server
                                ^
                                |
                    report importer every 15 min
                                |
                         SAP / report files
```

## Rules
- One company-controlled internal hostname.
- Database credentials exist only on the application server.
- Connection pooling between app server and PostgreSQL.
- API paging: 50 rows default, 200 maximum.
- Realtime sends deltas only, never complete datasets.
- Optimistic version checks prevent silent overwrite when two users edit the same card.
- Central audit log for important changes.
- Health checks, automatic service restart, logs, backups and monitoring are company-IT responsibilities.

The frontend is intentionally server-neutral. Moving from local mode to the company server should not require redesigning screens.
