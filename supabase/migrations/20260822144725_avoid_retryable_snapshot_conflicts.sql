-- Keep optimistic-concurrency conflicts as non-retryable application errors.
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
        using detail = 'The cloud snapshot was created or changed by another client.';
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
        using detail = format(
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
