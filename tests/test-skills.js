const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { SkillManager, CURATED_CATALOG } = require('../electron/skillManager');

async function runTests() {
  console.log('🧪 Testing SkillManager backend...\n');

  const testDir = path.join(__dirname, 'test-temp-userdata');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  const mockApp = {
    getPath: (name) => {
      if (name === 'userData') return testDir;
      return testDir;
    }
  };

  const manager = new SkillManager();
  manager.initialize(mockApp);

  // 1. Check Catalog
  const catalog = manager.getCatalog();
  assert(catalog.length >= 74, 'Catalog must contain all 63 imported skills plus native skills');
  assert(catalog.some(skill => skill.id === 'action-items-extraction'), 'Imported action-items skill must exist');
  assert(catalog.some(skill => skill.id === 'workspace-document-builder'), 'Imported workspace document skill must exist');
  assert(catalog.some(skill => skill.id === 'execution-verifier'), 'Imported execution verifier skill must exist');
  assert(
    catalog.find(skill => skill.id === 'action-items-extraction').instructions.includes('# Action Items Extraction'),
    'Imported skills must include their complete instructions'
  );
  console.log(`✅ Curated catalog loaded with ${catalog.length} skills.`);

  // 2. Check default installed skills (clean state on first launch)
  const initialSkills = manager.listSkills();
  assert.strictEqual(initialSkills.length, 0, 'No skills should be installed by default on first launch');
  assert.strictEqual(manager.getActiveSkills().length, 0, 'No skills should be active on first launch');
  console.log('✅ Clean initial state confirmed: 0 skills installed by default.');

  // 3. Install from catalog
  const installRes = manager.installFromCatalog('sys-architect');
  assert(installRes.success === true, 'Failed to install sys-architect from catalog');
  assert(manager.installedSkills.has('sys-architect'), 'sys-architect should be in installed map');
  console.log('✅ Installed skill from catalog: sys-architect');

  // 4. Create custom skill
  const customSkill = {
    name: 'Custom SEO Optimizer',
    description: 'Otimiza textos e artigos para SEO on-page e palavras-chave.',
    category: 'writing',
    tags: ['seo', 'marketing', 'conteudo'],
    icon: 'Sparkles',
    slashCommand: 'seo-opt',
    instructions: '# Instruções SEO\nOtimize o texto para busca orgânica com H1, H2 e densidade de palavras-chave.'
  };
  const createRes = manager.installSkill(customSkill);
  assert(createRes.success === true, 'Failed to create custom skill');
  assert(manager.installedSkills.has('custom-seo-optimizer'), 'custom-seo-optimizer must exist');
  console.log('✅ Created custom skill: custom-seo-optimizer');

  // 5. Toggle skill
  const toggleRes = manager.toggleSkill('custom-seo-optimizer', false);
  assert(toggleRes.enabled === false, 'Skill should be disabled');
  assert(manager.installedSkills.get('custom-seo-optimizer').enabled === false, 'Skill state in map must be disabled');
  console.log('✅ Toggled skill off/on');

  // 6. Test Build Skills Prompt
  const activeSkills = manager.getActiveSkills();
  const prompt = manager.buildSkillsPrompt(activeSkills);
  assert(prompt.includes('ATIVAÇÃO DE SKILLS'), 'Prompt should include header');
  assert(!prompt.includes('Custom SEO Optimizer'), 'Disabled skill should not appear in active prompt');
  console.log('✅ Built skills system prompt correctly with active skills only');

  // 7. Test Export
  const exportMd = manager.exportSkill('sys-architect', 'md');
  assert(exportMd.content.includes('---'), 'Markdown export must contain YAML frontmatter');
  assert(exportMd.filename.endsWith('.SKILL.md'), 'Export filename must end with .SKILL.md');
  console.log('✅ Exported skill as SKILL.md');

  // 8. Test Import
  const importedRes = manager.importSkillFromContent(exportMd.content, 'sys-architect-copy.md');
  assert(importedRes.success === true, 'Import must succeed');
  console.log('✅ Imported skill from Markdown string');

  // 9. Test Delete
  const delRes = manager.deleteSkill('custom-seo-optimizer');
  assert(delRes.success === true, 'Delete must succeed');
  assert(!manager.installedSkills.has('custom-seo-optimizer'), 'Deleted skill must not exist in map');
  console.log('✅ Deleted skill successfully');

  // 10. Composer active-skill marker mirrors the neo-chat interaction.
  const chatInputSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'ChatInput.jsx'), 'utf8');
  assert(chatInputSource.includes('Skills instaladas'), 'Composer must expose the installed skills popover');
  assert(chatInputSource.includes('isSkillsPopoverOpen'), 'Composer must track the skills popover state');
  assert(chatInputSource.includes("border-emerald-500 bg-emerald-500"), 'Active skills must have the green status marker');
  console.log('✅ Composer active-skill marker is connected');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ALL SKILL MANAGER TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
