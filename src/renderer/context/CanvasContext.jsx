import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from './ChatContext';

export const CanvasContext = createContext();

export function CanvasProvider({ children }) {
  const { currentChatId } = useChat();
  const [canvasDoc, setCanvasDoc] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState('preview'); // 'edit' | 'preview' | 'split' | 'diff'
  const [selectedText, setSelectedTextState] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [activeRevisionIndex, setActiveRevisionIndex] = useState(null);
  const [isAiEditing, setIsAiEditing] = useState(false);
  
  const canvasDocRef = useRef(canvasDoc);
  useEffect(() => {
    canvasDocRef.current = canvasDoc;
  }, [canvasDoc]);

  // Persist canvas document to chat history whenever it changes
  const persistCanvas = useCallback(async (doc) => {
    if (!currentChatId) return;
    try {
      if (window.electron?.chatHistory?.updateCanvas) {
        await window.electron.chatHistory.updateCanvas(currentChatId, doc);
      }
      if (window.electron?.canvas?.setActive) {
        await window.electron.canvas.setActive({ chatId: currentChatId, doc });
      }
    } catch (err) {
      console.error('[CanvasContext] Error persisting canvas doc:', err);
    }
  }, [currentChatId]);

  // Helper to compute metrics
  const computeStats = (content = '') => {
    const text = String(content || '').trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    const lines = text ? text.split('\n').length : 0;
    return { chars, words, readingTimeMinutes, lines };
  };

  // Create a new document in canvas
  const createNewDocument = useCallback(({
    title = 'Documento Sem Título',
    language = 'markdown',
    content = '',
    summary = 'Documento criado no Canvas',
    source = 'user'
  }) => {
    const now = new Date().toISOString();
    const stats = computeStats(content);
    const docId = `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const initialRev = {
      version: 1,
      content,
      timestamp: now,
      source: source || 'user',
      summary: summary || 'Documento criado',
      stats
    };

    const newDoc = {
      id: docId,
      title: title.trim() || 'Documento Sem Título',
      language: (language || 'markdown').toLowerCase(),
      content: content || '',
      version: 1,
      createdAt: now,
      updatedAt: now,
      stats,
      history: [initialRev]
    };

    setCanvasDoc(newDoc);
    setIsOpen(true);
    setActiveRevisionIndex(null);
    persistCanvas(newDoc);
    return newDoc;
  }, [persistCanvas]);

  // Update whole document
  const updateDocument = useCallback(({
    content,
    summary = 'Edição no documento',
    title,
    language,
    source = 'user'
  }) => {
    setCanvasDoc((prev) => {
      if (!prev) {
        return createNewDocument({ title, language, content, summary, source });
      }

      const now = new Date().toISOString();
      const updatedContent = content !== undefined ? content : prev.content;
      const stats = computeStats(updatedContent);
      const newVersion = (prev.version || 1) + 1;

      const newRev = {
        version: newVersion,
        content: updatedContent,
        timestamp: now,
        source: source || 'user',
        summary: summary || `Versão ${newVersion}`,
        stats
      };

      const updatedHistory = Array.isArray(prev.history)
        ? [...prev.history, newRev]
        : [newRev];

      const updated = {
        ...prev,
        title: title !== undefined && title.trim() ? title.trim() : prev.title,
        language: language !== undefined && language ? language.toLowerCase() : prev.language,
        content: updatedContent,
        version: newVersion,
        updatedAt: now,
        stats,
        history: updatedHistory
      };

      persistCanvas(updated);
      return updated;
    });

    if (source === 'ai') {
      setIsAiEditing(true);
      setTimeout(() => setIsAiEditing(false), 2000);
    }
  }, [createNewDocument, persistCanvas]);

  // Replace a targeted section/snippet in the document
  const applyPatch = useCallback(({
    targetText,
    replacementText = '',
    summary = 'Edição pontual',
    source = 'user'
  }) => {
    if (!targetText) return;
    
    setCanvasDoc((prev) => {
      if (!prev || !prev.content) return prev;

      let newContent = prev.content;
      if (newContent.includes(targetText)) {
        newContent = newContent.replace(targetText, replacementText);
      } else {
        const trimmedTarget = targetText.trim();
        if (trimmedTarget && newContent.includes(trimmedTarget)) {
          newContent = newContent.replace(trimmedTarget, replacementText.trim());
        }
      }

      if (newContent === prev.content) {
        console.warn('[CanvasContext] Target text not found in document to patch:', targetText);
        return prev;
      }

      const now = new Date().toISOString();
      const stats = computeStats(newContent);
      const newVersion = (prev.version || 1) + 1;

      const newRev = {
        version: newVersion,
        content: newContent,
        timestamp: now,
        source: source || 'user',
        summary: summary || `Edição pontual (v${newVersion})`,
        stats
      };

      const updated = {
        ...prev,
        content: newContent,
        version: newVersion,
        updatedAt: now,
        stats,
        history: Array.isArray(prev.history) ? [...prev.history, newRev] : [newRev]
      };

      persistCanvas(updated);
      return updated;
    });

    if (source === 'ai') {
      setIsAiEditing(true);
      setTimeout(() => setIsAiEditing(false), 2000);
    }
  }, [persistCanvas]);

  // Restore a previous version from history
  const restoreRevision = useCallback((versionNumber) => {
    setCanvasDoc((prev) => {
      if (!prev || !Array.isArray(prev.history)) return prev;
      const targetRev = prev.history.find(h => h.version === versionNumber);
      if (!targetRev) return prev;

      const now = new Date().toISOString();
      const stats = computeStats(targetRev.content);
      const newVersion = (prev.version || 1) + 1;

      const restoreRev = {
        version: newVersion,
        content: targetRev.content,
        timestamp: now,
        source: 'user',
        summary: `Restaurado a partir da Versão ${versionNumber}`,
        stats
      };

      const updated = {
        ...prev,
        content: targetRev.content,
        version: newVersion,
        updatedAt: now,
        stats,
        history: [...prev.history, restoreRev]
      };

      persistCanvas(updated);
      return updated;
    });
    setActiveRevisionIndex(null);
    setMode('preview');
  }, [persistCanvas]);

  // Load document from active chat
  const loadChatCanvas = useCallback((chatCanvasDoc) => {
    if (chatCanvasDoc && typeof chatCanvasDoc === 'object') {
      setCanvasDoc(chatCanvasDoc);
      setIsOpen(true);
      // Determine default mode based on language
      const lang = (chatCanvasDoc.language || '').toLowerCase();
      if (['javascript', 'python', 'typescript', 'js', 'py', 'ts'].includes(lang)) {
        setMode('edit');
      } else {
        setMode('preview');
      }
    } else {
      setCanvasDoc(null);
      setIsOpen(false);
      setIsFullscreen(false);
    }
    setActiveRevisionIndex(null);
  }, []);

  // Restore or open a specific version of a document from chat history
  const restoreOrOpenVersion = useCallback(({
    version = 1,
    title = 'Documento Canvas',
    content = '',
    language = 'markdown',
    summary = '',
    docId = null,
    history = null
  }) => {
    const now = new Date().toISOString();
    const stats = computeStats(content || '');
    const cleanLang = (language || 'markdown').toLowerCase();
    const cleanTitle = (title || 'Documento Canvas').trim();

    setCanvasDoc((prev) => {
      // 1. If there's currently no canvas doc (e.g. user deleted or cleared canvas)
      if (!prev) {
        const initialRevision = {
          version: version || 1,
          content: content || '',
          timestamp: now,
          source: 'ai',
          summary: summary || (version > 1 ? `Versão ${version} restaurada` : 'Documento criado no Canvas'),
          stats
        };

        const newDoc = {
          id: docId || `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: cleanTitle,
          language: cleanLang,
          content: content || '',
          version: version || 1,
          createdAt: now,
          updatedAt: now,
          stats,
          history: Array.isArray(history) && history.length > 0 ? history : [initialRevision]
        };

        persistCanvas(newDoc);
        return newDoc;
      }

      // 2. If canvas doc already matches this version and content
      if (prev.version === version && prev.content === content) {
        return prev;
      }

      // 3. Document exists: restore this version as a new revision so no history is lost
      const newVersion = (prev.version || 1) + 1;
      const restoreRev = {
        version: newVersion,
        content: content || '',
        timestamp: now,
        source: 'user',
        summary: summary || `Restaurado a partir da Versão ${version || 1}`,
        stats
      };

      const updatedHistory = Array.isArray(prev.history)
        ? [...prev.history, restoreRev]
        : [restoreRev];

      const updated = {
        ...prev,
        title: cleanTitle || prev.title,
        language: cleanLang || prev.language,
        content: content || '',
        version: newVersion,
        updatedAt: now,
        stats,
        history: updatedHistory
      };

      persistCanvas(updated);
      return updated;
    });

    setActiveRevisionIndex(null);
    if (['javascript', 'python', 'typescript', 'js', 'py', 'ts'].includes(cleanLang)) {
      setMode('edit');
    } else {
      setMode('preview');
    }
    setIsOpen(true);
  }, [persistCanvas]);

  const openCanvas = useCallback((docOverride) => {
    if (docOverride) {
      setCanvasDoc(docOverride);
      persistCanvas(docOverride);
    }
    setIsOpen(true);
  }, [persistCanvas]);

  const closeCanvas = useCallback(() => {
    setIsOpen(false);
    setIsFullscreen(false);
  }, []);

  const toggleCanvas = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const setSelectedText = useCallback((text, range = null) => {
    setSelectedTextState(text || '');
    setSelectionRange(range);
  }, []);

  const clearCanvas = useCallback(() => {
    setCanvasDoc(null);
    setIsOpen(false);
    setIsFullscreen(false);
    setSelectedTextState('');
    setSelectionRange(null);
    setActiveRevisionIndex(null);
    if (currentChatId) {
      if (window.electron?.chatHistory?.updateCanvas) {
        window.electron.chatHistory.updateCanvas(currentChatId, null);
      }
      if (window.electron?.canvas?.setActive) {
        window.electron.canvas.setActive({ chatId: currentChatId, doc: null });
      }
    }
  }, [currentChatId]);

  // Export document as file
  const exportDocument = useCallback(async (format = 'markdown') => {
    if (!canvasDoc) return;

    if (format === 'pdf') {
      if (window.electron?.canvas?.exportPdf) {
        try {
          return await window.electron.canvas.exportPdf({
            title: canvasDoc.title || 'documento',
            content: canvasDoc.content || '',
            language: canvasDoc.language || 'markdown'
          });
        } catch (err) {
          console.error('Failed to export canvas to PDF via Electron:', err);
        }
      }
      // Fallback for non-electron environment: trigger print dialog
      window.print();
      return;
    }

    if (format === 'docx') {
      if (window.electron?.canvas?.exportDocx) {
        try {
          return await window.electron.canvas.exportDocx({
            title: canvasDoc.title || 'documento',
            content: canvasDoc.content || '',
            language: canvasDoc.language || 'markdown'
          });
        } catch (err) {
          console.error('Failed to export canvas to DOCX via Electron:', err);
        }
      }
      return;
    }

    const extMap = {
      markdown: 'md',
      text: 'txt',
      html: 'html',
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      json: 'json',
      css: 'css'
    };
    const ext = extMap[format] || extMap[canvasDoc.language] || 'md';
    const filename = `${(canvasDoc.title || 'documento').replace(/[/\\?%*:|"<>]/g, '-').trim()}.${ext}`;

    const blob = new Blob([canvasDoc.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [canvasDoc]);

  return (
    <CanvasContext.Provider
      value={{
        canvasDoc,
        setCanvasDoc,
        isOpen,
        setIsOpen,
        isFullscreen,
        setIsFullscreen,
        mode,
        setMode,
        selectedText,
        selectionRange,
        activeRevisionIndex,
        setActiveRevisionIndex,
        isAiEditing,
        setIsAiEditing,
        createNewDocument,
        updateDocument,
        applyPatch,
        restoreRevision,
        restoreOrOpenVersion,
        loadChatCanvas,
        openCanvas,
        closeCanvas,
        toggleCanvas,
        toggleFullscreen,
        setSelectedText,
        clearCanvas,
        exportDocument
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
