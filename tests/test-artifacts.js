/**
 * Test suite for Artifacts detection, extraction, versioning and preprocessing
 */

const assert = require('assert');
const { 
  extractArtifactsFromContent, 
  extractArtifactsFromMessages, 
  preprocessArtifactTags,
  formatBytes,
  getArtifactExtension,
  normalizeArtifactType
} = require('../shared/artifactUtils');

function runTests() {
  console.log('--- [Test Suite] Artifacts Management & Extraction ---');

  // Test 1: Helper functions
  console.log('\n[1] Testing Artifacts Helper Functions...');
  assert.strictEqual(getArtifactExtension('html'), 'html');
  assert.strictEqual(getArtifactExtension('jsx'), 'jsx');
  assert.strictEqual(getArtifactExtension('react'), 'jsx');
  assert.strictEqual(getArtifactExtension('python'), 'py');
  assert.strictEqual(getArtifactExtension('mermaid'), 'mmd');
  assert.strictEqual(getArtifactExtension('svg'), 'svg');

  assert.strictEqual(formatBytes(500), '500 B');
  assert.strictEqual(formatBytes(2048), '2.0 KB');

  assert.strictEqual(normalizeArtifactType('application/vnd.ant.react'), 'jsx');
  assert.strictEqual(normalizeArtifactType('text/html'), 'html');
  assert.strictEqual(normalizeArtifactType('image/svg+xml'), 'svg');
  console.log('   ✓ Helper functions passed');

  // Test 2: Explicit <antArtifact> extraction
  console.log('\n[2] Testing Explicit <antArtifact> and <artifact> Tag Extraction...');
  const sampleMessageWithTags = `
Aqui está a aplicação que você pediu:

<antArtifact identifier="financial-dashboard" type="application/vnd.ant.react" title="Dashboard Financeiro">
import React, { useState } from 'react';

export default function FinancialDashboard() {
  return (
    <div className="p-4 bg-slate-900 text-white rounded-xl">
      <h1>Saldo: R$ 12.500,00</h1>
    </div>
  );
}
</antArtifact>

Espero que ajude!
`;

  const artifactsFromTags = extractArtifactsFromContent(sampleMessageWithTags, 'msg-1', 0);
  assert.strictEqual(artifactsFromTags.length, 1);
  assert.strictEqual(artifactsFromTags[0].identifier, 'financial-dashboard');
  assert.strictEqual(artifactsFromTags[0].title, 'Dashboard Financeiro');
  assert.strictEqual(artifactsFromTags[0].type, 'jsx');
  assert.strictEqual(artifactsFromTags[0].isVisual, true);
  assert.strictEqual(artifactsFromTags[0].isExplicitTag, true);
  assert.ok(artifactsFromTags[0].code.includes('Saldo: R$ 12.500,00'));
  console.log('   ✓ Explicit <antArtifact> tag extracted successfully:', artifactsFromTags[0].title);

  // Test 3: Markdown Code Block Extraction & Inferred Titles
  console.log('\n[3] Testing Markdown Code Block Extraction...');
  const sampleMarkdownCodeBlocks = `
Veja este script em Python e o diagrama:

\`\`\`python
# filename: process_metrics.py
import pandas as pd

def calculate_kpi(data):
    return data.mean()
\`\`\`

E o diagrama correspondente:

\`\`\`mermaid
graph TD
  A[Cliente] --> B[API Gateway]
  B --> C[Microserviço]
\`\`\`
`;

  const artifactsFromMarkdown = extractArtifactsFromContent(sampleMarkdownCodeBlocks, 'msg-2', 1);
  assert.strictEqual(artifactsFromMarkdown.length, 2);
  assert.strictEqual(artifactsFromMarkdown[0].type, 'python');
  assert.strictEqual(artifactsFromMarkdown[0].title, 'process_metrics.py');
  assert.strictEqual(artifactsFromMarkdown[0].isExecutable, true);

  assert.strictEqual(artifactsFromMarkdown[1].type, 'mermaid');
  assert.strictEqual(artifactsFromMarkdown[1].isVisual, true);
  console.log('   ✓ Markdown code blocks extracted with inferred titles successfully');

  // Test 4: Conversation Message History & Versioning
  console.log('\n[4] Testing Conversation Message History & Artifact Versioning...');
  const messages = [
    {
      role: 'user',
      content: 'Crie um contador em React'
    },
    {
      role: 'assistant',
      content: '<antArtifact identifier="counter-app" type="application/vnd.ant.react" title="Contador Simples">export default function Counter() { return <button>0</button>; }</antArtifact>'
    },
    {
      role: 'user',
      content: 'Agora adicione botão de decremento'
    },
    {
      role: 'assistant',
      content: '<antArtifact identifier="counter-app" type="application/vnd.ant.react" title="Contador Completo">export default function Counter() { return <div><button>+</button><button>-</button></div>; }</antArtifact>'
    }
  ];

  const extractedList = extractArtifactsFromMessages(messages);
  assert.strictEqual(extractedList.length, 1, 'Same identifier should be versioned together');
  assert.strictEqual(extractedList[0].identifier, 'counter-app');
  assert.strictEqual(extractedList[0].version, 2, 'Version should increment to 2');
  assert.strictEqual(extractedList[0].title, 'Contador Completo');
  assert.ok(extractedList[0].code.includes('<button>-</button>'));
  assert.strictEqual(extractedList[0].previousVersions.length, 1);
  console.log('   ✓ Artifact versioning confirmed: v' + extractedList[0].version);

  // Test 5: Tag Preprocessing for MarkdownRenderer
  console.log('\n[5] Testing Markdown Preprocessing for Safe Rendering...');
  const rawInput = 'Veja:\n<antArtifact identifier="todo" type="application/vnd.ant.react" title="Lista de Tarefas">\nconst Todo = () => <div>Tarefas</div>;\n</antArtifact>';
  const preprocessed = preprocessArtifactTags(rawInput);
  assert.ok(!preprocessed.includes('<antArtifact'));
  assert.ok(preprocessed.includes('```artifact'));
  assert.ok(preprocessed.includes('"identifier":"todo"'));
  assert.ok(preprocessed.includes('"title":"Lista de Tarefas"'));
  assert.ok(preprocessed.includes('---ARTIFACT_CODE---'));
  console.log('   ✓ Tag preprocessing confirmed');

  console.log('\n========================================');
  console.log('🎉 ALL ARTIFACT SYSTEM TESTS PASSED! 🎉');
  console.log('========================================\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ Artifacts test failed:', err);
  process.exit(1);
}
