#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const packageDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(packageDir, 'package.json');
const pnpmLockPath = path.join(packageDir, 'pnpm-lock.yaml');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function log(message) {
  process.stderr.write(`[smart-explore install] ${message}\n`);
}

function fail(message, exitCode = 1) {
  log(message);
  process.exit(exitCode);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to read ${filePath}: ${error.message}`);
  }
}

function getRequiredNodeMajor(packageJson) {
  const engineRange = packageJson.engines && packageJson.engines.node;
  const match = typeof engineRange === 'string' ? engineRange.match(/(\d+)/) : null;
  return match ? Number(match[1]) : 18;
}

function ensureNodeVersion(packageJson) {
  const requiredMajor = getRequiredNodeMajor(packageJson);
  const currentMajor = Number(process.versions.node.split('.')[0]);

  if (!Number.isInteger(currentMajor) || currentMajor < requiredMajor) {
    fail(`Node ${requiredMajor}+ is required, found ${process.version}`);
  }
}

function runCommand(command, args, options = {}) {
  const description = options.description || `${command} ${args.join(' ')}`;

  return new Promise((resolve, reject) => {
    log(description);

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => process.stderr.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));

    child.on('error', (error) => {
      reject(new Error(`Failed to start ${command}: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${description} terminated with signal ${signal}`));
        return;
      }

      if ((code ?? 1) !== 0) {
        const error = new Error(`${description} exited with code ${code}`);
        error.exitCode = code ?? 1;
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  if (!fs.existsSync(pnpmLockPath)) {
    fail(`Missing ${pnpmLockPath}; cannot run pnpm install --frozen-lockfile.`);
  }

  const packageJson = readJson(packageJsonPath);
  ensureNodeVersion(packageJson);

  await runCommand(pnpmCommand, ['install', '--frozen-lockfile'], {
    cwd: packageDir,
    description: 'Running pnpm install --frozen-lockfile for smart-explore',
  });

  log('Dependencies installed.');
}

main().catch((error) => {
  const exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
  fail(error.message, exitCode);
});
