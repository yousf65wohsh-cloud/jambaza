import type { FriendProfile } from "@/lib/friends/mapping";

/** Avatar, display name, and @username — shared by friends and search results. */
export function FriendIdentity({ profile }: { profile: FriendProfile }) {
  const name = profile.displayName || profile.username;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {profile.avatarUrl ? (
        // Avatar URLs are public Supabase URLs; next/image is not used for them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={`صورة ${name}`}
          loading="lazy"
          className="bg-surface-2 size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-surface-2 text-accent grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
        >
          {name.slice(0, 1)}
        </span>
      )}

      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span dir="ltr" className="text-muted block truncate text-xs">
          @{profile.username}
        </span>
      </span>
    </div>
  );
}
