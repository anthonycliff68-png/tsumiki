-- A face for the tiles.
--
-- Crew tiles are 32px and already carry the member's colour, so a cropped photo
-- would read as a smudge — and photos would mean a storage bucket, an upload
-- path and moderating images between people who reached each other through a
-- shared link. An emoji reads at any size, costs nothing to store, and cannot
-- be an image nobody wants to see.
--
-- Empty means "use my initials", which is what every existing row does.
alter table public.profiles
  add column avatar_emoji text not null default '';

comment on column public.profiles.avatar_emoji is
  'A single emoji shown instead of initials. Empty for initials.';

-- One grapheme at most. char_length counts characters rather than bytes, and a
-- flag or a skin-toned emoji is several, so the bound is loose on purpose: it
-- is here to stop someone storing a sentence, not to police which emoji.
alter table public.profiles
  add constraint profiles_avatar_emoji_short
  check (char_length(avatar_emoji) <= 16);

-- A name someone can actually be called.
--
-- display_name has always defaulted to '' and was only ever written once, from
-- Apple's given name, so email signups never had one. Onboarding now asks. The
-- bound matches the anchor label bound; the empty string stays legal because
-- existing rows hold it and onboarding is what fills it in.
alter table public.profiles
  add constraint profiles_display_name_short
  check (char_length(display_name) <= 40);
