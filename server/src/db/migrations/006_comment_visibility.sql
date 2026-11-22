alter table activity_comments
  add column visibility text not null default 'public'
  check (visibility in ('public', 'internal'));
