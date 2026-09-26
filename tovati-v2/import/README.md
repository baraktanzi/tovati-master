# 15-minute report import

This process will run only on the future internal company server. Browsers never import reports separately.

Flow:
1. Read notification/order/permit/PM reports.
2. Validate into staging.
3. Normalize source identifiers and timestamps.
4. Compare with current rows.
5. Insert new rows and update only changed rows.
6. Commit one database transaction.
7. Record statistics in import_runs.
8. Publish compact realtime events only for changed entities.

Requirements:
- idempotent processing;
- one active importer per source;
- rollback on failure;
- batching for large files;
- unchanged rows are not rewritten;
- a failed report cannot damage the last valid state.
