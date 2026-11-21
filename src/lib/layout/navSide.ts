export type NavSide = "left" | "right";

/** localStorage key for the chosen edge of the desktop navigation bar. */
export const NAV_SIDE_STORAGE_KEY = "jambaza.navSide";

export const DEFAULT_NAV_SIDE: NavSide = "right";

/** Accepts only the two persisted values; anything else falls back to "right". */
export function parseNavSide(value: unknown): NavSide {
  return value === "left" || value === "right" ? value : DEFAULT_NAV_SIDE;
}
