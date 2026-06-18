-- Migration 273: General Public Circles
--
-- PulseVerse is expanding beyond healthcare. This seeds broad public-interest
-- Circles that any user can discover, join, and post in. It does NOT touch the
-- existing healthcare / Confessions Circles, RLS policies, or moderation.
--
-- Model notes (see audit):
--   - Circles are rows in `public.communities` (slug is UNIQUE).
--   - There is no is_active / is_public / is_discoverable column — any row in
--     `communities` is discoverable. So inserting rows is enough to surface them.
--   - Confessions / anonymous posting is slug-based (`confessions`). None of the
--     new Circles use that slug, so they are normal (non-anonymous) Circles.
--   - Per-circle rules / weekly prompt / welcome copy live in `communities.metadata`
--     (jsonb) and are read by lib/circleIdentity.ts + lib/circleWeeklyPrompts.ts.
--   - "Featured" pinning uses `featured_order` (lower = earlier) ahead of the
--     popularity-ranked rest (see services/circleContent.ts). App Suggestions is
--     pinned at 1; we pin the five hero public Circles at 2..6.
--
-- Idempotent: ON CONFLICT (slug) updates identity columns only. It deliberately
-- does NOT overwrite live member_count / post_count so re-running never resets
-- real stats. No existing rows are dropped or altered.

insert into public.communities
  (slug, name, icon, accent_color, description, categories, onboarding_topics, featured_order, member_count, post_count, metadata)
values
  (
    'petverse',
    'PetVerse',
    '🐾',
    '#FB923C',
    'Pets, funny animal moments, pet reactions, pet stories, and pet personality posts.',
    array['General Public'],
    array['pets', 'humor', 'community'],
    2,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to PetVerse — for pet parents, funny animal moments, and chaotic pet energy. Show off your pets and keep it kind.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Show us your pet''s toxic trait.',
        'body', 'Drop a photo or clip of your pet being their chaotic, lovable self.',
        'cta', 'Post your pet'
      )
    )
  ),
  (
    'foodie-finds',
    'Foodie Finds',
    '🍽️',
    '#F59E0B',
    'Food reviews, home cooking, snacks, restaurants, comfort meals, and hidden gems.',
    array['General Public'],
    array['food', 'lifestyle', 'community'],
    5,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Foodie Finds — best bites, hidden gems, and meals worth sharing.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Best thing I ate this week.',
        'body', 'Share a photo and tell us why it slapped — restaurant, home cook, or struggle meal.',
        'cta', 'Share your plate'
      )
    )
  ),
  (
    'main-character-moments',
    'Main Character Moments',
    '🎬',
    '#A855F7',
    'Funny, dramatic, embarrassing, cinematic, or unforgettable everyday moments.',
    array['General Public'],
    array['stories', 'community', 'humor'],
    4,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Main Character Moments — everyday stories that felt like a movie scene.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'This felt like a movie scene.',
        'body', 'Tell us about your accidental main character moment — funny, dramatic, or cinematic.',
        'cta', 'Tell your story'
      )
    )
  ),
  (
    'the-drama-room',
    'The Drama Room',
    '🍵',
    '#F472B6',
    'Petty drama, relationship situations, workplace stories, neighbor drama, and "am I wrong?" debates.',
    array['General Public'],
    array['stories', 'community'],
    3,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to The Drama Room — storytime, tea, and opinions, without naming names. Keep stories anonymous and respectful.',
      'rules', jsonb_build_array(
        'Keep it anonymous — no full names of private individuals',
        'No addresses, phone numbers, workplaces, schools, or identifying details',
        'No targeted harassment, threats, or revenge posting',
        'Frame stories as your own experience or opinion',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Am I wrong for this?',
        'body', 'Tell us the tea without naming names — keep people and places anonymous.',
        'cta', 'Spill (no names)'
      )
    )
  ),
  (
    'laugh-lab',
    'Laugh Lab',
    '😂',
    '#FBBF24',
    'Jokes, memes, skits, fails, parody content, funny edits, and everyday comedy.',
    array['General Public'],
    array['humor', 'community'],
    6,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Laugh Lab — skits, memes, fails, and jokes that actually land.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Make us laugh in 15 seconds.',
        'body', 'Post your funniest clip, meme, or harmless fail of the week.',
        'cta', 'Post something funny'
      )
    )
  ),
  (
    'diy-home-glow',
    'DIY & Home Glow',
    '🛠️',
    '#34D399',
    'Home projects, decor, cleaning, organization, apartment upgrades, thrift flips, and room transformations.',
    array['General Public'],
    array['home', 'diy', 'lifestyle'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to DIY & Home Glow — small upgrades, big transformations.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Before and after room glow-up.',
        'body', 'Share your favorite home hack, thrift flip, or cleaning reset.',
        'cta', 'Share your glow-up'
      )
    )
  ),
  (
    'fandom-lounge',
    'Fandom Lounge',
    '🌟',
    '#818CF8',
    'TV, movies, music, games, celebrities, fan theories, reactions, and pop-culture conversations.',
    array['General Public'],
    array['pop_culture', 'community', 'humor'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Fandom Lounge — reactions, theories, favorites, and fandom chaos.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Drop your wildest fan theory.',
        'body', 'TV, movies, music, games — react, debate, and share your hot takes.',
        'cta', 'Share your take'
      )
    )
  ),
  (
    'creator-corner',
    'Creator Corner',
    '🎥',
    '#38BDF8',
    'Creator tips, editing workflows, AI tools, prompts, behind-the-scenes posts, setups, and growth advice.',
    array['General Public'],
    array['creator_tools', 'community'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Creator Corner — for creators building better content.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Show your setup.',
        'body', 'Share a behind-the-scenes look, an editing tip, or a prompt that actually worked.',
        'cta', 'Share a tip'
      )
    )
  ),
  (
    'travel-mode',
    'Travel Mode',
    '✈️',
    '#2DD4BF',
    'Trips, beaches, cruises, road trips, hidden gems, local recommendations, and travel stories.',
    array['General Public'],
    array['travel', 'lifestyle', 'community'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Travel Mode — trips, hidden gems, and places worth saving.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Best place I visited this year.',
        'body', 'Share a photo and a tip — beaches, road trips, or hidden gems in your city.',
        'cta', 'Share your trip'
      )
    )
  ),
  (
    'money-moves',
    'Money Moves',
    '💸',
    '#4ADE80',
    'Budgeting, saving, side hustles, small business wins, financial goals, and money lessons.',
    array['General Public'],
    array['money', 'side_hustles', 'community'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Money Moves — save smarter, earn better, and share the lessons. Shared for discussion only, not financial advice.',
      'rules', jsonb_build_array(
        'No guaranteed income or investment claims',
        'No scams, crypto pumps, or requests for money',
        'No suspicious links or financial deception',
        'Shared for discussion only — not financial advice',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Money lesson I wish I learned earlier.',
        'body', 'Budget wins, side hustles, and money lessons — discussion only, not financial advice.',
        'cta', 'Share a lesson'
      )
    )
  ),
  (
    'cozy-corner',
    'Cozy Corner',
    '☕',
    '#A78BFA',
    'Books, coffee, reset days, comfort routines, quiet moments, soft living, and relaxing content.',
    array['General Public'],
    array['lifestyle', 'cozy', 'community'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Cozy Corner — comfort content, calm routines, and cozy resets.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Sunday reset check-in.',
        'body', 'Share your comfort show, current book, or your cozy corner.',
        'cta', 'Share your reset'
      )
    )
  ),
  (
    'glow-up-garage',
    'Glow Up Garage',
    '✨',
    '#E879F9',
    'Personal transformations, fitness journeys, style upgrades, room makeovers, cars, hair, makeup, and progress videos.',
    array['General Public'],
    array['transformations', 'lifestyle', 'community'],
    null,
    0,
    0,
    jsonb_build_object(
      'welcome_copy', 'Welcome to Glow Up Garage — before, after, and everything in between.',
      'rules', jsonb_build_array(
        'Be respectful — no harassment, threats, hate, or bullying',
        'No doxxing or sharing private personal information',
        'No scams, spam, or misleading money claims',
        'Keep it legal, safe, and welcoming',
        'Follow PulseVerse community guidelines'
      ),
      'weekly_prompt', jsonb_build_object(
        'title', 'Before and after reveal.',
        'body', 'Fitness, style, room makeovers, or progress check-ins — show what changed.',
        'cta', 'Share your progress'
      )
    )
  )
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  accent_color = excluded.accent_color,
  description = excluded.description,
  categories = excluded.categories,
  onboarding_topics = excluded.onboarding_topics,
  featured_order = excluded.featured_order,
  metadata = excluded.metadata;
