-- stack_items: ユーザーが飲んでるサプリの記録
create table public.stack_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  dosage text,
  timing text[],
  source text,
  kw text,
  notes text,
  is_active boolean not null default true,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stack_items_user_id_idx on public.stack_items(user_id);
create index stack_items_added_at_idx on public.stack_items(added_at desc);

-- Row Level Security
alter table public.stack_items enable row level security;

create policy "Users can view their own stack items"
  on public.stack_items for select using (auth.uid() = user_id);

create policy "Users can insert their own stack items"
  on public.stack_items for insert with check (auth.uid() = user_id);

create policy "Users can update their own stack items"
  on public.stack_items for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own stack items"
  on public.stack_items for delete using (auth.uid() = user_id);

-- updated_at 自動更新
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger stack_items_updated_at
before update on public.stack_items
for each row execute function update_updated_at_column();
