import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

export function resolveRoot(...parts) {
  return path.join(repoRoot, ...parts);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      const list = args._ ?? [];
      list.push(token);
      args._ = list;
      continue;
    }
    const eq = token.indexOf("=");
    const key = token.slice(2, eq === -1 ? undefined : eq);
    const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
    if (eq === -1 && (value === undefined || value.startsWith("--"))) {
      args[key] = true;
      continue;
    }
    if (eq === -1) i += 1;
    if (args[key] === undefined) {
      args[key] = value;
    } else if (Array.isArray(args[key])) {
      args[key].push(value);
    } else {
      args[key] = [args[key], value];
    }
  }
  return args;
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

export async function writeJsonl(filePath, rows) {
  await ensureDir(path.dirname(filePath));
  const text = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.writeFile(filePath, `${text}\n`);
}

export async function loadCatalog() {
  return readJson(resolveRoot("data", "source-catalog.json"));
}

export function asList(value) {
  if (value === undefined || value === true) return [];
  const flat = Array.isArray(value) ? value : [value];
  return flat.flatMap((item) =>
    String(item)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s.-]+/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function nowIso() {
  return new Date().toISOString();
}

export function addHoursIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function formatPercent(value) {
  return Number(value.toFixed(4));
}

export function assertChunkPercent(percent, policy) {
  if (!Number.isFinite(percent)) {
    throw new Error("Chunk percent must be a number.");
  }
  if (percent < policy.minPercent || percent > policy.maxPercent) {
    throw new Error(
      `Chunk percent must be between ${policy.minPercent}% and ${policy.maxPercent}%.`
    );
  }
}

export function stageList() {
  return ["translation", "gloss", "illustration", "review"];
}

export async function ensureSetScaffold(setDir) {
  for (const stage of stageList()) {
    await ensureDir(path.join(setDir, "claims", stage));
    await ensureDir(path.join(setDir, "outputs", stage));
    await fs.writeFile(path.join(setDir, "claims", stage, ".gitkeep"), "");
    await fs.writeFile(path.join(setDir, "outputs", stage, ".gitkeep"), "");
  }
  await ensureDir(path.join(setDir, "reviews"));
  await ensureDir(path.join(setDir, "runtime"));
  await fs.writeFile(path.join(setDir, "reviews", ".gitkeep"), "");
}

