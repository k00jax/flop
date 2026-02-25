#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const isWindows = process.platform === "win32";
const rootDir = process.cwd();
const cachePath = path.join(rootDir, ".parcel-cache");

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // intentional blocking delay for sync startup retries
  }
}

function clearParcelCacheWithRetry(targetPath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      const code = error && error.code ? error.code : "";
      const canRetry =
        (code === "EBUSY" || code === "EPERM") && attempt < maxRetries;
      if (!canRetry) {
        return false;
      }
      sleep(150 * attempt);
    }
  }
  return false;
}

const cacheCleared = clearParcelCacheWithRetry(cachePath);

const env = { ...process.env };
if (isWindows) {
  env.PARCEL_DISABLE_CACHE = "true";
  env.PARCEL_WORKERS = "1";
}

let command;
let args;
let cacheDirOverride = "";

if (!cacheCleared) {
  cacheDirOverride = `.parcel-cache-dev-${Date.now()}`;
  console.warn(
    `[flop] warning: could not clear .parcel-cache (locked). Using ${cacheDirOverride} for this run.`,
  );
}

if (isWindows) {
  command = process.execPath;
  args = [
    path.join(rootDir, "node_modules", "parcel", "lib", "bin.js"),
    "application/index.html",
    "--open",
  ];
} else {
  command = "npx";
  args = ["parcel", "application/index.html", "--open"];
}

if (cacheDirOverride) {
  args.push("--cache-dir", cacheDirOverride);
}

console.log("[flop] web:dev entry: application/index.html");

const child = spawn(command, args, {
  cwd: rootDir,
  env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message || error);
  process.exit(1);
});
