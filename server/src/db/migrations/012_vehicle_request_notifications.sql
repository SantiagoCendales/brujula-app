alter table notifications alter column event_id drop not null;
alter table notifications add column vehicle_request_id integer references vehicle_requests (id);
alter table notifications add constraint notifications_one_source
  check ((event_id is not null) <> (vehicle_request_id is not null));
alter table notifications add constraint notifications_user_vehicle_request_unique
  unique (user_id, vehicle_request_id);
