import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  minify: false, // Keep readable for debugging, set true for production
  bundle: true,
  splitting: false,
  treeshake: true,
});
