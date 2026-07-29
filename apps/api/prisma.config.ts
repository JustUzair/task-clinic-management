import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: resolve(import.meta.dirname, "../../.env"),
  quiet: true,
});

const generationOnlyUrl =
  "postgresql://generate:generate@127.0.0.1:5432/generate";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? generationOnlyUrl,
  },
});
