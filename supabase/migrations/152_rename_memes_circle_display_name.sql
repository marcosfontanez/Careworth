-- Display name: shorten “Funny Memes” style labels to “Memes” for the primary meme room(s).
update public.communities
set name = 'Memes'
where slug in ('memes', 'funny-medical-memes')
  and name is distinct from 'Memes';
