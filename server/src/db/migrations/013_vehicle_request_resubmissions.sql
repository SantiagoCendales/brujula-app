alter table vehicle_requests add column resubmitted_from_id integer references vehicle_requests (id);
create unique index vehicle_requests_resubmitted_from_idx
  on vehicle_requests (resubmitted_from_id) where resubmitted_from_id is not null;
