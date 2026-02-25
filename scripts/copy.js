#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const mode = process.argv[2];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRecursive(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

if (mode === "kaios") {
  const root = process.cwd();
  const dist = path.join(root, "dist");
  const appAssets = path.join(root, "application", "assets");

  ensureDir(path.join(dist, "assets"));
  ensureDir(path.join(dist, "assets", "js"));
  ensureDir(path.join(root, "build"));

  copyRecursive(path.join(appAssets, "icons"), path.join(dist, "assets", "icons"));
  copyRecursive(path.join(appAssets, "image"), path.join(dist, "assets", "image"));
  fs.copyFileSync(
    path.join(appAssets, "js", "kaiads.v5.min.js"),
    path.join(dist, "assets", "js", "kaiads.v5.min.js"),
  );

  process.exit(0);
}

if (mode === "remove") {
  const target = process.argv[3];
  if (!target) process.exit(0);

  const abs = path.resolve(process.cwd(), target);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
  }
  process.exit(0);
}

if (mode === "web") {
  console.log("Parcel-only web build: no extra copy step required.");
  process.exit(0);
}

console.log("Usage: node scripts/copy.js [kaios|remove <path>|web]");
process.exit(0);
