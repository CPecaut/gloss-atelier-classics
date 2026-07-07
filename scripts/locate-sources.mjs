import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadCatalog, nowIso, resolveRoot, writeJson } from "./lib/io.mjs";

const execFileAsync = promisify(execFile);

function parseCurlHeaders(stdout, url, elapsedMs) {
  const statusLines = stdout.match(/^HTTP\/\S+\s+\d+/gim) ?? [];
  const lastStatus = statusLines.at(-1);
  const status = lastStatus ? Number(lastStatus.match(/\s(\d+)/)?.[1]) : 0;
  const contentType = stdout.match(/^content-type:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const contentLength = stdout.match(/^content-length:\s*(.+)$/im)?.[1]?.trim() ?? null;
  return {
    url,
    ok: status >= 200 && status < 400,
    status,
    contentType,
    contentLength,
    transport: "curl",
    elapsedMs
  };
}

async function probeWithCurl(url, startedAt) {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-L",
      "--max-time",
      "20",
      "-I",
      "-A",
      "GlossAtelier/0.1",
      url
    ]);
    return parseCurlHeaders(stdout, url, Date.now() - startedAt);
  } catch (error) {
    return {
      url,
      ok: false,
      error: error.stderr?.trim() || error.message,
      transport: "curl",
      elapsedMs: Date.now() - startedAt
    };
  }
}

async function probeUrl(url) {
  const startedAt = Date.now();
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "GlossAtelier/0.1" }
    });
    if (!response.ok || response.status === 405) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { range: "bytes=0-2047", "user-agent": "GlossAtelier/0.1" }
      });
    }
    if (!response.ok) return probeWithCurl(url, startedAt);
    return {
      url,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      transport: "fetch",
      elapsedMs: Date.now() - startedAt
    };
  } catch (error) {
    return probeWithCurl(url, startedAt);
  }
}

function extraUrls(source) {
  return ["repository", "ctext"]
    .map((key) => source.sourceRefs?.[key])
    .filter((value) => typeof value === "string" && /^https?:\/\//.test(value));
}

async function main() {
  const catalog = await loadCatalog();
  const checkedAt = nowIso();
  const sources = [];
  for (const source of catalog.sources) {
    const urls = [...new Set([source.primaryUrl, source.rawUrl, ...extraUrls(source)])];
    const probes = [];
    for (const url of urls) probes.push(await probeUrl(url));
    sources.push({
      id: source.id,
      title: source.title,
      checkedAt,
      ok: probes.every((probe) => probe.ok),
      probes
    });
  }
  await writeJson(resolveRoot("data", "source-status.json"), {
    version: 1,
    checkedAt,
    sources
  });
  for (const source of sources) {
    console.log(`${source.ok ? "OK" : "FAIL"} ${source.id}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
