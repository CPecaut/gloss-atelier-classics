#!/usr/bin/env node
// Keeps the large chunk ledger available to the Vite viewer without tracking a second copy.
import fs from "node:fs";
import path from "node:path";

const source = "tracking/sets/world-classics-seed/chunks.jsonl";
const targetDir = "public/data/world-classics-seed";
const target = path.join(targetDir, "chunks.jsonl");

if (!fs.existsSync(source)) {
  console.warn("[ensure-public-data] source chunks not found, skipping");
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });
if (!fs.existsSync(target) || fs.statSync(target).size !== fs.statSync(source).size) {
  fs.copyFileSync(source, target);
  console.log("[ensure-public-data] copied chunks.jsonl to public for viewer");
} else {
  console.log("[ensure-public-data] chunks up to date in public");
}
