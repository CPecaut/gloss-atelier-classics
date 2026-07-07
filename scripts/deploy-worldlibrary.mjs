import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, repoRoot, resolveRoot } from "./lib/io.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(here, "build-worldlibrary-site.mjs");
const distDir = resolveRoot("dist", "worldlibrary");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      ...options
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const args = parseArgs();
  const server = args.server ?? process.env.WORLDLIBRARY_SERVER ?? "bitnami@54.255.236.47";
  const port = args.port ?? process.env.WORLDLIBRARY_SERVER_PORT ?? "2222";
  const key =
    args.key ?? process.env.WORLDLIBRARY_SERVER_KEY ?? "/Users/oracle/speechweb/keys/NewKey.pem";
  const remoteDir =
    args.remoteDir ??
    process.env.WORLDLIBRARY_REMOTE_DIR ??
    "/opt/bitnami/apache/htdocs/public/worldlibrary";
  const ssh = ["ssh", "-i", key, "-p", String(port), "-o", "StrictHostKeyChecking=no"].join(" ");

  await run(process.execPath, [buildScript]);
  await run("ssh", [
    "-i",
    key,
    "-p",
    String(port),
    "-o",
    "StrictHostKeyChecking=no",
    server,
    `mkdir -p ${JSON.stringify(remoteDir)}`
  ]);
  await run("rsync", [
    "-az",
    "--delete",
    "-e",
    ssh,
    `${distDir}/`,
    `${server}:${remoteDir}/`
  ]);
  console.log(`Deployed World Library site to ${server}:${remoteDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
