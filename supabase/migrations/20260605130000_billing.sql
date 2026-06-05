-- Phase 4: 課金プラン管理 + AI 使用量カウント
--
-- profiles: ユーザーごとのプラン状態 + Stripe IDs
-- ai_usage_logs: AI分析の実行ログ(月N回ゲート用)
--
-- どちらも RLS で「自分のだけ SELECT」、書き込みは service_role (webhook/API) のみ

-- updated_at を自動更新する関数(既にあれば置き換え)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. profiles: 1 user に 1 行
-- ============================================================
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- 新規ユーザー作成時に自動で profiles 行を作るトリガー
create or replace function ensure_profile()
returns trigger as $$
begin
  insert into profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists ensure_profile_on_user_create on auth.users;
create trigger ensure_profile_on_user_create
  after insert on auth.users
  for each row execute function ensure_profile();

-- 既存ユーザーぶんを遡って作成(あなた自身のアカウントぶん)
insert into profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- 2. ai_usage_logs: 個別の AI 分析実行ログ
-- ============================================================
create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  input_tokens int,
  output_tokens int
);

create index if not exists ai_usage_logs_user_created_idx
  on ai_usage_logs (user_id, created_at desc);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table profiles enable row level security;
alter table ai_usage_logs enable row level security;

-- profiles: 自分のだけ SELECT。INSERT/UPDATE は service_role 経由のみ
drop policy if exists "users read own profile" on profiles;
create policy "users read own profile"
  on profiles for select
  using (auth.uid() = user_id);

-- ai_usage_logs: 自分のだけ SELECT。INSERT は service_role 経由のみ
drop policy if exists "users read own ai usage" on ai_usage_logs;
create policy "users read own ai usage"
  on ai_usage_logs for select
  using (auth.uid() = user_id);
