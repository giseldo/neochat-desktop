/**
 * Utility functions for Text-to-Speech (TTS) sanitization and text preparation
 */

function sanitizeTextForSpeech(text = '', language = 'pt') {
  if (!text) return '';
  
  let cleaned = String(text)
    // Code blocks with language
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const codeLines = code.trim().split('\n');
      if (codeLines.length > 8) {
        return language === 'pt' 
          ? ` [Bloco de código ${lang ? 'em ' + lang : ''} com ${codeLines.length} linhas omitido] `
          : ` [Code block ${lang ? 'in ' + lang : ''} with ${codeLines.length} lines omitted] `;
      }
      return ` ${code} `;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '$1')
    // Images ![alt](url) -> alt (MUST be before link replacement)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // HTML tags <tag ...>
    .replace(/<[^>]+>/g, ' ')
    // Common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Headers #, ##, etc.
    .replace(/^#{1,6}\s+/gm, '')
    // Bold / italic / strikethrough
    .replace(/(\*\*|\*|__|_|~~)(.*?)\1/g, '$2')
    // Blockquotes
    .replace(/^>\s+/gm, '')
    // Unordered & ordered list bullets
    .replace(/^[\t ]*[-*+]\s+/gm, '')
    .replace(/^[\t ]*\d+\.\s+/gm, '')
    // Markdown horizontal rules
    .replace(/^---+|^===+/gm, '')
    // Table delimiters and pipes
    .replace(/\|/g, ' ')
    .replace(/[-:]{3,}/g, ' ')
    // Normalize spaces and line breaks
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return cleaned;
}

/**
 * Splits text into safe, natural speech chunks for Web Speech API (max ~180-220 characters).
 * Prevents Chromium TTS buffer overflow and 15-second cut-off bug.
 */
function splitTextIntoChunks(text = '', maxChunkLength = 200) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkLength) return [trimmed];

  const chunks = [];
  const paragraphs = trimmed.split(/\n+/);

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if (p.length <= maxChunkLength) {
      chunks.push(p);
      continue;
    }

    // Split by sentence terminators (. ! ? ; or newline)
    const sentenceMatches = p.match(/[^.!?;\n]+(?:[.!?;\n]+|$)/g) || [p];

    let currentChunk = '';
    for (const sentence of sentenceMatches) {
      const s = sentence.trim();
      if (!s) continue;

      if (s.length > maxChunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        // Split by clause separators (, :)
        const clauseMatches = s.match(/[^,:]+(?:[,:]+|$)/g) || [s];
        for (const clause of clauseMatches) {
          const c = clause.trim();
          if (!c) continue;

          if (c.length > maxChunkLength) {
            // Split by words
            const words = c.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
              if (!word) continue;
              if ((wordChunk + ' ' + word).trim().length > maxChunkLength) {
                if (wordChunk) chunks.push(wordChunk);
                wordChunk = word;
              } else {
                wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
              }
            }
            if (wordChunk) {
              if ((currentChunk + ' ' + wordChunk).trim().length <= maxChunkLength) {
                currentChunk = currentChunk ? `${currentChunk} ${wordChunk}` : wordChunk;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = wordChunk;
              }
            }
          } else {
            if ((currentChunk + ' ' + c).trim().length <= maxChunkLength) {
              currentChunk = currentChunk ? `${currentChunk} ${c}` : c;
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = c;
            }
          }
        }
      } else {
        if ((currentChunk + ' ' + s).trim().length <= maxChunkLength) {
          currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = s;
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }

  return chunks.filter(c => c && c.trim().length > 0);
}

module.exports = {
  sanitizeTextForSpeech,
  splitTextIntoChunks
};
