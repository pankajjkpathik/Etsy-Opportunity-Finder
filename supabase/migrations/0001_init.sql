-- Users (mirror of Firebase Auth)
create table users (
  id uuid primary key,
  email text unique not null,
  display_name text,
  country text,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  niche text,
  created_at timestamptz not null default now()
);

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  query text not null,
  type text not null,
  params jsonb,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  query text not null,
  score numeric(5,2) not null,
  score_breakdown jsonb not null,
  risk_level text not null,
  confidence numeric(3,2) not null,
  data_sources text[] not null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

create table keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  term text not null,
  cluster_id uuid,
  intent text,
  source text,
  created_at timestamptz not null default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  shop_handle text not null,
  shop_id_etsy text,
  snapshot jsonb,
  gap_analysis jsonb,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now()
);

create table listings_generated (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  inputs jsonb not null,
  outputs jsonb not null,
  model text,
  tokens_used int,
  created_at timestamptz not null default now()
);

create table trend_snapshots (
  id bigserial primary key,
  query text not null,
  taken_at date not null,
  top_listings jsonb,
  metrics jsonb,
  unique (query, taken_at)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text,
  title text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade unique,
  stripe_subscription_id text unique,
  plan text,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  user_id uuid,
  action text,
  resource text,
  metadata jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index on opportunities(user_id, created_at desc);
create index on saved_searches(user_id, type);
create index on trend_snapshots(query, taken_at desc);
create index on keywords(user_id, cluster_id);

-- RLS
alter table projects enable row level security;
alter table saved_searches enable row level security;
alter table opportunities enable row level security;
alter table keywords enable row level security;
alter table competitors enable row level security;
alter table listings_generated enable row level security;
alter table reports enable row level security;
alter table subscriptions enable row level security;

create policy "own rows" on projects for all using (user_id = auth.uid()::uuid);
create policy "own rows" on saved_searches for all using (user_id = auth.uid()::uuid);
create policy "own rows" on opportunities for all using (user_id = auth.uid()::uuid);
create policy "own rows" on keywords for all using (user_id = auth.uid()::uuid);
create policy "own rows" on competitors for all using (user_id = auth.uid()::uuid);
create policy "own rows" on listings_generated for all using (user_id = auth.uid()::uuid);
create policy "own rows" on reports for all using (user_id = auth.uid()::uuid);
create policy "own rows" on subscriptions for all using (user_id = auth.uid()::uuid);
