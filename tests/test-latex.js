const React = require('react');
const ReactDOMServer = require('react-dom/server');

(async () => {
  console.log('🧪 Testing LaTeX code block and math formula rendering...');

  const { default: ReactMarkdown } = await import('react-markdown');
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const remarkGfm = (await import('remark-gfm')).default;

  function preprocessMarkdownMath(content) {
    if (!content) return '';
    const parts = content.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);
    return parts
      .map((part, index) => {
        if (index % 2 === 1) {
          const mathBlockMatch = /^```(?:math|katex)\r?\n([\s\S]*?)```$/.exec(part);
          if (mathBlockMatch) {
            return `\n$$\n${mathBlockMatch[1].trim()}\n$$\n`;
          }
          return part;
        }
        let res = part;
        res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);
        res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
        res = res.replace(/(^|[^\\])\$(?=\s*\d+([.,]\d+)?)/g, '$1\\$');
        return res;
      })
      .join('');
  }

  function render(text) {
    const processed = preprocessMarkdownMath(text);
    return ReactDOMServer.renderToStaticMarkup(
      React.createElement(ReactMarkdown, {
        remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: true }]],
        rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]],
        components: {
          code({ className, children }) {
            return React.createElement('code', { className }, children);
          }
        },
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

  // Test 1: LaTeX code block is preserved as a code block
  const latexBlock = 'Aqui está o código:\n```latex\n\\documentclass{article}\n\\begin{document}\nOlá\n\\end{document}\n```\nFim.';
  const html1 = render(latexBlock);
  assert(html1.includes('language-latex') && html1.includes('\\documentclass{article}'), 'LaTeX code block renders as language-latex and preserves contents');
  assert(!html1.includes('katex-error') && !html1.includes('undefined'), 'LaTeX code block does not trigger KaTeX error');

  // Test 2: Display math with \[ \]
  const displayMath = 'Equação:\n\\[\nE = mc^2\n\\]';
  const html2 = render(displayMath);
  assert(html2.includes('katex-display') || html2.includes('katex'), 'LaTeX display math \\[...\\] renders via KaTeX');

  // Test 3: Inline math with \( \)
  const inlineMath = 'Fórmula \\(a^2 + b^2 = c^2\\) inline.';
  const html3 = render(inlineMath);
  assert(html3.includes('katex'), 'LaTeX inline math \\(...\\) renders via KaTeX');

  // Test 4: Currency dollar signs are not corrupted
  const currency = 'Preço: $50 e desconto de $10.';
  const html4 = render(currency);
  assert(html4.includes('$50') && html4.includes('$10'), 'Currency dollar amounts are preserved');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
})();
