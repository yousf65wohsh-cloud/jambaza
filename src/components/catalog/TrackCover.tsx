import { MusicIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/track";

export function TrackCover({
  track,
  className,
}: {
  track: Pick<Track, "title" | "coverUrl">;
  className?: string;
}) {
  if (!track.coverUrl) {
    return (
      <div
        className={cn(
          "bg-surface-2 text-muted grid aspect-square w-full place-items-center",
          className,
        )}
      >
        <MusicIcon className="size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    // Supabase cover URLs are public URLs; next/image is not used for them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={track.coverUrl}
      alt={`غلاف ${track.title}`}
      loading="lazy"
      className={cn("bg-surface-2 aspect-square w-full object-cover", className)}
    />
  );
}
