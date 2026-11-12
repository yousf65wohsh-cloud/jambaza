import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "public/sw.js", "public/swe-worker-*.js", "next-env.d.ts"],
  },
];

export default config;
