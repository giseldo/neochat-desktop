const crypto = require('crypto');

/**
 * Normalizes text line endings to \n
 */
function normalizeLineEndings(text = '') {
    return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Calculates document metrics (words, chars, reading time)
 */
function calculateDocStats(content = '') {
    const text = normalizeLineEndings(content).trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    const lines = text ? text.split('\n').length : 0;

    return {
        chars,
        words,
        readingTimeMinutes,
        lines
    };
}

/**
 * Creates a brand new Canvas document object
 */
function createCanvasDocument({ title = 'Documento Sem Título', content = '', language = 'markdown', source = 'ai', summary = 'Documento criado' }) {
    const now = new Date().toISOString();
    const docId = `canvas_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const normalizedContent = normalizeLineEndings(content);
    const stats = calculateDocStats(normalizedContent);

    const initialRevision = {
        version: 1,
        content: normalizedContent,
        timestamp: now,
        source: source || 'ai',
        summary: summary || 'Documento criado',
        stats
    };

    return {
        id: docId,
        title: title.trim() || 'Documento Sem Título',
        language: (language || 'markdown').toLowerCase(),
        content: normalizedContent,
        version: 1,
        createdAt: now,
        updatedAt: now,
        stats,
        history: [initialRevision]
    };
}

/**
 * Updates an entire Canvas document, creating a new revision
 */
function updateCanvasDocument(existingDoc, { content, summary, title, language, source = 'ai' }) {
    if (!existingDoc) {
        return createCanvasDocument({ title, content, language, source, summary });
    }

    const now = new Date().toISOString();
    const normalizedContent = normalizeLineEndings(content !== undefined ? content : existingDoc.content);
    const newVersion = (existingDoc.version || 1) + 1;
    const stats = calculateDocStats(normalizedContent);

    const newRevision = {
        version: newVersion,
        content: normalizedContent,
        timestamp: now,
        source: source || 'ai',
        summary: summary || `Atualização da versão ${newVersion}`,
        stats
    };

    const updatedHistory = Array.isArray(existingDoc.history) 
        ? [...existingDoc.history, newRevision]
        : [newRevision];

    return {
        ...existingDoc,
        title: title !== undefined && title.trim() ? title.trim() : existingDoc.title,
        language: language !== undefined && language ? language.toLowerCase() : existingDoc.language,
        content: normalizedContent,
        version: newVersion,
        updatedAt: now,
        stats,
        history: updatedHistory
    };
}

/**
 * Replaces a target text snippet inside the document with replacement text (fuzzy or exact)
 */
function editCanvasSelection(existingDoc, { targetText, replacementText, summary, source = 'ai' }) {
    if (!existingDoc) {
        throw new Error('Nenhum documento ativo no Canvas para aplicar a edição.');
    }

    if (typeof targetText !== 'string' || !targetText.trim()) {
        throw new Error('targetText é obrigatório para editar um trecho do Canvas.');
    }

    const currentContent = normalizeLineEndings(existingDoc.content || '');
    const searchTarget = normalizeLineEndings(targetText);
    const replacement = normalizeLineEndings(replacementText || '');

    let newContent = '';
    let matchFound = false;

    // 1. Try exact match first
    if (currentContent.includes(searchTarget)) {
        newContent = currentContent.replace(searchTarget, replacement);
        matchFound = true;
    } else {
        // 2. Try trimmed match
        const trimmedTarget = searchTarget.trim();
        if (trimmedTarget && currentContent.includes(trimmedTarget)) {
            newContent = currentContent.replace(trimmedTarget, replacement.trim());
            matchFound = true;
        } else {
            // 3. Try line-by-line whitespace-insensitive match
            const docLines = currentContent.split('\n');
            const targetLines = searchTarget.split('\n').map(l => l.trim()).filter(Boolean);

            if (targetLines.length > 0) {
                for (let i = 0; i <= docLines.length - targetLines.length; i++) {
                    let allMatch = true;
                    for (let j = 0; j < targetLines.length; j++) {
                        if (docLines[i + j].trim() !== targetLines[j]) {
                            allMatch = false;
                            break;
                        }
                    }
                    if (allMatch) {
                        const before = docLines.slice(0, i);
                        const after = docLines.slice(i + targetLines.length);
                        newContent = [...before, replacement, ...after].join('\n');
                        matchFound = true;
                        break;
                    }
                }
            }
        }
    }

    if (!matchFound) {
        // Fallback: If not found, append or fail gracefully
        throw new Error(`Trecho não encontrado no documento atual: "${targetText.slice(0, 60)}..."`);
    }

    return updateCanvasDocument(existingDoc, {
        content: newContent,
        summary: summary || `Substituição pontual de trecho no documento`,
        source
    });
}

/**
 * Computes a line-by-line diff between two text strings
 * Returns an array of { type: 'added' | 'removed' | 'unchanged', text: string }
 */
function computeLineDiff(oldText = '', newText = '') {
    const oldLines = normalizeLineEndings(oldText).split('\n');
    const newLines = normalizeLineEndings(newText).split('\n');

    const diff = [];
    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
        if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
            diff.push({ type: 'unchanged', text: oldLines[i], oldLine: i + 1, newLine: j + 1 });
            i++;
            j++;
        } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
            diff.push({ type: 'added', text: newLines[j], newLine: j + 1 });
            j++;
        } else if (i < oldLines.length && (j >= newLines.length || !newLines.includes(oldLines[i]))) {
            diff.push({ type: 'removed', text: oldLines[i], oldLine: i + 1 });
            i++;
        } else {
            if (i < oldLines.length) {
                diff.push({ type: 'removed', text: oldLines[i], oldLine: i + 1 });
                i++;
            }
            if (j < newLines.length) {
                diff.push({ type: 'added', text: newLines[j], newLine: j + 1 });
                j++;
            }
        }
    }

    return diff;
}

/**
 * In-memory store for active Canvas documents per chat / session
 */
const activeCanvasByChatId = new Map();

function setActiveCanvasDocument(chatId = 'default', doc) {
    activeCanvasByChatId.set(chatId, doc);
    return doc;
}

function getActiveCanvasDocument(chatId = 'default') {
    return activeCanvasByChatId.get(chatId) || null;
}

function deleteActiveCanvasDocument(chatId = 'default') {
    activeCanvasByChatId.delete(chatId);
}

/**
 * Handles execution of canvas tools
 */
function handleCanvasToolCall(toolName, args = {}, chatId = 'default') {
    let currentDoc = getActiveCanvasDocument(chatId);

    if (toolName === 'canvas_create_document') {
        const title = args.title || 'Novo Documento';
        const content = args.content || '';
        const language = args.language || 'markdown';
        const summary = args.summary || 'Documento criado no Canvas';

        const newDoc = createCanvasDocument({ title, content, language, source: 'ai', summary });
        setActiveCanvasDocument(chatId, newDoc);

        return {
            success: true,
            action: 'created',
            docId: newDoc.id,
            title: newDoc.title,
            language: newDoc.language,
            version: newDoc.version,
            stats: newDoc.stats,
            summary: `Documento "${newDoc.title}" criado com sucesso no Canvas (Versão 1, ${newDoc.stats.words} palavras).`,
            document: newDoc
        };
    }

    if (toolName === 'canvas_update_document') {
        const content = args.content !== undefined ? args.content : (currentDoc?.content || '');
        const summary = args.summary || 'Documento atualizado no Canvas';
        const title = args.title;
        const language = args.language;

        const updatedDoc = updateCanvasDocument(currentDoc, { content, summary, title, language, source: 'ai' });
        setActiveCanvasDocument(chatId, updatedDoc);

        return {
            success: true,
            action: 'updated',
            docId: updatedDoc.id,
            title: updatedDoc.title,
            language: updatedDoc.language,
            version: updatedDoc.version,
            stats: updatedDoc.stats,
            summary: `Documento "${updatedDoc.title}" atualizado para versão ${updatedDoc.version} (${updatedDoc.stats.words} palavras). Resumo: ${summary}`,
            document: updatedDoc
        };
    }

    if (toolName === 'canvas_edit_selection') {
        if (!currentDoc) {
            throw new Error('Nenhum documento ativo no Canvas para editar trecho. Crie um documento primeiro com canvas_create_document.');
        }

        const targetText = args.targetText || args.target_text || args.oldText || args.old_text;
        const replacementText = args.replacementText || args.replacement_text || args.newText || args.new_text || '';
        const summary = args.summary || 'Edição pontual aplicada no Canvas';

        const updatedDoc = editCanvasSelection(currentDoc, { targetText, replacementText, summary, source: 'ai' });
        setActiveCanvasDocument(chatId, updatedDoc);

        return {
            success: true,
            action: 'edited_selection',
            docId: updatedDoc.id,
            title: updatedDoc.title,
            language: updatedDoc.language,
            version: updatedDoc.version,
            stats: updatedDoc.stats,
            summary: `Trecho do documento "${updatedDoc.title}" editado para versão ${updatedDoc.version}. Resumo: ${summary}`,
            document: updatedDoc
        };
    }

    if (toolName === 'canvas_get_document') {
        if (!currentDoc) {
            return {
                hasDocument: false,
                message: 'Nenhum documento ativo no Canvas no momento.'
            };
        }

        return {
            hasDocument: true,
            docId: currentDoc.id,
            title: currentDoc.title,
            language: currentDoc.language,
            version: currentDoc.version,
            stats: currentDoc.stats,
            updatedAt: currentDoc.updatedAt,
            content: currentDoc.content
        };
    }

    throw new Error(`Ferramenta Canvas desconhecida: ${toolName}`);
}

/**
 * Escapes HTML characters safely
 */
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Parses inline markdown elements (bold, italic, strikethrough, code, links, images, math)
 */
function parseInlineMarkdown(text = '') {
    let result = text;

    // 1. Math inline: \(...\)
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
        try {
            const katex = require('katex');
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
            return `<code>${escapeHtml(math)}</code>`;
        }
    });

    // 2. Math inline: $...$
    result = result.replace(/(^|[^\\])\$(?!\s)([\s\S]+?)(?!\s)\$/g, (match, prefix, math) => {
        if (/^\d+([.,]\d+)?$/.test(math.trim())) {
            return match;
        }
        try {
            const katex = require('katex');
            return prefix + katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
            return `${prefix}<code>${escapeHtml(math)}</code>`;
        }
    });

    // 3. Inline code: `code`
    result = result.replace(/`([^`\n]+?)`/g, (_, code) => {
        return `<code class="inline-code">${escapeHtml(code)}</code>`;
    });

    // 4. Images: ![alt](url)
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
        return `<img src="${escapeHtml(url.trim())}" alt="${escapeHtml(alt)}" />`;
    });

    // 5. Links: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
        return `<a href="${escapeHtml(url.trim())}" target="_blank" rel="noopener noreferrer">${parseInlineMarkdown(linkText)}</a>`;
    });

    // 6. Bold & Italic: ***text*** or ___text___
    result = result.replace(/(\*\*\*|___)([\s\S]+?)\1/g, '<strong><em>$2</em></strong>');

    // 7. Bold: **text** or __text__
    result = result.replace(/(\*\*|__)([\s\S]+?)\1/g, '<strong>$2</strong>');

    // 8. Italic: *text* or _text_
    result = result.replace(/(\*|_)([\s\S]+?)\1/g, '<em>$2</em>');

    // 9. Strikethrough: ~~text~~
    result = result.replace(/~~([\s\S]+?)~~/g, '<del>$1</del>');

    return result;
}

/**
 * Converts a markdown string into clean HTML blocks
 */
function convertMarkdownToHtml(markdown = '') {
    const rawLines = normalizeLineEndings(markdown).split('\n');
    const htmlBlocks = [];
    let i = 0;

    while (i < rawLines.length) {
        const line = rawLines[i];

        // 1. Empty line
        if (!line.trim()) {
            i++;
            continue;
        }

        // 2. LaTeX Display Math: $$ ... $$ or \[ ... \]
        if (line.trim().startsWith('$$') || line.trim().startsWith('\\[')) {
            const isBracket = line.trim().startsWith('\\[');
            const closeMarker = isBracket ? '\\]' : '$$';
            let mathLines = [];
            let firstLine = line.trim().replace(isBracket ? /^\s*\\\[/ : /^\s*\$\$/, '');
            if (firstLine.endsWith(closeMarker) && firstLine.length >= closeMarker.length) {
                mathLines.push(firstLine.slice(0, -closeMarker.length));
                i++;
            } else {
                if (firstLine) mathLines.push(firstLine);
                i++;
                while (i < rawLines.length) {
                    const current = rawLines[i];
                    if (current.includes(closeMarker)) {
                        const content = current.slice(0, current.indexOf(closeMarker));
                        if (content) mathLines.push(content);
                        i++;
                        break;
                    } else {
                        mathLines.push(current);
                        i++;
                    }
                }
            }
            const mathContent = mathLines.join('\n').trim();
            try {
                const katex = require('katex');
                const rendered = katex.renderToString(mathContent, { displayMode: true, throwOnError: false });
                htmlBlocks.push(`<div class="math-display">${rendered}</div>`);
            } catch (e) {
                htmlBlocks.push(`<pre class="math-raw"><code>${escapeHtml(mathContent)}</code></pre>`);
            }
            continue;
        }

        // 3. Fenced Code Block: ```lang
        if (line.trim().startsWith('```')) {
            const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
            const language = (langMatch && langMatch[1]) ? langMatch[1].toLowerCase() : '';
            const codeLines = [];
            i++;
            while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
                codeLines.push(rawLines[i]);
                i++;
            }
            if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
                i++; // Skip closing ```
            }

            const codeText = codeLines.join('\n');
            const langLabel = language ? language.toUpperCase() : 'CODE';

            htmlBlocks.push(`
<div class="code-container">
  <div class="code-header">
    <span>${escapeHtml(langLabel)}</span>
  </div>
  <pre class="code-block"><code>${escapeHtml(codeText)}</code></pre>
</div>`);
            continue;
        }

        // 4. Headings: # to ######
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2].trim();
            htmlBlocks.push(`<h${level}>${parseInlineMarkdown(headingText)}</h${level}>`);
            i++;
            continue;
        }

        // 5. Horizontal Rule: --- or *** or ___
        if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            htmlBlocks.push('<hr />');
            i++;
            continue;
        }

        // 6. Blockquote: > ...
        if (line.trim().startsWith('>')) {
            const quoteLines = [];
            while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
                quoteLines.push(rawLines[i].replace(/^\s*>\s?/, ''));
                i++;
            }
            const quoteContent = convertMarkdownToHtml(quoteLines.join('\n'));
            htmlBlocks.push(`<blockquote>${quoteContent}</blockquote>`);
            continue;
        }

        // 7. Table: | Col | Col |
        if (line.trim().startsWith('|') && line.includes('|')) {
            const tableLines = [];
            while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
                tableLines.push(rawLines[i].trim());
                i++;
            }

            if (tableLines.length >= 2) {
                const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
                const alignDefs = tableLines[1].split('|').slice(1, -1).map(c => c.trim());
                
                const alignments = alignDefs.map(def => {
                    if (def.startsWith(':') && def.endsWith(':')) return 'center';
                    if (def.endsWith(':')) return 'right';
                    return 'left';
                });

                let tableHtml = '<table>\n<thead>\n<tr>\n';
                headerCells.forEach((cell, idx) => {
                    const align = alignments[idx] || 'left';
                    tableHtml += `  <th style="text-align: ${align}">${parseInlineMarkdown(cell)}</th>\n`;
                });
                tableHtml += '</tr>\n</thead>\n<tbody>\n';

                for (let r = 2; r < tableLines.length; r++) {
                    const rowCells = tableLines[r].split('|').slice(1, -1).map(c => c.trim());
                    tableHtml += '<tr>\n';
                    rowCells.forEach((cell, idx) => {
                        const align = alignments[idx] || 'left';
                        tableHtml += `  <td style="text-align: ${align}">${parseInlineMarkdown(cell)}</td>\n`;
                    });
                    tableHtml += '</tr>\n';
                }
                tableHtml += '</tbody>\n</table>';
                htmlBlocks.push(tableHtml);
                continue;
            }
        }

        // 8. Lists (Unordered, Ordered, Task Lists)
        const isTaskItem = /^[-*+]\s+\[([ xX])\]\s+(.*)$/.test(line.trim());
        const isUnordered = /^[-*+]\s+(.*)$/.test(line.trim());
        const isOrdered = /^\d+\.\s+(.*)$/.test(line.trim());

        if (isTaskItem || isUnordered || isOrdered) {
            const listType = isOrdered ? 'ol' : 'ul';
            const listItems = [];

            while (i < rawLines.length) {
                const currentLine = rawLines[i];
                if (!currentLine.trim()) break;

                const taskMatch = currentLine.trim().match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
                if (taskMatch) {
                    const checked = taskMatch[1].toLowerCase() === 'x';
                    const text = taskMatch[2];
                    listItems.push(`<li class="task-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled /> <span>${parseInlineMarkdown(text)}</span></li>`);
                    i++;
                    continue;
                }

                const uMatch = currentLine.trim().match(/^[-*+]\s+(.*)$/);
                if (uMatch && !isOrdered) {
                    listItems.push(`<li>${parseInlineMarkdown(uMatch[1])}</li>`);
                    i++;
                    continue;
                }

                const oMatch = currentLine.trim().match(/^\d+\.\s+(.*)$/);
                if (oMatch && isOrdered) {
                    listItems.push(`<li>${parseInlineMarkdown(oMatch[1])}</li>`);
                    i++;
                    continue;
                }

                // If indented line following list item, append to previous
                if (/^\s{2,}/.test(currentLine) && listItems.length > 0) {
                    listItems[listItems.length - 1] += ` ${parseInlineMarkdown(currentLine.trim())}`;
                    i++;
                    continue;
                }

                break;
            }

            htmlBlocks.push(`<${listType}>\n${listItems.join('\n')}\n</${listType}>`);
            continue;
        }

        // 9. Standard Paragraphs
        const paraLines = [];
        while (i < rawLines.length) {
            const currentLine = rawLines[i];
            if (!currentLine.trim()) break;
            if (currentLine.match(/^#{1,6}\s+/) ||
                currentLine.trim().startsWith('```') ||
                currentLine.trim().startsWith('$$') ||
                currentLine.trim().startsWith('\\[') ||
                currentLine.trim().startsWith('>') ||
                currentLine.trim().startsWith('|') ||
                /^[-*+]\s+/.test(currentLine.trim()) ||
                /^\d+\.\s+/.test(currentLine.trim()) ||
                /^(\s*[-*_]\s*){3,}$/.test(currentLine)) {
                break;
            }
            paraLines.push(currentLine);
            i++;
        }

        if (paraLines.length > 0) {
            const paraText = paraLines.map(l => parseInlineMarkdown(l)).join('<br />\n');
            htmlBlocks.push(`<p>${paraText}</p>`);
        }
    }

    return htmlBlocks.join('\n\n');
}

/**
 * Formats code content into a styled HTML code block for PDF
 */
function formatCodeToHtml(title, content, language) {
    const langUpper = (language || 'TEXT').toUpperCase();
    const escapedCode = escapeHtml(content);
    return `
<div class="code-container">
  <div class="code-header">
    <span>${escapeHtml(langUpper)}</span>
  </div>
  <pre class="code-block"><code>${escapedCode}</code></pre>
</div>`;
}

/**
 * Formats a Canvas document (Markdown or code) into a complete, styled HTML page ready for PDF printing
 */
function formatCanvasToHtml({ title = 'Documento Sem Título', content = '', language = 'markdown' } = {}) {
    const stats = calculateDocStats(content);
    const langLower = (language || 'markdown').toLowerCase();
    const isMarkdown = !language || langLower === 'markdown' || langLower === 'md' || langLower === 'text' || langLower === 'txt';

    const bodyHtml = isMarkdown 
        ? convertMarkdownToHtml(content)
        : formatCodeToHtml(title, content, language);

    let katexCss = '';
    try {
        const fs = require('fs');
        const katexPath = require.resolve('katex/dist/katex.min.css');
        katexCss = fs.readFileSync(katexPath, 'utf8');
    } catch (e) {
        // Ignore if katex css not found
    }

    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    ${katexCss}
    * {
      box-sizing: border-box;
    }
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always;
      }
      pre, blockquote, table, tr, figure, img {
        page-break-inside: avoid;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.65;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .doc-container {
      max-width: 100%;
      margin: 0 auto;
    }
    .doc-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 24px;
    }
    .doc-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.25;
    }
    .doc-meta {
      font-size: 11px;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    h2 { font-size: 17px; font-weight: 600; color: #1e293b; margin: 20px 0 10px 0; }
    h3 { font-size: 15px; font-weight: 600; color: #334155; margin: 16px 0 8px 0; }
    h4, h5, h6 { font-size: 13.5px; font-weight: 600; color: #475569; margin: 14px 0 6px 0; }
    p { margin: 0 0 12px 0; }
    p:last-child { margin-bottom: 0; }
    a { color: #2563eb; text-decoration: none; }
    strong { font-weight: 600; color: #0f172a; }
    em { font-style: italic; }
    del { text-decoration: line-through; color: #94a3b8; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
    blockquote {
      margin: 14px 0;
      padding: 10px 16px;
      background-color: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 0 6px 6px 0;
      color: #334155;
      font-style: italic;
    }
    blockquote p { margin: 0; }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 24px;
    }
    li { margin-bottom: 4px; }
    li.task-item {
      list-style-type: none;
      margin-left: -20px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    li.task-item input[type="checkbox"] {
      margin: 0;
      vertical-align: middle;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12.5px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    code.inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 2px 5px;
      color: #0f172a;
    }
    pre.code-block {
      background-color: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 14px 0;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    pre.code-block code {
      font-family: inherit;
      color: inherit;
    }
    .code-container {
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background-color: #0f172a;
      margin: 14px 0;
      overflow: hidden;
    }
    .code-header {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }
    .code-container pre {
      margin: 0;
      padding: 12px 16px;
      background: transparent;
      color: #e2e8f0;
    }
    .math-display {
      margin: 16px 0;
      overflow-x: auto;
      text-align: center;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="doc-header">
      <h1 class="doc-title">${escapeHtml(title)}</h1>
      <div class="doc-meta">
        <span><strong>Formato:</strong> ${escapeHtml((language || 'markdown').toUpperCase())}</span>
        <span><strong>Palavras:</strong> ${stats.words}</span>
        <span><strong>Linhas:</strong> ${stats.lines}</span>
        <span><strong>Data:</strong> ${dateFormatted}</span>
      </div>
    </div>
    <div class="doc-content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Exports a Canvas document to PDF via Electron's printToPDF
 */
async function exportCanvasToPdf({ title, content, language, htmlContent, parentWindow } = {}) {
    const fs = require('fs');
    const path = require('path');
    const { BrowserWindow, dialog, app } = require('electron');

    const cleanTitle = (title || 'documento').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'documento';
    const defaultFilename = `${cleanTitle}.pdf`;

    const html = htmlContent || formatCanvasToHtml({ title, content, language });

    let printWin = null;
    try {
        printWin = new BrowserWindow({
            show: false,
            width: 850,
            height: 1100,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Brief delay to ensure styles and web fonts render
        await new Promise(resolve => setTimeout(resolve, 250));

        const pdfBuffer = await printWin.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: {
                marginType: 'default'
            }
        });

        const downloadsPath = app ? app.getPath('downloads') : process.cwd();
        const defaultPath = path.join(downloadsPath, defaultFilename);

        const { canceled, filePath } = await dialog.showSaveDialog(parentWindow || null, {
            title: 'Exportar Canvas para PDF',
            defaultPath,
            filters: [
                { name: 'Documento PDF (.pdf)', extensions: ['pdf'] },
                { name: 'Todos os arquivos', extensions: ['*'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, filePath };
    } catch (err) {
        console.error('[Canvas] Export to PDF error:', err);
        return { success: false, error: err.message };
    } finally {
        if (printWin && !printWin.isDestroyed()) {
            printWin.destroy();
        }
    }
}

/**
 * Parses inline markdown tokens into an array of docx TextRun and ExternalHyperlink elements
 */
function parseInlineToDocxRuns(text = '') {
    const { TextRun, ExternalHyperlink } = require('docx');
    if (!text) return [new TextRun({ text: '' })];

    const runs = [];
    const pattern = /(`([^`\n]+?)`)|(\*\*\*([^*]+?)\*\*\*)|(\*\*([^*]+?)\*\*|__([^_]+?)__)|(\*([^*]+?)\*|_([^_]+?)_)|(~~([^~]+?)~~)|(\[([^\]]+?)\]\(([^)]+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            runs.push(new TextRun({ text: text.substring(lastIndex, match.index) }));
        }

        if (match[1]) {
            // Code: `...`
            runs.push(new TextRun({
                text: match[2],
                font: 'Consolas',
                shading: { fill: 'F1F5F9' },
                color: '0F172A'
            }));
        } else if (match[3]) {
            // Bold Italic: ***...***
            runs.push(new TextRun({
                text: match[4],
                bold: true,
                italics: true
            }));
        } else if (match[5]) {
            // Bold: **...** or __...__
            runs.push(new TextRun({
                text: match[6] || match[7],
                bold: true
            }));
        } else if (match[8]) {
            // Italic: *...* or _..._
            runs.push(new TextRun({
                text: match[9] || match[10],
                italics: true
            }));
        } else if (match[11]) {
            // Strikethrough: ~~...~~
            runs.push(new TextRun({
                text: match[12],
                strike: true
            }));
        } else if (match[13]) {
            // Link: [text](url)
            runs.push(new ExternalHyperlink({
                children: [
                    new TextRun({
                        text: match[14],
                        style: 'Hyperlink',
                        color: '2563EB',
                        underline: {}
                    })
                ],
                link: match[15]
            }));
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
        runs.push(new TextRun({ text: text.substring(lastIndex) }));
    }

    return runs.length > 0 ? runs : [new TextRun({ text: '' })];
}

/**
 * Converts markdown content into an array of docx children elements (Paragraphs, Tables)
 */
function convertMarkdownToDocxChildren(markdown = '') {
    const {
        Paragraph,
        TextRun,
        HeadingLevel,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
        AlignmentType
    } = require('docx');

    const rawLines = normalizeLineEndings(markdown).split('\n');
    const docChildren = [];
    let i = 0;

    while (i < rawLines.length) {
        const line = rawLines[i];

        if (!line.trim()) {
            i++;
            continue;
        }

        // 1. LaTeX Display Math: $$ ... $$ or \[ ... \]
        if (line.trim().startsWith('$$') || line.trim().startsWith('\\[')) {
            const isBracket = line.trim().startsWith('\\[');
            const closeMarker = isBracket ? '\\]' : '$$';
            let mathLines = [];
            let firstLine = line.trim().replace(isBracket ? /^\s*\\\[/ : /^\s*\$\$/, '');
            if (firstLine.endsWith(closeMarker) && firstLine.length >= closeMarker.length) {
                mathLines.push(firstLine.slice(0, -closeMarker.length));
                i++;
            } else {
                if (firstLine) mathLines.push(firstLine);
                i++;
                while (i < rawLines.length) {
                    const current = rawLines[i];
                    if (current.includes(closeMarker)) {
                        const content = current.slice(0, current.indexOf(closeMarker));
                        if (content) mathLines.push(content);
                        i++;
                        break;
                    } else {
                        mathLines.push(current);
                        i++;
                    }
                }
            }
            const mathContent = mathLines.join(' ').trim();
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: mathContent,
                            font: 'Cambria Math',
                            italics: true,
                            size: 24
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 140, after: 140 }
                })
            );
            continue;
        }

        // 2. Fenced code block: ```lang ... ```
        if (line.trim().startsWith('```')) {
            const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
            const language = (langMatch && langMatch[1]) ? langMatch[1].toUpperCase() : 'CODE';
            const codeLines = [];
            i++;
            while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
                codeLines.push(rawLines[i]);
                i++;
            }
            if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
                i++;
            }

            docChildren.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    margins: { top: 120, bottom: 120 },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    shading: { fill: '0F172A' },
                                    margins: { top: 140, bottom: 140, left: 180, right: 180 },
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                        bottom: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                        left: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                        right: { style: BorderStyle.SINGLE, size: 6, color: '334155' }
                                    },
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: '// ' + language,
                                                    font: 'Consolas',
                                                    size: 17,
                                                    color: '94A3B8'
                                                })
                                            ],
                                            spacing: { after: 80 }
                                        }),
                                        ...codeLines.map(codeLine => new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: codeLine || ' ',
                                                    font: 'Consolas',
                                                    size: 19,
                                                    color: 'F8FAFC'
                                                })
                                            ],
                                            spacing: { line: 240, before: 0, after: 0 }
                                        }))
                                    ]
                                })
                            ]
                        })
                    ]
                })
            );
            continue;
        }

        // 3. Headings: # to ######
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2].trim();
            const headingLevels = {
                1: HeadingLevel.HEADING_1,
                2: HeadingLevel.HEADING_2,
                3: HeadingLevel.HEADING_3,
                4: HeadingLevel.HEADING_4,
                5: HeadingLevel.HEADING_5,
                6: HeadingLevel.HEADING_6
            };

            docChildren.push(
                new Paragraph({
                    heading: headingLevels[level] || HeadingLevel.HEADING_1,
                    children: parseInlineToDocxRuns(headingText),
                    spacing: { before: Math.max(120, 260 - (level * 20)), after: 100 }
                })
            );
            i++;
            continue;
        }

        // 4. Horizontal Rule: ---, ***, ___
        if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            docChildren.push(
                new Paragraph({
                    border: {
                        bottom: {
                            color: 'CBD5E1',
                            space: 1,
                            style: BorderStyle.SINGLE,
                            size: 8
                        }
                    },
                    spacing: { before: 180, after: 180 }
                })
            );
            i++;
            continue;
        }

        // 5. Blockquote: > ...
        if (line.trim().startsWith('>')) {
            const quoteLines = [];
            while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
                quoteLines.push(rawLines[i].replace(/^\s*>\s?/, ''));
                i++;
            }
            const quoteText = quoteLines.join(' ');
            const runs = parseInlineToDocxRuns(quoteText);
            runs.forEach(r => {
                if (r instanceof TextRun) {
                    r.italics = true;
                }
            });

            docChildren.push(
                new Paragraph({
                    children: runs,
                    indent: { left: 720 },
                    border: {
                        left: {
                            color: '3B82F6',
                            space: 12,
                            style: BorderStyle.SINGLE,
                            size: 24
                        }
                    },
                    spacing: { before: 140, after: 140 }
                })
            );
            continue;
        }

        // 6. Tables: | ... |
        if (line.trim().startsWith('|') && line.includes('|')) {
            const tableLines = [];
            while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
                tableLines.push(rawLines[i].trim());
                i++;
            }

            if (tableLines.length >= 2) {
                const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
                const rows = [
                    new TableRow({
                        children: headerCells.map(cell => new TableCell({
                            shading: { fill: 'F1F5F9' },
                            margins: { top: 100, bottom: 100, left: 140, right: 140 },
                            children: [
                                new Paragraph({
                                    children: parseInlineToDocxRuns(cell).map(r => {
                                        if (r instanceof TextRun) r.bold = true;
                                        return r;
                                    })
                                })
                            ]
                        }))
                    })
                ];

                for (let r = 2; r < tableLines.length; r++) {
                    const rowCells = tableLines[r].split('|').slice(1, -1).map(c => c.trim());
                    rows.push(
                        new TableRow({
                            children: rowCells.map(cell => new TableCell({
                                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                                children: [
                                    new Paragraph({
                                        children: parseInlineToDocxRuns(cell)
                                    })
                                ]
                            }))
                        })
                    );
                }

                docChildren.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        margins: { top: 120, bottom: 160 },
                        rows
                    })
                );
                continue;
            }
        }

        // 7. Task item: - [ ] or - [x]
        const taskMatch = line.trim().match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
            const isChecked = taskMatch[1].toLowerCase() === 'x';
            const taskText = taskMatch[2];
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: isChecked ? '\u2611 ' : '\u2610 ',
                            bold: true,
                            color: isChecked ? '16A34A' : '64748B'
                        }),
                        ...parseInlineToDocxRuns(taskText)
                    ],
                    spacing: { after: 60 }
                })
            );
            i++;
            continue;
        }

        // 8. Unordered list: - or * or +
        const uMatch = line.trim().match(/^[-*+]\s+(.*)$/);
        if (uMatch) {
            docChildren.push(
                new Paragraph({
                    children: parseInlineToDocxRuns(uMatch[1]),
                    bullet: { level: 0 },
                    spacing: { after: 60 }
                })
            );
            i++;
            continue;
        }

        // 9. Ordered list: 1. item
        const oMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
        if (oMatch) {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: oMatch[1] + '. ', bold: true }),
                        ...parseInlineToDocxRuns(oMatch[2])
                    ],
                    spacing: { after: 60 }
                })
            );
            i++;
            continue;
        }

        // 10. Standard Paragraphs
        const paraLines = [];
        while (i < rawLines.length) {
            const cur = rawLines[i];
            if (!cur.trim()) break;
            if (cur.match(/^#{1,6}\s+/) ||
                cur.trim().startsWith('```') ||
                cur.trim().startsWith('$$') ||
                cur.trim().startsWith('\\[') ||
                cur.trim().startsWith('>') ||
                cur.trim().startsWith('|') ||
                /^[-*+]\s+/.test(cur.trim()) ||
                /^\d+\.\s+/.test(cur.trim()) ||
                /^(\s*[-*_]\s*){3,}$/.test(cur)) {
                break;
            }
            paraLines.push(cur);
            i++;
        }

        if (paraLines.length > 0) {
            const text = paraLines.join(' ');
            docChildren.push(
                new Paragraph({
                    children: parseInlineToDocxRuns(text),
                    spacing: { after: 120, line: 276 }
                })
            );
        }
    }

    return docChildren;
}

/**
 * Converts a Canvas document (Markdown or code) into a formatted docx.Document instance
 */
function convertCanvasToDocx({ title = 'Documento Sem Título', content = '', language = 'markdown' } = {}) {
    const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
    const stats = calculateDocStats(content);
    const langLower = (language || 'markdown').toLowerCase();
    const isMarkdown = !language || langLower === 'markdown' || langLower === 'md' || langLower === 'text' || langLower === 'txt';

    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const docChildren = [
        new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 80 }
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `Formato: ${(language || 'markdown').toUpperCase()}  |  Palavras: ${stats.words}  |  Linhas: ${stats.lines}  |  Data: ${dateFormatted}`,
                    size: 18,
                    color: '64748B',
                    font: 'Consolas'
                })
            ],
            spacing: { after: 200 }
        }),
        new Paragraph({
            border: {
                bottom: {
                    color: 'E2E8F0',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 12
                }
            },
            spacing: { after: 240 }
        })
    ];

    if (isMarkdown) {
        const bodyElements = convertMarkdownToDocxChildren(content);
        docChildren.push(...bodyElements);
    } else {
        const codeLines = content.split('\n');
        docChildren.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                shading: { fill: '0F172A' },
                                margins: { top: 140, bottom: 140, left: 180, right: 180 },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                    bottom: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                    left: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                                    right: { style: BorderStyle.SINGLE, size: 6, color: '334155' }
                                },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: '// ' + (language || 'CODE').toUpperCase(),
                                                font: 'Consolas',
                                                size: 17,
                                                color: '94A3B8'
                                            })
                                        ],
                                        spacing: { after: 80 }
                                    }),
                                    ...codeLines.map(codeLine => new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: codeLine || ' ',
                                                font: 'Consolas',
                                                size: 19,
                                                color: 'F8FAFC'
                                            })
                                        ],
                                        spacing: { line: 240, before: 0, after: 0 }
                                    }))
                                ]
                            })
                        ]
                    })
                ]
            })
        );
    }

    return new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Segoe UI',
                        size: 22,
                        color: '1E293B'
                    }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,
                        right: 1440,
                        bottom: 1440,
                        left: 1440
                    }
                }
            },
            children: docChildren
        }]
    });
}

/**
 * Exports a Canvas document to Microsoft Word (.docx) file
 */
async function exportCanvasToDocx({ title, content, language, parentWindow } = {}) {
    const fs = require('fs');
    const path = require('path');
    const { dialog, app } = require('electron');
    const { Packer } = require('docx');

    const cleanTitle = (title || 'documento').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'documento';
    const defaultFilename = `${cleanTitle}.docx`;

    try {
        const doc = convertCanvasToDocx({ title, content, language });
        const docxBuffer = await Packer.toBuffer(doc);

        const downloadsPath = app ? app.getPath('downloads') : process.cwd();
        const defaultPath = path.join(downloadsPath, defaultFilename);

        const { canceled, filePath } = await dialog.showSaveDialog(parentWindow || null, {
            title: 'Exportar Canvas para Word (.docx)',
            defaultPath,
            filters: [
                { name: 'Documento Word (.docx)', extensions: ['docx'] },
                { name: 'Todos os arquivos', extensions: ['*'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(filePath, docxBuffer);
        return { success: true, filePath };
    } catch (err) {
        console.error('[Canvas] Export to DOCX error:', err);
        return { success: false, error: err.message };
    }
}

module.exports = {
    normalizeLineEndings,
    calculateDocStats,
    createCanvasDocument,
    updateCanvasDocument,
    editCanvasSelection,
    computeLineDiff,
    setActiveCanvasDocument,
    getActiveCanvasDocument,
    deleteActiveCanvasDocument,
    handleCanvasToolCall,
    formatCanvasToHtml,
    exportCanvasToPdf,
    convertCanvasToDocx,
    exportCanvasToDocx
};

