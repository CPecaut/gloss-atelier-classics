import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  asList,
  assertChunkPercent,
  ensureSetScaffold,
  formatPercent,
  loadCatalog,
  nowIso,
  parseArgs,
  pathExists,
  readJson,
  resolveRoot,
  slugify,
  writeJson,
  writeJsonl
} from "./lib/io.mjs";

function usage() {
  return `Usage:
  npm run set:new -- --id world-classics-seed --source herodotus-histories,shahnameh --chunk-percent 0.1 --owner @you

Options:
  --id              Set id. Defaults from title/source.
  --title           Human title.
  --source          Comma-separated source ids. Defaults to all catalog sources.
  --chunk-percent   0.01 to 0.1. Default comes from catalog.
  --owner           Coordinator handle.
  --concurrency     Starting worker limit. Default 4.
  --force           Overwrite existing set directory.
`;
}

function makeChunks({ sources, setId, percent }) {
  const scale = 10000;
  const totalUnits = 100 * scale;
  const chunkUnits = Math.round(percent * scale);
  const count = Math.ceil(totalUnits / chunkUnits);
  const pad = String(count).length;
  const chunks = [];

  for (const source of sources) {
    for (let index = 0; index < count; index += 1) {
      const startUnits = index * chunkUnits;
      const endUnits = Math.min(totalUnits, startUnits + chunkUnits);
      const ordinal = String(index + 1).padStart(pad, "0");
      chunks.push({
        id: `${source.id}-${ordinal}`,
        setId,
        sourceId: source.id,
        sourceTitle: source.title,
        originalTitle: source.originalTitle,
        language: source.language,
        stageStatus: {
          translation: "open",
          gloss: "open",
          illustration: "open",
          review: "open"
        },
        coverage: {
          startPercent: formatPercent(startUnits / scale),
          endPercent: formatPercent(endUnits / scale),
          chunkPercent: percent
        },
        sourceLocator: {
          primaryUrl: source.primaryUrl,
          rawUrl: source.rawUrl,
          sourceRefs: source.sourceRefs,
          boundaryInstruction:
            "Fetch the source text, locate this percentage span in source order, then snap to the nearest natural source boundary without crossing adjacent chunks unless the review notes request a repair."
        },
        deliverables: [
          "source excerpt reference",
          "literal translation",
          "reader translation",
          "per-token or per-character gloss table",
          "illustration prompt with character/style continuity notes",
          "uncertainty notes"
        ],
        promptSeed: {
          aesthetic: source.starterAesthetic,
          focus: source.promptFocus
        }
      });
    }
  }
  return chunks;
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(usage());
    return;
  }

  const catalog = await loadCatalog();
  const percent = Number(args["chunk-percent"] ?? catalog.chunkPolicy.defaultPercent);
  assertChunkPercent(percent, catalog.chunkPolicy);

  const requestedSources = asList(args.source);
  const sourceIds = requestedSources.length
    ? requestedSources
    : catalog.sources.map((source) => source.id);
  const sources = sourceIds.map((id) => {
    const source = catalog.sources.find((item) => item.id === id);
    if (!source) throw new Error(`Unknown source id: ${id}`);
    return source;
  });

  const title =
    args.title ??
    (sources.length === catalog.sources.length
      ? "World Classics Seed"
      : `${sources.map((source) => source.title).join(" + ")} Seed`);
  const setId = slugify(args.id ?? title);
  if (!setId) throw new Error("Unable to derive a set id.");

  const setDir = resolveRoot("tracking", "sets", setId);
  if ((await pathExists(setDir)) && !args.force) {
    throw new Error(`Set already exists: ${setDir}. Pass --force to overwrite.`);
  }

  const chunks = makeChunks({ sources, setId, percent });
  const manifest = {
    version: 1,
    id: setId,
    title,
    createdAt: nowIso(),
    owner: args.owner ?? "unassigned",
    sourceIds: sources.map((source) => source.id),
    chunkPercent: percent,
    chunkCount: chunks.length,
    stages: ["translation", "gloss", "illustration", "review"],
    concurrency: {
      startingLimit: Number(args.concurrency ?? 4),
      currentLimitFile: "runtime/concurrency.json",
      acceleration: "When review quality is stable, run `npm run concurrency -- --set " +
        setId +
        " --multiply 10`. When account limits or quality failures hit, run with `--reset`."
    },
    sourcePolicy: catalog.chunkPolicy.description,
    paths: {
      chunks: "chunks.jsonl",
      claims: "claims/",
      outputs: "outputs/",
      reviews: "reviews/"
    }
  };

  await ensureSetScaffold(setDir);
  await writeJson(path.join(setDir, "manifest.json"), manifest);
  await writeJsonl(path.join(setDir, "chunks.jsonl"), chunks);
  await writeJson(path.join(setDir, "runtime", "concurrency.json"), {
    setId,
    currentLimit: manifest.concurrency.startingLimit,
    baselineLimit: manifest.concurrency.startingLimit,
    updatedAt: nowIso(),
    reason: "initial set creation"
  });

  console.log(`Created ${setId}`);
  console.log(`Sources: ${sources.map((source) => source.id).join(", ")}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(pathToFileURL(setDir).href);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

