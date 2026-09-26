# TOVATI V2 – architecture

This branch prepares TOVATI for a future company-owned server while leaving the active R24 production build unchanged.

- Default runtime is local; no server connection.
- No external-cloud dependency is required by V2.
- Future internal mode uses same-origin /api/v1 and /ws.
- UI modules use a DataSource adapter instead of knowing where data is stored.
- PostgreSQL, API, realtime and 15-minute import contracts are prepared in advance.
- Lists must be paged/virtualized; clients never download the whole database.
- R24 remains the reference until each module is migrated and tested.
