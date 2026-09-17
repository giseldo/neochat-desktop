const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_TARGET = 'giseldo/neochat-desktop';
const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

function run(command, options = {}) {
  console.log(`\n> ${command}`);
  if (options.dryRun) {
    console.log('  [dry-run] skipped execution');
    return '';
  }
  return execSync(command, { cwd: rootDir, stdio: options.silent ? 'pipe' : 'inherit', encoding: 'utf8' });
}

function parseSemver(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || ''
  };
}

function calculateNextVersion(currentVersion, bumpType = 'patch') {
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Current version in package.json ("${currentVersion}") is not valid SemVer (X.Y.Z).`);
  }

  const type = bumpType.toLowerCase().trim();
  if (type === 'patch') {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  if (type === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (type === 'major') {
    return `${parsed.major + 1}.0.0`;
  }

  // Explicit version string provided (e.g. 0.0.1 or v0.0.1)
  const explicit = bumpType.replace(/^v/, '');
  if (parseSemver(explicit)) {
    return explicit;
  }

  throw new Error(`Unknown bump type or invalid version: "${bumpType}". Expected: "patch", "minor", "major", or a version like "0.0.6".`);
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isLocalBuild = args.includes('--local');
  const isSkipPush = args.includes('--skip-push');
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`
NeoChat Desktop - Automated Release Tool

Usage:
  node scripts/release.js [patch|minor|major|<version>] [options]
  pnpm release:create [patch|minor|major|<version>] [options]

Arguments:
  patch                  Increment patch version (0.0.5 -> 0.0.6) [Default]
  minor                  Increment minor version (0.0.5 -> 0.1.0)
  major                  Increment major version (0.0.5 -> 1.0.0)
  <version>              Specify exact version (e.g. 0.0.6)

Options:
  --dry-run              Preview steps without modifying files, tagging or pushing
  --local                Also build and upload locally instead of relying purely on GitHub Actions
  --skip-push            Skip git push to remote
  --help, -h             Show this help message
`);
    process.exit(0);
  }

  // Extract bump type (first argument that doesn't start with --)
  const bumpArg = args.find(a => !a.startsWith('--')) || 'patch';

  console.log('==============================================');
  console.log('  🚀 NeoChat Desktop - Automated Release');
  console.log('==============================================');
  if (isDryRun) console.log('⚠️  RUNNING IN DRY-RUN MODE (No changes will be made)\n');

  // 1. Read package.json
  const pkgContent = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgContent);
  const currentVersion = pkg.version;
  const nextVersion = calculateNextVersion(currentVersion, bumpArg);
  const tag = `v${nextVersion}`;

  console.log(`Current version: ${currentVersion}`);
  console.log(`Target version:  ${nextVersion} (${tag})`);
  console.log(`Target repo:     ${REPO_TARGET}`);

  // 2. Check git tag collision
  try {
    const existingTag = execSync(`git tag -l "${tag}"`, { encoding: 'utf8' }).trim();
    if (existingTag) {
      console.error(`\n❌ Git tag ${tag} already exists locally!`);
      process.exit(1);
    }
  } catch (e) {
    // Ignore error if check fails
  }

  // 3. Update package.json
  console.log(`\n[1/3] Updating package.json to ${nextVersion}...`);
  if (!isDryRun) {
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`✔ package.json version updated to ${nextVersion}`);
  } else {
    console.log(`  [dry-run] Would update package.json version to ${nextVersion}`);
  }

  // 4. Commit & Tag
  console.log(`\n[2/3] Creating Git commit and tag (${tag})...`);
  run('git add -A', { dryRun: isDryRun });
  run(`git commit -m "chore(release): bump version to ${nextVersion}"`, { dryRun: isDryRun });
  run(`git tag ${tag}`, { dryRun: isDryRun });
  console.log(`✔ Git commit and tag ${tag} created.`);

  // 5. Push to remote
  console.log(`\n[3/3] Pushing commit and tag ${tag} to origin main...`);
  if (!isSkipPush) {
    run(`git push origin main && git push origin ${tag}`, { dryRun: isDryRun });
    console.log(`✔ Git push completed.`);
  } else {
    console.log('⏩ Skipping git push (--skip-push).');
  }

  // Optional local build/publish if requested
  if (isLocalBuild) {
    console.log('\n[Local Build] Building and uploading release locally (--local)...');
    run('pnpm dist:win', { dryRun: isDryRun });
    run('node scripts/publish-release.js', { dryRun: isDryRun });
  }

  console.log('\n==============================================');
  console.log(`🎉 Release ${tag} triggered successfully!`);
  console.log(`⚙️  GitHub Actions CI/CD is compiling and publishing artifacts:`);
  console.log(`   https://github.com/${REPO_TARGET}/actions`);
  console.log(`🔗 Release URL when ready:`);
  console.log(`   https://github.com/${REPO_TARGET}/releases/tag/${tag}`);
  console.log('==============================================\n');
}

main();
