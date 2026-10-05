const React = require('react');
const ReactDOMServer = require('react-dom/server');

const emojiBulletChars = '[✅❌✔️✖️☑️❎🟢🔴🟡🔵⚪⚫🔹🔷🔸🔶🔺🔻▪▫▶👉⚡💡📌⭐🌟✓✗✘]';
const emojiBulletPattern = '(?:' + emojiBulletChars + '\\uFE0F?)';
const emojiBulletRegex = new RegExp('^' + emojiBulletPattern, 'u');

function isEmojiBulletItem(node) {
  if (!node) return false;
  if (typeof node === 'string') {
    return emojiBulletRegex.test(node.trimStart());
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === 'string' && !item.trim()) continue;
      return isEmojiBulletItem(item);
    }
    return false;
  }
  if (typeof node === 'object' && node.props) {
    return isEmojiBulletItem(node.props.children);
  }
  return false;
}

function preprocessEmojiLists(content) {
  if (!content || typeof content !== 'string') return '';

  const parts = content.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);

  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part;

      const lines = part.split(/\r?\n/);
      const processedLines = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          processedLines.push(line);
          continue;
        }

        if (/^#{1,6}\s/.test(trimmed)) {
          processedLines.push(line);
          continue;
        }

        if (/^(?:>|---|\*\*\*|___)/.test(trimmed)) {
          processedLines.push(line);
          continue;
        }

        let prefix = '';
        let restOfLine = line;
        const listMarkerMatch = /^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/.exec(line);
        if (listMarkerMatch) {
          prefix = listMarkerMatch[1];
          restOfLine = listMarkerMatch[2];
        }

        const inlineEmojiRegex = new RegExp('(?<!^\\s*\\d+)([.!?:;\\u2026)]|\\*\\*)[ \\t]*(' + emojiBulletPattern + '(?:[ \\t]+|(?=[*#_`\\[])))', 'gu');
        restOfLine = restOfLine.replace(inlineEmojiRegex, '$1\n$2');
        line = prefix + restOfLine;

        const sublines = line.split('\n');
        for (let j = 0; j < sublines.length; j++) {
          const sLine = sublines[j];

          if (/^\s*([-*+]|\d+\.)\s+/.test(sLine)) {
            processedLines.push(sLine);
            continue;
          }

          const emojiStartRegex = new RegExp('^(\\s*)(' + emojiBulletPattern + ')(?:\\s+|(?=[*#_`\\[]))(.+)', 'u');
          const match = emojiStartRegex.exec(sLine);

          if (match) {
            const indent = match[1];
            const emoji = match[2];
            const rest = match[3];
            processedLines.push(`${indent}- ${emoji} ${rest.trimStart()}`);
          } else {
            processedLines.push(sLine);
          }
        }
      }

      return processedLines.join('\n');
    })
    .join('');
}

(async () => {
  console.log('🧪 Testing Emoji List Formatting...');

  const { default: ReactMarkdown } = await import('react-markdown');
  const remarkGfm = (await import('remark-gfm')).default;

  const components = {
    ol: ({ node: _, children, ...props }) => React.createElement('ol', { className: 'ml-5 mb-3 list-decimal space-y-1', ...props }, children),
    ul: ({ node: _, children, ...props }) => {
      const styledChildren = React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        if (isEmojiBulletItem(child.props?.children)) {
          const currentClass = child.props?.className || '';
          return React.cloneElement(child, {
            className: (currentClass.replace('pl-1', '').trim() + ' list-none pl-0').trim()
          });
        }
        return child;
      });
      return React.createElement('ul', { className: 'ml-5 mb-3 list-disc space-y-1', ...props }, styledChildren);
    },
    li: ({ node: _, children, ...props }) => React.createElement('li', { className: 'pl-1', ...props }, children)
  };

  function render(text) {
    const processed = preprocessEmojiLists(text);
    return ReactDOMServer.renderToStaticMarkup(
      React.createElement(ReactMarkdown, {
        remarkPlugins: [remarkGfm],
        components,
        children: processed
      })
    );
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ ${message}`);
      failed++;
    }
  }

  // Test 1: User's exact screenshot scenario
  const userCase = `## 📈 **Vantagens**

✅ **Capacidade de aprender com dados não estruturados** (ex: imagens, áudio, texto).
✅ **Generalização:** Pode prever novos dados não vistos durante o treinamento.
✅ **Escalabilidade:** Funciona bem com grandes volumes de dados.
✅ **Flexibilidade:** Pode ser adaptada para diversos tipos de problemas.

---

## ⚠️ **Desafios**

❌ **Requer muitos dados** para treinamento.
❌ **Computacionalmente intensivo** (GPUs/TPUs são essenciais).
❌ **Difícil interpretação** ("caixa preta").
❌ **Overfitting:** Pode memorizar os dados de treinamento e falhar em novos dados.`;

  const html1 = render(userCase);
  const liCount1 = (html1.match(/<li/gi) || []).length;
  assert(html1.includes('<ul') && liCount1 === 8, 'Renders 8 list items inside <ul> for user sample');
  assert(html1.includes('class="list-none pl-0">✅') && html1.includes('class="list-none pl-0">❌'), 'Emoji list items have list-none style without redundant bullet');

  // Test 2: Inline emoji bullets separated by sentences
  const inlineCase = `Vantagens: ✅ Item 1. ✅ Item 2. ✅ Item 3.`;
  const html2 = render(inlineCase);
  assert((html2.match(/<li /g) || []).length === 3, 'Breaks inline emoji items into 3 list items');

  // Test 3: Tables are preserved
  const tableCase = `| Status | Obs |\n| --- | --- |\n| ✅ Ativo | Tudo ok |`;
  const html3 = render(tableCase);
  assert(html3.includes('<table>') && html3.includes('✅ Ativo'), 'Preserves tables with emojis');

  // Test 4: Code blocks are preserved
  const codeCase = '```javascript\nconst isDone = true; // ✅\nconst isFailed = false; // ❌\n```';
  const html4 = render(codeCase);
  assert(html4.includes('// ✅') && !html4.includes('<li'), 'Preserves code blocks containing emojis');

  // Test 5: Existing markdown lists with emojis
  const existingListCase = `- ✅ Já é lista 1\n- ❌ Já é lista 2`;
  const html5 = render(existingListCase);
  assert((html5.match(/<li /g) || []).length === 2 && !html5.includes('- -'), 'Does not duplicate list dashes');

  // Test 6: Headings with emojis
  const headingCase = `### 📈 **Vantagens**\n\nTexto`;
  const html6 = render(headingCase);
  assert(html6.includes('<h3>') && !html6.includes('<li>📈'), 'Does not convert headings with emojis into list items');

  // Test 7: Ordered lists with emojis retain standard list item class (not list-none)
  const orderedCase = `1. ✅ Primeiro passo\n2. ❌ Segundo passo`;
  const html7 = render(orderedCase);
  assert(html7.includes('<ol') && !html7.includes('list-none') && html7.includes('pl-1'), 'Ordered lists retain numbering without list-none');

  // Test 8: Emoji directly before markdown bold without space
  const noSpaceCase = `✅**Sem espaço**\n❌**Também sem espaço**`;
  const html8 = render(noSpaceCase);
  assert((html8.match(/<li /g) || []).length === 2 && html8.includes('list-none'), 'Handles emoji directly before bold without space');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
