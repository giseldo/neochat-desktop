import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, 
  X, 
  Sparkles, 
  Terminal, 
  Brain, 
  Sliders, 
  Wrench, 
  Globe, 
  Code2, 
  Trash2, 
  Plus, 
  Search, 
  Check, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  MessageSquare,
  Zap,
  CheckCircle2,
  FolderCode
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import Switch from './ui/Switch';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const AVAILABLE_ICONS = [
  { name: 'Bot', icon: Bot },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Terminal', icon: Terminal },
  { name: 'Brain', icon: Brain },
  { name: 'Code2', icon: Code2 },
  { name: 'Zap', icon: Zap },
  { name: 'Cpu', icon: Cpu },
  { name: 'FolderCode', icon: FolderCode },
  { name: 'ShieldAlert', icon: ShieldAlert },
  { name: 'CheckCircle2', icon: CheckCircle2 }
];

const PRESET_COLORS = [
  '#8b5cf6', // Purple / Hermes
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#64748b'  // Slate
];

export default function BotConfigModal({
  isOpen,
  onClose,
  bot = null,
  onSave,
  availableModels = [],
  initialTab = 'identity'
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab || 'identity');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [icon, setIcon] = useState('Bot');
  const [color, setColor] = useState('#8b5cf6');
  const [preferredModel, setPreferredModel] = useState('');
  const [temperature, setTemperature] = useState(0.5);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [approvalMode, setApprovalMode] = useState('balanced');
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [codeToolsEnabled, setCodeToolsEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  // Bot-specific memories state
  const [botMemories, setBotMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [memorySearch, setMemorySearch] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('preference');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form when modal opens or bot changes
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab || 'identity');

    if (bot) {
      setName(bot.name || '');
      setDescription(bot.description || '');
      setSystemPrompt(bot.systemPrompt || '');
      setIcon(bot.icon || 'Bot');
      setColor(bot.color || '#8b5cf6');
      setPreferredModel(bot.preferredModel || '');
      setTemperature(typeof bot.temperature === 'number' ? bot.temperature : 0.5);
      setAgentEnabled(Boolean(bot.agentEnabled));
      setApprovalMode(bot.approvalMode || 'balanced');
      setSearchEnabled(bot.searchEnabled !== false);
      setMemoryEnabled(bot.memoryEnabled !== false);

      const hasCode = Array.isArray(bot.tools) && bot.tools.some(t => ['read_file', 'write_file', 'shell_exec'].includes(t));
      setCodeToolsEnabled(hasCode);

      // Load bot memories
      loadMemories(bot.id);
    } else {
      setName('');
      setDescription('');
      setSystemPrompt('Você é um agente inteligente autônomo com memória contínua e raciocínio analítico profundo.');
      setIcon('Sparkles');
      setColor('#8b5cf6');
      setPreferredModel('');
      setTemperature(0.5);
      setAgentEnabled(false);
      setApprovalMode('balanced');
      setSearchEnabled(true);
      setCodeToolsEnabled(true);
      setMemoryEnabled(true);
      setBotMemories([]);
    }
  }, [isOpen, bot, initialTab]);

  const loadMemories = async (botId) => {
    if (!botId || !window.electron?.bots?.getMemories) return;
    try {
      setLoadingMemories(true);
      const mems = await window.electron.bots.getMemories(botId);
      setBotMemories(Array.isArray(mems) ? mems : []);
    } catch (err) {
      console.error('Error fetching bot memories:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleAddManualMemory = async (e) => {
    e.preventDefault();
    if (!newMemoryContent.trim() || !bot?.id || !window.electron?.memory?.add) return;
    try {
      const res = await window.electron.memory.add(
        newMemoryContent.trim(),
        newMemoryCategory,
        'manual',
        bot.id
      );
      if (res.success) {
        setNewMemoryContent('');
        loadMemories(bot.id);
      }
    } catch (err) {
      console.error('Error adding memory to bot:', err);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!window.electron?.memory?.delete) return;
    try {
      await window.electron.memory.delete(id);
      if (bot?.id) {
        loadMemories(bot.id);
      }
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  const handleClearAllMemories = async () => {
    if (!bot?.id || !window.electron?.bots?.clearMemories) return;
    if (!confirm('Tem certeza de que deseja apagar todas as memórias e aprendizados deste Bot?')) return;
    try {
      await window.electron.bots.clearMemories(bot.id);
      loadMemories(bot.id);
    } catch (err) {
      console.error('Error clearing bot memories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tools = [];
      if (searchEnabled) tools.push('web_search');
      if (memoryEnabled) {
        tools.push('save_user_memory');
        tools.push('forget_user_memory');
      }
      if (codeToolsEnabled) {
        tools.push(
          'read_file', 'write_file', 'edit_file', 'list_directory',
          'glob_search', 'grep_search', 'shell_exec', 'git_status'
        );
      }

      const payload = {
        id: bot?.id,
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        icon,
        color,
        preferredModel: preferredModel.trim(),
        temperature: Number(temperature),
        agentEnabled,
        approvalMode,
        searchEnabled,
        memoryEnabled,
        tools
      };

      const result = await window.electron.bots.save(payload);
      if (result.success && onSave) {
        onSave(result.bot);
      }
      onClose();
    } catch (err) {
      console.error('Error saving bot:', err);
      alert('Erro ao salvar bot: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMemories = useMemo(() => {
    if (!memorySearch.trim()) return botMemories;
    const q = memorySearch.toLowerCase().trim();
    return botMemories.filter(m => (m.content || '').toLowerCase().includes(q));
  }, [botMemories, memorySearch]);

  if (!isOpen) return null;

  const CurrentIconComponent = AVAILABLE_ICONS.find(i => i.name === icon)?.icon || Bot;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <CurrentIconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {bot ? bot.name : (t('bots.newBot') || 'Novo Agente Autônomo')}
                </h2>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0.5 tracking-wider bg-primary/10 text-primary border-primary/20">
                  {t('bots.badgeHermes') || 'Hermes Bot'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {bot 
                  ? (t('bots.editSubtitle') || 'Configure capacidades, raciocínio e memórias aprendidas.')
                  : (t('bots.createSubtitle') || 'Crie um parceiro autônomo com aprendizado contínuo.')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-border/40 bg-muted/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={cn(
              "pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === 'identity'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{t('bots.tabIdentity') || 'Identidade'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reasoning')}
            className={cn(
              "pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === 'reasoning'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('bots.tabReasoning') || 'Modelo & Raciocínio'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={cn(
              "pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === 'tools'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{t('bots.tabTools') || 'Habilidades'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('memories')}
            className={cn(
              "pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === 'memories'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{t('bots.tabMemories') || 'Aprendizados'}</span>
            {botMemories.length > 0 && (
              <span className="ml-1 text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-mono">
                {botMemories.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: IDENTIDADE */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {t('bots.nameLabel') || 'Nome do Bot'} *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Hermes Dev, Assistente Financeiro, Arquiteto..."
                  required
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {t('bots.descLabel') || 'Descrição Breve'}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Propósito ou papel principal deste agente"
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Icon Selection */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    {t('bots.iconLabel') || 'Ícone'}
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/50">
                    {AVAILABLE_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSel = icon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setIcon(item.name)}
                          className={cn(
                            "p-2 rounded-lg transition-all cursor-pointer",
                            isSel 
                              ? "bg-primary text-primary-foreground shadow-xs scale-105" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          title={item.name}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    {t('bots.colorLabel') || 'Cor de Identidade'}
                  </label>
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/50">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center",
                          color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                        )}
                      >
                        {color === c && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {t('bots.systemPromptLabel') || 'Prompt de Sistema & Diretrizes'}
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder="Instruções de personalidade, estilo e missão do agente..."
                  className="w-full text-xs font-mono p-3 rounded-xl border border-border/60 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-y leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MODELO & RACIOCÍNIO */}
          {activeTab === 'reasoning' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {t('bots.modelLabel') || 'Modelo de IA Preferido'}
                </label>
                <Input
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  placeholder={t('bots.modelPlaceholder') || 'Deixe em branco para usar o modelo selecionado no chat'}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Exemplos: <code className="text-foreground">llama-3.3-70b-versatile</code>, <code className="text-foreground">claude-3-7-sonnet</code>, <code className="text-foreground">gpt-4o</code>, <code className="text-foreground">ollama/qwen2.5-coder</code>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t('bots.temperatureLabel') || 'Temperatura'} ({temperature})
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {temperature <= 0.3 ? 'Mais preciso & determinístico' : temperature >= 0.7 ? 'Mais criativo' : 'Equilibrado'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      {t('bots.agentModeLabel') || 'Modo Agente Autônomo (Hermes Loop)'}
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Permite ao bot encadear múltiplos passos de raciocínio e execução de ferramentas sequenciais.
                    </p>
                  </div>
                  <Switch
                    checked={agentEnabled}
                    onCheckedChange={setAgentEnabled}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {t('bots.approvalModeLabel') || 'Modo de Aprovação de Ferramentas'}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'permissive', label: 'Permissivo', desc: 'Executa sem pedir confirmação' },
                    { id: 'balanced', label: 'Equilibrado', desc: 'Pede confirmação apenas para ações destrutivas' },
                    { id: 'strict', label: 'Rigoroso', desc: 'Pede confirmação a cada ferramenta' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setApprovalMode(mode.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        approvalMode === mode.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className="font-semibold text-foreground text-xs">{mode.label}</span>
                      <span className="text-[10px] mt-1 leading-snug">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HABILIDADES / TOOLS */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Selecione as ferramentas e recursos aos quais este bot terá acesso durante as conversas:
              </p>

              <div className="space-y-3">
                {/* Continuous Memory */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {t('bots.toolMemoryLabel') || 'Aprendizado e Memória Contínua (Hermes Memory)'}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permite ao Bot memorizar fatos, preferências de estilo e lições aprendidas em conversas anteriores.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={memoryEnabled}
                    onCheckedChange={setMemoryEnabled}
                  />
                </div>

                {/* Web Search */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {t('bots.toolSearchLabel') || 'Busca na Web em Tempo Real'}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Habilita a ferramenta de busca para notícias, documentações e pesquisas atualizadas.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={searchEnabled}
                    onCheckedChange={setSearchEnabled}
                  />
                </div>

                {/* Code & Terminal */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {t('bots.toolCodeLabel') || 'Operações de Arquivos e Terminal (Dev Tools)'}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permite leitura e edição de arquivos locais, busca de código no workspace e execução no shell.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={codeToolsEnabled}
                    onCheckedChange={setCodeToolsEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APRENDIZADOS CONTÍNUOS */}
          {activeTab === 'memories' && (
            <div className="space-y-4">
              {!bot?.id ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="font-semibold text-foreground">Salve o Bot primeiro</p>
                  <p className="mt-1">Após salvar este bot, ele começará a acumular aprendizados e notas automaticamente durante as conversas.</p>
                </div>
              ) : (
                <>
                  {/* Manual add memory to bot */}
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Ensinar um novo fato ou regra diretamente a este Bot:
                    </span>
                    <div className="flex gap-2">
                      <Input
                        value={newMemoryContent}
                        onChange={(e) => setNewMemoryContent(e.target.value)}
                        placeholder="ex: Prefiro que você escreva testes em Jest / O usuário trabalha no fuso de Brasília..."
                        className="text-xs flex-1"
                      />
                      <select
                        value={newMemoryCategory}
                        onChange={(e) => setNewMemoryCategory(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card text-foreground"
                      >
                        <option value="preference">Preferência</option>
                        <option value="fact">Fato</option>
                        <option value="rule">Regra</option>
                        <option value="context">Contexto</option>
                      </select>
                      <Button
                        type="button"
                        onClick={handleAddManualMemory}
                        disabled={!newMemoryContent.trim()}
                        className="text-xs shrink-0 cursor-pointer"
                        size="sm"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Ensinar
                      </Button>
                    </div>
                  </div>

                  {/* Search and list */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={memorySearch}
                        onChange={(e) => setMemorySearch(e.target.value)}
                        placeholder="Filtrar aprendizados..."
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                    {botMemories.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllMemories}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs h-8 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Limpar Todos
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {loadingMemories ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">Carregando memórias...</p>
                    ) : filteredMemories.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                        <Brain className="w-6 h-6 mx-auto mb-1 opacity-30 text-muted-foreground" />
                        <p>Nenhuma memória ou aprendizado registrado ainda para este Bot.</p>
                        <p className="text-[11px] mt-0.5">Diga coisas como "Lembre-se que..." durante o chat para ele aprender.</p>
                      </div>
                    ) : (
                      filteredMemories.map((mem) => (
                        <div
                          key={mem.id}
                          className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-colors text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 py-0">
                                {mem.category}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {mem.source === 'ai_extracted' ? '🤖 Aprendido via IA' : '👤 Manual'}
                              </span>
                            </div>
                            <p className="text-foreground/90 font-medium break-words leading-relaxed">
                              {mem.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Esquecer esta memória"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {bot?.isBuiltIn ? 'Bot nativo pré-instalado (configurações personalizáveis)' : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || isSaving}
                className="text-xs cursor-pointer"
              >
                {isSaving ? 'Salvando...' : (bot ? 'Salvar Alterações' : 'Criar Bot')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
