const assert = require('assert');

// Test mermaid diagram definition samples and verification
const sampleDiagrams = {
  flowchart: `flowchart LR
    A[Início] --> B{Decisão}
    B -->|Sim| C[Processar]
    B -->|Não| D[Fim]
    C --> D`,
  sequence: `sequenceDiagram
    autonumber
    Alice->>Bob: Olá Bob, como você está?
    Bob-->>Alice: Estou bem, obrigado!`,
  classDiagram: `classDiagram
    class Animal {
      +String name
      +makeSound()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog`,
  mindmap: `mindmap
  root((Diferenças políticas no Brasil))
    Esquerda
      Estado forte e intervencionista
    Direita
      Estado mínimo`
};

console.log('--- [Test Suite] Mermaid Diagram Support & Validation ---');

// Test 1: Validate diagram definitions are non-empty and well-formed
Object.entries(sampleDiagrams).forEach(([name, code]) => {
  assert.ok(code.trim().length > 0, `Diagram ${name} should have content`);
  assert.match(code, /^(flowchart|sequenceDiagram|classDiagram|mindmap)/, `Diagram ${name} should start with valid mermaid keyword`);
  console.log(`   ✓ Sample ${name} diagram syntax verified`);
});

// Test 2: Check mermaid package resolution
try {
  const mermaidPackage = require.resolve('mermaid');
  assert.ok(mermaidPackage, 'mermaid package should resolve correctly');
  console.log('   ✓ Mermaid npm package resolved:', mermaidPackage);
} catch (e) {
  console.error('   ❌ Mermaid resolution failed:', e.message);
  process.exit(1);
}

// Test 3: Validate Mermaid Sanitizer and Auto-Repair
const { sanitizeMermaid, repairMermaidSyntax } = require('../shared/mermaidSanitizer');

// Test 3.1: User's exact diagram from bug report
const userDiagramInput = `flowchart LR
    A[Texto Bruto] --> B[Pré-processamento]
    B --> C[Tokenização]
    C --> D[Treinamento]
    D --> E[Modelo Treinado]
    E --> F[Inferência]
    F --> G[Resultado (texto gerado ou analisado)]`;

const userDiagramOutput = sanitizeMermaid(userDiagramInput);
assert.ok(userDiagramOutput.includes('G["Resultado (texto gerado ou analisado)"]'), 'Node G label with parentheses should be automatically quoted');
assert.ok(userDiagramOutput.includes('A[Texto Bruto]'), 'Clean node A without special characters should remain unquoted');
console.log('   ✓ User reported diagram syntax issue auto-repaired successfully');

// Test 3.2: Existing valid sample diagrams should remain untouched
Object.entries(sampleDiagrams).forEach(([name, code]) => {
  const result = sanitizeMermaid(code);
  assert.strictEqual(result, code.trim(), `Sample ${name} should remain identical`);
});
console.log('   ✓ Sample diagrams preserved without distortion');

// Test 3.3: Stripping wrapping markdown fences
const fenced = '```mermaid\nflowchart TD\n  A[Início (1)] --> B\n```';
const unfenced = sanitizeMermaid(fenced);
assert.strictEqual(unfenced.startsWith('```'), false, 'Markdown code fence should be stripped');
assert.ok(unfenced.includes('A["Início (1)"]'), 'Node label with parens inside fenced code should be quoted');
console.log('   ✓ Fenced code block stripped and sanitized');

// Test 3.4: Multiple nodes on same line and various shapes
const variousShapes = `flowchart TD
  A[Node (rect)] --> B(Node (round)) --> C([Node (stadium)])
  C --> D[[Node (subroutine)]] --> E[(Node (cylinder))]
  E --> F((Node (circle))) --> G{Node (rhombus)?}
  G -->|Opção (1)| H{{Node (hexagon)}}`;

const sanitizedShapes = sanitizeMermaid(variousShapes);
assert.ok(sanitizedShapes.includes('A["Node (rect)"]'), 'Rect shape quoted');
assert.ok(sanitizedShapes.includes('B("Node (round)")'), 'Round shape quoted');
assert.ok(sanitizedShapes.includes('C(["Node (stadium)"])'), 'Stadium shape quoted');
assert.ok(sanitizedShapes.includes('D[["Node (subroutine)"]]'), 'Subroutine shape quoted');
assert.ok(sanitizedShapes.includes('E[("Node (cylinder)")]'), 'Cylinder shape quoted');
assert.ok(sanitizedShapes.includes('F(("Node (circle)"))'), 'Circle shape quoted');
assert.ok(sanitizedShapes.includes('G{"Node (rhombus)?"}'), 'Rhombus shape quoted');
assert.ok(sanitizedShapes.includes('H{{"Node (hexagon)"}}'), 'Hexagon shape quoted');
assert.ok(sanitizedShapes.includes('|"Opção (1)"|'), 'Edge label quoted');
console.log('   ✓ All 8 diagram shapes and edge labels with parentheses auto-repaired');

// Test 3.5: User's exact pseudo-mindmap from bug report
const userMindmapInput = `# Diferenças entre Direita e Esquerda no Brasil
(root) Diferenças políticas no Brasil
  (Esquerda)
    - Estado forte e intervencionista
    - Redução de desigualdades
    - Progressismo social
    - Apoio a políticas identitárias
    - Crítica ao livre mercado
  (Direita)
    - Estado mínimo
    - Livre mercado e meritocracia
    - Conservadorismo social
    - Enfase na segurança e ordem
    - Crítica ao intervencionismo`;

const sanitizedUserMindmap = sanitizeMermaid(userMindmapInput);
assert.ok(sanitizedUserMindmap.startsWith('mindmap'), 'Should start with mindmap keyword');
assert.ok(sanitizedUserMindmap.includes('root(("Diferenças políticas no Brasil"))'), 'Root node should be correctly defined');
assert.ok(sanitizedUserMindmap.includes('Esquerda'), 'Branch Esquerda preserved');
assert.ok(sanitizedUserMindmap.includes('Estado forte e intervencionista'), 'Child items preserved');
assert.ok(sanitizedUserMindmap.includes('Direita'), 'Branch Direita preserved');
assert.ok(!sanitizedUserMindmap.includes('- Estado'), 'Hyphen bullets should be stripped from mindmap');
console.log('   ✓ User reported pseudo-mindmap auto-repaired into valid Mermaid mindmap');

// Test 3.6: Fenced mindmap block with ```mindmap
const fencedMindmap = '```mindmap\n# Tema\n(root) Central\n  Item 1\n```';
const unfencedMindmap = sanitizeMermaid(fencedMindmap);
assert.ok(!unfencedMindmap.startsWith('```'), 'Markdown code fence should be stripped');
assert.ok(unfencedMindmap.startsWith('mindmap'), 'Should start with mindmap keyword');
assert.ok(unfencedMindmap.includes('root(("Central"))'), 'Central root preserved');
console.log('   ✓ Fenced ```mindmap code block auto-converted');

// Test 3.7: Mindmap with bullet items and parentheses in items
const mindmapWithBullets = `mindmap
  root((Tema Central))
    - Subtópico 1 (detalhes)
    - Subtópico 2`;
const sanitizedBullets = sanitizeMermaid(mindmapWithBullets);
assert.ok(sanitizedBullets.startsWith('mindmap'), 'Should preserve mindmap keyword');
assert.ok(!sanitizedBullets.includes('- Subtópico'), 'Bullet hyphens should be stripped');
assert.ok(sanitizedBullets.includes('Subtópico 1 (detalhes)') || sanitizedBullets.includes('Subtópico 1'), 'Item content preserved');
console.log('   ✓ Mindmap with bullet points and details auto-repaired');

console.log('\n🎉 ALL MERMAID DIAGRAM TESTS PASSED!\n');
