import { readFileSync, writeFileSync } from "node:fs";

const p = "src/lib/prospection-demo.ts";
const s = readFileSync(p, "utf8");
const start = s.indexOf("export function createProspectionDemoSeed");
if (start < 0) throw new Error("fn not found");

let i = s.indexOf("{", start);
let depth = 0;
let end = -1;
for (; i < s.length; i++) {
  if (s[i] === "{") depth++;
  else if (s[i] === "}") {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end < 0) throw new Error("end not found");

const replacement = `export function createProspectionDemoSeed(): ProspectionData {
  /** État vide — hydraté depuis la BDD (objectifs / checklist seedés côté serveur). */
  return {
    companies: [],
    clientOverlays: {},
    contacts: [],
    opportunities: [],
    activities: [],
    leads: [],
    expenses: [],
    objectives: [],
    notifications: [],
    libraryItems: [],
    referentials: [],
    weekChecks: [],
  };
}`;
writeFileSync(p, s.slice(0, start) + replacement + s.slice(end));
console.log("patched seed");
