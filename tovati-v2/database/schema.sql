-- TOVATI V2 PostgreSQL schema for the future internal company server.
-- The browser will never connect directly to PostgreSQL.

create table if not exists departments(
  id text primary key,
  name text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists users(
  id text primary key,
  username text not null unique,
  display_name text not null,
  department_id text references departments(id),
  role text not null,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists notifications(
  id text primary key,
  source_id text unique,
  description text,
  equipment text,
  department_id text references departments(id),
  status text,
  priority text,
  source_payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists orders(
  id text primary key,
  source_id text unique,
  notification_id text references notifications(id),
  description text,
  equipment text,
  department_id text references departments(id),
  status text,
  priority text,
  planned_for date,
  source_payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists permits(
  id text primary key,
  source_id text unique,
  order_id text references orders(id),
  status text,
  valid_from timestamptz,
  valid_until timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists work_items(
  id text primary key,
  notification_id text references notifications(id),
  order_id text references orders(id),
  permit_id text references permits(id),
  department_id text references departments(id),
  title text,
  description text,
  operational_priority text,
  status text,
  planned_for timestamptz,
  assigned_user_id text references users(id),
  closed_at timestamptz,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists pm_tasks(
  id text primary key,
  source_id text unique,
  order_id text references orders(id),
  permit_id text references permits(id),
  department_id text references departments(id),
  title text,
  due_at timestamptz,
  completed_at timestamptz,
  status text,
  source_payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists jsa_assessments(
  id text primary key,
  work_item_id text references work_items(id),
  permit_id text references permits(id),
  status text not null,
  content jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by text references users(id),
  updated_at timestamptz not null default now()
);

create table if not exists ptp_documents(
  id text primary key,
  work_item_id text references work_items(id),
  permit_id text references permits(id),
  jsa_id text references jsa_assessments(id),
  status text not null,
  content jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by text references users(id),
  updated_at timestamptz not null default now()
);

create table if not exists work_assignments(
  id text primary key,
  work_item_id text not null references work_items(id),
  user_id text references users(id),
  planned_start timestamptz,
  planned_end timestamptz,
  status text,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists import_runs(
  id bigserial primary key,
  source_type text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_received integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_unchanged integer not null default 0,
  rows_failed integer not null default 0,
  status text not null,
  error_message text
);

create table if not exists audit_log(
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  user_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
