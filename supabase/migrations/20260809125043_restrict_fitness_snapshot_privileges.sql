-- Make the Data API surface explicit even on projects that previously
-- auto-granted broad privileges to authenticated clients.
revoke all privileges
on table public.fitness_snapshots
from public, anon, authenticated;

grant select, insert, update
on table public.fitness_snapshots
to authenticated;
