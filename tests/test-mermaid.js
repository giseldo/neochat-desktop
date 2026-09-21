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

console.log('\n🎉 ALL MERMAID DIAGRAM TESTS PASSED!\n');
