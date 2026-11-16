-- Run against a disposable PostgreSQL database with every migration applied.
begin;

insert into auth.users (id, email) values
  ('71000000-0000-4000-8000-000000000001', 'routine-owner@example.com'),
  ('71000000-0000-4000-8000-000000000002', 'routine-other@example.com');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into public.user_routine_checkins (user_id, routine_date, period, completed_step_ids)
  values (auth.uid(), '2026-11-05', 'am', array['cleanser', 'hydrator']);
update public.user_routine_checkins set completed_step_ids = array['cleanser']
  where user_id = auth.uid() and routine_date = '2026-11-05' and period = 'am';

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.user_routine_checkins) then
    raise exception 'A different account can read another account routine check-in';
  end if;
  update public.user_routine_checkins set completed_step_ids = array['treatment']
    where user_id = '71000000-0000-4000-8000-000000000001';
  if found then raise exception 'A different account can update another account routine check-in'; end if;
  begin
    insert into public.user_routine_checkins (user_id, routine_date, period)
      values ('71000000-0000-4000-8000-000000000001', '2026-11-05', 'pm');
    raise exception 'A different account can insert another account routine check-in';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.user_routine_checkins;
    raise exception 'Guest can read routine check-ins';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
