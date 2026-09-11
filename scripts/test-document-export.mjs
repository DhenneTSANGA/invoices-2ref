/**
 * Vérifie la chaîne export Bilan (DB + ZIP/CSV) sans UI.
 * Usage: node scripts/test-document-export.mjs
 *
 * Délègue à verify-bilan-export.mjs (compatible Node, sans alias @/).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const verify = path.join(__dirname, "verify-bilan-export.mjs");

const child = spawn(process.execPath, [verify], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
