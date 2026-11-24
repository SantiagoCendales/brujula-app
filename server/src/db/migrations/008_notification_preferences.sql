create table muted_notification_types (
  user_id integer not null references users (id),
  type text not null,
  primary key (user_id, type)
);
