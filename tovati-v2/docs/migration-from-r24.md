# Safe migration from R24

R24 remains the reference source and the production branch is not switched during modularization.

## Phase 1 – architecture
Local-first DataSource, module registry, internal-server API/realtime contracts, PostgreSQL schema and indexes.

## Phase 2 – modular local application
Extract in this order:
1. daily maintenance + operations prioritization;
2. department planning;
3. preventive maintenance;
4. permits + JSA + PTP;
5. annual plans + unit overhauls;
6. management dashboard + personal area.

Every extracted module must behave like R24 before moving to the next one.

## Phase 3 – company server
IT provisions the internal application server and PostgreSQL. Then runtime mode changes from local to company-server and realtime is enabled.

## Phase 4 – load tests
Before pilot:
- 100+ simultaneous sessions;
- report import while users edit;
- two users editing the same card;
- temporary network loss and reconnect;
- large lists with paging;
- database backup/restore drill.

## Phase 5 – controlled pilot
Small group first, rollback path to R24 retained until acceptance.
