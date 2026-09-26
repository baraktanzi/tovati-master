# Offline / temporary network recovery

This is prepared for the future company-server mode and is not enabled in the current local pilot.

## Goal
A short internal-network outage must not silently lose a user mutation or overwrite a newer server value.

## Rules
1. Every mutation has an `Idempotency-Key`.
2. Pending mutations may be stored in the browser outbox without authentication secrets.
3. Reconnect retries the exact same mutation and idempotency key.
4. The server re-checks authorization and `If-Match` / version on every retry.
5. HTTP 409 moves the mutation to **conflict**. It is never auto-overwritten.
6. Network errors remain **pending** and are retried later in original order.
7. The UI distinguishes:
   - saved on server;
   - pending synchronization;
   - conflict requiring refresh/review.
8. Work completion and safety-related approvals must not be displayed as final/approved until the internal server confirms the transaction.
9. The outbox is not a replacement for the database or audit log.
10. Authentication/session tokens are never persisted inside outbox records.

## Reconnect sequence
```
browser reconnects
  -> fetch current session
  -> flush pending mutations in creation order
  -> server validates version
     -> success: remove from outbox
     -> conflict: keep as conflict and notify user
     -> unavailable: stop and retry later
  -> refresh affected entities
  -> resume realtime subscription
```
