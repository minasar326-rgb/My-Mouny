import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const gitPath = "git";
const root = process.cwd();
const distDir = path.join(root, "dist");

console.log("Pushing pre-built static assets from dist/ to gh-pages branch...");

if (!fs.existsSync(distDir)) {
  throw new Error("dist directory does not exist! Run npm run export:gh-pages first.");
}

// Remove any existing .git inside dist
const distGit = path.join(distDir, ".git");
if (fs.existsSync(distGit)) {
  fs.rmSync(distGit, { recursive: true, force: true });
}

execSync(`"${gitPath}" init`, { cwd: distDir, stdio: "inherit" });
execSync(`"${gitPath}" add -A`, { cwd: distDir, stdio: "inherit" });
execSync(`"${gitPath}" commit -m "deploy: static GitHub Pages build for my Mouny 100% offline and persistent"`, { cwd: distDir, stdio: "inherit" });
execSync(`"${gitPath}" branch -M gh-pages`, { cwd: distDir, stdio: "inherit" });

// 1. Push to primary My-Mouny repo
console.log("Pushing to My-Mouny gh-pages...");
execSync(`"${gitPath}" remote add origin https://github.com/minasar326-rgb/My-Mouny.git`, { cwd: distDir, stdio: "inherit" });
execSync(`"${gitPath}" push -f origin gh-pages`, { cwd: distDir, stdio: "inherit" });

// 2. Also push to Zaker-MB as fallback mirror
try {
  console.log("Pushing mirror to Zaker-MB gh-pages...");
  execSync(`"${gitPath}" remote set-url origin https://github.com/minasar326-rgb/Zaker-MB.git`, { cwd: distDir, stdio: "inherit" });
  execSync(`"${gitPath}" push -f origin gh-pages`, { cwd: distDir, stdio: "inherit" });
} catch (e) {
  console.warn("Mirror push to Zaker-MB skipped:", e.message);
}

console.log("Successfully pushed to gh-pages branches!");
