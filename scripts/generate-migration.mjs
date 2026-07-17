import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const migrationDir = path.join("prisma", "migrations", "20260717160000_init");
fs.mkdirSync(migrationDir, { recursive: true });

const sql = execSync(
  "pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8" },
);

// Keep only SQL (drop pnpm noise before first SQL comment/statement)
const start = sql.indexOf("--");
const clean = (start >= 0 ? sql.slice(start) : sql).trim() + "\n";

fs.writeFileSync(path.join(migrationDir, "migration.sql"), clean, "utf8");
fs.writeFileSync("prisma/init.sql", clean, "utf8");
console.log("Wrote migration SQL,", clean.length, "bytes");
