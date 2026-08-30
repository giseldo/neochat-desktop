'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MessageItem from '@/components/MessageItem';
import ChatInput from '@/components/ChatInput';
import SettingsModal from '@/components/SettingsModal';
import PromptTemplatesModal from '@/components/PromptTemplatesModal';
import { PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL } from '@/lib/providers';
import { Sparkles, Code2, Sigma, Shield, ArrowRight, Key } from 'lucide-react';

export default function NeoChatWebApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Armazenamento de chaves BYOK no navegador
  const [apiKeys, setApiKeys] = useState({});
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Estado de Entrada e Streaming
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Modais
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Carregar dados salvos do localStorage
  useEffect(() => {
    try {
      const savedKeys = localStorage.getItem('neochat_web_api_keys');
      if (savedKeys) setApiKeys(JSON.parse(savedKeys));

      const savedConvs = localStorage.getItem('neochat_web_conversations');
      if (savedConvs) {
        const parsed = JSON.parse(savedConvs);
        setConversations(parsed);
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id);
          setMessages(parsed[0].messages || []);
        }
      }

      const savedProv = localStorage.getItem('neochat_web_provider');
      if (savedProv && PROVIDERS[savedProv]) setProvider(savedProv);

      const savedModel = localStorage.getItem('neochat_web_model');
      if (savedModel) setModel(savedModel);

      const savedSystem = localStorage.getItem('neochat_web_system_prompt');
      if (savedSystem) setSystemPrompt(savedSystem);

      const savedTemp = localStorage.getItem('neochat_web_temperature');
      if (savedTemp) setTemperature(parseFloat(savedTemp));
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }
  }, []);

  // Salvar conversas no localStorage quando alteradas
  const persistConversations = (newConvs) => {
    setConversations(newConvs);
    try {
      localStorage.setItem('neochat_web_conversations', JSON.stringify(newConvs));
    } catch (e) {
      console.error('Erro ao salvar conversas:', e);
    }
  };

  // Salvar chaves no localStorage
  const handleSaveKeys = (keys) => {
    setApiKeys(keys);
    localStorage.setItem('neochat_web_api_keys', JSON.stringify(keys));
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Criar nova conversa
  const handleNewChat = () => {
    const newId = `chat_${Date.now()}`;
    const newChat = {
      id: newId,
      title: 'Nova Conversa',
      provider,
      model,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [newChat, ...conversations];
    setCurrentChatId(newId);
    setMessages([]);
    persistConversations(updated);
  };

  // Selecionar conversa
  const handleSelectChat = (chatId) => {
    const found = conversations.find((c) => c.id === chatId);
    if (found) {
      setCurrentChatId(found.id);
      setMessages(found.messages || []);
      if (found.provider) setProvider(found.provider);
      if (found.model) setModel(found.model);
    }
  };

  // Excluir conversa
  const handleDeleteChat = (chatId) => {
    const updated = conversations.filter((c) => c.id !== chatId);
    persistConversations(updated);
    if (currentChatId === chatId) {
      if (updated.length > 0) {
        setCurrentChatId(updated[0].id);
        setMessages(updated[0].messages || []);
      } else {
        setCurrentChatId(null);
        setMessages([]);
      }
    }
  };

  // Fixar conversa
  const handleTogglePin = (chatId) => {
    const updated = conversations.map((c) =>
      c.id === chatId ? { ...c, pinned: !c.pinned } : c
    );
    persistConversations(updated);
  };

  // Limpar conversa atual
  const handleClearChat = () => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }
    const updated = conversations.map((c) =>
      c.id === currentChatId ? { ...c, messages: [] } : c
    );
    setMessages([]);
    persistConversations(updated);
  };

  // Enviar mensagem
  const handleSendMessage = async (textToSend) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    // Garante que exista uma conversa ativa
    let activeChatId = currentChatId;
    let activeConversations = [...conversations];

    if (!activeChatId) {
      activeChatId = `chat_${Date.now()}`;
      const newChat = {
        id: activeChatId,
        title: messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : ''),
        provider,
        model,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      activeConversations = [newChat, ...activeConversations];
      setCurrentChatId(activeChatId);
    } else {
      // Atualiza título se for a primeira mensagem
      activeConversations = activeConversations.map((c) => {
        if (c.id === activeChatId && (!c.messages || c.messages.length === 0)) {
          return {
            ...c,
            title: messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : ''),
          };
        }
        return c;
      });
    }

    const userMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setStreamingReasoning('');

    // Atualiza conversa no array
    const updatedConvs = activeConversations.map((c) =>
      c.id === activeChatId ? { ...c, messages: newMessages } : c
    );
    persistConversations(updatedConvs);

    // Inicia a requisição de streaming
    abortControllerRef.current = new AbortController();

    try {
      const activeApiKey = apiKeys[provider] || '';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeApiKey,
        },
        body: JSON.stringify({
          messages: newMessages,
          provider,
          model,
          systemPrompt,
          temperature,
          apiKey: activeApiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let accumulatedReasoning = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
              if (parsed.reasoning) {
                accumulatedReasoning += parsed.reasoning;
                setStreamingReasoning(accumulatedReasoning);
              }
            } catch (e) {
              // ignore json parse error
            }
          }
        }
      }

      // Mensagem final do assistente
      const assistantMessage = {
        role: 'assistant',
        content: accumulated,
        reasoning: accumulatedReasoning,
        model,
        provider,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      const finalConvs = updatedConvs.map((c) =>
        c.id === activeChatId ? { ...c, messages: finalMessages } : c
      );
      persistConversations(finalConvs);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMessage = {
          role: 'assistant',
          content: `⚠️ **Erro na geração:** ${err.message}\n\n*Dica: Verifique se sua chave de API para o provedor **${provider.toUpperCase()}** está configurada e válida no botão BYOK.*`,
          model,
          provider,
        };
        const errMessages = [...newMessages, errorMessage];
        setMessages(errMessages);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setStreamingReasoning('');
      abortControllerRef.current = null;
    }
  };

  // Interromper streaming
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Aplicar template
  const handleSelectTemplate = (template) => {
    setSystemPrompt(template.systemPrompt);
    localStorage.setItem('neochat_web_system_prompt', template.systemPrompt);
  };

  const hasKey = Boolean(apiKeys[provider]);

  return (
    <div className="flex h-screen w-full bg-[#090d16] text-slate-100 overflow-hidden relative">
      {/* Background Decorativo */}
      <div className="ambient-glow bg-blue-600 top-0 left-1/4 w-96 h-96" />
      <div className="ambient-glow bg-purple-600 bottom-0 right-1/4 w-96 h-96" />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        conversations={conversations}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onTogglePin={handleTogglePin}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          provider={provider}
          setProvider={(p) => {
            setProvider(p);
            localStorage.setItem('neochat_web_provider', p);
            const provConfig = PROVIDERS[p];
            if (provConfig) {
              setModel(provConfig.defaultModel);
              localStorage.setItem('neochat_web_model', provConfig.defaultModel);
            }
          }}
          model={model}
          setModel={(m) => {
            setModel(m);
            localStorage.setItem('neochat_web_model', m);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onClearChat={handleClearChat}
          hasMessages={messages.length > 0}
          hasKey={hasKey}
        />

        {/* Área de Mensagens / Tela de Boas-Vindas */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[75vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-xl shadow-blue-500/20 mb-6">
                <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                  <img src="/icon.png" alt="NeoChat" className="w-10 h-10 rounded-xl" />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                NeoChat <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Web</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
                Workspace universal de IA com acesso direto a múltiplos provedores via modelo seguro <strong>BYOK</strong> (Bring Your Own Key), renderização de LaTeX e Markdown em tempo real.
              </p>

              {/* Sugestões Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-8">
                <button
                  onClick={() => handleSendMessage('Explique o que é o Teorema de Bell e escreva as fórmulas matemáticas fundamentais em LaTeX.')}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 group-hover:text-blue-300 mb-1">
                    <Sigma className="w-3.5 h-3.5 text-purple-400" />
                    <span>Fórmulas e Matemática em LaTeX</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Teorema de Bell e equações quânticas formatadas com KaTeX.
                  </p>
                </button>

                <button
                  onClick={() => handleSendMessage('Crie um componente React com TypeScript e Tailwind CSS para um dashboard moderno com gráficos.')}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 group-hover:text-blue-300 mb-1">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Desenvolvimento & Clean Code</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Componente React moderno com realce de sintaxe e boas práticas.
                  </p>
                </button>
              </div>

              {!hasKey && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-4 max-w-xl text-left">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Configure sua chave de API para começar a conversar (Groq, OpenAI, Claude, etc.).</span>
                  </div>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shrink-0"
                  >
                    Configurar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/20">
              {messages.map((msg, idx) => (
                <MessageItem key={idx} message={msg} />
              ))}

              {/* Mensagem em Streaming */}
              {isLoading && (streamingContent || streamingReasoning) && (
                <MessageItem
                  message={{
                    role: 'assistant',
                    content: streamingContent,
                    reasoning: streamingReasoning,
                    model,
                    provider,
                  }}
                />
              )}

              {/* Indicador de Carregamento */}
              {isLoading && !streamingContent && !streamingReasoning && (
                <div className="py-6 px-4 md:px-6 bg-slate-900/40">
                  <div className="max-w-4xl mx-auto flex items-center gap-3 text-slate-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span>Aguardando resposta do modelo...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
          onStop={handleStop}
        />
      </div>

      {/* Modais */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={handleSaveKeys}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        temperature={temperature}
        setTemperature={setTemperature}
      />

      <PromptTemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
