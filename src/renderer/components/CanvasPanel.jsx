import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
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
  MoreHorizontal,
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
  AudioLines,
  Trash2,
  Presentation,
  PlaySquare,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useCanvas } from '../context/CanvasContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MarkdownRenderer from './MarkdownRenderer';
import { cn } from '../lib/utils';
import { computeLineDiff } from '../lib/diffUtils';
import { playSpeech, stopSpeech, pauseSpeech, resumeSpeech } from '../lib/ttsUtils';
import { ACADEMIC_AI_ACTIONS, ACADEMIC_TEMPLATES, latexToPreviewMarkdown } from '../lib/academicTemplates';

const QUICK_AI_ACTIONS = [
  { id: 'improve', label: 'Melhorar Escrita', desc: 'Reescrever com mais clareza e fluidez', icon: Sparkles, prompt: 'Reescrever e melhorar a clareza, fluidez e qualidade do texto' },
  { id: 'expand', label: 'Expandir Conteúdo', desc: 'Adicionar mais detalhes e explicações', icon: Plus, prompt: 'Expandir o documento adicionando mais seções, detalhes e explicações' },
  { id: 'summarize', label: 'Resumir', desc: 'Encurtar mantendo os pontos principais', icon: Scissors, prompt: 'Resumir e encurtar o documento, mantendo apenas os pontos principais' },
  { id: 'grammar', label: 'Corrigir Gramática', desc: 'Revisar erros ortográficos e de pontuação', icon: FileCheck, prompt: 'Revisar e corrigir todos os erros gramaticais e de pontuação' },
  { id: 'formal', label: 'Tom Formal', desc: 'Adaptar para tom corporativo e profissional', icon: Wand2, prompt: 'Reescrever o documento em tom formal e profissional' },
  { id: 'translate', label: 'Traduzir (EN)', desc: 'Traduzir o documento para o inglês', icon: Languages, prompt: 'Traduzir todo o documento para o Inglês' },
];

const SUPPORTED_LANGUAGES = [
  { id: 'markdown', label: 'Markdown (.md)', icon: FileText },
  { id: 'latex', label: 'LaTeX (.tex)', icon: BookOpen },
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
    exportDocument,
    clearCanvas
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAiActionsMenuOpen, setIsAiActionsMenuOpen] = useState(false);
  const [isAcademicMenuOpen, setIsAcademicMenuOpen] = useState(false);
  const [diffComparisonVersion, setDiffComparisonVersion] = useState(null);

  // Refs for dropdowns
  const moreMenuRef = useRef(null);
  const exportMenuRef = useRef(null);
  const languageMenuRef = useRef(null);
  const aiActionsMenuRef = useRef(null);
  const academicMenuRef = useRef(null);

  // Floating selection menu state
  const [floatingMenuPos, setFloatingMenuPos] = useState(null);

  // TTS Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.05);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsVoiceURI, setTtsVoiceURI] = useState('');
  const [isTtsSpeedMenuOpen, setIsTtsSpeedMenuOpen] = useState(false);

  // Click outside listener for all popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(e.target)) {
        setIsLanguageMenuOpen(false);
      }
      if (aiActionsMenuRef.current && !aiActionsMenuRef.current.contains(e.target)) {
        setIsAiActionsMenuOpen(false);
      }
      if (academicMenuRef.current && !academicMenuRef.current.contains(e.target)) {
        setIsAcademicMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editorTextareaRef = useRef(null);
  const monacoEditorRef = useRef(null);
  const previewScrollRef = useRef(null);
  const editorScrollRef = useRef(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const currentLanguage = canvasDoc?.language || 'markdown';
  const isLatex = ['latex', 'tex'].includes(currentLanguage);
  const isCode = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'html', 'react', 'css', 'json', 'sql', 'latex', 'tex'].includes(currentLanguage);
  const activeAiActions = isLatex ? [...ACADEMIC_AI_ACTIONS, ...QUICK_AI_ACTIONS] : QUICK_AI_ACTIONS;
  const previewContent = useMemo(
    () => isLatex ? latexToPreviewMarkdown(localContent) : localContent,
    [isLatex, localContent]
  );
  const historyList = Array.isArray(canvasDoc?.history) ? canvasDoc.history : [];
  const activeRev = activeRevisionIndex !== null ? historyList[activeRevisionIndex] : null;

  // Compute diff lines between selected revision and current document (or between history steps)
  const diffLines = useMemo(() => {
    if (mode !== 'diff') return [];
    const baseContent = activeRev ? activeRev.content : (historyList[historyList.length - 2]?.content || '');
    const currentDocContent = canvasDoc?.content || '';
    return computeLineDiff(baseContent, currentDocContent);
  }, [mode, activeRev, historyList, canvasDoc?.content]);

  // Parse markdown content into slides
  const slides = useMemo(() => {
    if (!localContent) return [''];
    const parts = localContent.split(/\n---\n/);
    return parts.length > 0 ? parts : [localContent];
  }, [localContent]);

  // Dynamic sandboxed HTML for interactive preview
  const sandboxHtml = useMemo(() => {
    if (!localContent) return '';
    if (localContent.includes('<html') || localContent.includes('<!DOCTYPE')) {
      return localContent;
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: ${isDark ? '#09090b' : '#ffffff'};
      color: ${isDark ? '#f4f4f5' : '#09090b'};
    }
  </style>
</head>
<body>
  <div id="root">${currentLanguage === 'html' ? localContent : ''}</div>
  <script>
    try {
      ${currentLanguage !== 'html' ? localContent : ''}
    } catch (err) {
      console.error(err);
      const errBox = document.createElement('div');
      errBox.style = 'color: #ef4444; font-family: monospace; font-size: 12px; padding: 12px; border: 1px solid #ef4444; border-radius: 8px; margin-top: 16px; background: rgba(239, 68, 68, 0.1);';
      errBox.innerHTML = '<strong>Execution Error:</strong> ' + err.message;
      document.body.appendChild(errBox);
    }
  </script>
</body>
</html>`;
  }, [localContent, currentLanguage, isDark]);

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

  const handleApplyAcademicTemplate = (template) => {
    if (!template) return;
    if (localContent.trim() && !window.confirm('Substituir o conteúdo atual pelo modelo acadêmico selecionado?')) {
      return;
    }
    setLocalContent(template.content);
    updateDocument({
      title: template.title,
      language: 'latex',
      content: template.content,
      summary: `Modelo acadêmico "${template.label}" aplicado`,
      source: 'user'
    });
    setMode('split');
    setIsAcademicMenuOpen(false);
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
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-muted/30 gap-2 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  className="px-2 py-0.5 text-xs font-semibold rounded bg-background border border-primary text-foreground focus:outline-none w-full max-w-[240px]"
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
                <h3 className="font-semibold text-xs text-foreground truncate max-w-[220px]">
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
              <div className="relative" ref={languageMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono uppercase bg-muted/60 hover:bg-muted px-1.5 py-0.2 rounded transition-colors"
                >
                  <span>{currentLanguage}</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>

                {isLanguageMenuOpen && (
                  <div className="absolute left-0 mt-1 w-44 rounded-xl bg-popover border border-border shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { handleLanguageChange(l.id); setIsLanguageMenuOpen(false); }}
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

        {/* Center: Core Mode Switcher Pills (Editor | Preview | Split) */}
        <div className="flex items-center bg-muted/80 rounded-xl p-0.5 border border-border/80 text-xs shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => { setMode('edit'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs",
              mode === 'edit' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabEditor') || 'Editor'}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('canvas.tabEditor') || 'Editor'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('preview'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs",
              mode === 'preview' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabPreview') || 'Visualização'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('canvas.tabPreview') || 'Visualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('split'); handleSaveContent(); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs",
              mode === 'split' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title={t('canvas.tabSplit') || 'Dividido'}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('canvas.tabSplit') || 'Dividido'}</span>
          </button>
        </div>

        {/* Right Action Controls: Copy, Export, More Menu (...), Maximize, Close */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('common.copy') || 'Copiar conteúdo'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className={cn(
                "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                isExportMenuOpen && "bg-muted text-foreground"
              )}
              title={t('canvas.exportDocument') || 'Exportar Documento'}
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-popover border border-border shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
                <button
                  type="button"
                  onClick={() => { exportDocument('markdown'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                >
                  <span>Markdown</span>
                  <span className="text-[10px] text-muted-foreground font-mono">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => { exportDocument('text'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                >
                  <span>Texto Simples</span>
                  <span className="text-[10px] text-muted-foreground font-mono">.txt</span>
                </button>
                <button
                  type="button"
                  onClick={() => { exportDocument('html'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                >
                  <span>HTML Document</span>
                  <span className="text-[10px] text-muted-foreground font-mono">.html</span>
                </button>
                {isLatex && (
                  <button
                    type="button"
                    onClick={() => { exportDocument('latex'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                  >
                    <span>Fonte LaTeX</span>
                    <span className="text-[10px] text-muted-foreground font-mono">.tex</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { exportDocument('pdf'); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                >
                  <span>{t('canvas.exportPdf') || 'Documento PDF'}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">.pdf</span>
                </button>
                {isCode && (
                  <button
                    type="button"
                    onClick={() => { exportDocument(currentLanguage); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs transition-colors"
                  >
                    <span>Código Fonte</span>
                    <span className="text-[10px] text-muted-foreground font-mono">.{currentLanguage}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* More Options Dropdown (TTS, History, Sandbox, Slides, Clear) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={cn(
                "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative",
                (isMoreMenuOpen || ['diff', 'sandbox', 'slides'].includes(mode) || isSpeaking) && "bg-muted text-foreground"
              )}
              title="Mais Opções e Modos"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              {isSpeaking && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 p-1.5 rounded-xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 space-y-0.5 text-xs">
                {/* TTS Audio Row */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 mb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-primary" />
                      Leitura em Voz Alta
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{ttsRate}x</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSpeech()}
                      className={cn(
                        "flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors",
                        isSpeaking ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-muted text-foreground"
                      )}
                    >
                      {isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isSpeaking ? "Parar" : "Ouvir"}</span>
                    </button>
                    {isSpeaking && (
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="py-1 px-2 rounded-md bg-background border border-border hover:bg-muted text-foreground text-[11px]"
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>
                    )}
                    {/* Speed cycle button */}
                    <button
                      type="button"
                      onClick={() => {
                        const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
                        const nextRate = rates[(rates.indexOf(ttsRate) + 1) % rates.length] || 1.0;
                        handleSpeedChange(nextRate);
                      }}
                      className="py-1 px-1.5 rounded-md bg-background border border-border hover:bg-muted text-foreground text-[10px] font-mono"
                      title="Alterar Velocidade"
                    >
                      {ttsRate}x
                    </button>
                  </div>
                </div>

                {/* History / Diff Mode */}
                <button
                  type="button"
                  onClick={() => { setMode('diff'); handleSaveContent(); setIsMoreMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors text-left text-xs",
                    mode === 'diff' && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>Histórico de Versões</span>
                  </div>
                  {historyList.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-mono">
                      {historyList.length}
                    </span>
                  )}
                </button>

                {/* Sandbox Mode */}
                <button
                  type="button"
                  onClick={() => { setMode('sandbox'); handleSaveContent(); setIsMoreMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors text-left text-xs",
                    mode === 'sandbox' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  )}
                >
                  <PlaySquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sandbox Web Interativo</span>
                </button>

                {/* Slides Mode */}
                <button
                  type="button"
                  onClick={() => { setMode('slides'); handleSaveContent(); setIsMoreMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors text-left text-xs",
                    mode === 'slides' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
                  )}
                >
                  <Presentation className="w-3.5 h-3.5 text-purple-500" />
                  <span>Modo Slides / Apresentação</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                {/* Clear / Delete Document */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (canvasDoc.content && canvasDoc.content.trim()) {
                      if (!window.confirm(t('canvas.confirmDeleteCanvas') || 'Tem certeza que deseja excluir o documento Canvas desta conversa?')) {
                        return;
                      }
                    }
                    clearCanvas();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-left text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('canvas.deleteCanvas') || 'Limpar Documento'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isFullscreen ? t('canvas.exitFullscreen') || 'Sair da tela cheia' : t('canvas.fullscreen') || 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={closeCanvas}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('canvas.hideCanvas') || t('common.close')}
          >
            <X className="w-3.5 h-3.5" />
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
              <MarkdownRenderer content={previewContent} />
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
              <MarkdownRenderer content={previewContent} />
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

              {/* Diff Editor for Code or Text Diff */}
              <div className="flex-1 h-full overflow-hidden">
                {isCode ? (
                  <DiffEditor
                    height="100%"
                    original={activeRev?.content || ''}
                    modified={localContent}
                    language={currentLanguage === 'react' ? 'javascript' : currentLanguage}
                    theme={isDark ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      originalEditable: false,
                      automaticLayout: true,
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      lineNumbers: 'on',
                      renderSideBySide: true
                    }}
                  />
                ) : (
                  <div className="p-4 overflow-y-auto font-mono text-xs custom-scrollbar leading-relaxed h-full">
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE WEB SANDBOX */}
        {mode === 'sandbox' && (
          <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs">
              <div className="flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-foreground">Live Web Sandbox (Preview Interativo)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Tailwind CSS + HTML5/JS</span>
            </div>
            <div className="flex-1 w-full h-full bg-background">
              <iframe
                title="Live Sandbox Preview"
                srcDoc={sandboxHtml}
                sandbox="allow-scripts"
                className="w-full h-full border-none bg-background"
              />
            </div>
          </div>
        )}

        {/* TAB 6: SLIDES PRESENTATION MODE */}
        {mode === 'slides' && (
          <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs">
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-foreground">
                  Slide {currentSlideIndex + 1} de {slides.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-40 text-foreground"
                  title="Slide Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlideIndex >= slides.length - 1}
                  className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-40 text-foreground"
                  title="Próximo Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto bg-muted/10">
              <div className="w-full max-w-3xl min-h-[380px] p-8 rounded-2xl bg-card border border-border/80 shadow-xl flex flex-col justify-center animate-in zoom-in-95 duration-150">
                <MarkdownRenderer content={slides[currentSlideIndex] || ''} />
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

      {/* 4. Interactive AI Prompt Bar (Bottom) */}
      <div className="p-3 border-t border-border bg-muted/20 shrink-0">
        <form onSubmit={handleCustomAiPromptSubmit} className="relative flex items-center bg-background border border-border/80 hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-xl shadow-xs transition-all p-1">
          {/* Academic workspace templates */}
          <div className="relative shrink-0" ref={academicMenuRef}>
            <button
              type="button"
              onClick={() => setIsAcademicMenuOpen(!isAcademicMenuOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isLatex ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "hover:bg-muted text-muted-foreground"
              )}
              title="Criar documento acadêmico em LaTeX"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Acadêmico</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", isAcademicMenuOpen && "rotate-180")} />
            </button>
            {isAcademicMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 p-1.5 rounded-xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 space-y-0.5 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Modelos LaTeX
                </div>
                {ACADEMIC_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyAcademicTemplate(template)}
                    className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 mt-0.5 text-violet-500 shrink-0" />
                    <span>
                      <span className="block font-semibold text-foreground">{template.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{template.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

                    {/* Quick AI Actions Popover Trigger */}
          <div className="relative shrink-0" ref={aiActionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsAiActionsMenuOpen(!isAiActionsMenuOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isAiActionsMenuOpen ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              title="Ações Rápidas de IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Ações IA</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isAiActionsMenuOpen && "rotate-180")} />
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isAiActionsMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 p-1.5 rounded-xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-0.5 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedText ? 'Ações no Trecho Selecionado' : 'Ações no Documento'}
                </div>
                {activeAiActions.map(action => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      setIsAiActionsMenuOpen(false);
                      handleSendQuickAction(action.prompt);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <action.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs">{action.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            placeholder={
              selectedText
                ? `Pedir alteração no trecho selecionado (${selectedText.slice(0, 25)}...)...`
                : t('canvas.aiPromptPlaceholder') || 'Peça ao chatbot para alterar ou editar o documento...'
            }
            className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!aiPromptInput.trim()}
            className={cn(
              "p-1.5 rounded-lg transition-all shrink-0",
              aiPromptInput.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-xs"
                : "bg-transparent text-muted-foreground/40 cursor-not-allowed"
            )}
            title={t('canvas.sendToAi') || 'Pedir alteração à IA'}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default CanvasPanel;
