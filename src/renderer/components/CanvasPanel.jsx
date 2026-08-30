import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  FileText,
  FileCode,
  Sparkles,
  Edit3,
  Eye,
  Columns2,
  History,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Plus,
  Play,
  RotateCcw,
  Send,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Table as TableIcon,
  CheckSquare,
  Wand2,
  ChevronDown,
  Languages,
  Clock,
  Type,
  FileCheck,
  Scissors,
  HelpCircle,
  Undo2,
  Volume2,
  VolumeX,
  Pause,
  Square,
  AudioLines
} from 'lucide-react';
import { useCanvas } from '../context/CanvasContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MarkdownRenderer from './MarkdownRenderer';
import { cn } from '../lib/utils';
import { computeLineDiff } from '../lib/diffUtils';
import { playSpeech, stopSpeech, pauseSpeech, resumeSpeech } from '../lib/ttsUtils';

const SUPPORTED_LANGUAGES = [
  { id: 'markdown', label: 'Markdown (.md)', icon: FileText },
  { id: 'text', label: 'Texto Simples (.txt)', icon: FileText },
  { id: 'javascript', label: 'JavaScript (.js)', icon: FileCode },
  { id: 'typescript', label: 'TypeScript (.ts)', icon: FileCode },
  { id: 'python', label: 'Python (.py)', icon: FileCode },
  { id: 'html', label: 'HTML (.html)', icon: FileCode },
  { id: 'react', label: 'React JSX (.jsx)', icon: FileCode },
  { id: 'json', label: 'JSON (.json)', icon: FileCode },
  { id: 'css', label: 'CSS (.css)', icon: FileCode },
  { id: 'sql', label: 'SQL (.sql)', icon: FileCode },
];

const CANVAS_WIDTH_KEY = 'neochat_canvas_panel_width';
const DEFAULT_CANVAS_WIDTH = 680;
const MIN_CANVAS_WIDTH = 380;

export function CanvasPanel({ onSendPrompt, className }) {
  const {
    canvasDoc,
    isOpen,
    closeCanvas,
    isFullscreen,
    toggleFullscreen,
    mode,
    setMode,
    selectedText,
    setSelectedText,
    activeRevisionIndex,
    setActiveRevisionIndex,
    isAiEditing,
    updateDocument,
    restoreRevision,
    exportDocument
  } = useCanvas();

  const { t, language: appLanguage } = useLanguage();
  const { isDark } = useTheme();

  // Width & Resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(CANVAS_WIDTH_KEY);
    return saved ? Math.max(MIN_CANVAS_WIDTH, parseInt(saved, 10)) : DEFAULT_CANVAS_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Resize Drag Handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleResizeReset = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setPanelWidth(DEFAULT_CANVAS_WIDTH);
    localStorage.setItem(CANVAS_WIDTH_KEY, String(DEFAULT_CANVAS_WIDTH));
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const maxWidth = Math.max(MIN_CANVAS_WIDTH, window.innerWidth - 360);
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_CANVAS_WIDTH), maxWidth);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(CANVAS_WIDTH_KEY, String(panelWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, panelWidth]);

  // Local state for editing
  const [localContent, setLocalContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [diffComparisonVersion, setDiffComparisonVersion] = useState(null);

  // Floating selection menu state
  const [floatingMenuPos, setFloatingMenuPos] = useState(null);

  // TTS Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.05);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsVoiceURI, setTtsVoiceURI] = useState('');
  const [isTtsSpeedMenuOpen, setIsTtsSpeedMenuOpen] = useState(false);

  const editorTextareaRef = useRef(null);
  const monacoEditorRef = useRef(null);
  const previewScrollRef = useRef(null);
  const editorScrollRef = useRef(null);

  // Load global TTS settings from electron storage
  useEffect(() => {
    window.electron?.getSettings?.().then((settings) => {
      if (settings?.tts) {
        if (settings.tts.rate) setTtsRate(Number(settings.tts.rate) || 1.05);
        if (settings.tts.pitch) setTtsPitch(Number(settings.tts.pitch) || 1.0);
        if (settings.tts.voiceURI) setTtsVoiceURI(settings.tts.voiceURI);
      }
    }).catch(() => {});
  }, []);

  // Cleanup speech synthesis on unmount or when document ID changes
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [canvasDoc?.id]);

  // Sync canvasDoc content to local content
  useEffect(() => {
    if (canvasDoc) {
      setLocalContent(canvasDoc.content || '');
      setTitleInput(canvasDoc.title || '');
    }
  }, [canvasDoc]);

  // Handle language change
  const handleLanguageChange = (langId) => {
    if (!canvasDoc) return;
    updateDocument({
      content: localContent,
      language: langId,
      summary: `Formato alterado para ${langId}`,
      source: 'user'
    });
    setIsLanguageMenuOpen(false);
  };

  // Handle local text change with auto-debounce
  const handleContentChange = (newContent) => {
    setLocalContent(newContent);
  };

  const handleSaveContent = () => {
    if (!canvasDoc) return;
    if (localContent !== canvasDoc.content) {
      updateDocument({
        content: localContent,
        summary: 'Edição manual do usuário',
        source: 'user'
      });
    }
  };

  // Title save
  const handleTitleSubmit = () => {
    if (!canvasDoc) return;
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== canvasDoc.title) {
      updateDocument({
        title: trimmed,
        summary: `Título alterado para "${trimmed}"`,
        source: 'user'
      });
    }
    setIsEditingTitle(false);
  };

  // Copy document
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy canvas content:', err);
    }
  };

  // TTS Speech Synthesis Toggle & Playback
  const handleToggleSpeech = (targetText = null) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setIsPaused(false);
    } else {
      const textToSpeak = targetText || localContent || canvasDoc?.content || '';
      if (!textToSpeak.trim()) return;

      playSpeech({
        text: textToSpeak,
        language: appLanguage === 'en' ? 'en' : 'pt',
        voiceURI: ttsVoiceURI,
        rate: ttsRate,
        pitch: ttsPitch,
        onStart: () => {
          setIsSpeaking(true);
          setIsPaused(false);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onPause: () => setIsPaused(true),
        onResume: () => setIsPaused(false)
      });
    }
  };

  const handleTogglePause = () => {
    if (!isSpeaking) return;
    if (isPaused) {
      resumeSpeech();
      setIsPaused(false);
    } else {
      pauseSpeech();
      setIsPaused(true);
    }
  };

  const handleSpeedChange = (newRate) => {
    setTtsRate(newRate);
    setIsTtsSpeedMenuOpen(false);
    if (isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        handleToggleSpeech(localContent);
      }, 60);
    }
  };

  // Format action helpers for textarea markdown
  const insertFormatting = (prefix, suffix = '', placeholder = '') => {
    const textarea = editorTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;

    const updated = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setLocalContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Handle text selection detection in editor or preview
  const handleTextSelection = (e) => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim() || '';

    if (text && text.length > 2) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFloatingMenuPos({
        top: Math.max(10, rect.top - 46),
        left: Math.max(10, rect.left + rect.width / 2 - 120)
      });
    } else {
      setSelectedText('');
      setFloatingMenuPos(null);
    }
  };

  // Send a quick AI action prompt
  const handleSendQuickAction = (actionPrompt, targetSelection = selectedText) => {
    if (!onSendPrompt || !canvasDoc) return;

    let fullPrompt = '';
    if (targetSelection) {
      fullPrompt = `[Alteração no Canvas] No documento "${canvasDoc.title}", no trecho selecionado:\n"""\n${targetSelection}\n"""\n\nPor favor: ${actionPrompt}. Aplique a alteração diretamente no Canvas usando a ferramenta adequada.`;
    } else {
      fullPrompt = `[Alteração no Canvas] No documento "${canvasDoc.title}": ${actionPrompt}. Atualize o documento diretamente no Canvas.`;
    }

    onSendPrompt(fullPrompt);
    setAiPromptInput('');
    setFloatingMenuPos(null);
  };

  const handleCustomAiPromptSubmit = (e) => {
    e?.preventDefault();
    if (!aiPromptInput.trim()) return;
    handleSendQuickAction(aiPromptInput.trim(), selectedText);
  };

  if (!isOpen || !canvasDoc) return null;

  const currentLanguage = canvasDoc.language || 'markdown';
  const isCode = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'html', 'react', 'css', 'json', 'sql'].includes(currentLanguage);
  const historyList = Array.isArray(canvasDoc.history) ? canvasDoc.history : [];
  const activeRev = activeRevisionIndex !== null ? historyList[activeRevisionIndex] : null;

  // Compute diff lines between selected revision and current document (or between history steps)
  const diffLines = useMemo(() => {
    if (mode !== 'diff') return [];
    const baseContent = activeRev ? activeRev.content : (historyList[historyList.length - 2]?.content || '');
    const currentDocContent = canvasDoc.content || '';
    return computeLineDiff(baseContent, currentDocContent);
  }, [mode, activeRev, historyList, canvasDoc.content]);

  return (
    <div
      style={{ width: isFullscreen ? '100%' : `${panelWidth}px` }}
      className={cn(
        "relative flex flex-col h-full bg-background border-l border-border shadow-2xl z-40 animate-in slide-in-from-right duration-200 min-w-[360px] shrink-0",
        isFullscreen && "fixed inset-0 z-50 w-full",
        className
      )}
      onMouseUp={handleTextSelection}
    >
      {/* Left Resize Handle */}
      {!isFullscreen && (
        <div
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeReset}
          className={cn(
            "absolute top-0 left-0 -ml-1 w-2.5 h-full cursor-col-resize z-50 group select-none flex items-center justify-center transition-colors",
            isResizing ? "bg-primary/40" : "hover:bg-primary/20"
          )}
          title={t('sidebar.dragToResize') || 'Arraste para redimensionar (Duplo clique para redefinir)'}
        >
          <div className={cn(
            "w-1 h-8 rounded-full transition-colors",
            isResizing ? "bg-primary" : "bg-border group-hover:bg-primary/80"
          )} />
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 gap-2 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Canvas Icon with pulse animation when AI is editing */}
          <div className={cn(
            "p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 transition-all",
            isAiEditing && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
          )}>
            {isCode ? <FileCode className="w-4 h-4 text-cyan-500" /> : <FileText className="w-4 h-4 text-primary" />}
          </div>

          {/* Title (Inline editable) */}
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  onBlur={handleTitleSubmit}
                  autoFocus
                  className="px-2 py-0.5 text-xs font-semibold rounded bg-background border border-primary text-foreground focus:outline-none w-full max-w-[280px]"
                />
                <button
                  type="button"
                  onClick={handleTitleSubmit}
                  className="p-1 text-primary hover:bg-primary/10 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer group/title"
                title={t('canvas.clickToRename') || 'Clique para renomear'}
              >
                <h3 className="font-semibold text-xs text-foreground truncate max-w-[260px]">
                  {canvasDoc.title || 'Documento Sem Título'}
                </h3>
                <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
              </div>
            )}

            {/* Document Subtitle / Version / Language */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-medium">
                v{canvasDoc.version || 1}
              </span>
              
              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono uppercase bg-muted/60 hover:bg-muted px-1.5 py-0.2 rounded transition-colors"
                >
                  <span>{currentLanguage}</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>

                {isLanguageMenuOpen && (
                  <div className="absolute left-0 mt-1 w-44 rounded-lg bg-popover border border-border shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleLanguageChange(l.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-xs transition-colors",
                          currentLanguage === l.id && "font-semibold text-primary bg-primary/5"
                        )}
                      >
                        <l.icon className="w-3.5 h-3.5 opacity-70" />
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isAiEditing && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium animate-pulse flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('canvas.aiWriting') || 'IA editando...'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex items-center bg-muted/80 rounded-lg p-0.5 border border-border text-xs shrink-0">
          <button
            type="button"
            onClick={() => { setMode('edit'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
              mode === 'edit' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabEditor') || 'Editor'}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('canvas.tabEditor') || 'Editor'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('preview'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
              mode === 'preview' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabPreview') || 'Visualização'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('canvas.tabPreview') || 'Visualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('split'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
              mode === 'split' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabSplit') || 'Dividido'}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('canvas.tabSplit') || 'Dividido'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('diff'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors relative",
              mode === 'diff' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabHistory') || 'Histórico / Versões'}
          >
            <History className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{t('canvas.tabHistory') || 'Versões'}</span>
            {historyList.length > 1 && (
              <span className="text-[9px] px-1 rounded-full bg-primary/20 text-primary font-mono ml-0.5">
                {historyList.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* TTS Audio Controls */}
          <div className="flex items-center gap-0.5 bg-muted/70 rounded-lg p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => handleToggleSpeech()}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center",
                isSpeaking
                  ? "bg-primary text-primary-foreground shadow-xs animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={isSpeaking ? (t('canvas.ttsStop') || 'Parar Leitura') : (t('canvas.ttsPlay') || 'Ouvir Documento (TTS)')}
            >
              {isSpeaking ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={handleTogglePause}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={isPaused ? (t('canvas.ttsResume') || 'Continuar') : (t('canvas.ttsPause') || 'Pausar')}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-primary fill-primary" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Speed selection dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTtsSpeedMenuOpen(!isTtsSpeedMenuOpen)}
                className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title={t('canvas.ttsSpeed') || 'Velocidade de Leitura'}
              >
                {ttsRate}x
              </button>

              {isTtsSpeedMenuOpen && (
                <div className="absolute right-0 mt-1 w-24 rounded-lg bg-popover border border-border shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
                  {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={cn(
                        "w-full text-left px-3 py-1 text-xs hover:bg-muted font-mono transition-colors",
                        ttsRate === rate && "font-bold text-primary bg-primary/10"
                      )}
                    >
                      {rate}x {rate === 1.0 ? '(Normal)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('common.copy')}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('canvas.exportDocument') || 'Exportar'}
            >
              <Download className="w-4 h-4" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg bg-popover border border-border shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
                <button
                  type="button"
                  onClick={() => { exportDocument('markdown'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs"
                >
                  <span>Markdown</span>
                  <span className="text-[10px] text-muted-foreground">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => { exportDocument('text'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs"
                >
                  <span>Texto Simples</span>
                  <span className="text-[10px] text-muted-foreground">.txt</span>
                </button>
                <button
                  type="button"
                  onClick={() => { exportDocument('html'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs"
                >
                  <span>HTML Document</span>
                  <span className="text-[10px] text-muted-foreground">.html</span>
                </button>
                {isCode && (
                  <button
                    type="button"
                    onClick={() => { exportDocument(currentLanguage); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs"
                  >
                    <span>Código Fonte</span>
                    <span className="text-[10px] text-muted-foreground">.{currentLanguage}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isFullscreen ? t('canvas.exitFullscreen') || 'Sair da tela cheia' : t('canvas.fullscreen') || 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={closeCanvas}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-0.5"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Secondary Info Bar (Stats & Markdown Toolbar) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 text-[11px] text-muted-foreground shrink-0 overflow-x-auto">
        {/* Left: Stats */}
        <div className="flex items-center gap-3 font-mono">
          <span className="flex items-center gap-1">
            <Type className="w-3 h-3 text-muted-foreground" />
            <span>{canvasDoc.stats?.words || 0} {t('canvas.words') || 'palavras'}</span>
          </span>
          <span>•</span>
          <span>{canvasDoc.stats?.chars || 0} {t('canvas.chars') || 'caracteres'}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>~{canvasDoc.stats?.readingTimeMinutes || 1} min {t('canvas.readTime') || 'leitura'}</span>
          </span>
        </div>

        {/* Right: Markdown Formatting Toolbar (when in edit or split mode for markdown/text) */}
        {(mode === 'edit' || mode === 'split') && !isCode && (
          <div className="flex items-center gap-1 bg-muted/50 rounded p-0.5 border border-border/30">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'texto em negrito')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Negrito (Ctrl+B)"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'texto em itálico')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Itálico (Ctrl+I)"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('# ', '', 'Título Principal')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Título H1"
            >
              <Heading1 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ', '', 'Subtítulo')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Título H2"
            >
              <Heading2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ', '', 'Item da lista')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Lista"
            >
              <List className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```', 'código aqui')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Bloco de Código"
            >
              <Code className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ', '', 'Citação')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Citação"
            >
              <Quote className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('| Coluna 1 | Coluna 2 |\n|---|---|\n| Item 1 | Item 2 |')}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Tabela"
            >
              <TableIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 overflow-hidden relative bg-card flex flex-col min-h-0">
        {/* TAB 1: PREVIEW MODE */}
        {mode === 'preview' && (
          <div 
            ref={previewScrollRef}
            className="w-full h-full p-6 overflow-y-auto custom-scrollbar leading-relaxed"
          >
            <div className="max-w-4xl mx-auto">
              <MarkdownRenderer content={localContent} />
            </div>
          </div>
        )}

        {/* TAB 2: EDIT MODE */}
        {mode === 'edit' && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            {isCode ? (
              <Editor
                height="100%"
                language={currentLanguage === 'react' ? 'javascript' : currentLanguage}
                theme={isDark ? 'vs-dark' : 'light'}
                value={localContent}
                onChange={(val) => handleContentChange(val || '')}
                onMount={(editor) => { monacoEditorRef.current = editor; }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: true },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 12 }
                }}
              />
            ) : (
              <textarea
                ref={editorTextareaRef}
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={handleSaveContent}
                placeholder={t('canvas.editorPlaceholder') || 'Escreva seu documento em Markdown aqui...'}
                className="w-full h-full p-6 font-mono text-sm leading-relaxed bg-background text-foreground border-none resize-none focus:outline-none custom-scrollbar"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }}
              />
            )}
          </div>
        )}

        {/* TAB 3: SPLIT VIEW (EDITOR + PREVIEW) */}
        {mode === 'split' && (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-border overflow-hidden">
            {/* Left: Editor */}
            <div className="h-full overflow-hidden flex flex-col">
              {isCode ? (
                <Editor
                  height="100%"
                  language={currentLanguage === 'react' ? 'javascript' : currentLanguage}
                  theme={isDark ? 'vs-dark' : 'light'}
                  value={localContent}
                  onChange={(val) => handleContentChange(val || '')}
                  options={{
                    fontSize: 12.5,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 8, bottom: 8 }
                  }}
                />
              ) : (
                <textarea
                  ref={editorTextareaRef}
                  value={localContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onBlur={handleSaveContent}
                  placeholder="Editor..."
                  className="w-full h-full p-4 font-mono text-xs leading-relaxed bg-background text-foreground border-none resize-none focus:outline-none custom-scrollbar"
                />
              )}
            </div>

            {/* Right: Live Rendered Preview */}
            <div className="h-full p-5 overflow-y-auto custom-scrollbar bg-muted/5">
              <MarkdownRenderer content={localContent} />
            </div>
          </div>
        )}

        {/* TAB 4: REVISIONS & DIFF MODE */}
        {mode === 'diff' && (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
            {/* Left Column: Revisions Timeline */}
            <div className="p-3 overflow-y-auto custom-scrollbar bg-muted/20 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border text-xs font-semibold text-foreground">
                <span>{t('canvas.revisionsHistory') || 'Histórico de Versões'}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {historyList.length} {t('canvas.versions') || 'versões'}
                </span>
              </div>

              <div className="space-y-1.5">
                {historyList.slice().reverse().map((rev, index) => {
                  const actualIndex = historyList.length - 1 - index;
                  const isSelected = activeRevisionIndex === actualIndex;
                  const isCurrent = rev.version === canvasDoc.version;

                  return (
                    <div
                      key={`rev-${rev.version}-${index}`}
                      onClick={() => setActiveRevisionIndex(actualIndex)}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs cursor-pointer transition-all",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs"
                          : isCurrent
                          ? "bg-card border-border hover:border-primary/40"
                          : "bg-muted/40 border-border/60 hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="text-primary font-mono">v{rev.version}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {rev.source === 'ai' ? '🤖 IA' : '👤 Usuário'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(rev.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {rev.summary || `Versão ${rev.version}`}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-1.5 pt-1 border-t border-border/30">
                        <span>{rev.stats?.words || 0} palavras</span>
                        {isCurrent && (
                          <span className="text-primary font-medium">Atual</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Line-by-Line Diff & Restore Button */}
            <div className="col-span-2 flex flex-col h-full overflow-hidden bg-background">
              {/* Diff Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span className="font-semibold">
                    {activeRev ? `Comparando Versão ${activeRev.version} com a Versão Atual (v${canvasDoc.version})` : `Alterações Recentes`}
                  </span>
                </div>

                {activeRev && activeRev.version !== canvasDoc.version && (
                  <button
                    type="button"
                    onClick={() => restoreRevision(activeRev.version)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Restaurar esta Versão</span>
                  </button>
                )}
              </div>

              {/* Diff Lines View */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs custom-scrollbar leading-relaxed">
                {diffLines.map((line, idx) => (
                  <div
                    key={`diff-${idx}`}
                    className={cn(
                      "px-2 py-0.5 rounded flex items-start gap-2 select-text",
                      line.type === 'added' && "bg-green-500/15 text-green-700 dark:text-green-300 font-medium",
                      line.type === 'removed' && "bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-70",
                      line.type === 'unchanged' && "text-muted-foreground opacity-90"
                    )}
                  >
                    <span className="w-4 select-none opacity-50 shrink-0 text-center font-bold">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1">{line.text || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Selection Toolbar Popover */}
        {floatingMenuPos && selectedText && (
          <div
            style={{ top: `${floatingMenuPos.top}px`, left: `${floatingMenuPos.left}px` }}
            className="fixed z-50 bg-popover/95 backdrop-blur border border-primary/40 shadow-xl rounded-xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleSendQuickAction('Melhorar a escrita deste trecho')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary hover:text-primary-foreground text-foreground text-[11px] font-medium transition-colors"
                title="Melhorar escrita"
              >
                <Wand2 className="w-3 h-3 text-amber-500" />
                <span>Melhorar</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendQuickAction('Expandir e detalhar este trecho com mais profundidade')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary hover:text-primary-foreground text-foreground text-[11px] font-medium transition-colors"
              >
                <Plus className="w-3 h-3 text-blue-500" />
                <span>Expandir</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendQuickAction('Resumir e tornar este trecho mais direto e conciso')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary hover:text-primary-foreground text-foreground text-[11px] font-medium transition-colors"
              >
                <Scissors className="w-3 h-3 text-purple-500" />
                <span>Resumir</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleSpeech(selectedText)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
                  isSpeaking
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary hover:text-primary-foreground text-foreground"
                )}
                title={isSpeaking ? (t('canvas.ttsStop') || 'Parar Leitura') : (t('canvas.ttsListenSnippet') || 'Ouvir Trecho')}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3 h-3 fill-current text-white" />
                    <span>{t('canvas.ttsStop') || 'Parar'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-cyan-500" />
                    <span>{t('canvas.ttsListenSnippet') || 'Ouvir'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Interactive AI Quick Actions & Prompt Bar (Bottom) */}
      <div className="p-3 border-t border-border bg-muted/30 shrink-0 space-y-2">
        {/* Quick Action Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px] no-scrollbar">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>IA:</span>
          </span>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Reescrever e melhorar a clareza, fluidez e qualidade do texto')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            ✨ Melhorar Escrita
          </button>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Expandir o documento adicionando mais seções, detalhes e explicações')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            ➕ Expandir Conteúdo
          </button>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Resumir e encurtar o documento, mantendo apenas os pontos principais')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            ✂️ Resumir
          </button>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Revisar e corrigir todos os erros gramaticais e de pontuação')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            🔍 Corrigir Gramática
          </button>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Reescrever o documento em tom formal e profissional')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            👔 Tom Formal
          </button>

          <button
            type="button"
            onClick={() => handleSendQuickAction('Traduzir todo o documento para o Inglês')}
            className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/60 text-foreground hover:bg-primary/5 transition-colors shrink-0 shadow-2xs font-medium"
          >
            🌐 Traduzir (EN)
          </button>
        </div>

        {/* Custom AI Prompt Input Bar */}
        <form onSubmit={handleCustomAiPromptSubmit} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              placeholder={
                selectedText
                  ? `Pedir alteração no trecho selecionado (${selectedText.slice(0, 25)}...)...`
                  : t('canvas.aiPromptPlaceholder') || 'Peça ao chatbot para alterar ou editar o documento...'
              }
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!aiPromptInput.trim()}
            className={cn(
              "p-2 rounded-xl transition-all shadow-xs",
              aiPromptInput.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            )}
            title={t('canvas.sendToAi') || 'Pedir alteração à IA'}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default CanvasPanel;
