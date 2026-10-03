/**
 * Mermaid Diagram Sanitizer & Syntax Auto-Repair
 * 
 * Pre-processes Mermaid diagrams to automatically fix syntax issues commonly produced
 * by LLMs, such as unquoted node labels containing parentheses, brackets, braces,
 * colons, or other special characters that break the Mermaid lexer/parser.
 */

/**
 * Sanitizes mindmaps, converting pseudo-mindmaps (markdown bullets, indentation trees)
 * into valid Mermaid mindmap syntax and stripping invalid bullets or unquoted special chars.
 * @param {string} code - Mindmap source code
 * @returns {string} - Clean Mermaid mindmap code
 */
function sanitizeMindmap(code) {
  let lines = code.trim().split(/\r?\n/);
  const firstNonEmpty = lines.find(l => l.trim() && !l.trim().startsWith('%%') && !l.trim().startsWith('#'));
  const hasMindmapKeyword = Boolean(firstNonEmpty && firstNonEmpty.trim().startsWith('mindmap'));

  let title = '';
  let rootAdded = false;
  const resultLines = ['mindmap'];

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip the 'mindmap' keyword line if present
    if (trimmed === 'mindmap' || trimmed.startsWith('mindmap ')) {
      continue;
    }

    // Markdown title header: # Title
    if (trimmed.startsWith('#')) {
      title = trimmed.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Check for root declaration: (root) Text, root((Text)), root: Text, [root] Text
    const rootMatch = trimmed.match(/^[\(\[]?root[\)\]]?[:\s]+(.*)$/i);
    if (rootMatch && !rootAdded) {
      const rootText = rootMatch[1].trim().replace(/^[\(\[]+|[\)\]]+$/g, '').trim();
      resultLines.push(`  root(("${rootText || title || 'Mapa Mental'}"))`);
      rootAdded = true;
      continue;
    }

    // If it's already a Mermaid root declaration like `root((Text))` or `root[Text]`
    const mermaidRootMatch = trimmed.match(/^root(\(\(.*?\)\)|\[.*?\]|\(.*?\)|{{.*?}}|\)\).*?\(\(|\).*?\()/i);
    if (mermaidRootMatch && !rootAdded) {
      resultLines.push(`  ${trimmed}`);
      rootAdded = true;
      continue;
    }

    // If we haven't encountered a root yet and this is the first content line
    if (!rootAdded) {
      if (title) {
        resultLines.push(`  root(("${title}"))`);
        rootAdded = true;
      } else {
        const cleanFirst = trimmed.replace(/^[-*•]\s+/, '').replace(/^[\(\[]+|[\)\]]+$/g, '').trim();
        resultLines.push(`  root(("${cleanFirst}"))`);
        rootAdded = true;
        continue;
      }
    }

    // For child nodes: preserve relative indentation
    const indentMatch = rawLine.match(/^(\s*)/);
    const rawIndentLen = indentMatch ? indentMatch[1].length : 0;

    // Strip leading bullets: - , * , •
    let cleanText = trimmed.replace(/^[-*•]\s+/, '').trim();
    if (!cleanText) continue;

    // Check if user/model wrapped whole node in parentheses e.g. (Esquerda) -> Esquerda
    const simpleParenMatch = cleanText.match(/^\(([^()]+)\)$/);
    if (simpleParenMatch) {
      cleanText = simpleParenMatch[1].trim();
    }

    // Determine target indentation (minimum 4 spaces for direct children of root)
    let targetSpaces = hasMindmapKeyword ? Math.max(4, rawIndentLen) : Math.max(4, rawIndentLen + 2);
    if (targetSpaces % 2 !== 0) targetSpaces += 1;
    const targetIndent = ' '.repeat(targetSpaces);

    // If already safely wrapped in quotes or shape delimiters e.g. ["..."], (("...")), leave it
    if (/^(\(\(.*\)\)|\[".*"\]|\[.*\]|\(.*\)|{{.*}}|\)\).*?\(\(|\).*?\()$/.test(cleanText)) {
      resultLines.push(`${targetIndent}${cleanText}`);
    } else if (/[\(\)\[\]\{\}:;,/#"\\-]/.test(cleanText)) {
      const escaped = cleanText.replace(/"/g, '#quot;');
      resultLines.push(`${targetIndent}["${escaped}"]`);
    } else {
      resultLines.push(`${targetIndent}${cleanText}`);
    }
  }

  if (!rootAdded) {
    resultLines.push(`  root(("${title || 'Mapa Mental'}"))`);
  }

  return resultLines.join('\n');
}

/**
 * Sanitizes and repairs common Mermaid syntax issues.
 * @param {string} code - Raw Mermaid diagram source code
 * @returns {string} - Cleaned and repaired Mermaid code ready for rendering
 */
function sanitizeMermaid(code) {
  if (!code || typeof code !== 'string') return '';

  let sanitized = code.trim();

  // Strip wrapping markdown code fences if accidentally included (e.g. ```mermaid ... ``` or ```mindmap ... ```)
  sanitized = sanitized.replace(/^```(?:mermaid|mindmap)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Check if diagram is a mindmap or pseudo-mindmap
  const cleanStart = sanitized.replace(/^(?:%%[^\r\n]*\r?\n|\s+)+/, '');
  const isMindmap = /^\s*mindmap\b/i.test(cleanStart) ||
    (!/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|timeline|quadrantChart|sankey|xychart|architecture|block-beta|packet-beta|kanban)\b/i.test(cleanStart) &&
     (/[\(\[]?root[\)\]]?[:\s]+/i.test(cleanStart) || /^\s*#\s+.*\n\s*[\(\[]?root[\)\]]?/i.test(cleanStart)));

  if (isMindmap) {
    return sanitizeMindmap(sanitized);
  }

  const lines = sanitized.split(/\r?\n/);
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {
      return line;
    }

    // Protect existing double-quoted strings with tokens: __MQUOTED_index__
    const quotedStrings = [];
    let workLine = line.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
      const idx = quotedStrings.length;
      quotedStrings.push(match);
      return `__MQUOTED_${idx}__`;
    });

    const quoteInnerIfNeeded = (inner) => {
      const trimmedInner = inner.trim();
      // If it is already a placeholder, it's already safely quoted
      if (/^__MQUOTED_\d+__$/.test(trimmedInner)) {
        return inner;
      }
      // Check if it contains special characters that break unquoted node labels:
      // ( ) [ ] { } : ; , / #
      if (/[\(\)\[\]\{\}:;,/#]/.test(trimmedInner)) {
        const escaped = trimmedInner.replace(/"/g, '#quot;');
        const idx = quotedStrings.length;
        quotedStrings.push(`"${escaped}"`);
        return `__MQUOTED_${idx}__`;
      }
      return inner;
    };

    const nodePlaceholders = [];
    const saveNode = (nodeText) => {
      const idx = nodePlaceholders.length;
      nodePlaceholders.push(nodeText);
      return `__MNODE_${idx}__`;
    };

    // 1. Edge labels: | ... | (Process FIRST before node shapes so words inside edge labels are not mistaken for nodes)
    workLine = workLine.replace(/(\|)([^\r\n|]+)(\|)/g, (match, openPipe, inner, closePipe) => {
      const trimmedInner = inner.trim();
      if (/^__MQUOTED_\d+__$/.test(trimmedInner)) {
        return match;
      }
      if (/[\(\)\[\]\{\}:;,/#]/.test(trimmedInner)) {
        const escaped = trimmedInner.replace(/"/g, '#quot;');
        const idx = quotedStrings.length;
        quotedStrings.push(`"${escaped}"`);
        return `|__MQUOTED_${idx}__|`;
      }
      return match;
    });

    // Helper to replace balanced delimiter nodes with accurate depth tracking
    const processDelim = (inputLine, openDelim, closeDelim, formatNode, openChar, closeChar, initialDepth = 1) => {
      let result = '';
      let i = 0;

      while (i < inputLine.length) {
        const openIdx = inputLine.indexOf(openDelim, i);
        if (openIdx === -1) {
          result += inputLine.slice(i);
          break;
        }

        const textBefore = inputLine.slice(i, openIdx);
        const idMatch = textBefore.match(/(^|[\s;&\->=~])([a-zA-Z0-9_\u00C0-\u024F-]+)(\s*)$/);

        if (!idMatch) {
          result += inputLine.slice(i, openIdx + openDelim.length);
          i = openIdx + openDelim.length;
          continue;
        }

        const id = idMatch[2];
        const space = idMatch[3];
        const prefixEndIdx = openIdx - id.length - space.length;

        const innerStart = openIdx + openDelim.length;
        let depth = initialDepth;
        let j = innerStart;
        let found = false;

        while (j < inputLine.length) {
          const ch = inputLine[j];

          // If closeDelim is multi-char or single-char
          if (closeChar && ch === openChar) {
            depth++;
          } else if (closeChar && ch === closeChar) {
            depth--;
            if (depth === 0) {
              // For multi-char closers like ]) or )]
              let matchEnd = j + 1;
              if (closeDelim.length > 1) {
                // Verify the full closeDelim matches at or ending at j
                if (closeDelim === '])' || closeDelim === ')]') {
                  if (inputLine.slice(j, j + closeDelim.length) === closeDelim) {
                    matchEnd = j + closeDelim.length;
                  }
                }
              }
              const inner = inputLine.slice(innerStart, matchEnd - closeDelim.length);
              const replaced = saveNode(formatNode(id, space, quoteInnerIfNeeded(inner)));
              result += inputLine.slice(i, prefixEndIdx) + replaced;
              i = matchEnd;
              found = true;
              break;
            }
          } else if (!closeChar && inputLine.slice(j, j + closeDelim.length) === closeDelim) {
            const inner = inputLine.slice(innerStart, j);
            const replaced = saveNode(formatNode(id, space, quoteInnerIfNeeded(inner)));
            result += inputLine.slice(i, prefixEndIdx) + replaced;
            i = j + closeDelim.length;
            found = true;
            break;
          }

          j++;
        }

        if (!found) {
          result += inputLine.slice(i, openIdx + openDelim.length);
          i = openIdx + openDelim.length;
        }
      }

      return result;
    };

    // Replace compound delimiters first, then single delimiters
    // 2. Stadium: ([ ... ])
    workLine = processDelim(workLine, '([', '])', (id, s, inner) => `${id}${s}([${inner}])`, '[', ']', 1);

    // 3. Subroutine: [[ ... ]]
    workLine = processDelim(workLine, '[[', ']]', (id, s, inner) => `${id}${s}[[${inner}]]`, '[', ']', 2);

    // 4. Cylinder: [( ... )]
    workLine = processDelim(workLine, '[(', ')]', (id, s, inner) => `${id}${s}[(${inner})]`, '(', ')', 1);

    // 5. Circle: (( ... ))
    workLine = processDelim(workLine, '((', '))', (id, s, inner) => `${id}${s}((${inner}))`, '(', ')', 2);

    // 6. Hexagon: {{ ... }}
    workLine = processDelim(workLine, '{{', '}}', (id, s, inner) => `${id}${s}{{${inner}}}`, '{', '}', 2);

    // 7. Parallelograms & Trapezoids:
    workLine = processDelim(workLine, '[/', '/]', (id, s, inner) => `${id}${s}[/${inner}/]`);
    workLine = processDelim(workLine, '[\\', '\\]', (id, s, inner) => `${id}${s}[\\${inner}\\]`);
    workLine = processDelim(workLine, '[/', '\\]', (id, s, inner) => `${id}${s}[/${inner}\\]`);
    workLine = processDelim(workLine, '[\\', '/]', (id, s, inner) => `${id}${s}[\\${inner}/]`);

    // 8. Square brackets: [ ... ]
    workLine = processDelim(workLine, '[', ']', (id, s, inner) => `${id}${s}[${inner}]`, '[', ']', 1);

    // 9. Decision / Rhombus: { ... }
    workLine = processDelim(workLine, '{', '}', (id, s, inner) => `${id}${s}{${inner}}`, '{', '}', 1);

    // 10. Rounded parenthesis: ( ... )
    workLine = processDelim(workLine, '(', ')', (id, s, inner) => `${id}${s}(${inner})`, '(', ')', 1);

    // Restore all node placeholders
    workLine = workLine.replace(/__MNODE_(\d+)__/g, (m, idx) => {
      return nodePlaceholders[parseInt(idx, 10)] ?? m;
    });

    // Restore all quoted strings
    workLine = workLine.replace(/__MQUOTED_(\d+)__/g, (m, idx) => {
      return quotedStrings[parseInt(idx, 10)] ?? m;
    });

    return workLine;
  });

  return processedLines.join('\n');
}

/**
 * Repairs Mermaid syntax if possible.
 * Can be called proactively before rendering or on render failure.
 */
function repairMermaidSyntax(code) {
  return sanitizeMermaid(code);
}

module.exports = {
  sanitizeMermaid,
  repairMermaidSyntax,
  default: sanitizeMermaid
};
