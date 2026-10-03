/**
 * artifactUtils.js
 * Utilities for extracting, detecting, formatting, and managing
 * created artifacts from conversation messages and assistant outputs.
 */

// Supported visual formats
export const VISUAL_TYPES = ['html', 'htm', 'svg', 'jsx', 'tsx', 'react', 'mermaid', 'mindmap'];

// Supported executable formats
export const EXECUTABLE_TYPES = ['js', 'javascript', 'ts', 'typescript', 'py', 'python'];

// Clean language name map
export const LANGUAGE_LABEL_MAP = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'React (JSX)',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'React (TSX)',
  react: 'React',
  py: 'Python',
  python: 'Python',
  html: 'HTML5',
  htm: 'HTML5',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  sql: 'SQL',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  markdown: 'Markdown',
  mermaid: 'Mermaid',
  mindmap: 'Mapa Mental',
  svg: 'SVG Vector',
  xml: 'XML'
};

/**
 * Maps raw type/language to standard file extension
 */
export function getArtifactExtension(type = '') {
  const t = (type || '').toLowerCase().trim();
  const map = {
    js: 'js',
    javascript: 'js',
    jsx: 'jsx',
    ts: 'ts',
    typescript: 'ts',
    tsx: 'tsx',
    react: 'jsx',
    py: 'py',
    python: 'py',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    bash: 'sh',
    sh: 'sh',
    shell: 'sh',
    powershell: 'ps1',
    ps1: 'ps1',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'md',
    markdown: 'md',
    svg: 'svg',
    mermaid: 'mmd',
    mindmap: 'mmd',
    xml: 'xml'
  };
  return map[t] || 'txt';
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Normalize artifact MIME/type string to simplified type
 */
export function normalizeArtifactType(rawType = '', code = '') {
  const t = (rawType || '').toLowerCase().trim();
  if (t === 'application/vnd.ant.react' || t === 'react' || t === 'jsx') return 'jsx';
  if (t === 'text/html' || t === 'html' || t === 'htm') return 'html';
  if (t === 'image/svg+xml' || t === 'svg') return 'svg';
  if (t === 'application/vnd.ant.mermaid' || t === 'mermaid' || t === 'mindmap') return 'mermaid';
  if (t === 'application/vnd.ant.markdown' || t === 'markdown' || t === 'md') return 'markdown';
  if (t === 'application/vnd.ant.code' || t === 'code') {
    if (code.includes('import React') || code.includes('export default function')) return 'jsx';
    if (code.startsWith('<!DOCTYPE html') || code.includes('<html')) return 'html';
    return 'javascript';
  }
  return t || 'plaintext';
}

/**
 * Smart detection of title from code comments or content
 */
function inferTitleFromCode(code, lang, index) {
  if (!code) return `Artefato ${index + 1}`;

  // Check first 5 lines for filename or title comments
  const lines = code.split(/\r?\n/).slice(0, 5);
  for (const line of lines) {
    const filenameMatch = line.trim().match(/(?:\/\/|#|\/\*|<!--)\s*(?:filename|file|title|name):\s*([a-zA-Z0-9_\-./ ]+)/i);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].trim();
    }
  }

  // React component name
  const reactMatch = code.match(/(?:export\s+default\s+function|export\s+function|function|const)\s+([A-Z][a-zA-Z0-9_]+)/);
  if (reactMatch && reactMatch[1]) {
    return `${reactMatch[1]} Component`;
  }

  // HTML title
  const htmlTitleMatch = code.match(/<title>([^<]+)<\/title>/i);
  if (htmlTitleMatch && htmlTitleMatch[1]) {
    return htmlTitleMatch[1].trim();
  }

  // Mermaid or Mindmap diagram title
  if (lang === 'mermaid' || lang === 'mindmap') {
    const titleMatch = code.match(/(?:title|#)\s+([^\n]+)/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    return lang === 'mindmap' ? `Mapa Mental ${index + 1}` : `Diagrama Mermaid ${index + 1}`;
  }

  const langLabel = LANGUAGE_LABEL_MAP[lang.toLowerCase()] || lang.toUpperCase();
  return `${langLabel} Artefato ${index + 1}`;
}

/**
 * Extract artifacts from a single message content string
 */
export function extractArtifactsFromContent(content, messageId, messageIndex = 0) {
  if (!content || typeof content !== 'string') return [];

  const artifacts = [];
  let blockIndex = 0;

  // 1. Explicit <antArtifact ...> or <artifact ...> tags (Claude style)
  const tagRegex = /<\s*(?:antArtifact|artifact)\s+([^>]*)>([\s\S]*?)<\s*\/\s*(?:antArtifact|artifact)\s*>/gi;
  let tagMatch;

  // Keep track of extracted code ranges to avoid duplicating code blocks inside tags
  const matchedCodes = new Set();

  while ((tagMatch = tagRegex.exec(content)) !== null) {
    blockIndex++;
    const attrString = tagMatch[1] || '';
    const rawInnerCode = (tagMatch[2] || '').trim();

    // Parse attributes
    const idMatch = attrString.match(/identifier=["']([^"']+)["']/i);
    const typeMatch = attrString.match(/type=["']([^"']+)["']/i);
    const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
    const langMatch = attrString.match(/language=["']([^"']+)["']/i);

    const identifier = idMatch ? idMatch[1] : `artifact-${messageId || messageIndex}-${blockIndex}`;
    const rawType = typeMatch ? typeMatch[1] : (langMatch ? langMatch[1] : 'html');
    const normalizedType = normalizeArtifactType(rawType, rawInnerCode);
    const effectiveLanguage = langMatch ? langMatch[1] : normalizedType;
    const title = titleMatch ? titleMatch[1] : inferTitleFromCode(rawInnerCode, effectiveLanguage, blockIndex - 1);

    const lines = rawInnerCode ? rawInnerCode.split(/\r?\n/).length : 0;
    const sizeBytes = new Blob([rawInnerCode]).size;

    const isVisual = VISUAL_TYPES.includes(normalizedType) || normalizedType === 'svg';
    const isExecutable = EXECUTABLE_TYPES.includes(normalizedType);

    matchedCodes.add(rawInnerCode);

    artifacts.push({
      id: identifier,
      identifier,
      title,
      type: normalizedType,
      language: effectiveLanguage,
      code: rawInnerCode,
      messageId,
      messageIndex,
      lines,
      sizeBytes,
      isVisual,
      isExecutable,
      isExplicitTag: true,
      timestamp: Date.now()
    });
  }

  // 2. Standard markdown code blocks
  // Check code blocks with language tag that represent meaningful code or visual artifacts
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]+)?(?:[ \t]+([^\r\n]+))?\r?\n([\s\S]*?)```/g;
  let cbMatch;

  while ((cbMatch = codeBlockRegex.exec(content)) !== null) {
    const rawLang = (cbMatch[1] || '').toLowerCase().trim();
    const metaStr = cbMatch[2] || '';
    const code = (cbMatch[3] || '').trim();

    if (!code || matchedCodes.has(code)) continue;

    // Filter out very short trivial shell commands (e.g. `npm i`, `cd dir`) unless tagged as artifact
    const lines = code.split(/\r?\n/).length;
    const isShell = ['sh', 'bash', 'shell', 'cmd', 'ps1', 'powershell'].includes(rawLang);
    if (isShell && lines <= 2 && !metaStr.includes('title=')) {
      continue;
    }

    // Must be a recognized language or have > 2 lines
    if (!rawLang && lines <= 2) {
      continue;
    }

    blockIndex++;
    const metaTitleMatch = metaStr.match(/title=["']?([^"'\s]+)["']?/i);
    const normalizedType = normalizeArtifactType(rawLang || 'text', code);
    const title = metaTitleMatch 
      ? metaTitleMatch[1] 
      : inferTitleFromCode(code, rawLang || 'text', blockIndex - 1);

    const isVisual = VISUAL_TYPES.includes(normalizedType) || normalizedType === 'svg';
    const isExecutable = EXECUTABLE_TYPES.includes(normalizedType);
    const sizeBytes = new Blob([code]).size;

    artifacts.push({
      id: `block-${messageId || messageIndex}-${blockIndex}`,
      identifier: `block-${messageId || messageIndex}-${blockIndex}`,
      title,
      type: normalizedType,
      language: rawLang || normalizedType,
      code,
      messageId,
      messageIndex,
      lines,
      sizeBytes,
      isVisual,
      isExecutable,
      isExplicitTag: false,
      timestamp: Date.now()
    });
  }

  return artifacts;
}

/**
 * Extract all artifacts from a list of messages
 */
export function extractArtifactsFromMessages(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const allArtifacts = [];
  const identifierMap = new Map();

  messages.forEach((msg, msgIdx) => {
    if (!msg || !msg.content) return;

    let contentStr = '';
    if (typeof msg.content === 'string') {
      contentStr = msg.content;
    } else if (Array.isArray(msg.content)) {
      contentStr = msg.content
        .filter(p => p && (p.type === 'text' || typeof p === 'string'))
        .map(p => (typeof p === 'string' ? p : p.text || ''))
        .join('\n');
    }

    const messageId = msg.id || `msg-${msgIdx}`;
    const extracted = extractArtifactsFromContent(contentStr, messageId, msgIdx);

    extracted.forEach((art) => {
      // If artifact has an explicit identifier and was seen before, treat as an updated version
      if (art.isExplicitTag && identifierMap.has(art.identifier)) {
        const prev = identifierMap.get(art.identifier);
        const version = (prev.version || 1) + 1;
        const updated = {
          ...art,
          version,
          previousVersions: [...(prev.previousVersions || []), prev]
        };
        identifierMap.set(art.identifier, updated);
        // Replace in allArtifacts
        const idx = allArtifacts.findIndex(a => a.identifier === art.identifier);
        if (idx !== -1) {
          allArtifacts[idx] = updated;
        } else {
          allArtifacts.push(updated);
        }
      } else {
        if (art.isExplicitTag) {
          identifierMap.set(art.identifier, art);
        }
        allArtifacts.push(art);
      }
    });
  });

  return allArtifacts;
}

/**
 * Preprocesses markdown content so explicit <antArtifact> tags are converted
 * into a safe, syntax-safe code block representation that MarkdownRenderer
 * can render as an interactive <ArtifactCard /> without broken HTML or XML leaks.
 */
export function preprocessArtifactTags(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return '';

  return rawContent.replace(
    /<\s*(?:antArtifact|artifact)\s+([^>]*)>([\s\S]*?)<\s*\/\s*(?:antArtifact|artifact)\s*>/gi,
    (_, attrString, innerCode) => {
      const idMatch = attrString.match(/identifier=["']([^"']+)["']/i);
      const typeMatch = attrString.match(/type=["']([^"']+)["']/i);
      const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
      const langMatch = attrString.match(/language=["']([^"']+)["']/i);

      const metadata = {
        identifier: idMatch ? idMatch[1] : 'artifact',
        type: typeMatch ? typeMatch[1] : 'html',
        title: titleMatch ? titleMatch[1] : '',
        language: langMatch ? langMatch[1] : (typeMatch ? typeMatch[1] : 'html')
      };

      const metaJson = JSON.stringify(metadata);
      const cleanCode = innerCode.trim();

      return `\n\`\`\`artifact\n${metaJson}\n---ARTIFACT_CODE---\n${cleanCode}\n\`\`\`\n`;
    }
  );
}
