import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  nowIso,
  parseArgs,
  pathExists,
  readJson,
  resolveRoot,
  slugify,
  stageList,
  writeJson
} from "./lib/io.mjs";

function usage() {
  return `Usage:
  npm run complete -- --set world-classics-seed --stage translation --chunk herodotus-histories-0001 --owner @you --artifact /tmp/output.json

Options:
  --set       Required set id.
  --stage     translation, gloss, illustration, or review.
  --chunk     Required chunk id.
  --owner     Contributor handle.
  --artifact  Optional JSON or text artifact to wrap.
  --status    submitted, approved, or needs-revision. Default submitted.
  --notes     Optional notes.
  --force     Overwrite existing output.
`;
}

async function readArtifact(filePath) {
  if (!filePath) return null;
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function updateClaim(setDir, stage, chunkId, owner) {
  const ownerSlug = slugify(owner) || "worker";
  const claimPath = path.join(setDir, "claims", stage, `${chunkId}--${ownerSlug}.json`);
  if (!(await pathExists(claimPath))) return;
  const claim = await readJson(claimPath);
  claim.status = "submitted";
  claim.submittedAt = nowIso();
  await writeJson(claimPath, claim);
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(usage());
    return;
  }
  const setId = args.set;
  const stage = args.stage ?? "translation";
  const chunkId = args.chunk;
  if (!setId) throw new Error("--set is required.");
  if (!chunkId) throw new Error("--chunk is required.");
  if (!stageList().includes(stage)) throw new Error(`Unknown stage: ${stage}`);

  const owner = args.owner ?? process.env.USER ?? "worker";
  const setDir = resolveRoot("tracking", "sets", setId);
  const outputPath = path.join(setDir, "outputs", stage, `${chunkId}.json`);
  if ((await pathExists(outputPath)) && !args.force) {
    throw new Error(`Output already exists: ${outputPath}. Pass --force to overwrite.`);
  }

  await ensureDir(path.dirname(outputPath));
  const artifact = await readArtifact(args.artifact);
  await writeJson(outputPath, {
    version: 1,
    setId,
    chunkId,
    stage,
    owner,
    status: args.status ?? "submitted",
    submittedAt: nowIso(),
    notes: args.notes ?? "",
    artifact
  });
  await updateClaim(setDir, stage, chunkId, owner);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

