-- Coffee Drop should be sendable from Profiles (matches seed 122); repair rows missing `profile`.

update public.shop_items
set
  gift_contexts = array['live', 'post', 'profile']::text[],
  updated_at = now()
where slug = 'coffee-drop'
  and type = 'gift'
  and (
    gift_contexts is null
    or not ('profile'::text = any (gift_contexts))
  );
