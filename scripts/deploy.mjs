#!/usr/bin/env node
// Cross-platform deploy script (Windows / Linux / macOS).
// Steps: package .vsix  ->  uninstall existing extension (if present)  ->  install .vsix
//
// Usage:
//   node scripts/deploy.mjs            # package + (re)install
//   node scripts/deploy.mjs --package  # only build the .vsix
//   node scripts/deploy.mjs --no-package  # skip build, install existing .vsix

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const extId = `${pkg.publisher}.${pkg.name}`;
const vsixName = `${pkg.name}-${pkg.version}.vsix`;
const vsixPath = join(root, vsixName);

const args = process.argv.slice(2);
const onlyPackage = args.includes("--package");
const skipPackage = args.includes("--no-package");

// `code` is a shell script/cmd, so it must go through the shell on Windows.
const isWin = process.platform === "win32";
const codeCmd = isWin ? "code.cmd" : "code";

function run(cmd, cmdArgs, opts = {}) {
  console.log(`$ ${cmd} ${cmdArgs.join(" ")}`);
  return execFileSync(cmd, cmdArgs, { stdio: "inherit", cwd: root, shell: isWin, ...opts });
}

function codeListed() {
  try {
    const out = execSync(`${codeCmd} --list-extensions`, { cwd: root, shell: isWin })
      .toString();
    return out.split(/\r?\n/).map((s) => s.trim()).includes(extId);
  } catch {
    console.warn("⚠  `code` CLI not found on PATH — skipping uninstall/install steps.");
    console.warn("   (In VS Code: Cmd/Ctrl+Shift+P → 'Shell Command: Install code command in PATH')");
    return null; // signal: code CLI unavailable
  }
}

// 1) Package
if (!skipPackage) {
  console.log(`\n▶ Packaging ${vsixName} ...`);
  run("npx", ["--yes", "@vscode/vsce", "package"]);
} else {
  console.log("▶ Skipping package step (--no-package)");
}

if (!existsSync(vsixPath)) {
  console.error(`✗ ${vsixName} not found. Run without --no-package to build it.`);
  process.exit(1);
}

if (onlyPackage) {
  console.log(`\n✓ Built ${vsixName}`);
  process.exit(0);
}

// 2) Uninstall if present
const listed = codeListed();
if (listed === null) {
  console.log(`\n✓ Built ${vsixName} (install skipped — no code CLI).`);
  process.exit(0);
}
if (listed) {
  console.log(`\n▶ Uninstalling existing ${extId} ...`);
  run(codeCmd, ["--uninstall-extension", extId]);
} else {
  console.log(`\n▶ ${extId} not currently installed — fresh install.`);
}

// 3) Install
console.log(`\n▶ Installing ${vsixName} ...`);
run(codeCmd, ["--install-extension", vsixPath, "--force"]);

console.log(`\n✓ Deployed ${extId} (${pkg.version}). Reload VS Code and open the Eyes view from the Activity Bar.`);
