const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getUnversionedNames, prepareLatestAssets } = require('../scripts/prepare-latest-assets.js');

console.log('--- Testing scripts/prepare-latest-assets.js ---');

// Test 1: getUnversionedNames for Windows installer
const winExeNames = getUnversionedNames('NeoChat Desktop-Setup-0.0.5.exe', '0.0.5');
console.log('Windows installer aliases:', winExeNames);
assert(winExeNames.includes('NeoChat-Setup.exe'), 'Should include NeoChat-Setup.exe');
assert(winExeNames.includes('NeoChat Desktop-Setup.exe'), 'Should include NeoChat Desktop-Setup.exe');

// Test 2: Portable
const winPortableNames = getUnversionedNames('NeoChat-Portable-0.0.5.exe', '0.0.5');
console.log('Windows portable aliases:', winPortableNames);
assert(winPortableNames.includes('NeoChat-Portable.exe'), 'Should include NeoChat-Portable.exe');

// Test 3: Mac DMG
const macDmgNames = getUnversionedNames('NeoChat Desktop-0.0.5.dmg', '0.0.5');
console.log('macOS DMG aliases:', macDmgNames);
assert(macDmgNames.includes('NeoChat-Desktop.dmg') || macDmgNames.includes('NeoChat.dmg'), 'Should include unversioned DMG aliases');

// Test 4: File directory generation simulation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-assets-test-'));
const testFiles = [
  'NeoChat Desktop-Setup-0.0.5.exe',
  'NeoChat-Portable-0.0.5.exe',
  'NeoChat Desktop-0.0.5.dmg',
  'latest.yml'
];

testFiles.forEach(f => {
  fs.writeFileSync(path.join(tempDir, f), 'mock-binary-content');
});

const generated = prepareLatestAssets(tempDir, '0.0.5');
assert(generated.length > 0, 'Should generate unversioned files');
assert(fs.existsSync(path.join(tempDir, 'NeoChat-Setup.exe')), 'NeoChat-Setup.exe must exist in target dir');
assert(fs.existsSync(path.join(tempDir, 'NeoChat-Portable.exe')), 'NeoChat-Portable.exe must exist in target dir');
assert(fs.existsSync(path.join(tempDir, 'NeoChat.dmg')) || fs.existsSync(path.join(tempDir, 'NeoChat-Desktop.dmg')), 'NeoChat unversioned dmg must exist');

// Clean up
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('✔ All prepareLatestAssets tests passed successfully!');
