import fs from "node:fs/promises";
import path from "node:path";
import {
  addHoursIso,
  asList,
  ensureDir,
  loadCatalog,
  nowIso,
  parseArgs,
  readJson,
  readJsonl,
  resolveRoot,
  slugify,
  stageList,
  writeJson
} from "./lib/io.mjs";

function usage() {
  return `Usage:
  npm run claim -- --set world-classics-seed --stage illustration --count 8 --owner @you

Options:
  --set       Required set id.
  --stage     translation, gloss, illustration, or review.
  --count     Number of chunks to claim. Default 1.
  --owner     Contributor handle. Defaults to local user.
  --source    Optional source id filter.
  --hours     Claim expiry window. Default 24.
`;
}

async function readClaims(setDir, stage) {
  const dir = path.join(setDir, "claims", stage);
  await ensureDir(dir);
  const files = await fs.readdir(dir);
  const claims = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const claim = await readJson(path.join(dir, file));
    claims.push({ ...claim, file });
  }
  return claims;
}

async function outputExists(setDir, stage, chunkId) {
  try {
    await fs.access(path.join(setDir, "outputs", stage, `${chunkId}.json`));
    return true;
  } catch {
    return false;
  }
}

function isActiveClaim(claim) {
  return claim.status === "active" && (!claim.expiresAt || Date.parse(claim.expiresAt) > Date.now());
}

function makeCodexPrompt({ manifest, chunks, stage }) {
  const lines = chunks.map((chunk) => `- ${chunk.id}: ${chunk.sourceTitle} ${chunk.coverage.startPercent}-${chunk.coverage.endPercent}%`);
  return `You are working in the Gloss Atelier repo.

Set: ${manifest.id}
Stage: ${stage}
Claimed chunks:
${lines.join("\n")}

For each chunk:
1. Fetch the public source from the chunk sourceLocator.
2. Snap the percentage span to natural boundaries while preserving source order.
3. Produce the requested ${stage} deliverable without overwriting other chunks.
4. Save JSON output under tracking/sets/${manifest.id}/outputs/${stage}/<chunk-id>.json.
5. Include source URL, source refs, model/command route, uncertainties, and review notes.

Use account-auth CLI routes only; do not use API-key SDK calls.`;
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(usage());
    return;
  }
  const setId = args.set;
  const stage = args.stage ?? "translation";
  if (!setId) throw new Error("--set is required.");
  if (!stageList().includes(stage)) throw new Error(`Unknown stage: ${stage}`);

  const owner = args.owner ?? process.env.USER ?? "worker";
  const ownerSlug = slugify(owner) || "worker";
  const count = Number(args.count ?? 1);
  const hours = Number(args.hours ?? 24);
  const sourceFilter = new Set(asList(args.source));
  const setDir = resolveRoot("tracking", "sets", setId);
  const manifest = await readJson(path.join(setDir, "manifest.json"));
  const chunks = await readJsonl(path.join(setDir, "chunks.jsonl"));
  const catalog = await loadCatalog();
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  for (const id of sourceFilter) {
    if (!sourceIds.has(id)) throw new Error(`Unknown source id: ${id}`);
  }

  const claims = await readClaims(setDir, stage);
  const active = new Set(claims.filter(isActiveClaim).map((claim) => claim.chunkId));
  const selected = [];
  for (const chunk of chunks) {
    if (sourceFilter.size && !sourceFilter.has(chunk.sourceId)) continue;
    if (active.has(chunk.id)) continue;
    if (await outputExists(setDir, stage, chunk.id)) continue;
    selected.push(chunk);
    if (selected.length >= count) break;
  }

  if (!selected.length) {
    console.log("No claimable chunks found.");
    return;
  }

  const claimDir = path.join(setDir, "claims", stage);
  await ensureDir(claimDir);
  const prompt = makeCodexPrompt({ manifest, chunks: selected, stage });
  for (const chunk of selected) {
    await writeJson(path.join(claimDir, `${chunk.id}--${ownerSlug}.json`), {
      version: 1,
      setId,
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      stage,
      owner,
      status: "active",
      claimedAt: nowIso(),
      expiresAt: addHoursIso(hours),
      branchHint: `work/${setId}/${stage}/${chunk.id}-${ownerSlug}`,
      promptFile: `${chunk.id}--${ownerSlug}.prompt.md`
    });
    await fs.writeFile(path.join(claimDir, `${chunk.id}--${ownerSlug}.prompt.md`), prompt);
  }

  console.log(`Claimed ${selected.length} ${stage} chunk(s):`);
  for (const chunk of selected) console.log(`- ${chunk.id}`);
  console.log("\nCodex prompt:\n");
  console.log(prompt);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

