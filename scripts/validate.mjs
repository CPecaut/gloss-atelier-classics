import fs from "node:fs/promises";
import path from "node:path";
import {
  assertChunkPercent,
  loadCatalog,
  pathExists,
  readJson,
  readJsonl,
  resolveRoot,
  stageList
} from "./lib/io.mjs";

const errors = [];

function fail(message) {
  errors.push(message);
}

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function validateCatalog() {
  const catalog = await loadCatalog();
  const seen = new Set();
  for (const source of catalog.sources) {
    if (!source.id) fail("Catalog source missing id.");
    if (seen.has(source.id)) fail(`Duplicate source id: ${source.id}`);
    seen.add(source.id);
    for (const key of ["primaryUrl", "rawUrl"]) {
      if (!isUrl(source[key])) fail(`${source.id}.${key} is not a valid URL.`);
    }
  }
  return catalog;
}

async function listSetDirs() {
  const root = resolveRoot("tracking", "sets");
  if (!(await pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name));
}

async function validateClaims(setDir, manifest, chunkIds) {
  for (const stage of stageList()) {
    const claimDir = path.join(setDir, "claims", stage);
    if (!(await pathExists(claimDir))) continue;
    const files = await fs.readdir(claimDir);
    const active = new Map();
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const claim = await readJson(path.join(claimDir, file));
      if (claim.setId !== manifest.id) fail(`${file}: claim setId mismatch.`);
      if (claim.stage !== stage) fail(`${file}: claim stage mismatch.`);
      if (!chunkIds.has(claim.chunkId)) fail(`${file}: unknown chunk ${claim.chunkId}.`);
      const isActive =
        claim.status === "active" && (!claim.expiresAt || Date.parse(claim.expiresAt) > Date.now());
      if (!isActive) continue;
      const key = `${claim.stage}:${claim.chunkId}`;
      if (active.has(key)) {
        fail(`Duplicate active claim for ${key}: ${active.get(key)} and ${file}`);
      }
      active.set(key, file);
    }
  }
}

async function validateOutputs(setDir, manifest, chunkIds) {
  for (const stage of stageList()) {
    const outputDir = path.join(setDir, "outputs", stage);
    if (!(await pathExists(outputDir))) continue;
    const files = await fs.readdir(outputDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const output = await readJson(path.join(outputDir, file));
      const chunkId = file.replace(/\.json$/, "");
      if (output.setId !== manifest.id) fail(`${file}: output setId mismatch.`);
      if (output.stage !== stage) fail(`${file}: output stage mismatch.`);
      if (output.chunkId !== chunkId) fail(`${file}: output chunk id mismatch.`);
      if (!chunkIds.has(chunkId)) fail(`${file}: unknown output chunk ${chunkId}.`);
    }
  }
}

async function validateSet(setDir, catalog) {
  const manifestPath = path.join(setDir, "manifest.json");
  const chunksPath = path.join(setDir, "chunks.jsonl");
  if (!(await pathExists(manifestPath))) return;
  const manifest = await readJson(manifestPath);
  assertChunkPercent(Number(manifest.chunkPercent), catalog.chunkPolicy);
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  for (const id of manifest.sourceIds ?? []) {
    if (!sourceIds.has(id)) fail(`${manifest.id}: unknown source id ${id}.`);
  }
  const chunks = await readJsonl(chunksPath);
  if (chunks.length !== manifest.chunkCount) {
    fail(`${manifest.id}: manifest chunkCount ${manifest.chunkCount} != ${chunks.length}.`);
  }
  const chunkIds = new Set();
  for (const chunk of chunks) {
    if (chunkIds.has(chunk.id)) fail(`${manifest.id}: duplicate chunk id ${chunk.id}.`);
    chunkIds.add(chunk.id);
    if (!sourceIds.has(chunk.sourceId)) fail(`${chunk.id}: unknown source id ${chunk.sourceId}.`);
    const start = Number(chunk.coverage?.startPercent);
    const end = Number(chunk.coverage?.endPercent);
    if (!(start >= 0 && start < 100 && end > 0 && end <= 100 && end > start)) {
      fail(`${chunk.id}: invalid coverage ${start}-${end}.`);
    }
  }
  await validateClaims(setDir, manifest, chunkIds);
  await validateOutputs(setDir, manifest, chunkIds);
}

async function main() {
  const catalog = await validateCatalog();
  const setDirs = await listSetDirs();
  for (const setDir of setDirs) await validateSet(setDir, catalog);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Validation passed: ${catalog.sources.length} sources, ${setDirs.length} set(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

