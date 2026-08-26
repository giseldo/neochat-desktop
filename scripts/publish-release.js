const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_TARGET = 'giseldo/neochat-releases';
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = 'v' + version;
const releaseDir = path.join(__dirname, '..', 'release');

console.log('\n📦 Publishing release ' + tag + ' to ' + REPO_TARGET + '...');

if (!fs.existsSync(releaseDir)) {
  console.error('❌ Release directory does not exist: ' + releaseDir);
  process.exit(1);
}

const allFiles = fs.readdirSync(releaseDir);
const filesToUpload = allFiles
  .filter((file) => {
    if (file === 'latest.yml' || file === 'latest-mac.yml' || file === 'latest-linux.yml') return true;
    if (file.includes(version) && (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.zip') || file.endsWith('.AppImage') || file.endsWith('.deb') || file.endsWith('.blockmap'))) {
      return true;
    }
    return false;
  })
  .map((file) => path.join(releaseDir, file));

if (filesToUpload.length === 0) {
  console.error('❌ No release artifacts found for version ' + version + ' in ' + releaseDir);
  process.exit(1);
}

console.log('Found ' + filesToUpload.length + ' artifacts to upload:');
filesToUpload.forEach((f) => console.log(' - ' + path.basename(f)));

const quotedFiles = filesToUpload.map((f) => '"' + f + '"').join(' ');

let releaseExists = false;
try {
  execSync('gh release view ' + tag + ' -R ' + REPO_TARGET, { stdio: 'ignore' });
  releaseExists = true;
} catch (e) {
  releaseExists = false;
}

if (releaseExists) {
  console.log('\nRelease ' + tag + ' already exists on ' + REPO_TARGET + '. Uploading/updating assets...');
  execSync('gh release upload --repo ' + REPO_TARGET + ' ' + tag + ' ' + quotedFiles + ' --clobber', { stdio: 'inherit' });
} else {
  console.log('\nCreating release ' + tag + ' on ' + REPO_TARGET + '...');
  const title = 'NeoChat Desktop ' + tag;
  const notes = '## NeoChat Desktop ' + tag + '\n\nAutomated release of NeoChat Desktop.';
  execSync('gh release create --repo ' + REPO_TARGET + ' ' + tag + ' ' + quotedFiles + ' --title "' + title + '" --notes "' + notes + '"', { stdio: 'inherit' });
}

console.log('\n✅ Release ' + tag + ' successfully published to https://github.com/' + REPO_TARGET + '/releases/tag/' + tag + '\n');
