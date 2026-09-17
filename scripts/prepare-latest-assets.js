const fs = require('fs');
const path = require('path');

function getUnversionedNames(filename, version) {
  const ext = path.extname(filename);
  if (!['.exe', '.dmg', '.zip', '.AppImage', '.deb', '.rpm'].includes(ext)) {
    return [];
  }

  const escapedVersion = version.replace(/\./g, '\\.');
  const versionRegex = new RegExp(`[-_\\s]?v?${escapedVersion}`, 'gi');

  if (!versionRegex.test(filename)) {
    return [];
  }

  // Basic unversioned base name
  const baseUnversioned = filename.replace(versionRegex, '').replace(/\s+/g, ' ').trim();
  const candidates = new Set();

  if (baseUnversioned && baseUnversioned !== filename) {
    candidates.add(baseUnversioned);

    // Also add version with spaces replaced by hyphens for URL-friendly links
    const hyphenated = baseUnversioned.replace(/\s+/g, '-');
    candidates.add(hyphenated);

    // Common simplified aliases (e.g. NeoChat Desktop-Setup -> NeoChat-Setup)
    const simplified = hyphenated.replace(/NeoChat-Desktop/g, 'NeoChat');
    candidates.add(simplified);

    // E.g. NeoChat-Desktop.dmg / NeoChat.dmg
    if (ext === '.dmg') {
      candidates.add('NeoChat-Desktop.dmg');
      candidates.add('NeoChat.dmg');
    }
  }

  return Array.from(candidates).filter(name => name !== filename && name.length > ext.length);
}

function prepareLatestAssets(targetDir, version) {
  const resolvedDir = targetDir || path.join(__dirname, '..', 'release');
  if (!fs.existsSync(resolvedDir)) {
    console.log(`Directory does not exist: ${resolvedDir}`);
    return [];
  }

  const resolvedVersion = version || require('../package.json').version;
  const files = fs.readdirSync(resolvedDir);
  const createdFiles = [];

  for (const file of files) {
    const filePath = path.join(resolvedDir, file);
    if (!fs.statSync(filePath).isFile()) continue;

    const unversionedNames = getUnversionedNames(file, resolvedVersion);
    for (const unversioned of unversionedNames) {
      const destPath = path.join(resolvedDir, unversioned);
      try {
        fs.copyFileSync(filePath, destPath);
        console.log(`✔ Generated unversioned asset: ${unversioned} (from ${file})`);
        createdFiles.push(destPath);
      } catch (err) {
        console.error(`❌ Failed to create ${unversioned}:`, err.message);
      }
    }
  }

  return createdFiles;
}

if (require.main === module) {
  const dir = process.argv[2];
  const ver = process.argv[3];
  console.log('\n📦 Preparing unversioned latest assets for release...');
  const results = prepareLatestAssets(dir, ver);
  console.log(`✨ Total unversioned assets prepared: ${results.length}\n`);
}

module.exports = {
  getUnversionedNames,
  prepareLatestAssets
};
