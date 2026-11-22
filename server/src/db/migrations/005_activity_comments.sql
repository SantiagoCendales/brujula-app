create table activity_comments (
  id integer generated always as identity primary key,
  activity_id integer not null references activities (id),
  author_id integer not null references users (id),
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index activity_comments_activity_idx on activity_comments (activity_id, created_at, id);
