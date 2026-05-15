-- Emerald Renewal: procedural EKG + sparkles in app — align catalog with animated presentation.
update public.shop_items
set
  is_animated = true,
  visual_tier = 'animated',
  updated_at = now()
where slug = 'border-emerald-renewal-may-2026';
