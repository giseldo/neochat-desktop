/**
 * Test script for Canvas TTS sanitization, chunking and text preparation
 */

const assert = require('assert');
const { sanitizeTextForSpeech, splitTextIntoChunks } = require('./shared/ttsUtils');

function runTests() {
  console.log('--- Starting Canvas TTS Tests ---');

  // Test 1: Markdown formatting removal
  console.log('\n[Test 1] Testing Markdown headers, bold, italic, lists...');
  const md = `# Título Principal\n\nEste é um **documento importante** com *itálico* e ~~riscado~~.\n- Item 1\n- Item 2\n1. Primeiro\n2. Segundo`;
  const sanitized1 = sanitizeTextForSpeech(md, 'pt');
  
  assert.ok(!sanitized1.includes('#'), 'Should not contain #');
  assert.ok(!sanitized1.includes('**'), 'Should not contain **');
  assert.ok(!sanitized1.includes('*itálico*'), 'Should not contain asterisks');
  assert.ok(!sanitized1.startsWith('-'), 'Should not start with list dash');
  assert.ok(sanitized1.includes('Título Principal'), 'Should retain text content');
  assert.ok(sanitized1.includes('documento importante'), 'Should retain bold text');
  console.log('✓ Markdown formatting stripped cleanly:', JSON.stringify(sanitized1));

  // Test 2: Links, images and HTML
  console.log('\n[Test 2] Testing links, images and HTML tags...');
  const linksMd = `Acesse o [Google](https://google.com) para buscar informações. Imagem: ![Logo](https://site.com/logo.png). <span class="highlight">Texto com tag HTML &amp; entidades</span>`;
  const sanitized2 = sanitizeTextForSpeech(linksMd, 'pt');
  assert.ok(!sanitized2.includes('https://'), 'Should strip URLs');
  assert.ok(sanitized2.includes('Google'), 'Should retain link anchor text');
  assert.ok(!sanitized2.includes('!Logo'), 'Should not leave exclamation mark on image alt');
  assert.ok(sanitized2.includes('Logo'), 'Should retain image alt text');
  assert.ok(!sanitized2.includes('<span'), 'Should strip HTML tags');
  assert.ok(sanitized2.includes('& entidades'), 'Should decode HTML entities');
  console.log('✓ Links, images and HTML parsed cleanly:', JSON.stringify(sanitized2));

  // Test 3: Large code blocks handling
  console.log('\n[Test 3] Testing large code block omission in speech...');
  const codeMd = `Aqui está o código:\n\`\`\`javascript\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\nconst f = 6;\nconst g = 7;\nconst h = 8;\nconst i = 9;\nconsole.log(a + b + c);\n\`\`\`\nFim do código.`;
  const sanitized3 = sanitizeTextForSpeech(codeMd, 'pt');
  assert.ok(sanitized3.includes('Bloco de código em javascript'), 'Should mention code block omitted gracefully');
  assert.ok(sanitized3.includes('Fim do código'), 'Should retain following text');
  console.log('✓ Large code blocks summarized gracefully:', JSON.stringify(sanitized3));

  // Test 4: Tables
  console.log('\n[Test 4] Testing table sanitization...');
  const tableMd = `| Coluna 1 | Coluna 2 |\n|---|---|\n| Dado A | Dado B |`;
  const sanitized4 = sanitizeTextForSpeech(tableMd, 'pt');
  assert.ok(!sanitized4.includes('|'), 'Should not contain pipes');
  assert.ok(sanitized4.includes('Coluna 1'), 'Should contain table words');
  console.log('✓ Tables sanitized cleanly:', JSON.stringify(sanitized4));

  // Test 5: Text Chunking for Long Documents
  console.log('\n[Test 5] Testing text chunking for large documents (e.g. 4500+ chars)...');
  const longParagraph = `Um dos riscos mais imediatos e visíveis é a erosão da privacidade e a vigilância em massa. Com a capacidade de processar vastas quantidades de dados pessoais, a IA permite o rastreamento comportamental de indivíduos em escala inéditas. Isso pode levar à criação de perfis detalhados que são utilizados para manipulação política, publicidade predatória ou controle social. A falta de regulamentação robusta em muitas regiões do mundo deixa os cidadãos vulneráveis ao uso indevido de seus dados, comprometendo a autonomia individual.`;
  const longDocument = `${longParagraph}\n\n${longParagraph}\n\n${longParagraph}\n\n${longParagraph}`;
  
  assert.ok(longDocument.length > 1500, 'Test document should be long');
  const chunks = splitTextIntoChunks(longDocument, 200);
  assert.ok(chunks.length > 5, 'Should split long document into multiple safe chunks');
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    assert.ok(chunk.length <= 250, `Chunk ${i} length (${chunk.length}) should not exceed threshold`);
    assert.ok(chunk.trim().length > 0, `Chunk ${i} should not be empty`);
  }
  console.log(`✓ Long text (${longDocument.length} chars) safely divided into ${chunks.length} chunks.`);

  console.log('\n========================================');
  console.log('🎉 ALL CANVAS TTS TESTS PASSED! 🎉');
  console.log('========================================');
}

runTests();
