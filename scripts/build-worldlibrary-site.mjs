import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  loadCatalog,
  parseArgs,
  pathExists,
  readJson,
  readJsonl,
  repoRoot,
  resolveRoot,
  stageList,
  writeJson
} from "./lib/io.mjs";

const siteTemplateDir = resolveRoot("site", "worldlibrary");
const repoUrl =
  process.env.GLOSS_ATELIER_REPO_URL ?? "https://github.com/CPecaut/gloss-atelier-classics";

async function listDirs(dirPath) {
  if (!(await pathExists(dirPath))) return [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function listJsonFiles(dirPath) {
  if (!(await pathExists(dirPath))) return [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name))
    .sort();
}

function isActiveClaim(claim) {
  return claim.status === "active" && (!claim.expiresAt || Date.parse(claim.expiresAt) > Date.now());
}

function coverageLabel(coverage) {
  if (!coverage) return "";
  return `${coverage.startPercent}-${coverage.endPercent}%`;
}

function summarizeOutput(output) {
  const artifact = output.artifact ?? {};
  const seed = artifact.illustrationPromptSeed ?? {};
  return (
    artifact.readerTranslation ??
    artifact.combinedReaderTranslation ??
    artifact.readerTranslations?.map((row) => row.translation).join(" ") ??
    artifact.literalTranslation ??
    artifact.literalTranslations?.map((row) => row.translation).join(" ") ??
    seed.prompt ??
    artifact.text ??
    output.notes ??
    ""
  );
}

function compactSource(source, status) {
  return {
    id: source.id,
    title: source.title,
    originalTitle: source.originalTitle,
    author: source.author,
    language: source.language,
    period: source.period,
    sourceFamily: source.sourceFamily,
    rightsNote: source.rightsNote,
    primaryUrl: source.primaryUrl,
    rawUrl: source.rawUrl,
    statusOk: Boolean(status?.ok),
    checkedAt: status?.checkedAt ?? null
  };
}

async function readClaims(setDir, setId) {
  const claims = [];
  for (const stage of stageList()) {
    const claimDir = path.join(setDir, "claims", stage);
    const files = await listJsonFiles(claimDir);
    for (const filePath of files) {
      const claim = await readJson(filePath);
      claims.push({
        id: `${setId}:${stage}:${claim.chunkId}:${claim.owner}`,
        setId,
        chunkId: claim.chunkId,
        sourceId: claim.sourceId,
        stage,
        owner: claim.owner,
        status: isActiveClaim(claim) ? "active" : claim.status,
        claimedAt: claim.claimedAt ?? null,
        expiresAt: claim.expiresAt ?? null,
        submittedAt: claim.submittedAt ?? null,
        branchHint: claim.branchHint ?? null,
        promptFile: claim.promptFile ?? null
      });
    }
  }
  return claims;
}

async function readOutputs(setDir, setId) {
  const outputs = [];
  for (const stage of stageList()) {
    const outputDir = path.join(setDir, "outputs", stage);
    const files = await listJsonFiles(outputDir);
    for (const filePath of files) {
      const output = await readJson(filePath);
      const chunkId = output.chunkId ?? path.basename(filePath, ".json");
      outputs.push({
        id: `${setId}:${stage}:${chunkId}`,
        setId,
        chunkId,
        sourceId: null,
        stage,
        owner: output.owner ?? "",
        status: output.status ?? "submitted",
        submittedAt: output.submittedAt ?? null,
        notes: output.notes ?? "",
        summary: summarizeOutput(output),
        artifact: output.artifact ?? null
      });
    }
  }
  return outputs;
}

function createStats(sources) {
  return Object.fromEntries(
    sources.map((source) => [
      source.id,
      {
        chunks: 0,
        outputs: 0,
        activeClaims: 0,
        stages: Object.fromEntries(stageList().map((stage) => [stage, 0]))
      }
    ])
  );
}

async function collectData() {
  const catalog = await loadCatalog();
  const statusPath = resolveRoot("data", "source-status.json");
  const status = (await pathExists(statusPath)) ? await readJson(statusPath) : { sources: [] };
  const statusById = new Map((status.sources ?? []).map((source) => [source.id, source]));
  const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
  const sourceStats = createStats(catalog.sources);
  const sets = [];
  const claims = [];
  const outputs = [];
  const chunks = [];
  const setsRoot = resolveRoot("tracking", "sets");

  for (const setId of await listDirs(setsRoot)) {
    const setDir = path.join(setsRoot, setId);
    const manifestPath = path.join(setDir, "manifest.json");
    const chunksPath = path.join(setDir, "chunks.jsonl");
    if (!(await pathExists(manifestPath)) || !(await pathExists(chunksPath))) continue;

    const manifest = await readJson(manifestPath);
    const setClaims = await readClaims(setDir, manifest.id);
    const setOutputs = await readOutputs(setDir, manifest.id);
    const outputByChunkStage = new Map(
      setOutputs.map((output) => [`${output.chunkId}:${output.stage}`, output])
    );
    const activeClaims = setClaims.filter((claim) => claim.status === "active");
    const activeClaimByChunkStage = new Map(
      activeClaims.map((claim) => [`${claim.chunkId}:${claim.stage}`, claim])
    );
    const chunkRows = await readJsonl(chunksPath);
    const chunkById = new Map(chunkRows.map((chunk) => [chunk.id, chunk]));

    for (const chunk of chunkRows) {
      if (sourceStats[chunk.sourceId]) sourceStats[chunk.sourceId].chunks += 1;
      const stages = {};
      for (const stage of stageList()) {
        const key = `${chunk.id}:${stage}`;
        if (outputByChunkStage.has(key)) {
          stages[stage] = outputByChunkStage.get(key).status;
        } else if (activeClaimByChunkStage.has(key)) {
          stages[stage] = "active";
        } else {
          stages[stage] = "open";
        }
      }
      chunks.push({
        id: chunk.id,
        setId: manifest.id,
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        coverage: coverageLabel(chunk.coverage),
        stages
      });
    }

    for (const output of setOutputs) {
      const chunk = chunkById.get(output.chunkId);
      output.sourceId = chunk?.sourceId ?? null;
      output.sourceTitle =
        chunk?.sourceTitle ?? sourceById.get(output.sourceId)?.title ?? output.sourceId;
      if (output.sourceId && sourceStats[output.sourceId]) {
        sourceStats[output.sourceId].outputs += 1;
        sourceStats[output.sourceId].stages[output.stage] += 1;
      }
    }
    for (const claim of activeClaims) {
      const chunk = chunkById.get(claim.chunkId);
      claim.sourceId = claim.sourceId ?? chunk?.sourceId ?? null;
      if (claim.sourceId && sourceStats[claim.sourceId]) {
        sourceStats[claim.sourceId].activeClaims += 1;
      }
    }

    claims.push(...setClaims);
    outputs.push(...setOutputs);
    sets.push({
      id: manifest.id,
      title: manifest.title,
      createdAt: manifest.createdAt,
      owner: manifest.owner,
      sourceIds: manifest.sourceIds,
      chunkPercent: manifest.chunkPercent,
      chunkCount: manifest.chunkCount,
      stages: manifest.stages,
      concurrency: manifest.concurrency,
      outputs: setOutputs.length,
      activeClaims: activeClaims.length
    });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    repoUrl,
    sources: catalog.sources.map((source) => compactSource(source, statusById.get(source.id))),
    sets,
    sourceStats,
    claims,
    outputs: outputs.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))),
    chunks
  };
}

async function copyStaticFiles(outputDir) {
  await fs.cp(siteTemplateDir, outputDir, { recursive: true });
  const assetDir = resolveRoot("public", "assets");
  if (await pathExists(assetDir)) {
    await fs.cp(assetDir, path.join(outputDir, "assets"), { recursive: true });
  }
}

async function mirrorChunkLedgers(outputDir) {
  const setsRoot = resolveRoot("tracking", "sets");
  for (const setId of await listDirs(setsRoot)) {
    const chunksPath = path.join(setsRoot, setId, "chunks.jsonl");
    if (!(await pathExists(chunksPath))) continue;
    const targetPath = path.join(outputDir, "data", setId, "chunks.jsonl");
    await ensureDir(path.dirname(targetPath));
    await fs.copyFile(chunksPath, targetPath);
  }
}

async function copyTree(sourceDir, targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await ensureDir(targetDir);
  await fs.cp(sourceDir, targetDir, { recursive: true });
}

async function buildSite(outputDir) {
  const data = await collectData();
  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);
  await copyStaticFiles(outputDir);
  await mirrorChunkLedgers(outputDir);
  await writeJson(path.join(outputDir, "worldlibrary-data.json"), data);
  return data;
}

async function main() {
  const args = parseArgs();
  const outputDir = path.resolve(repoRoot, args.outDir ?? "dist/worldlibrary");
  const data = await buildSite(outputDir);

  if (args["copy-to"]) {
    const copyTarget = path.resolve(String(args["copy-to"]));
    await copyTree(outputDir, copyTarget);
    console.log(`Copied World Library site to ${copyTarget}`);
  }

  console.log(
    `Built World Library site at ${outputDir} (${data.sources.length} sources, ${data.chunks.length} chunks, ${data.outputs.length} outputs).`
  );
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
