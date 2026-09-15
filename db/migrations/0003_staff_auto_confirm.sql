-- db/migrations/0003_staff_auto_confirm.sql
-- Additive: auto-confirm email ONLY for accounts that get a pos_staff row
-- (i.e. accounts created through the admin "Add Staff" flow), so a newly
-- created operator can sign in immediately without checking their inbox.
-- The website's own customer signup confirmation behavior is untouched -
-- this trigger only fires on INSERT into pos_staff, never on auth.users
-- directly, so ordinary customer signups are not affected.
begin;

create or replace function public.auto_confirm_staff_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.user_id;
  return new;
end;
$$;

create trigger trg_pos_staff_auto_confirm
after insert on public.pos_staff
for each row execute function public.auto_confirm_staff_email();

commit;
