import type { ProfileRole } from "@/types/database";

/** Only artists and admins may publish tracks to the catalog. */
export function canUpload(role: ProfileRole | null | undefined): boolean {
  return role === "artist" || role === "admin";
}
