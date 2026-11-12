import { spawnSync } from "node:child_process";

import { createSerwistRoute } from "@serwist/turbopack";

// A revision lets Serwist invalidate the precached offline page when it
// changes. Falls back to a random id when git metadata is unavailable.
const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout;
const revision = gitRevision?.trim() || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
