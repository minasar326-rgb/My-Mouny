import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const gitPath = "git";
const root = process.cwd();
const distDir = path.join(root, "dist");

const remotes = [
  "https://github.com/minasar326-rgb/Zaker-MB.git",
];

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

for (const remoteUrl of remotes) {
  try {
    console.log(`Pushing directly to ${remoteUrl} gh-pages...`);
    try {
      execSync(`"${gitPath}" remote remove current`, { cwd: distDir, stdio: "ignore" });
    } catch {}
    execSync(`"${gitPath}" remote add current ${remoteUrl}`, { cwd: distDir, stdio: "inherit" });
    execSync(`"${gitPath}" push -f current gh-pages`, { cwd: distDir, stdio: "inherit" });
    console.log(`Successfully pushed to ${remoteUrl} gh-pages!`);
  } catch (err) {
    console.error(`Warning: Failed to push to ${remoteUrl}:`, err.message);
  }
}

console.log("All deployments to gh-pages completed!");
