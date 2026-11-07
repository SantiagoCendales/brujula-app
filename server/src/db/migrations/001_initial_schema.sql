create type user_role as enum ('admin', 'coordinator', 'technician', 'cec', 'client');

create type activity_status as enum (
  'requested', 'assigned', 'on_site', 'report_ready', 'validated', 'returned', 'delivered'
);

create type photo_category as enum ('plate', 'odometer', 'issue_found', 'issue_fixed', 'other');

create table companies (
  id integer generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table users (
  id integer generated always as identity primary key,
  company_id integer references companies (id),
  name text not null,
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  role user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Clients belong to a company; internal staff does not.
  constraint users_company_matches_role check ((role = 'client') = (company_id is not null))
);

create table vehicles (
  id integer generated always as identity primary key,
  company_id integer not null references companies (id),
  plate text not null unique check (plate = upper(plate) and length(plate) > 0),
  make text not null default '',
  model text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  -- Target of the composite foreign key in activities (see below).
  unique (id, company_id)
);

create table activities (
  id integer generated always as identity primary key,
  company_id integer not null references companies (id),
  vehicle_id integer not null,
  type text not null,
  description text not null default '',
  status activity_status not null default 'requested',
  created_by integer not null references users (id),
  -- Who has it in their hands right now; cleared when the technician marks "finished".
  technician_id integer references users (id),
  -- Who performed it (marked "arrived"); never changes. It is the evidence of who went.
  performed_by integer references users (id),
  scheduled_for timestamptz,
  arrived_at timestamptz,
  arrival_lat double precision check (arrival_lat between -90 and 90),
  arrival_lng double precision check (arrival_lng between -180 and 180),
  arrival_accuracy_m double precision check (arrival_accuracy_m >= 0),
  finished_at timestamptz,
  finish_lat double precision check (finish_lat between -90 and 90),
  finish_lng double precision check (finish_lng between -180 and 180),
  finish_accuracy_m double precision check (finish_accuracy_m >= 0),
  report text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enforces in the database that the vehicle belongs to the same company as the activity.
  foreign key (vehicle_id, company_id) references vehicles (id, company_id)
);

create index activities_company_idx on activities (company_id);
create index activities_vehicle_idx on activities (vehicle_id);
create index activities_technician_idx on activities (technician_id);
create index activities_performed_by_idx on activities (performed_by);
create index activities_status_idx on activities (status);

-- No cascade delete: an activity cannot be deleted while it has photos,
-- so the files are removed from disk first and never left orphaned.
create table photos (
  id integer generated always as identity primary key,
  activity_id integer not null references activities (id),
  category photo_category not null,
  storage_key text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  uploaded_by integer not null references users (id),
  uploaded_at timestamptz not null default now()
);

create index photos_activity_idx on photos (activity_id);

-- Audit log: rows are only inserted, never updated or deleted.
create table activity_events (
  id integer generated always as identity primary key,
  activity_id integer not null references activities (id),
  user_id integer not null references users (id),
  type text not null,
  from_status activity_status,
  to_status activity_status,
  note text,
  data jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_activity_idx on activity_events (activity_id);
