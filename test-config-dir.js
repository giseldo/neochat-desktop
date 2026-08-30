const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    getDefaultUserDataPath,
    getPointerFilePath,
    bootstrapUserDataPath,
    getConfigDirInfo,
    changeUserDataPath,
    resetDefaultUserDataPath,
    copyRecursively
} = require('./electron/configDirManager');

async function run() {
    console.log('Testing ConfigDirManager...');

    const baseTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-configdir-test-'));
    const defaultUserDataDir = path.join(baseTempDir, 'appData', 'neochat-desktop');
    fs.mkdirSync(defaultUserDataDir, { recursive: true });

    let activeUserData = defaultUserDataDir;

    const mockApp = {
        getPath: (name) => {
            if (name === 'appData') return path.join(baseTempDir, 'appData');
            if (name === 'userData') return activeUserData;
            return baseTempDir;
        },
        setPath: (name, val) => {
            if (name === 'userData') {
                activeUserData = val;
            }
        },
        getName: () => 'neochat-desktop'
    };

    try {
        // 1. Initial State: Default path
        const initialInfo = getConfigDirInfo(mockApp);
        assert.strictEqual(initialInfo.isCustom, false, 'Initial state should not be custom');
        assert.strictEqual(path.resolve(initialInfo.currentPath), path.resolve(defaultUserDataDir));

        // Create sample config files in default directory
        const sampleSettings = { language: 'pt', model: 'llama-3.3-70b-versatile', customKey: 'val123' };
        fs.writeFileSync(path.join(defaultUserDataDir, 'settings.json'), JSON.stringify(sampleSettings));
        fs.writeFileSync(path.join(defaultUserDataDir, 'projects.json'), JSON.stringify([{ id: 'p1', name: 'Project 1' }]));
        
        const chatDir = path.join(defaultUserDataDir, 'chat-history');
        fs.mkdirSync(chatDir, { recursive: true });
        fs.writeFileSync(path.join(chatDir, 'chat-1.json'), JSON.stringify({ id: 'chat-1', title: 'Test Chat' }));

        // 2. Change to Custom Directory with file copying
        const customTargetDir = path.join(baseTempDir, 'custom-configs');
        let changeCallbackCalled = false;
        const changeResult = await changeUserDataPath(mockApp, customTargetDir, {
            copyExisting: true,
            onConfigDirChanged: async (newPath, oldPath) => {
                changeCallbackCalled = true;
                assert.strictEqual(path.resolve(newPath), path.resolve(customTargetDir));
                assert.strictEqual(path.resolve(oldPath), path.resolve(defaultUserDataDir));
            }
        });

        assert.strictEqual(changeResult.success, true, 'changeUserDataPath should succeed');
        assert.strictEqual(changeResult.isCustom, true, 'isCustom should be true');
        assert.strictEqual(changeCallbackCalled, true, 'onConfigDirChanged callback should be called');
        assert.strictEqual(path.resolve(mockApp.getPath('userData')), path.resolve(customTargetDir));

        // Verify files were copied to custom directory
        assert.ok(fs.existsSync(path.join(customTargetDir, 'settings.json')), 'settings.json must exist in custom folder');
        assert.ok(fs.existsSync(path.join(customTargetDir, 'projects.json')), 'projects.json must exist in custom folder');
        assert.ok(fs.existsSync(path.join(customTargetDir, 'chat-history', 'chat-1.json')), 'chat file must exist in custom folder');

        const copiedSettings = JSON.parse(fs.readFileSync(path.join(customTargetDir, 'settings.json'), 'utf8'));
        assert.strictEqual(copiedSettings.customKey, 'val123', 'settings content must match');

        // Verify pointer file was written in default directory
        const pointerPath = getPointerFilePath(mockApp);
        assert.ok(fs.existsSync(pointerPath), 'Pointer file must exist');
        const pointerData = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
        assert.strictEqual(path.resolve(pointerData.customUserDataPath), path.resolve(customTargetDir));

        // 3. Test info when custom
        const customInfo = getConfigDirInfo(mockApp);
        assert.strictEqual(customInfo.isCustom, true);
        assert.strictEqual(path.resolve(customInfo.currentPath), path.resolve(customTargetDir));
        assert.strictEqual(path.resolve(customInfo.defaultPath), path.resolve(defaultUserDataDir));

        // 4. Test bootstrapUserDataPath on fresh app launch
        let freshAppUserData = defaultUserDataDir;
        const freshMockApp = {
            getPath: (name) => {
                if (name === 'appData') return path.join(baseTempDir, 'appData');
                if (name === 'userData') return freshAppUserData;
                return baseTempDir;
            },
            setPath: (name, val) => {
                if (name === 'userData') {
                    freshAppUserData = val;
                }
            },
            getName: () => 'neochat-desktop'
        };

        const bootstrappedPath = bootstrapUserDataPath(freshMockApp);
        assert.strictEqual(path.resolve(bootstrappedPath), path.resolve(customTargetDir), 'bootstrap must restore custom path from pointer file');
        assert.strictEqual(path.resolve(freshMockApp.getPath('userData')), path.resolve(customTargetDir));

        // 5. Test Resetting to Default
        // Add a new file in custom directory
        fs.writeFileSync(path.join(customTargetDir, 'new-in-custom.json'), JSON.stringify({ custom: true }));

        let resetCallbackCalled = false;
        const resetResult = await resetDefaultUserDataPath(mockApp, {
            copyExisting: true,
            onConfigDirChanged: async (newPath) => {
                resetCallbackCalled = true;
                assert.strictEqual(path.resolve(newPath), path.resolve(defaultUserDataDir));
            }
        });

        assert.strictEqual(resetResult.success, true, 'resetDefaultUserDataPath should succeed');
        assert.strictEqual(resetResult.isCustom, false);
        assert.strictEqual(resetCallbackCalled, true);
        assert.strictEqual(path.resolve(mockApp.getPath('userData')), path.resolve(defaultUserDataDir));
        assert.ok(!fs.existsSync(pointerPath), 'Pointer file should be removed upon reset');
        assert.ok(fs.existsSync(path.join(defaultUserDataDir, 'new-in-custom.json')), 'New file must be copied back to default folder');

        const afterResetInfo = getConfigDirInfo(mockApp);
        assert.strictEqual(afterResetInfo.isCustom, false);

        // 6. Test Legacy Migration from groq-desktop-app to neochat-desktop
        const migrationBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-mig-test-'));
        const legacyDir = path.join(migrationBaseDir, 'appData', 'groq-desktop-app');
        const newDefaultDir = path.join(migrationBaseDir, 'appData', 'neochat-desktop');
        fs.mkdirSync(legacyDir, { recursive: true });
        fs.writeFileSync(path.join(legacyDir, 'settings.json'), JSON.stringify({ legacyMigrated: true }));
        fs.writeFileSync(path.join(legacyDir, 'secrets.vault'), 'encrypted-data');

        let migrationUserData = newDefaultDir;
        const migrationMockApp = {
            getPath: (name) => {
                if (name === 'appData') return path.join(migrationBaseDir, 'appData');
                if (name === 'userData') return migrationUserData;
                return migrationBaseDir;
            },
            setPath: (name, val) => {
                if (name === 'userData') {
                    migrationUserData = val;
                }
            },
            getName: () => 'neochat-desktop'
        };

        const migratedPath = bootstrapUserDataPath(migrationMockApp);
        assert.strictEqual(path.resolve(migratedPath), path.resolve(newDefaultDir));
        assert.ok(fs.existsSync(path.join(newDefaultDir, 'settings.json')), 'settings.json must be migrated from legacy folder');
        assert.ok(fs.existsSync(path.join(newDefaultDir, 'secrets.vault')), 'secrets.vault must be migrated from legacy folder');
        const migratedSettings = JSON.parse(fs.readFileSync(path.join(newDefaultDir, 'settings.json'), 'utf8'));
        assert.strictEqual(migratedSettings.legacyMigrated, true);

        fs.rmSync(migrationBaseDir, { recursive: true, force: true });

        console.log('All ConfigDirManager tests passed successfully!');
    } finally {
        fs.rmSync(baseTempDir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error('Test failed:', error);
    process.exitCode = 1;
});
