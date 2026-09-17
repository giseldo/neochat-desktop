const assert = require('assert');

function preprocessCitations(content, sources = []) {
  if (!content || typeof content !== 'string') return '';

  const safeSources = Array.isArray(sources) ? sources : [];

  // Split content by code blocks and inline code to avoid replacing inside code
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);

  return parts
    .map((part, index) => {
      // Odd indices are code blocks or inline code - return unchanged
      if (index % 2 === 1) {
        return part;
      }

      let res = part;

      // 1. Remove RAG line markers like 【4†L24-L30】
      res = res.replace(/【\d+†L\d+-L\d+】/g, '');
      res = res.replace(/【L\d+-L\d+】/g, '');

      // 2. Convert standard OpenAI/GPT-OSS search citation tokens:
      // Examples: 【3†source】, 【4:0†source】, 【1†escavador.com】, 【2】
      res = res.replace(/【(\d+)(?::\d+)?(?:†[^】]*)?】/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
          const src = safeSources[num - 1];
          const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
          return ` [${num}](${src.url} "${title}")`;
        }
        return ` [${num}]`;
      });

      // 3. Convert [N†source] format: [3†source]
      res = res.replace(/\[(\d+)(?::\d+)?†[^\]]*\]/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
          const src = safeSources[num - 1];
          const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
          return ` [${num}](${src.url} "${title}")`;
        }
        return ` [${num}]`;
      });

      // 4. Convert bracketed numbers [1], [2], [1, 2] ONLY when matching valid sources
      if (safeSources.length > 0) {
        // Handle comma-separated list like [1, 2] or [1, 3, 4]
        res = res.replace(/(^|[\s([{"'«“—–])\[((?:\d+\s*,\s*)+\d+)\](?![(\w:])/g, (match, prefix, group) => {
          const nums = group.split(',').map(n => parseInt(n.trim(), 10));
          const converted = nums.map(num => {
            if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
              const src = safeSources[num - 1];
              const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
              return `[${num}](${src.url} "${title}")`;
            }
            return `[${num}]`;
          });
          return `${prefix}[${converted.join(', ')}]`;
        });

        // Handle single numeric citations like [1], [2]
        res = res.replace(/(^|[\s([{"'«“—–])\[(\d+)\](?![(\w:])/g, (match, prefix, numStr) => {
          const num = parseInt(numStr, 10);
          if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
            const src = safeSources[num - 1];
            const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
            return `${prefix}[${num}](${src.url} "${title}")`;
          }
          return match;
        });
      }

      return res;
    })
    .join('');
}

console.log('🧪 Testing preprocessCitations...');

const mockSources = [
  {
    title: 'ALANA VIANA BORGES DA SILVA NEO - Escavador',
    url: 'https://www.escavador.com/sobre/379389628/alana-viana-borges-da-silva-neo',
    domain: 'escavador.com'
  },
  {
    title: 'Alana Viana Borges da Silva Neo - Google Acadêmico',
    url: 'https://scholar.google.com/citations?user=wmG7vj8AAAAJ&hl=pt-BR',
    domain: 'scholar.google.com'
  },
  {
    title: 'Alana Viana Borges da Silva Neo - Docente - IFMS - Campus Corumbá',
    url: 'https://dsv-rdintegra.ifrs.edu.br/p/IFMS-alana-viana-borges-da-silva-neo',
    domain: 'dsv-rdintegra.ifrs.edu.br'
  },
  {
    title: 'Análise da confiança de estudantes',
    url: 'https://www.repositorio.ufal.br/bitstream/123456789/8993/1/Analise.pdf',
    domain: 'repositorio.ufal.br'
  }
];

// Test 1: User's exact prompt response
const userText = `**Alana Viana Borges da Silva Neo**  

- **Cargo:** Professora de Informática (Docente) no Instituto Federal de Mato Grosso do Sul – Campus Corumbá【3†source】.  
- **Formação:** Possui doutorado em Ciência da Computação.  
- **Linha de pesquisa:** “Análise da confiança de estudantes de ambientes virtuais”【4†source】.  
- **Produção científica:** Mantém perfil no Google Scholar【2†source】.`;

const res1 = preprocessCitations(userText, mockSources);
assert.ok(res1.includes('[3](https://dsv-rdintegra.ifrs.edu.br/p/IFMS-alana-viana-borges-da-silva-neo'), 'Test 1: source 3 link failed');
assert.ok(res1.includes('[4](https://www.repositorio.ufal.br/bitstream/123456789/8993/1/Analise.pdf'), 'Test 1: source 4 link failed');
assert.ok(res1.includes('[2](https://scholar.google.com/citations?user=wmG7vj8AAAAJ&hl=pt-BR'), 'Test 1: source 2 link failed');
console.log('✅ Test 1 passed: User exact OpenAI citation tags converted to markdown links.');

// Test 2: [3†source] format
const text2 = `Informações encontradas no perfil [3†source] e no repositório [4†source].`;
const res2 = preprocessCitations(text2, mockSources);
assert.ok(res2.includes('[3](https://dsv-rdintegra.ifrs.edu.br/p/IFMS-alana-viana-borges-da-silva-neo'), 'Test 2: [3†source] failed');
console.log('✅ Test 2 passed: [N†source] format converted.');

// Test 3: Standalone brackets [1], [2]
const text3 = `De acordo com a pesquisa [1], o resultado foi comprovado [2].`;
const res3 = preprocessCitations(text3, mockSources);
assert.ok(res3.includes('[1](https://www.escavador.com/sobre/379389628/alana-viana-borges-da-silva-neo'), 'Test 3: [1] failed');
assert.ok(res3.includes('[2](https://scholar.google.com/citations?user=wmG7vj8AAAAJ&hl=pt-BR'), 'Test 3: [2] failed');
console.log('✅ Test 3 passed: Standalone bracket citations [1] and [2] converted.');

// Test 4: Code block preservation (e.g. array indexing in code)
const text4 = '```javascript\nconst item = list[1];\nconsole.log(item);\n```\nConforme visto em [1].';
const res4 = preprocessCitations(text4, mockSources);
assert.ok(res4.includes('const item = list[1];'), 'Test 4: code block list[1] preserved');
assert.ok(res4.includes('[1](https://www.escavador.com'), 'Test 4: [1] outside code converted');
console.log('✅ Test 4 passed: Code block indexing preserved.');

// Test 5: Fallback when source not available
const text5 = `Citação sem fonte 【99†source】 e 【5】.`;
const res5 = preprocessCitations(text5, mockSources);
assert.ok(res5.includes('[99]'), 'Test 5: [99] fallback rendered');
assert.ok(res5.includes('[5]'), 'Test 5: [5] fallback rendered');
console.log('✅ Test 5 passed: Out-of-bounds sources handled gracefully.');

console.log('\n🎉 All citation tests passed successfully!');
