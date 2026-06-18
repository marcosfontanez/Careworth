-- Pulse Board RLS / privilege verification
select json_build_object(
  'authenticated_insert',
  has_table_privilege('authenticated', 'public.profile_board_shoutouts', 'INSERT'),
  'authenticated_update',
  has_table_privilege('authenticated', 'public.profile_board_shoutouts', 'UPDATE'),
  'authenticated_delete',
  has_table_privilege('authenticated', 'public.profile_board_shoutouts', 'DELETE'),
  'authenticated_select',
  has_table_privilege('authenticated', 'public.profile_board_shoutouts', 'SELECT'),
  'post_rpc_execute',
  has_function_privilege('authenticated', 'public.post_profile_board_shoutout(uuid, text)', 'EXECUTE'),
  'moderate_rpc_execute',
  has_function_privilege('authenticated', 'public.moderate_profile_board_shoutout(uuid, text)', 'EXECUTE'),
  'policy_count',
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profile_board_shoutouts')
) as pulse_board_privileges;
