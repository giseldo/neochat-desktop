'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, Pin, X } from 'lucide-react';

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
      {/* Backdrop para telas menores */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-card border-r border-border flex flex-col z-40 transition-transform duration-200 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-64'
        } ${!isOpen ? 'lg:hidden' : ''}`}
      >
        {/* Header da Barra Lateral */}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold shadow-xs transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conversa</span>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <MessageSquare className="w-7 h-7 mb-2 opacity-30" />
              <p className="text-xs font-medium">Nenhum chat recente</p>
              <p className="text-[10px] mt-0.5 text-muted-foreground/60">Inicie uma nova conversa para salvar.</p>
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
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-secondary text-foreground font-semibold border-l-2 border-primary shadow-xs'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-4">
                    {chat.pinned ? (
                      <Pin className="w-3 h-3 text-primary shrink-0 rotate-45" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    )}
                    <span className="truncate">{chat.title || 'Nova Conversa'}</span>
                  </div>

                  {/* Ações */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(chat.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-card rounded"
                      title={chat.pinned ? 'Desafixar' : 'Fixar'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-card rounded"
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

        {/* Rodapé */}
        <div className="p-3 border-t border-border bg-card text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{conversations.length} conversas salvas</span>
          <span className="text-primary font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Online
          </span>
        </div>
      </aside>
    </>
  );
}
