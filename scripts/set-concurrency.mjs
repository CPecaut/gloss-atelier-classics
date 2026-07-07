import path from "node:path";
import { nowIso, parseArgs, readJson, resolveRoot, writeJson } from "./lib/io.mjs";

function usage() {
  return `Usage:
  npm run concurrency -- --set world-classics-seed --multiply 10
  npm run concurrency -- --set world-classics-seed --reset
  npm run concurrency -- --set world-classics-seed --value 24
`;
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(usage());
    return;
  }
  const setId = args.set;
  if (!setId) throw new Error("--set is required.");
  const runtimePath = resolveRoot("tracking", "sets", setId, "runtime", "concurrency.json");
  const current = await readJson(runtimePath);
  let next = current.currentLimit;
  let reason = "manual update";

  if (args.reset) {
    next = current.baselineLimit ?? 4;
    reason = "reset to baseline after limit exhaustion or review stop";
  } else if (args.multiply !== undefined) {
    const factor = Number(args.multiply);
    if (!Number.isFinite(factor) || factor <= 0) throw new Error("--multiply must be positive.");
    next = Math.max(1, Math.round(current.currentLimit * factor));
    reason = `multiplied by ${factor}`;
  } else if (args.value !== undefined) {
    next = Number(args.value);
    if (!Number.isFinite(next) || next < 1) throw new Error("--value must be a positive number.");
    next = Math.round(next);
  } else {
    throw new Error("Pass --multiply, --reset, or --value.");
  }

  await writeJson(runtimePath, {
    ...current,
    currentLimit: next,
    updatedAt: nowIso(),
    reason
  });
  console.log(`Concurrency for ${setId}: ${current.currentLimit} -> ${next}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

