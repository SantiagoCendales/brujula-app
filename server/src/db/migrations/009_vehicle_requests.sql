create type vehicle_request_status as enum ('pending', 'approved', 'rejected');

-- A client asks for a service on a plate that is not in its fleet yet. Staff validate it: approving creates
-- the vehicle and the service activity from these fields.
create table vehicle_requests (
  id integer generated always as identity primary key,
  company_id integer not null references companies (id),
  requested_by integer not null references users (id),
  plate text not null check (plate = upper(plate) and length(plate) > 0),
  make text not null default '',
  model text not null default '',
  vin text,
  year integer,
  color text,
  type text not null,
  description text not null default '',
  location text not null,
  scheduled_for timestamptz not null,
  status vehicle_request_status not null default 'pending',
  review_note text,
  reviewed_by integer references users (id),
  reviewed_at timestamptz,
  vehicle_id integer references vehicles (id),
  activity_id integer references activities (id),
  created_at timestamptz not null default now()
);

-- Per company, so a client never learns that another company already asked for (or owns) a plate.
create unique index vehicle_requests_pending_plate_idx on vehicle_requests (company_id, plate) where status = 'pending';
create index vehicle_requests_company_idx on vehicle_requests (company_id, id desc);

alter table activities add column location text;
