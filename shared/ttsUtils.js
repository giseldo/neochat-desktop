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
    // Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
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

module.exports = {
  sanitizeTextForSpeech
};
