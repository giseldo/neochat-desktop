import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ShieldAlert, Terminal, Check, X, Zap, ShieldCheck, Ban } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Clean theme for syntax highlighter
const cleanTheme = (theme) => {
  if (!theme) return theme;
  const newTheme = { ...theme };
  if (newTheme['code[class*="language-"]']) {
    newTheme['code[class*="language-"]'] = {
      ...newTheme['code[class*="language-"]'],
      background: 'transparent',
      backgroundColor: 'transparent',
    };
  }
  if (newTheme['pre[class*="language-"]']) {
    newTheme['pre[class*="language-"]'] = {
      ...newTheme['pre[class*="language-"]'],
      background: 'transparent',
      backgroundColor: 'transparent',
    };
  }
  return newTheme;
};

const customOneDark = cleanTheme(oneDark);
const customOneLight = cleanTheme(oneLight);

function ToolApprovalModal({ toolCall, onApprove }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const allowOnceButtonRef = useRef(null);

  const handleChoice = (choice) => {
    if (onApprove) {
      onApprove(choice, toolCall);
    }
  };

  useEffect(() => {
    if (!toolCall) return;

    // Focus the primary "Allow Once" button on mount
    const timer = setTimeout(() => {
      allowOnceButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleChoice('once');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleChoice('deny');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toolCall, onApprove]);

  if (!toolCall) return null;

  // Handle both local tool calls and remote MCP approval requests
  const isMcpApprovalRequest = toolCall.type === 'mcp_approval_request';
  
  let toolName;
  let args = {};
  let serverLabel = null;

  if (isMcpApprovalRequest) {
    toolName = toolCall.name;
    serverLabel = toolCall.server_label;
    try {
      const argsString = toolCall.arguments ?? '{}';
      args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString;
    } catch (e) {
      console.error("Failed to parse MCP approval request arguments:", toolCall.arguments, e);
      args = { parse_error: "Could not parse arguments", original_arguments: toolCall.arguments };
    }
  } else {
    const { function: func } = toolCall;
    toolName = func.name;
    try {
      const argsString = func.arguments ?? '{}';
      args = JSON.parse(argsString);
    } catch (e) {
      console.error("Failed to parse tool call arguments for modal:", toolCall.function?.arguments, e);
      args = { parse_error: "Could not parse arguments", original_arguments: toolCall.function?.arguments };
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-150">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-foreground">
                {isMcpApprovalRequest ? t('toolApproval.titleRemote') : t('toolApproval.titleLocal')}
              </h2>
              {isMcpApprovalRequest && serverLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('toolApproval.server')}: <span className="font-semibold text-primary">{serverLabel}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleChoice('deny')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-foreground overflow-y-auto max-h-[60vh]">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">{t('toolApproval.message')}</p>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border font-mono text-xs text-primary font-semibold">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span>{toolName}</span>
              {serverLabel && (
                <span className="ml-auto px-2 py-0.5 rounded-md text-[11px] font-sans font-medium bg-background border border-border text-muted-foreground">
                  {serverLabel}
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">{t('toolApproval.arguments')}</p>
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30 max-h-64 overflow-y-auto text-xs">
              <SyntaxHighlighter
                language="json"
                style={isDark ? customOneDark : customOneLight}
                customStyle={{
                  margin: 0,
                  padding: '0.875rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'transparent',
                }}
              >
                {JSON.stringify(args, null, 2)}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-end gap-2.5">
          <button
            ref={allowOnceButtonRef}
            autoFocus
            onClick={() => handleChoice('once')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 ring-2 ring-primary/40 cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{t('toolApproval.allowOnce')}</span>
            <kbd className="inline-block px-1.5 py-0.5 text-[10px] bg-primary-foreground/20 border border-primary-foreground/30 rounded text-primary-foreground font-mono font-medium leading-none">
              ↵ Enter
            </kbd>
          </button>
          
          <button
            onClick={() => handleChoice('always')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{t('toolApproval.alwaysAllowTool')}</span>
          </button>
          
          <button
            onClick={() => handleChoice('yolo')}
            title={t('toolApproval.yoloTitle')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>{t('toolApproval.yoloMode')}</span>
          </button>
          
          <button
            onClick={() => handleChoice('deny')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 shrink-0" />
            <span>{t('toolApproval.deny')}</span>
            <kbd className="inline-block px-1.5 py-0.5 text-[10px] bg-background border border-border rounded text-muted-foreground font-mono font-medium leading-none">
              Esc
            </kbd>
          </button>
          
          <button
            onClick={() => handleChoice('never')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Ban className="w-4 h-4 shrink-0" />
            <span>{t('toolApproval.alwaysDenyTool')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ToolApprovalModal;
