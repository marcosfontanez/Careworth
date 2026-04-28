-- Private bucket for FFmpeg export outputs (worker uploads via service role; app uses signed URLs).
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;
