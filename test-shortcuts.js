const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadSettings } = require('./electron/settingsManager');

async function runTests() {
  console.log('🧪 Iniciando teste de Atalhos de Teclado e Janela Flutuante...');

  // 1. Test formatAccelerator
  console.log('1. Testando formatAccelerator...');
  const code = fs.readFileSync(path.join(__dirname, 'src/renderer/lib/shortcutUtils.js'), 'utf8')
    .replace('export function formatAccelerator', 'function formatAccelerator');
  const formatAccelerator = new Function(`${code}; return formatAccelerator;`)();

  const winTokens = formatAccelerator('CommandOrControl+Shift+Space', false);
  assert.deepStrictEqual(winTokens, ['Ctrl', 'Shift', 'Espaço'], 'Tokens Windows para CommandOrControl+Shift+Space devem ser Ctrl, Shift, Espaço');

  const macTokens = formatAccelerator('CommandOrControl+Shift+Space', true);
  assert.deepStrictEqual(macTokens, ['⌘ Cmd', '⇧ Shift', 'Space'], 'Tokens Mac para CommandOrControl+Shift+Space devem ser ⌘ Cmd, ⇧ Shift, Space');

  const altTokens = formatAccelerator('Alt+Shift+G', false);
  assert.deepStrictEqual(altTokens, ['Alt', 'Shift', 'G'], 'Tokens para Alt+Shift+G');
  console.log('   ✅ formatAccelerator funcionando corretamente para Windows e macOS');

  // 2. Test translations file content
  console.log('2. Testando arquivo de traduções...');
  const translationsContent = fs.readFileSync(path.join(__dirname, 'src/renderer/i18n/translations.js'), 'utf8');
  assert.ok(translationsContent.includes("keyboardShortcuts: 'Atalhos de Teclado (Ctrl+/)'"), 'Tradução pt.header.keyboardShortcuts deve existir');
  assert.ok(translationsContent.includes("keyboardShortcuts: 'Keyboard Shortcuts (Ctrl+/)'"), 'Tradução en.header.keyboardShortcuts deve existir');
  assert.ok(translationsContent.includes("title: 'Central de Atalhos de Teclado'"), 'Tradução pt.shortcuts.title deve existir');
  assert.ok(translationsContent.includes("title: 'Keyboard Shortcuts Central'"), 'Tradução en.shortcuts.title deve existir');
  assert.ok(translationsContent.includes("popupShortcutLabel: 'Atalho Global do Sistema'"), 'Tradução pt.settings.popupShortcutLabel deve existir');
  assert.ok(translationsContent.includes("popupShortcutLabel: 'Global System Hotkey'"), 'Tradução en.settings.popupShortcutLabel deve existir');
  assert.ok(translationsContent.includes("popupToggle: 'Abrir / Alternar Janela Flutuante'"), 'Tradução pt.shortcuts.items.popupToggle deve existir');
  console.log('   ✅ Todas as traduções de atalhos e janela flutuante estão completas');

  // 3. Test settingsManager defaults
  console.log('3. Testando valores padrão de settingsManager...');
  const mockSettings = loadSettings();
  assert.strictEqual(mockSettings.popupShortcut, 'CommandOrControl+Shift+Space', 'popupShortcut default deve ser CommandOrControl+Shift+Space');
  assert.strictEqual(mockSettings.popupEnabled, true, 'popupEnabled default deve ser true');
  console.log('   ✅ Configurações padrão de atalhos validadas');

  console.log('\n🎉 TODOS OS TESTES DE ATALHOS PASSARAM COM SUCESSO!');
}

runTests().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
