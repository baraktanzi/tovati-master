# TOVATI V2

Target architecture for about 100 concurrent users with immediate synchronization and 15-minute report ingestion.

## Now
Runs in local mode using IndexedDB. No external or internal server connection is attempted.

## Later
Company IT can host the application server and PostgreSQL inside the company network. The frontend already expects:
- REST: /api/v1
- Realtime: /ws

Switching to the company server is a runtime configuration change plus implementation of the prepared server contract.

## Structure
- frontend/ – modules and client adapters
- database/ – PostgreSQL schema and indexes
- server-contract/ – API and realtime contracts
- import/ – 15-minute report synchronization design
- docs/ – deployment and migration guidance
