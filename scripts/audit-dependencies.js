const { spawnSync } = require('child_process');

const acceptedUnpatchedAdvisories = new Map([
  [
    'GHSA-jmr9-qjv8-65gv',
    'extract-zip is used only by Electron during dependency installation; the advisory has no patched npm release.'
  ]
]);

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error('Run this audit through pnpm: pnpm security:audit');

const result = spawnSync(process.execPath, [pnpmEntry, 'audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024
});

if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  console.error(result.stderr || result.stdout);
  throw new Error(`Could not parse pnpm audit output: ${error.message}`);
}

const advisories = Object.values(report.advisories || {});
const blocking = advisories.filter((advisory) => {
  if (!['critical', 'high'].includes(advisory.severity)) return false;
  return !acceptedUnpatchedAdvisories.has(advisory.github_advisory_id);
});

for (const advisory of advisories) {
  const rationale = acceptedUnpatchedAdvisories.get(advisory.github_advisory_id);
  if (rationale) {
    console.warn(`Accepted unpatched advisory ${advisory.github_advisory_id}: ${rationale}`);
  }
}

const counts = report.metadata?.vulnerabilities || {};
console.log(`Audit totals: ${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.moderate || 0} moderate, ${counts.low || 0} low.`);

if (blocking.length > 0) {
  for (const advisory of blocking) {
    console.error(`${advisory.severity.toUpperCase()} ${advisory.module_name}: ${advisory.github_advisory_id || advisory.id}`);
  }
  process.exitCode = 1;
} else {
  console.log('No unaccepted critical or high dependency advisories found.');
}
