import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useChat } from './ChatContext';
import { 
  extractArtifactsFromMessages, 
  getArtifactExtension 
} from '../lib/artifactUtils';

export const ArtifactsContext = createContext(null);

export function ArtifactsProvider({ children }) {
  const { messages, currentChatId } = useChat();

  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Automatically extract artifacts from current conversation messages
  const artifacts = useMemo(() => {
    return extractArtifactsFromMessages(messages);
  }, [messages]);

  // Current artifact index in the list
  const currentArtifactIndex = useMemo(() => {
    if (!activeArtifact) return -1;
    return artifacts.findIndex(
      (a) => a.id === activeArtifact.id || a.identifier === activeArtifact.identifier || (a.code === activeArtifact.code && a.title === activeArtifact.title)
    );
  }, [activeArtifact, artifacts]);

  // Open an artifact by object or by ID
  const openArtifact = useCallback((artifactOrId) => {
    if (!artifactOrId) return;

    if (typeof artifactOrId === 'string') {
      const found = artifacts.find(a => a.id === artifactOrId || a.identifier === artifactOrId);
      if (found) {
        setActiveArtifact(found);
      }
    } else {
      setActiveArtifact(artifactOrId);
    }
  }, [artifacts]);

  // Close the active artifact panel
  const closeArtifact = useCallback(() => {
    setActiveArtifact(null);
  }, []);

  // Toggle the artifacts panel: if open, close; if closed, open active or latest artifact
  const toggleArtifactsPanel = useCallback(() => {
    if (activeArtifact) {
      setActiveArtifact(null);
    } else if (artifacts.length > 0) {
      // Open the latest artifact created in the conversation
      setActiveArtifact(artifacts[artifacts.length - 1]);
    } else {
      // Default empty/code interpreter artifact
      setActiveArtifact({
        id: 'scratchpad',
        title: 'Editor de Artefatos',
        type: 'html',
        code: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }\n    .box { text-align: center; padding: 2rem; border-radius: 1rem; background: #1e293b; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }\n    h1 { margin-top: 0; color: #38bdf8; }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <h1>Novo Artefato</h1>\n    <p>Edite o código no painel para ver o resultado em tempo real!</p>\n  </div>\n</body>\n</html>`
      });
    }
  }, [activeArtifact, artifacts]);

  // Navigate to next artifact
  const nextArtifact = useCallback(() => {
    if (artifacts.length === 0) return;
    if (currentArtifactIndex === -1 || currentArtifactIndex >= artifacts.length - 1) {
      setActiveArtifact(artifacts[0]);
    } else {
      setActiveArtifact(artifacts[currentArtifactIndex + 1]);
    }
  }, [artifacts, currentArtifactIndex]);

  // Navigate to previous artifact
  const prevArtifact = useCallback(() => {
    if (artifacts.length === 0) return;
    if (currentArtifactIndex <= 0) {
      setActiveArtifact(artifacts[artifacts.length - 1]);
    } else {
      setActiveArtifact(artifacts[currentArtifactIndex - 1]);
    }
  }, [artifacts, currentArtifactIndex]);

  // Open/Close gallery modal
  const openGallery = useCallback(() => setIsGalleryOpen(true), []);
  const closeGallery = useCallback(() => setIsGalleryOpen(false), []);

  // Download a single artifact
  const downloadArtifact = useCallback((art) => {
    if (!art) return;
    try {
      const ext = getArtifactExtension(art.type || art.language);
      const safeTitle = (art.title || 'artifact')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 40);
      const filename = `${safeTitle}-${Date.now()}.${ext}`;

      const blob = new Blob([art.code || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download artifact:', err);
    }
  }, []);

  // Download all artifacts
  const downloadAllArtifacts = useCallback(() => {
    if (artifacts.length === 0) return;
    artifacts.forEach((art, index) => {
      setTimeout(() => {
        downloadArtifact(art);
      }, index * 250);
    });
  }, [artifacts, downloadArtifact]);

  const value = useMemo(() => ({
    artifacts,
    activeArtifact,
    setActiveArtifact,
    openArtifact,
    closeArtifact,
    toggleArtifactsPanel,
    nextArtifact,
    prevArtifact,
    currentArtifactIndex,
    isGalleryOpen,
    setIsGalleryOpen,
    openGallery,
    closeGallery,
    downloadArtifact,
    downloadAllArtifacts,
    currentChatId
  }), [
    artifacts,
    activeArtifact,
    openArtifact,
    closeArtifact,
    toggleArtifactsPanel,
    nextArtifact,
    prevArtifact,
    currentArtifactIndex,
    isGalleryOpen,
    openGallery,
    closeGallery,
    downloadArtifact,
    downloadAllArtifacts,
    currentChatId
  ]);

  return (
    <ArtifactsContext.Provider value={value}>
      {children}
    </ArtifactsContext.Provider>
  );
}

export function useArtifacts() {
  const context = useContext(ArtifactsContext);
  if (!context) {
    throw new Error('useArtifacts must be used within an ArtifactsProvider');
  }
  return context;
}
