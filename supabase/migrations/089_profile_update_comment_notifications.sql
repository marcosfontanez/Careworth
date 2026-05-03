-- Notify Pulse owners (and parent-comment authors) when someone comments on a My Pulse card.
-- Mirrors public.comments → notify_on_comment, but for profile_update_comments.

create or replace function public.notify_on_profile_update_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner        uuid;
  v_parent_owner uuid;
begin
  begin
    select pu.user_id
      into v_owner
    from public.profile_updates pu
    where pu.id = new.update_id;

    if v_owner is not null and v_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_owner,
        new.author_id,
        'comment',
        'New comment on your Pulse',
        'profile_update:' || new.update_id::text,
        false
      );
    end if;

    if new.parent_id is not null then
      select c.author_id
        into v_parent_owner
      from public.profile_update_comments c
      where c.id = new.parent_id;

      if v_parent_owner is not null
         and v_parent_owner <> new.author_id
         and (v_parent_owner is distinct from v_owner) then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read)
        values (
          v_parent_owner,
          new.author_id,
          'reply',
          'Someone replied to your comment',
          'profile_update:' || new.update_id::text,
          false
        );
      end if;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_profile_update_comment', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('update_id', new.update_id, 'comment_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_profile_update_comment on public.profile_update_comments;
create trigger tr_notify_on_profile_update_comment
  after insert on public.profile_update_comments
  for each row execute function public.notify_on_profile_update_comment();
