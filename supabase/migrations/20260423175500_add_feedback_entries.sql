create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) >= 3),
  page_path text,
  created_at timestamptz not null default now()
);

alter table public.feedback_entries enable row level security;

drop policy if exists "Allow public insert feedback entries" on public.feedback_entries;
create policy "Allow public insert feedback entries"
  on public.feedback_entries
  for insert
  to anon, authenticated
  with check (true);
