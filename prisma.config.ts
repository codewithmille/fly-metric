import dotenv from "dotenv";
import path from "path";

// Load .env.local where Next.js stores env vars, then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use session-mode direct URL for migrations/push (supports DDL)
    // Falls back to DATABASE_URL if DIRECT_URL is not set
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:placeholder@localhost:5432/postgres",
  },
});
