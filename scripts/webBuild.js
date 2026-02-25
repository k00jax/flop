#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const isWindows = process.platform === "win32";
const docsPath = path.join(process.cwd(), "docs");

fs.rmSync(docsPath, { recursive: true, force: true });

const env = { ...process.env };
if (isWindows) {
  env.PARCEL_DISABLE_CACHE = "true";
  env.PARCEL_WORKERS = "1";
}

const parcelCommand = process.execPath;
const parcelBin = path.join(process.cwd(), "node_modules", "parcel", "lib", "bin.js");
const parcelArgs = [
  parcelBin,
  "build",
  "--dist-dir",
  "docs",
  "--public-url",
  "./",
  "--no-source-maps",
  "--no-content-hash",
  "application/index.html",
];

const result = spawnSync(parcelCommand, parcelArgs, {
  env,
  encoding: "utf8",
  shell: false,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}

const status = Number.isInteger(result.status) ? result.status : 1;
const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const builtSuccessfully = /Built in/i.test(output);
const docsExists =
  fs.existsSync(docsPath) &&
  fs.statSync(docsPath).isDirectory() &&
  fs.readdirSync(docsPath).length > 0;

const ACCESS_VIOLATION_SIGNED = -1073741819;
const ACCESS_VIOLATION_UNSIGNED = 3221225477;
const isAccessViolation =
  status === ACCESS_VIOLATION_SIGNED || status === ACCESS_VIOLATION_UNSIGNED;

if (isWindows && isAccessViolation && builtSuccessfully && docsExists) {
  console.warn(
    "Parcel exited with Windows access-violation after successful output; treating as tooling defect and continuing.",
  );
  process.exit(0);
}

process.exit(status);
