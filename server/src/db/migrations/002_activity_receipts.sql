create table activity_receipts (
  activity_id integer primary key references activities (id),
  kind text not null check (kind in ('signed', 'nobody_present')),
  signer_name text,
  signer_document text,
  signature jsonb,
  recorded_by integer not null references users (id),
  created_at timestamptz not null default now(),
  constraint receipt_fields_match_kind check (
    (kind = 'signed' and signer_name is not null and signer_document is not null and signature is not null)
    or (kind = 'nobody_present' and signer_name is null and signer_document is null and signature is null)
  )
);
