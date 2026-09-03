const fs = require('fs');
const path = require('path');

(async () => {
  const sourcePath = path.join(__dirname, 'src', 'renderer', 'lib', 'academicTemplates.js');
  const canvasPath = path.join(__dirname, 'src', 'renderer', 'components', 'CanvasPanel.jsx');
  const contextPath = path.join(__dirname, 'src', 'renderer', 'context', 'CanvasContext.jsx');

  const moduleSource = fs.readFileSync(sourcePath, 'utf8');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`;
  const { ACADEMIC_TEMPLATES, ACADEMIC_AI_ACTIONS, latexToPreviewMarkdown } = await import(moduleUrl);

  let passed = 0;
  let failed = 0;
  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed += 1;
    } else {
      console.error(`  ❌ ${message}`);
      failed += 1;
    }
  };

  console.log('🧪 Testing academic workspace...');

  assert(ACADEMIC_TEMPLATES.length === 3, 'offers article, thesis/dissertation and report templates');
  assert(ACADEMIC_TEMPLATES.every(item => item.content.includes('\\begin{document}') && item.content.includes('\\end{document}')), 'all templates contain a complete LaTeX document');
  assert(ACADEMIC_AI_ACTIONS.some(item => item.prompt.includes('não invente')), 'citation workflow explicitly prevents fabricated references');

  const preview = latexToPreviewMarkdown(ACADEMIC_TEMPLATES[0].content);
  assert(preview.includes('# Título do artigo'), 'converts the LaTeX title for live preview');
  assert(preview.includes('## Introdução'), 'converts LaTeX sections for live preview');
  assert(!preview.includes('\\documentclass'), 'hides LaTeX preamble from the reading preview');

  const canvasSource = fs.readFileSync(canvasPath, 'utf8');
  const contextSource = fs.readFileSync(contextPath, 'utf8');
  assert(canvasSource.includes("label: 'LaTeX (.tex)'"), 'exposes LaTeX in the Canvas format selector');
  assert(canvasSource.includes('Modelos LaTeX'), 'exposes the academic templates menu');
  assert(contextSource.includes("latex: 'tex'"), 'maps LaTeX exports to the .tex extension');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
