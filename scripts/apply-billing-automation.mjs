/**
 * Applique la migration abonnements + relances.
 * Usage: node scripts/apply-billing-automation.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(
  __dirname,
  "../prisma/migrations/20260909100000_billing_automation/migration.sql",
);
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

await client.connect();
await client.query(sql);
await client.end();
console.log("Migration billing_automation OK");
