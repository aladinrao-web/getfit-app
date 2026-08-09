create table if not exists public.fitness_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  schema_version integer not null check (schema_version > 0),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.fitness_snapshots enable row level security;

revoke all on table public.fitness_snapshots from public, anon;
grant select, insert, update on table public.fitness_snapshots to authenticated;

drop policy if exists "Users can read their own fitness snapshot" on public.fitness_snapshots;
create policy "Users can read their own fitness snapshot"
on public.fitness_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own fitness snapshot" on public.fitness_snapshots;
create policy "Users can create their own fitness snapshot"
on public.fitness_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own fitness snapshot" on public.fitness_snapshots;
create policy "Users can update their own fitness snapshot"
on public.fitness_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.save_fitness_snapshot(
  p_expected_revision bigint,
  p_state jsonb,
  p_schema_version integer
)
returns table (revision bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_current_revision bigint;
  v_revision bigint;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_expected_revision < 0 then
    raise exception 'invalid_expected_revision' using errcode = '22023';
  end if;

  if p_schema_version < 1 then
    raise exception 'invalid_schema_version' using errcode = '22023';
  end if;

  select snapshot.revision
  into v_current_revision
  from public.fitness_snapshots as snapshot
  where snapshot.user_id = v_user_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'fitness_snapshot_conflict'
        using errcode = '40001',
              detail = 'The cloud snapshot was created or changed by another client.';
    end if;

    insert into public.fitness_snapshots (
      user_id,
      state,
      schema_version,
      revision,
      updated_at
    )
    values (
      v_user_id,
      p_state,
      p_schema_version,
      1,
      now()
    )
    returning fitness_snapshots.revision, fitness_snapshots.updated_at
    into v_revision, v_updated_at;
  else
    if v_current_revision <> p_expected_revision then
      raise exception 'fitness_snapshot_conflict'
        using errcode = '40001',
              detail = format(
                'Expected revision %s but the cloud snapshot is at revision %s.',
                p_expected_revision,
                v_current_revision
              );
    end if;

    update public.fitness_snapshots as snapshot
    set state = p_state,
        schema_version = p_schema_version,
        revision = snapshot.revision + 1,
        updated_at = now()
    where snapshot.user_id = v_user_id
    returning snapshot.revision, snapshot.updated_at
    into v_revision, v_updated_at;
  end if;

  return query
  select v_revision, v_updated_at;
end;
$function$;

revoke all on function public.save_fitness_snapshot(bigint, jsonb, integer) from public, anon;
grant execute on function public.save_fitness_snapshot(bigint, jsonb, integer) to authenticated;
