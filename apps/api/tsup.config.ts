import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  entry: ["src/server.ts"],
  format: ["cjs"],
  minify: false,
  noExternal: [/.*/],
  outExtension: () => ({ js: ".cjs" }),
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  splitting: false,
  target: "node24",
});
