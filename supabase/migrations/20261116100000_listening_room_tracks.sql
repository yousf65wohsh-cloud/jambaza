-- Replace the unused YouTube-era column with a real Storage-hosted track.
--
-- `video_id` was always written as an empty string and never read by playback.
-- `track_id` is nullable so a room can exist before the host picks a track.
-- Existing RLS policies and Realtime membership stay unchanged.

alter table public.listening_rooms
  add column track_id uuid references public.tracks (id) on delete set null;

alter table public.listening_rooms
  drop column video_id;

comment on column public.listening_rooms.track_id is
  'The Storage-hosted track currently selected by the room host, or null before a track is chosen.';

create index listening_rooms_track_id_idx
  on public.listening_rooms (track_id);
