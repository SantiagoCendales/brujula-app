create table role_permissions (
  role user_role not null,
  permission text not null,
  enabled boolean not null default true,
  primary key (role, permission)
);

insert into role_permissions (role, permission) values
  ('client', 'create_activity'),
  ('coordinator', 'create_activity'), ('admin', 'create_activity'),
  ('coordinator', 'create_vehicle'), ('admin', 'create_vehicle'),
  ('coordinator', 'assign_technician'), ('admin', 'assign_technician'),
  ('technician', 'record_field_work'), ('technician', 'finish_report'),
  ('cec', 'review_report'), ('admin', 'review_report'),
  ('coordinator', 'deliver_report'), ('admin', 'deliver_report');

create table permission_changes (
  id integer generated always as identity primary key,
  role user_role not null,
  permission text not null,
  enabled boolean not null,
  changed_by integer not null references users (id),
  created_at timestamptz not null default now()
);
