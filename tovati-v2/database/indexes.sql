create index if not exists idx_notifications_department_status on notifications(department_id,status);
create index if not exists idx_notifications_priority on notifications(priority);
create index if not exists idx_notifications_updated on notifications(updated_at desc);

create index if not exists idx_orders_notification on orders(notification_id);
create index if not exists idx_orders_department_status on orders(department_id,status);
create index if not exists idx_orders_priority_planned on orders(priority,planned_for);
create index if not exists idx_orders_updated on orders(updated_at desc);

create index if not exists idx_permits_order on permits(order_id);
create index if not exists idx_permits_status_valid_until on permits(status,valid_until);

create index if not exists idx_work_items_department_status on work_items(department_id,status);
create index if not exists idx_work_items_priority_plan on work_items(operational_priority,planned_for);
create index if not exists idx_work_items_assigned_status on work_items(assigned_user_id,status);
create index if not exists idx_work_items_updated on work_items(updated_at desc);

create index if not exists idx_pm_due_status on pm_tasks(due_at,status);
create index if not exists idx_pm_department_status on pm_tasks(department_id,status);
create index if not exists idx_assignment_user_start on work_assignments(user_id,planned_start);
create index if not exists idx_import_runs_latest on import_runs(source_type,started_at desc);
create index if not exists idx_audit_entity on audit_log(entity_type,entity_id,created_at desc);
