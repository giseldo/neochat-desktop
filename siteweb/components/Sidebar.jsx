'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, Pin, Download, X, Sparkles } from 'lucide-react';

export default function Sidebar({
  isOpen,
  setIsOpen,
  conversations,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onTogglePin,
}) {
  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full w-72 bg-slate-950 border-r border-slate-800 flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-72'
        } ${!isOpen ? 'lg:hidden' : ''}`}
      >
        {/* Header da Sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conversa</span>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">Nenhuma conversa salva.</p>
              <p className="text-[11px] mt-1 text-slate-600">Inicie uma nova conversa para salvar o histórico.</p>
            </div>
          ) : (
            conversations.map((chat) => {
              const isSelected = chat.id === currentChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    if (window.innerWidth < 1024) setIsOpen(false);
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-6">
                    {chat.pinned ? (
                      <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{chat.title || 'Conversa sem título'}</span>
                  </div>

                  {/* Ações ao passar o mouse */}
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(chat.id);
                      }}
                      className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-700/50 rounded"
                      title={chat.pinned ? 'Desafixar' : 'Fixar'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-500 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span>Conversas: {conversations.length}</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Web Ready
            </span>
          </div>
          <div className="text-[10px] text-slate-600">
            Armazenamento local criptografado e sincronizável.
          </div>
        </div>
      </aside>
    </>
  );
}
