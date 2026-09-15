-- db/migrations/0002_staff_permissions.sql
-- Additive: adds granular UI permissions to pos_staff and tightens who can
-- create/edit/delete staff rows (only a true admin, not every staff member).
begin;

alter table public.pos_staff add column permissions text[] not null default '{}';

drop policy if exists "pos_staff: admins manage" on public.pos_staff;

create policy "pos_staff: staff read" on public.pos_staff
  for select using (public.is_admin_or_staff());

create policy "pos_staff: admins insert" on public.pos_staff
  for insert with check (public.is_admin());

create policy "pos_staff: admins update" on public.pos_staff
  for update using (public.is_admin()) with check (public.is_admin());

create policy "pos_staff: admins delete" on public.pos_staff
  for delete using (public.is_admin());

commit;
