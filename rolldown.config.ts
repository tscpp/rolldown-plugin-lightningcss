import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";
import pkg from "./package.json" with { type: "json" };

const deps = Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
});

export default defineConfig({
  input: ["./src/index.ts"],
  output: {
    format: "esm",
    cleanDir: true,
  },
  platform: "node",
  external: (id) => deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`)),
  plugins: [dts({ tsgo: true })],
});
