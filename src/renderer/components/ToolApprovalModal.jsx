import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../context/LanguageContext';

function ToolApprovalModal({ toolCall, onApprove }) {
  const { t } = useLanguage();
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
  // Local tool calls have: { function: { name, arguments }, id, ... }
  // MCP approval requests have: { name, arguments, id, server_label, type: 'mcp_approval_request' }
  const isMcpApprovalRequest = toolCall.type === 'mcp_approval_request';
  
  let toolName;
  let args = {};
  let serverLabel = null;

  if (isMcpApprovalRequest) {
    // Remote MCP approval request format
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
    // Local tool call format
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

  // More subtle button styling, consistent text color
  const baseButtonClass = "w-full sm:w-auto px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-opacity-70 transition duration-150 ease-in-out text-sm font-medium text-gray-100";
  const buttonClasses = {
    once:   `bg-blue-700 hover:bg-blue-800 focus:ring-blue-500 ${baseButtonClass}`,
    always: `bg-green-700 hover:bg-green-800 focus:ring-green-600 ${baseButtonClass}`,
    yolo:   `bg-yellow-700 hover:bg-yellow-800 focus:ring-yellow-600 ${baseButtonClass}`,
    deny:   `bg-red-700 hover:bg-red-800 focus:ring-red-600 ${baseButtonClass}`,
    never:  `bg-red-900 hover:bg-red-950 focus:ring-red-700 ${baseButtonClass}`,
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 w-full max-w-xl rounded-lg shadow-xl overflow-hidden flex flex-col border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isMcpApprovalRequest ? t('toolApproval.titleRemote') : t('toolApproval.titleLocal')}
          </h2>
          {isMcpApprovalRequest && serverLabel && (
            <p className="text-sm text-gray-400 mt-1 ml-7">
              {t('toolApproval.server')}: <span className="text-blue-400">{serverLabel}</span>
            </p>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[60vh] text-sm">
          <p className="text-gray-300 mb-2">{t('toolApproval.message')}</p>
          <div className="bg-gray-900 rounded p-2 mb-4 border border-gray-700 font-mono text-xs">
            <span className="text-blue-400 font-semibold">{toolName}</span>
          </div>

          <p className="text-gray-400 mb-1">{t('toolApproval.arguments')}</p>
          <div className="rounded overflow-hidden border border-gray-700 max-h-60 overflow-y-auto text-xs">
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '0.75rem',
                fontSize: '0.75rem',
                backgroundColor: '#1E1E1E',
                borderRadius: '0.375rem'
              }}
            >
              {JSON.stringify(args, null, 2)}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-gray-700 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            ref={allowOnceButtonRef}
            autoFocus
            onClick={() => handleChoice('once')}
            className={`${buttonClasses.once} flex items-center justify-center gap-2`}
          >
            <span>{t('toolApproval.allowOnce')}</span>
            <kbd className="inline-block px-1.5 py-0.5 text-[10px] bg-blue-900/80 border border-blue-400/30 rounded text-blue-200 font-mono">
              ↵ Enter
            </kbd>
          </button>
          <button
            onClick={() => handleChoice('always')}
            className={buttonClasses.always}
          >
            {t('toolApproval.alwaysAllowTool')}
          </button>
          <button
            onClick={() => handleChoice('yolo')}
            title={t('toolApproval.yoloTitle')}
            className={buttonClasses.yolo}
          >
            {t('toolApproval.yoloMode')}
          </button>
          <button
            onClick={() => handleChoice('deny')}
            className={`${buttonClasses.deny} flex items-center justify-center gap-2`}
          >
            <span>{t('toolApproval.deny')}</span>
            <kbd className="inline-block px-1.5 py-0.5 text-[10px] bg-red-900/80 border border-red-400/30 rounded text-red-200 font-mono">
              Esc
            </kbd>
          </button>
          <button
            onClick={() => handleChoice('never')}
            className={buttonClasses.never}
          >
            {t('toolApproval.alwaysDenyTool')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ToolApprovalModal;
