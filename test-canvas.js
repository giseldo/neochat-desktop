/**
 * Test script for Canvas document lifecycle and operations
 */

const assert = require('assert');
const {
  createCanvasDocument,
  updateCanvasDocument,
  editCanvasSelection,
  computeLineDiff,
  calculateDocStats,
  handleCanvasToolCall,
  formatCanvasToHtml,
  exportCanvasToPdf,
  convertCanvasToDocx,
  exportCanvasToDocx
} = require('./electron/canvasManager');

async function runTests() {
  console.log('--- Starting Canvas System Tests ---');

  // Test 1: Document creation
  console.log('\n[Test 1] Creating Canvas Document...');
  const initialContent = `# Guia de Arquitetura\n\nEste é um guia inicial sobre o sistema.`;
  const doc = createCanvasDocument({
    title: 'Guia de Arquitetura',
    language: 'markdown',
    content: initialContent,
    summary: 'Documento criado inicialmente'
  });

  assert.ok(doc.id, 'Document should have an ID');
  assert.strictEqual(doc.title, 'Guia de Arquitetura');
  assert.strictEqual(doc.version, 1);
  assert.strictEqual(doc.content, initialContent);
  assert.strictEqual(doc.history.length, 1);
  assert.ok(doc.stats.words > 0, 'Stats words should be positive');
  console.log('✓ Document creation passed:', doc.id, 'v' + doc.version);

  // Test 2: Full Document update
  console.log('\n[Test 2] Updating Document...');
  const updatedContent = `# Guia de Arquitetura\n\nEste é um guia completo sobre o sistema.\n\n## Módulos Principais\n- Backend Electron\n- Frontend React`;
  const updatedDoc = updateCanvasDocument(doc, {
    content: updatedContent,
    summary: 'Adicionada seção de módulos principais'
  });

  assert.strictEqual(updatedDoc.version, 2);
  assert.strictEqual(updatedDoc.history.length, 2);
  assert.strictEqual(updatedDoc.content, updatedContent);
  console.log('✓ Document update passed: v' + updatedDoc.version, 'history count:', updatedDoc.history.length);

  // Test 3: Targeted Selection Editing
  console.log('\n[Test 3] Editing targeted selection...');
  const editedDoc = editCanvasSelection(updatedDoc, {
    targetText: '- Backend Electron\n- Frontend React',
    replacementText: '- Backend Electron (IPC & Managers)\n- Frontend React 19 (Canvas & Vite)',
    summary: 'Detalhado os módulos'
  });

  assert.strictEqual(editedDoc.version, 3);
  assert.ok(editedDoc.content.includes('IPC & Managers'), 'Content should contain replacement text');
  console.log('✓ Targeted selection edit passed: v' + editedDoc.version);

  // Test 4: Line Diff Calculation
  console.log('\n[Test 4] Computing Line Diff...');
  const oldText = 'Linha 1\nLinha 2 antiga\nLinha 3';
  const newText = 'Linha 1\nLinha 2 nova\nLinha 3\nLinha 4';
  const diff = computeLineDiff(oldText, newText);

  assert.ok(Array.isArray(diff), 'Diff should be an array');
  const hasAdded = diff.some(d => d.type === 'added');
  const hasRemoved = diff.some(d => d.type === 'removed');
  const hasUnchanged = diff.some(d => d.type === 'unchanged');
  assert.ok(hasAdded, 'Diff should detect added lines');
  assert.ok(hasRemoved, 'Diff should detect removed lines');
  assert.ok(hasUnchanged, 'Diff should detect unchanged lines');
  console.log('✓ Line diff passed:', diff.length, 'diff chunks generated');

  // Test 5: Document Stats
  console.log('\n[Test 5] Calculating Doc Stats...');
  const sampleDocText = 'Era uma vez um sistema completo de inteligência artificial.';
  const stats = calculateDocStats(sampleDocText);
  assert.strictEqual(stats.words, 9);
  assert.strictEqual(stats.lines, 1);
  assert.strictEqual(stats.readingTimeMinutes, 1);
  console.log('✓ Doc stats calculation passed:', stats);

  // Test 6: Canvas Tool Handler Simulation
  console.log('\n[Test 6] Simulating Tool Calls...');
  const createResult = await handleCanvasToolCall('canvas_create_document', {
    title: 'Relatório Executivo',
    language: 'markdown',
    content: 'Introdução ao relatório.'
  });

  assert.strictEqual(createResult.success, true);
  assert.strictEqual(createResult.action, 'created');
  assert.ok(createResult.document, 'Result must include document');

  const patchResult = await handleCanvasToolCall('canvas_edit_selection', {
    target_text: 'Introdução ao relatório.',
    replacement_text: 'Introdução detalhada ao relatório com dados de performance.',
    summary: 'Expandida a introdução'
  });

  assert.strictEqual(patchResult.success, true);
  assert.strictEqual(patchResult.action, 'edited_selection');
  assert.strictEqual(patchResult.version, 2);
  console.log('✓ Tool handler simulation passed: created and patched seamlessly');

  // Test 7: Canvas HTML/PDF Document Generation
  console.log('\n[Test 7] Testing Canvas HTML Generation for PDF Export...');
  const mdContent = `# Relatório Mensal

Documento com **negrito**, *itálico* e fórmula $E = mc^2$.

## Tabela de Dados
| Métrica | Valor | Status |
| :--- | :---: | ---: |
| Latência | 120ms | OK |
| Taxa de Sucesso | 99.8% | Excelente |

> Este relatório foi gerado automaticamente pelo NeoChat.

### Lista de Tarefas
- [x] Otimizar renderização
- [ ] Conectar banco de dados

\`\`\`javascript
function calcularMedia(a, b) {
  return (a + b) / 2;
}
\`\`\`
`;

  const htmlDoc = formatCanvasToHtml({
    title: 'Relatório Mensal',
    content: mdContent,
    language: 'markdown'
  });

  assert.ok(htmlDoc.includes('<!DOCTYPE html>'), 'HTML output should contain DOCTYPE');
  assert.ok(htmlDoc.includes('<title>Relatório Mensal</title>'), 'HTML output should contain document title');
  assert.ok(htmlDoc.includes('<strong>negrito</strong>'), 'HTML output should render bold text');
  assert.ok(htmlDoc.includes('<table>'), 'HTML output should render tables');
  assert.ok(htmlDoc.includes('class="task-item"'), 'HTML output should render task items');
  assert.ok(htmlDoc.includes('class="code-container"'), 'HTML output should render code blocks');
  assert.ok(htmlDoc.includes('class="doc-meta"'), 'HTML output should include document metadata');
  assert.ok(htmlDoc.includes('@media print'), 'HTML output should include print CSS');
  assert.strictEqual(typeof exportCanvasToPdf, 'function', 'exportCanvasToPdf should be a function');
  console.log('✓ Markdown to HTML for PDF passed with tables, code, and print styles');

  // Test 8: Code document HTML generation
  console.log('\n[Test 8] Testing Code Document HTML Generation...');
  const codeContent = `const http = require('http');\nconst server = http.createServer();\nserver.listen(3000);`;
  const codeHtmlDoc = formatCanvasToHtml({
    title: 'Server Script',
    content: codeContent,
    language: 'javascript'
  });

  assert.ok(codeHtmlDoc.includes('JAVASCRIPT'), 'Code HTML should display language header');
  assert.ok(codeHtmlDoc.includes('const server = http.createServer()'), 'Code HTML should display escaped code');
  console.log('✓ Code document to HTML for PDF passed');

  // Test 9: Canvas DOCX Document Generation
  console.log('\n[Test 9] Testing Canvas DOCX Generation & Parsing...');
  const { Packer } = require('docx');
  const { parseOffice } = require('officeparser');

  const docxInstance = convertCanvasToDocx({
    title: 'Relatório Mensal',
    content: mdContent,
    language: 'markdown'
  });

  assert.ok(docxInstance, 'convertCanvasToDocx should return a Document instance');
  const docxBuffer = await Packer.toBuffer(docxInstance);
  assert.ok(Buffer.isBuffer(docxBuffer), 'Packer.toBuffer should return a Buffer');
  assert.ok(docxBuffer.length > 5000, `Buffer size should be significant (>5KB), got ${docxBuffer.length}`);

  const parsedDocx = await parseOffice(docxBuffer);
  assert.strictEqual(parsedDocx.type, 'docx', 'officeparser should identify file type as docx');
  const fullText = parsedDocx.toText ? parsedDocx.toText() : JSON.stringify(parsedDocx);
  assert.ok(fullText.includes('Relatório Mensal'), 'DOCX should contain title text');
  assert.ok(fullText.includes('negrito'), 'DOCX should contain bold markdown text');
  assert.ok(fullText.includes('Tabela de Dados') || fullText.includes('Métrica'), 'DOCX should contain table data');
  assert.strictEqual(typeof exportCanvasToDocx, 'function', 'exportCanvasToDocx should be a function');
  console.log('✓ Markdown to DOCX generation passed: valid buffer & parsed structure (' + docxBuffer.length + ' bytes)');

  // Test 10: Code document DOCX generation
  console.log('\n[Test 10] Testing Code Document DOCX Generation...');
  const codeDocxInstance = convertCanvasToDocx({
    title: 'Server Script',
    content: codeContent,
    language: 'javascript'
  });

  const codeDocxBuffer = await Packer.toBuffer(codeDocxInstance);
  assert.ok(codeDocxBuffer.length > 3000, 'Code DOCX buffer should be >3KB');
  const parsedCodeDocx = await parseOffice(codeDocxBuffer);
  const codeText = parsedCodeDocx.toText ? parsedCodeDocx.toText() : JSON.stringify(parsedCodeDocx);
  assert.ok(codeText.includes('Server Script'), 'Code DOCX should contain title');
  assert.ok(codeText.includes('createServer'), 'Code DOCX should contain code body');
  console.log('✓ Code document to DOCX passed (' + codeDocxBuffer.length + ' bytes)');

  console.log('\n========================================');
  console.log('🎉 ALL CANVAS SYSTEM TESTS PASSED! 🎉');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
