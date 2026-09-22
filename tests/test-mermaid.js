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
    Animal <|-- Dog`
};

console.log('--- [Test Suite] Mermaid Diagram Support & Validation ---');

// Test 1: Validate diagram definitions are non-empty and well-formed
Object.entries(sampleDiagrams).forEach(([name, code]) => {
  assert.ok(code.trim().length > 0, `Diagram ${name} should have content`);
  assert.match(code, /^(flowchart|sequenceDiagram|classDiagram)/, `Diagram ${name} should start with valid mermaid keyword`);
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

console.log('\n🎉 ALL MERMAID DIAGRAM TESTS PASSED!\n');
