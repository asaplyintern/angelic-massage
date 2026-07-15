create extension if not exists btree_gist;

create table if not exists services (
  id text primary key,
  name text not null,
  category text not null,
  description text default '',
  image text default '',
  popular boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_prices (
  id bigint generated always as identity primary key,
  service_id text not null references services(id) on delete cascade,
  duration text not null,
  duration_minutes integer not null,
  price integer not null,
  sort_order integer not null default 0
);

create unique index if not exists idx_service_prices_unique
  on service_prices (service_id, duration);

create table if not exists appointments (
  id bigint generated always as identity primary key,
  customer_name text not null,
  email text not null,
  phone text not null,
  service_id text not null references services(id),
  service_name text not null,
  duration text not null,
  duration_minutes integer not null,
  location text not null,
  balcony boolean not null default false,
  appointment_start timestamp not null,
  appointment_end timestamp not null,
  notes text default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'complete')),
  email_reminder_sent_at timestamptz,
  sms_reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (appointment_end > appointment_start)
);

alter table appointments
  drop constraint if exists appointments_no_overlap;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tsrange(appointment_start, appointment_end, '[)') with &&
  )
  where (status <> 'cancelled');

create index if not exists idx_appointments_start on appointments (appointment_start);
create index if not exists idx_appointments_customer on appointments (email, phone, customer_name);
create index if not exists idx_appointments_status on appointments (status);

create table if not exists working_hours (
  weekday integer primary key check (weekday between 0 and 6),
  open_time time,
  close_time time,
  closed boolean not null default false
);

create table if not exists blocked_dates (
  day date primary key,
  reason text default ''
);

alter table services enable row level security;
alter table service_prices enable row level security;
alter table appointments enable row level security;
alter table working_hours enable row level security;
alter table blocked_dates enable row level security;

insert into services (id, name, category, description, image, popular, sort_order)
values
  ('blend', 'Blend', 'Relaxation Massage with Deep Tissue', 'Relaxation massage with deeper pressure where needed.', '/assets/blend-massage.jpg', true, 1),
  ('soft-touch', 'Soft Touch', 'Relaxation Massage', 'Gentle relaxation massage.', '/assets/soft-touch-neck.jpg', false, 2),
  ('deep-tissue', 'Deep Tissue', 'Therapeutic Massage', 'Focused pressure for tight muscles.', '/assets/deep-tissue-back.jpg', false, 3),
  ('hot-stone', 'Hot Stone Therapy', 'Stone Therapy', 'Warm stone massage.', '/assets/hot-stones-back.jpg', false, 4)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image = excluded.image,
  popular = excluded.popular,
  sort_order = excluded.sort_order;

insert into service_prices (service_id, duration, duration_minutes, price, sort_order)
values
  ('blend', '30 minutes', 30, 80, 1),
  ('blend', '1 hour', 60, 120, 2),
  ('blend', '90 minutes', 90, 160, 3),
  ('blend', '2 hours', 120, 220, 4),
  ('soft-touch', '30 minutes', 30, 80, 1),
  ('soft-touch', '1 hour', 60, 120, 2),
  ('soft-touch', '90 minutes', 90, 160, 3),
  ('soft-touch', '2 hours', 120, 220, 4),
  ('deep-tissue', '30 minutes', 30, 80, 1),
  ('deep-tissue', '1 hour', 60, 120, 2),
  ('deep-tissue', '90 minutes', 90, 160, 3),
  ('deep-tissue', '2 hours', 120, 220, 4),
  ('hot-stone', '1 hour', 60, 150, 1),
  ('hot-stone', '90 minutes', 90, 190, 2),
  ('hot-stone', '2 hours', 120, 250, 3)
on conflict (service_id, duration) do update set
  duration_minutes = excluded.duration_minutes,
  price = excluded.price,
  sort_order = excluded.sort_order;

insert into working_hours (weekday, open_time, close_time, closed)
values
  (0, null, null, true),
  (1, '06:00', '19:00', false),
  (2, '06:00', '19:00', false),
  (3, '06:00', '19:00', false),
  (4, '06:00', '19:00', false),
  (5, '06:00', '19:00', false),
  (6, '10:00', '18:00', false)
on conflict (weekday) do update set
  open_time = excluded.open_time,
  close_time = excluded.close_time,
  closed = excluded.closed;
