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
    handleCanvasToolCall
};
