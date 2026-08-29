import { useState, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Clock, Layers, Terminal, Search, Download, Check, Sparkles, Zap, Activity } from 'lucide-react';
import TrajectoryTimeline from './TrajectoryTimeline';
import TrajectoryLedger from './TrajectoryLedger';
import { Button } from './ui/button';
import { extractThinking } from '../lib/messageUtils';

export default function TrajectoryView({
  messages = [],
  currentChatTitle = '',
  activeProject = null,
  activePersona = null,
  canvasDoc = null,
  selectedText = '',
  selectedModel = '',
  mcpTools = [],
  loading: _loading = false,
  onPreviewArtifact,
  onOpenMcpTools,
}) {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState('duration'); // 'duration' | 'turns' | 'calls'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const ledgerContainerRef = useRef(null);

  // Parse raw messages array into structured Turns and Events
  const { turns, timelineSegments } = useMemo(() => {
    const turnsList = [];
    const segments = [];
    let currentTurn = null;
    let turnCount = 0;

    // Reconstruct current active context if any (fallback for turns without metadata)
    const activeContextParts = [];
    const activeSystemStrings = [];
    if (activeProject?.customPrompt && activeProject.customPrompt.trim()) {
      const pRaw = `[Instruções do Projeto "${activeProject.name}"]:\n${activeProject.customPrompt.trim()}`;
      activeSystemStrings.push(pRaw);
      activeContextParts.push({
        type: 'project',
        title: activeProject.name,
        content: activeProject.customPrompt.trim(),
        raw: pRaw
      });
    }
    if (activePersona?.systemPrompt && activePersona.systemPrompt.trim()) {
      const pName = activePersona.name || (activePersona.nameKey ? t(activePersona.nameKey) : activePersona.id);
      const personaRaw = activePersona.systemPrompt.trim();
      activeSystemStrings.push(personaRaw);
      activeContextParts.push({
        type: 'persona',
        title: pName,
        content: personaRaw,
        raw: personaRaw
      });
    }
    if (canvasDoc && canvasDoc.content) {
      let cPrompt = `[Documento Canvas Ativo no Espaço de Trabalho]:\nTítulo: "${canvasDoc.title}" (v${canvasDoc.version || 1}, formato: ${canvasDoc.language || 'markdown'})\nTotal de Palavras: ${canvasDoc.stats?.words || 0}\n`;
      if (selectedText) {
        cPrompt += `Trecho Selecionado pelo Usuário no Canvas:\n"""\n${selectedText}\n"""\n`;
      }
      cPrompt += `Conteúdo do Documento no Canvas:\n\`\`\`${canvasDoc.language || ''}\n${canvasDoc.content}\n\`\`\``;
      activeSystemStrings.push(cPrompt);
      activeContextParts.push({
        type: 'canvas',
        title: `${canvasDoc.title} (v${canvasDoc.version || 1})`,
        content: canvasDoc.content,
        selectedText: selectedText || null,
        raw: cPrompt
      });
    }

    // Check for initial system prompt
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length > 0) {
      const combinedSystem = systemMessages.map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n\n');
      turnsList.push({
        id: 'turn-system',
        type: 'system',
        events: [{
          id: 'ev-system',
          type: 'system',
          content: combinedSystem,
        }]
      });
    }

    // Map tool responses by tool_call_id
    const toolResponsesMap = new Map();
    messages.forEach(m => {
      if (m.role === 'tool' && m.tool_call_id) {
        toolResponsesMap.set(m.tool_call_id, m);
      }
    });

    messages.forEach((msg, idx) => {
      if (msg.role === 'system') {
        // Handled above
        return;
      }

      if (msg.role === 'user') {
        turnCount++;
        const userText = typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.filter(p => p.type === 'text').map(p => p.text).join(' ')
            : '';

        currentTurn = {
          id: `turn-${turnCount}`,
          turnNumber: turnCount,
          userPrompt: userText.length > 60 ? `${userText.substring(0, 60)}...` : userText,
          events: [{
            id: `ev-user-${turnCount}`,
            type: 'user',
            content: msg.content,
            timestamp: msg.timestamp || msg.createdAt,
          }]
        };
        turnsList.push(currentTurn);

        // Timeline segment for input
        segments.push({
          id: `seg-input-${turnCount}`,
          turnId: currentTurn.id,
          type: 'input',
          title: `Turn ${turnCount} · Input`,
          subtitle: userText,
          durationMs: 800, // Nominal input time
        });
        return;
      }

      if (msg.role === 'assistant') {
        if (!currentTurn) {
          turnCount++;
          currentTurn = {
            id: `turn-${turnCount}`,
            turnNumber: turnCount,
            events: []
          };
          turnsList.push(currentTurn);
        }

        // Add Injected Context (Stage 1) event if present or fallback on Turn 1
        const injectedCtx = msg.injectedContext || (turnCount === 1 && activeContextParts.length > 0 ? {
          systemPrompt: activeSystemStrings.join('\n\n'),
          parts: activeContextParts,
          timestamp: msg.timestamp || msg.createdAt
        } : null);

        if (injectedCtx && (injectedCtx.parts?.length > 0 || injectedCtx.systemPrompt)) {
          const hasAlreadyInjectedEvent = currentTurn.events.some(e => e.type === 'injected_context');
          if (!hasAlreadyInjectedEvent) {
            currentTurn.events.push({
              id: `ev-injected-${currentTurn.turnNumber || idx}`,
              type: 'injected_context',
              title: t('trajectory.injectedContextStage1'),
              systemPrompt: injectedCtx.systemPrompt,
              parts: injectedCtx.parts || [],
              timestamp: injectedCtx.timestamp || msg.timestamp || msg.createdAt,
            });
          }
        }

        // Assistant Message Event
        const rawContent = msg.content || '';
        const { thinking } = extractThinking(typeof rawContent === 'string' ? rawContent : '');
        const reasoning = msg.liveReasoning || msg.reasoning || thinking;
        const reasoningDuration = msg.reasoningDuration;

        const assistantEvent = {
          id: `ev-asst-${idx}`,
          type: 'assistant',
          content: rawContent,
          reasoning,
          liveReasoning: msg.liveReasoning,
          reasoningDuration,
          usage: msg.usage,
          timestamp: msg.timestamp || msg.createdAt,
        };
        currentTurn.events.push(assistantEvent);

        // Model Timeline Segment
        const modelDurationMs = (reasoningDuration ? reasoningDuration * 1000 : 0) + 
          (msg.usage?.completion_time ? msg.usage.completion_time * 1000 : 1500);

        segments.push({
          id: `seg-model-${idx}`,
          turnId: currentTurn.id,
          type: 'model',
          title: `Turn ${currentTurn.turnNumber} · Model`,
          subtitle: reasoning ? 'Thinking & Generation' : 'Response Generation',
          durationMs: modelDurationMs,
        });

        // Assistant Tool Calls
        const toolCalls = msg.tool_calls || [];
        const liveTools = msg.liveExecutedTools || [];

        // Add regular tool calls
        toolCalls.forEach((tc, tcIdx) => {
          const resp = toolResponsesMap.get(tc.id);
          const isError = Boolean(resp?.error || (typeof resp?.content === 'string' && resp.content.includes('"error":')));
          const duration = resp?.durationMs || 500;

          const toolEvent = {
            id: `ev-tool-${tc.id || `${idx}-${tcIdx}`}`,
            type: 'tool',
            name: tc.function?.name || tc.name || 'tool',
            arguments: tc.function?.arguments || tc.arguments,
            result: resp?.content,
            error: resp?.error,
            durationMs: duration,
            status: resp ? (isError ? 'error' : 'completed') : (msg.isStreaming ? 'running' : 'completed'),
          };
          currentTurn.events.push(toolEvent);

          segments.push({
            id: `seg-tool-${tc.id || `${idx}-${tcIdx}`}`,
            turnId: currentTurn.id,
            type: 'tool',
            name: toolEvent.name,
            title: `Tool: ${toolEvent.name}`,
            subtitle: toolEvent.status,
            durationMs: duration,
            status: toolEvent.status,
            isError,
          });
        });

        // Add live executed tools (for compound models) if not already listed
        liveTools.forEach((lt, ltIdx) => {
          if (!toolCalls.some(tc => tc.name === lt.name || tc.function?.name === lt.name)) {
            const toolEvent = {
              id: `ev-livetool-${idx}-${ltIdx}`,
              type: 'tool',
              name: lt.name || 'tool',
              arguments: lt.arguments,
              result: lt.output,
              durationMs: lt.durationMs || 600,
              status: lt.output ? 'completed' : 'running',
            };
            currentTurn.events.push(toolEvent);

            segments.push({
              id: `seg-livetool-${idx}-${ltIdx}`,
              turnId: currentTurn.id,
              type: 'tool',
              name: toolEvent.name,
              title: `Tool: ${toolEvent.name}`,
              subtitle: toolEvent.status,
              durationMs: toolEvent.durationMs,
              status: toolEvent.status,
            });
          }
        });
      }
    });

    if (turnsList.length === 0 && activeContextParts.length > 0) {
      turnsList.push({
        id: 'turn-context-preview',
        turnNumber: 1,
        userPrompt: t('trajectory.injectedContextStage1'),
        events: [{
          id: 'ev-injected-preview',
          type: 'injected_context',
          title: t('trajectory.injectedContextStage1'),
          systemPrompt: activeSystemStrings.join('\n\n'),
          parts: activeContextParts,
          timestamp: Date.now()
        }]
      });
    }

    return { turns: turnsList, timelineSegments: segments };
  }, [messages, activeProject, activePersona, canvasDoc, selectedText, t]);

  const totalTokensSummary = useMemo(() => {
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalTokens = 0;

    turns.forEach(t => {
      t.events?.forEach(e => {
        if (e.type === 'assistant' && e.usage) {
          const prompt = e.usage.prompt_tokens || 0;
          const comp = e.usage.completion_tokens || 0;
          const tot = e.usage.total_tokens || (prompt + comp);
          totalPrompt += prompt;
          totalCompletion += comp;
          totalTokens += tot;
        }
      });
    });

    return {
      totalPrompt,
      totalCompletion,
      totalTokens
    };
  }, [turns]);

  // Handle clicking on a timeline segment to scroll directly to that turn
  const handleSelectSegment = (segment) => {
    setActiveSegmentId(segment.id);
    if (segment.turnId) {
      const el = document.getElementById(segment.turnId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Export Session Log as JSON
  const handleExportSessionLog = () => {
    setIsExporting(true);
    try {
      const sessionData = {
        title: currentChatTitle || 'Session Trajectory',
        project: activeProject ? { id: activeProject.id, name: activeProject.name } : null,
        model: selectedModel,
        exportedAt: new Date().toISOString(),
        totalTurns: turns.filter(t => t.type !== 'system').length,
        totalEvents: turns.reduce((acc, t) => acc + t.events.length, 0),
        tokensSummary: totalTokensSummary,
        turns: turns.map(t => ({
          id: t.id,
          turnNumber: t.turnNumber,
          userPrompt: t.userPrompt,
          events: t.events.map(e => ({
            type: e.type,
            name: e.name,
            title: e.title,
            systemPrompt: e.systemPrompt,
            injectedParts: e.parts,
            content: e.content,
            reasoning: e.reasoning,
            reasoningDuration: e.reasoningDuration,
            arguments: e.arguments,
            result: e.result,
            error: e.error,
            durationMs: e.durationMs,
            status: e.status,
            usage: e.usage
          }))
        }))
      };

      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-log-${(currentChatTitle || 'trajectory').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting session log:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 1500);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* 1. Trajectory Top Subheader (Title, Badges, Session Log Export) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="font-semibold text-sm text-foreground truncate">
            {currentChatTitle || activeProject?.name || t('trajectory.title')}
          </h2>

          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/80 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{t('trajectory.standardMode')}</span>
          </span>

          {totalTokensSummary.totalTokens > 0 && (
            <span 
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5 shrink-0 font-mono shadow-2xs select-none"
              title={`${t('trajectory.promptTokensLabel')}: ${totalTokensSummary.totalPrompt.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} tk | ${t('trajectory.completionTokensLabel')}: ${totalTokensSummary.totalCompletion.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} tk`}
            >
              <Activity className="w-3 h-3 text-purple-500" />
              <span>{totalTokensSummary.totalTokens.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} {t('trajectory.tokensUnit')}</span>
            </span>
          )}

          {mcpTools.length > 0 && (
            <button
              type="button"
              onClick={onOpenMcpTools}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors shadow-2xs select-none"
              title={t('chat.toolsTooltip')}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>
                {mcpTools.length === 1 ? t('trajectory.backgroundJob') : t('trajectory.backgroundJobs', { count: mcpTools.length })}
              </span>
            </button>
          )}
        </div>

        {/* Session Log Export Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportSessionLog}
          className="h-7 text-xs flex items-center gap-1.5 px-3 border-border hover:bg-muted text-foreground"
          title={t('trajectory.sessionLog')}
        >
          {isExporting ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5 text-primary" />}
          <span>{t('trajectory.sessionLog')}</span>
          <span className="text-[10px] text-muted-foreground">↓</span>
        </Button>
      </div>

      {/* 2. Control Bar (Duration, Turns, Calls Modes + Search) */}
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        {/* View Mode Toggle */}
        <div className="inline-flex p-0.5 rounded-xl bg-muted/60 border border-border/70 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('duration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'duration'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('trajectory.duration')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('turns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'turns'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>{t('trajectory.turns')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('calls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'calls'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('trajectory.calls')}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('trajectory.searchPlaceholder')}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Proportional Overview Timeline Bar */}
      <TrajectoryTimeline
        timelineSegments={timelineSegments}
        onSelectSegment={handleSelectSegment}
        activeSegmentId={activeSegmentId}
      />

      {/* 4. Event Ledger List */}
      <div 
        ref={ledgerContainerRef}
        className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3"
      >
        <TrajectoryLedger
          turns={turns}
          viewMode={viewMode}
          searchQuery={searchQuery}
          mcpTools={mcpTools}
          onPreviewArtifact={onPreviewArtifact}
        />
      </div>
    </div>
  );
}
