create table notifications (
  id integer generated always as identity primary key,
  user_id integer not null references users (id),
  event_id integer not null references activity_events (id),
  read_at timestamptz,
  unique (user_id, event_id)
);

create index notifications_user_id_idx on notifications (user_id, id desc);
