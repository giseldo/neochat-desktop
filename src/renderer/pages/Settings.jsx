import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Eye, EyeOff, Plus, Trash2, Edit3, Save, X, RefreshCw, Key, Settings as SettingsIcon, Zap, Cpu, Server, AlertCircle, CheckCircle, Sun, Moon, Laptop, Languages, Check, Terminal, Globe, Palette, Type, Sparkles, Sliders, ExternalLink, Route, User, Wrench, Download, UploadCloud, BarChart3, GitBranch, Mic, Volume2, Info, Keyboard, Folder, FolderOpen, RotateCcw, Lightbulb, Star, ChevronDown, ChevronUp, HardDrive, Brain, Flame, AlignJustify, Maximize2, Blocks, Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Switch from '../components/ui/Switch';
import { useTheme, COLOR_THEMES, BG_THEMES, FONT_THEMES, FONT_SIZES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import PromptTemplatesModal from '../components/PromptTemplatesModal';
import KeyboardShortcutsModal, { formatAccelerator, KeyCombo, KeyBadge } from '../components/KeyboardShortcutsModal';
import UserMemoryModal from '../components/UserMemoryModal';
import { cn } from '../lib/utils';
import { getModelGroup, getModelDisplayName, groupModels, parseBulkModelsInput } from '../lib/modelGrouping';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant. Format responses using Markdown.';

const POPULAR_PROVIDER_PRESETS = [
  {
    id: 'groq',
    name: 'Groq',
    badge: 'Llama 3.3, DeepSeek R1 Distill',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    description: 'Inferência LPU ultra-rápida com modelos Llama, Gemma e DeepSeek',
    icon: Zap,
    color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30 text-orange-500',
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'Groq Console',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Gemini 2.5 Flash / 2.0 Flash / 1.5 Pro',
    defaultModel: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    description: 'Modelos Gemini 2.5, 2.0 Flash e 1.5 Pro via endpoint OpenAI-compatible',
    icon: Sparkles,
    color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-500',
    keyPlaceholder: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyUrlLabel: 'Google AI Studio',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT-4o, o1, o3-mini',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    description: 'GPT-4o, GPT-4o-mini, o1, o3-mini e catálogo oficial da OpenAI',
    icon: Sparkles,
    color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-500',
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'OpenAI Platform',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    badge: 'Claude 3.7 Sonnet / 3.5',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Claude 3.7 Sonnet (com raciocínio híbrido) e Claude 3.5 via OpenRouter',
    icon: Brain,
    color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'OpenRouter Console',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    badge: 'Sonar Pro & Reasoning',
    defaultModel: 'sonar-pro',
    baseUrl: 'https://api.perplexity.ai',
    description: 'Modelos Sonar, Sonar Pro e Sonar Reasoning com pesquisa web em tempo real',
    icon: Globe,
    color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-500',
    keyPlaceholder: 'pplx-...',
    keyUrl: 'https://www.perplexity.ai/settings/api',
    keyUrlLabel: 'Perplexity Settings',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'DeepSeek-V3 & DeepSeek-R1',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek-V3 e DeepSeek-R1 (raciocínio avançado de alto desempenho)',
    icon: Brain,
    color: 'from-blue-600/10 to-indigo-600/10 border-blue-600/30 text-blue-600 dark:text-blue-400',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyUrlLabel: 'DeepSeek Platform',
  },
  {
    id: 'grok',
    name: 'xAI (Grok)',
    badge: 'Grok 2 & Grok Vision',
    defaultModel: 'grok-2-latest',
    baseUrl: 'https://api.x.ai/v1',
    description: 'Modelos Grok desenvolvidos pela xAI',
    icon: Sparkles,
    color: 'from-zinc-500/10 to-neutral-500/10 border-zinc-500/30 text-zinc-400',
    keyPlaceholder: 'xai-...',
    keyUrl: 'https://console.x.ai/',
    keyUrlLabel: 'xAI Console',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    badge: 'Llama 3.3 (>1800 tok/s)',
    defaultModel: 'llama-3.3-70b',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Inferência em velocidade recorde com Llama 3.3 e DeepSeek R1',
    icon: Zap,
    color: 'from-amber-400/10 to-yellow-500/10 border-yellow-500/30 text-yellow-500',
    keyPlaceholder: 'csk-...',
    keyUrl: 'https://cloud.cerebras.ai/',
    keyUrlLabel: 'Cerebras Cloud',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    badge: 'Mistral Large & Codestral',
    defaultModel: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    description: 'Modelos abertos e comerciais da Mistral AI (Large, Small, Codestral, Pixtral)',
    icon: Sparkles,
    color: 'from-orange-500/10 to-red-500/10 border-orange-500/30 text-orange-500',
    keyPlaceholder: '...',
    keyUrl: 'https://console.mistral.ai/api-keys/',
    keyUrlLabel: 'Mistral Console',
  },
  {
    id: 'together',
    name: 'Together AI',
    badge: 'Llama 3.3 & Qwen 2.5',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    baseUrl: 'https://api.together.xyz/v1',
    description: 'Inferência em nuvem de código aberto com dezenas de modelos',
    icon: Sparkles,
    color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-400',
    keyPlaceholder: '...',
    keyUrl: 'https://api.together.xyz/settings/api-keys',
    keyUrlLabel: 'Together Settings',
  },
  {
    id: 'sambanova',
    name: 'SambaNova Cloud',
    badge: 'DeepSeek R1 671B Full',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    baseUrl: 'https://api.sambanova.ai/v1',
    description: 'Modelos de ponta em precisão total (DeepSeek R1 e Llama 3.3 70B)',
    icon: Cpu,
    color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-400',
    keyPlaceholder: '...',
    keyUrl: 'https://cloud.sambanova.ai/',
    keyUrlLabel: 'SambaNova Cloud',
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    badge: 'Llama 3.3 & Qwen 2.5',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    description: 'Infraestrutura econômica para Llama 3.3, Qwen 2.5 e DeepSeek V3/R1',
    icon: Server,
    color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30 text-indigo-400',
    keyPlaceholder: '...',
    keyUrl: 'https://deepinfra.com/dash/api_keys',
    keyUrlLabel: 'DeepInfra Dashboard',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    badge: 'Command R+ & RAG',
    defaultModel: 'command-r-plus-08-2024',
    baseUrl: 'https://api.cohere.com/v2',
    description: 'Modelos Command R+ e Command R para raciocínio e RAG',
    icon: Sparkles,
    color: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30 text-emerald-400',
    keyPlaceholder: '...',
    keyUrl: 'https://dashboard.cohere.com/api-keys',
    keyUrlLabel: 'Cohere Dashboard',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Centenas de Modelos',
    defaultModel: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Acesso unificado a centenas de modelos através de uma única chave',
    icon: Globe,
    color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30 text-teal-400',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'OpenRouter Keys',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    badge: 'vLLM, LiteLLM, Ollama Remoto',
    defaultModel: '',
    baseUrl: '',
    description: 'Qualquer endpoint compatível com a API da OpenAI (vLLM, LocalAI, etc.)',
    icon: SettingsIcon,
    color: 'from-muted/30 to-muted/10 border-border text-foreground',
    keyPlaceholder: 'sk-...',
    keyUrl: '',
    keyUrlLabel: '',
  }
];

function getKnownApiKeyUrl(id = '', baseUrl = '', name = '') {
  const normId = (id || '').toLowerCase();
  const normUrl = (baseUrl || '').toLowerCase();
  const normName = (name || '').toLowerCase();

  const preset = POPULAR_PROVIDER_PRESETS.find(p => p.id === normId || normName.includes(p.id) || (p.baseUrl && normUrl.includes(p.baseUrl.replace(/\/+$/, ''))));
  if (preset && preset.keyUrl) {
    return preset.keyUrl;
  }

  if (normId.includes('groq') || normUrl.includes('groq.com') || normName.includes('groq')) {
    return 'https://console.groq.com/keys';
  }
  if (normId.includes('gemini') || normId.includes('google') || normUrl.includes('googleapis.com') || normUrl.includes('generativelanguage') || normName.includes('gemini') || normName.includes('google')) {
    return 'https://aistudio.google.com/app/apikey';
  }
  if (normId.includes('openai') || normUrl.includes('openai.com') || normName.includes('openai')) {
    return 'https://platform.openai.com/api-keys';
  }
  if (normId.includes('anthropic') || normId.includes('claude') || normUrl.includes('anthropic.com') || normName.includes('anthropic') || normName.includes('claude')) {
    return 'https://console.anthropic.com/settings/keys';
  }
  if (normId.includes('openrouter') || normUrl.includes('openrouter.ai') || normName.includes('openrouter')) {
    return 'https://openrouter.ai/keys';
  }
  if (normId.includes('deepseek') || normUrl.includes('deepseek.com') || normName.includes('deepseek')) {
    return 'https://platform.deepseek.com/api_keys';
  }
  if (normId.includes('together') || normUrl.includes('together.xyz') || normUrl.includes('together.ai') || normName.includes('together')) {
    return 'https://api.together.xyz/settings/api-keys';
  }
  if (normId.includes('fireworks') || normUrl.includes('fireworks.ai') || normName.includes('fireworks')) {
    return 'https://fireworks.ai/api-keys';
  }
  if (normId.includes('mistral') || normUrl.includes('mistral.ai') || normName.includes('mistral')) {
    return 'https://console.mistral.ai/api-keys/';
  }
  if (normId.includes('grok') || normId.includes('xai') || normUrl.includes('x.ai') || normName.includes('xai') || normName.includes('grok')) {
    return 'https://console.x.ai/';
  }
  if (normId.includes('perplexity') || normUrl.includes('perplexity.ai') || normName.includes('perplexity')) {
    return 'https://www.perplexity.ai/settings/api';
  }
  if (normId.includes('cohere') || normUrl.includes('cohere.com') || normUrl.includes('cohere.ai') || normName.includes('cohere')) {
    return 'https://dashboard.cohere.com/api-keys';
  }
  if (normId.includes('cerebras') || normUrl.includes('cerebras.ai') || normName.includes('cerebras')) {
    return 'https://cloud.cerebras.ai/';
  }
  if (normId.includes('sambanova') || normUrl.includes('sambanova.ai') || normName.includes('sambanova')) {
    return 'https://cloud.sambanova.ai/';
  }
  if (normId.includes('deepinfra') || normUrl.includes('deepinfra.com') || normName.includes('deepinfra')) {
    return 'https://deepinfra.com/dash/api_keys';
  }
  if (normId.includes('novita') || normUrl.includes('novita.ai') || normName.includes('novita')) {
    return 'https://novita.ai/dashboard/key-management';
  }
  if (normId.includes('ai21') || normUrl.includes('ai21.com') || normName.includes('ai21')) {
    return 'https://studio.ai21.com/account/api-key';
  }
  if (normId.includes('voyage') || normUrl.includes('voyageai.com') || normName.includes('voyage')) {
    return 'https://dash.voyageai.com/api-keys';
  }
  if (normId.includes('huggingface') || normId.includes('hf') || normUrl.includes('huggingface.co') || normName.includes('huggingface')) {
    return 'https://huggingface.co/settings/tokens';
  }
  return '';
}

function Settings() {
  const {
    theme,
    setTheme,
    colorTheme,
    setColorTheme,
    bgTheme,
    setBgTheme,
    fontTheme,
    setFontTheme,
    fontSize,
    setFontSize,
    chatWidth,
    setChatWidth,
    resolvedTheme,
    isDark
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [isPromptTemplatesModalOpen, setIsPromptTemplatesModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryStats, setMemoryStats] = useState({ total: 0, active: 0 });
  const [isTestingWebSearch, setIsTestingWebSearch] = useState(false);
  const [webSearchTestResult, setWebSearchTestResult] = useState(null);
  const [pluginList, setPluginList] = useState([]);
  const [isTogglingPlugin, setIsTogglingPlugin] = useState(null);
  const [settings, setSettings] = useState({
    language: 'pt',
    interfaceMode: 'user',
    agentHarness: 'native',
    showTrajectoryTab: true,
    showWelcomeTips: false,
    showWelcomeSuggestions: false,
    showButtonLabels: false,
    GROQ_API_KEY: '',
    temperature: 0.7,
    top_p: 0.95,
    reasoning_effort: 'medium',
    mcpServers: {},
    disabledMcpServers: [],
    customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    popupEnabled: true,
    popupShortcut: 'CommandOrControl+Shift+Space',
    customCompletionUrl: '',
    toolOutputLimit: 8000,
    customApiBaseUrl: '',
    customApiBaseUrlEnabled: false,
    customModels: {},
    builtInTools: {
      codeInterpreter: false,
      browserSearch: false
    },
    webSearch: {
      enabled: true,
      provider: 'local',
      apiKey: '',
      maxResults: 3,
      maxSearchesPerTurn: 2
    },
    modelFilter: '',
    modelFilterExclude: '',
    enableThinkingSummaries: true,
    useResponsesApi: false,
    logApiRequests: false,
    googleConnectors: { gmail: false, calendar: false, drive: false },
    googleConnectorsApproval: { gmail: 'never', calendar: 'never', drive: 'never' },
    googleOAuthToken: '',
    googleRefreshToken: '',
    googleClientId: '',
    googleClientSecret: '',
    googleTokenExpiresAt: null,
    remoteMcpServers: {},
    fallbackProviders: [],
    fallbackModels: {},
    tts: { enabled: true, autoSpeak: false, voiceURI: '', rate: 1.05, pitch: 1 },
    voiceInput: { enabled: true, apiKey: '' },
    autoUpdate: { checkOnStartup: true, channel: 'stable' },
    observability: { monthlyBudgetUsd: 0, defaultRate: { input: 0, output: 0 }, modelRates: {} },
    gitIntegration: { repositoryPath: '' },
    providerFilterTab: 'active'
  });
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showVoiceApiKey, setShowVoiceApiKey] = useState(false);
  const [isDeletingAllModalOpen, setIsDeletingAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [newMcpServer, setNewMcpServer] = useState({
    id: '',
    transport: 'stdio',
    command: '',
    args: '',
    env: {},
    url: '',
    headers: {}
  });
  const [useJsonInput, setUseJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [settingsPath, setSettingsPath] = useState('');
  const [configDirInfo, setConfigDirInfo] = useState({
    currentPath: '',
    defaultPath: '',
    isCustom: false,
    settingsPath: ''
  });
  const [isChangingConfigDirModalOpen, setIsChangingConfigDirModalOpen] = useState(false);
  const [isResetConfigDirModalOpen, setIsResetConfigDirModalOpen] = useState(false);
  const [pendingNewConfigPath, setPendingNewConfigPath] = useState('');
  const [copyExistingFiles, setCopyExistingFiles] = useState(true);
  const [isConfigDirLoading, setIsConfigDirLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerFilterTab, setProviderFilterTab] = useState('active'); // 'all' | 'active' | 'configured' | 'local' | 'custom'
  const [providerSearchTerm, setProviderSearchTerm] = useState('');
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [modalTestResult, setModalTestResult] = useState(null);
  const [showModalApiKey, setShowModalApiKey] = useState(false);
  const modalApiKeyInputRef = useRef(null);
  const [customProviderForm, setCustomProviderForm] = useState({
    id: '',
    name: '',
    baseUrl: '',
    apiKey: '',
    defaultModel: '',
    description: '',
    isLocal: false,
    requiresApiKey: true,
    enabled: true
  });
  const [customProviderFormErrors, setCustomProviderFormErrors] = useState({});
  const [providerTestResults, setProviderTestResults] = useState({});
  const [deletingCustomProvider, setDeletingCustomProvider] = useState(null);
  const [expandedProviderCardIds, setExpandedProviderCardIds] = useState(new Set());
  const [showProviderApiKeyMap, setShowProviderApiKeyMap] = useState({});
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });
  const [editingServerId, setEditingServerId] = useState(null);
  const [newCustomModel, setNewCustomModel] = useState({
    id: '',
    displayName: '',
    group: '',
    context: 1000000,
    vision_supported: false,
    builtin_tools_supported: false
  });
  const [editingModelId, setEditingModelId] = useState(null);
  const [customModelTab, setCustomModelTab] = useState('single'); // 'single' | 'bulk' | 'json'
  const [bulkModelsInput, setBulkModelsInput] = useState('');
  const [bulkDefaultContext, setBulkDefaultContext] = useState(1000000);
  const [bulkDefaultGroup, setBulkDefaultGroup] = useState('');
  const [bulkVisionSupported, setBulkVisionSupported] = useState(false);
  const [bulkToolsSupported, setBulkToolsSupported] = useState(false);
  const [customModelsJsonInput, setCustomModelsJsonInput] = useState('');
  const [customModelSearchQuery, setCustomModelSearchQuery] = useState('');
  const [modelConfigs, setModelConfigs] = useState({});
  const [allLoadedModels, setAllLoadedModels] = useState([]);
  const [providerModelSearchQuery, setProviderModelSearchQuery] = useState('');
  const [expandedProviderGroups, setExpandedProviderGroups] = useState(new Set());
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  
  // Remote MCP Server state
  const [newRemoteMcpServer, setNewRemoteMcpServer] = useState({
    id: '',
    serverUrl: '',
    serverLabel: '',
    serverDescription: '',
    requireApproval: 'never',
    allowedTools: '', // Comma-separated list of tool names to filter (empty = all tools)
    headers: {}
  });
  const [newRemoteMcpHeader, setNewRemoteMcpHeader] = useState({ key: '', value: '' });
  const [editingRemoteMcpServerId, setEditingRemoteMcpServerId] = useState(null);
  
  // Local AI Auto-Detection state
  const [localAiStatus, setLocalAiStatus] = useState(null);
  const [isDetectingLocalAi, setIsDetectingLocalAi] = useState(false);
  const [speechVoices, setSpeechVoices] = useState([]);
  const [updateStatus, setUpdateStatus] = useState({ status: 'idle', percent: 0 });
  const [usageSummary, setUsageSummary] = useState(null);
  const [gitOutput, setGitOutput] = useState('');
  const [gitCommitMessage, setGitCommitMessage] = useState('');
  const [isGitBusy, setIsGitBusy] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState(null);

  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
  }, []);

  const POPUP_SHORTCUT_PRESETS = useMemo(() => [
    { value: 'CommandOrControl+Shift+Space', label: `${isMac ? '⌘+Shift+Space' : 'Ctrl+Shift+Espaço'} (Padrão)` },
    { value: 'Alt+Space', label: `${isMac ? '⌥+Space' : 'Alt+Espaço'}` },
    { value: 'Alt+Shift+G', label: `${isMac ? '⌥+Shift+G' : 'Alt+Shift+G'}` },
    { value: 'CommandOrControl+Alt+G', label: `${isMac ? '⌘+⌥+G' : 'Ctrl+Alt+G'}` },
    { value: 'CommandOrControl+Shift+G', label: `${isMac ? '⌘+Shift+G' : 'Ctrl+Shift+G'}` },
    { value: 'CommandOrControl+G', label: `${isMac ? '⌘+G' : 'Ctrl+G'}` },
  ], [isMac]);

  const loadMemoryStats = async () => {
    if (window.electron?.memory?.getStats) {
      try {
        const stats = await window.electron.memory.getStats();
        setMemoryStats(stats || { total: 0, active: 0 });
      } catch (err) {
        console.warn('Error fetching memory stats:', err);
      }
    }
  };

  // Load shortcut status & memory stats on mount
  useEffect(() => {
    if (window.electron?.getGlobalShortcutStatus) {
      window.electron.getGlobalShortcutStatus()
        .then(status => setShortcutStatus(status))
        .catch(err => console.warn('Error fetching shortcut status:', err));
    }
    loadMemoryStats();
  }, []);

  // Listen for keypress when recording custom shortcut
  useEffect(() => {
    if (!isRecordingShortcut) return;

    const handleRecordKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsRecordingShortcut(false);
        return;
      }

      const isModifierKey = ['Control', 'Meta', 'Alt', 'Shift', 'AltGraph'].includes(e.key);
      if (isModifierKey) return;

      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');

      if (modifiers.length === 0) {
        return;
      }

      let keyPart = e.code.replace('Key', '').replace('Digit', '');
      if (e.code === 'Space' || e.key === ' ') {
        keyPart = 'Space';
      } else if (e.key.length === 1) {
        keyPart = e.key.toUpperCase();
      }

      const recordedShortcut = [...modifiers, keyPart].join('+');
      const updatedSettings = { ...settings, popupShortcut: recordedShortcut };
      setSettings(updatedSettings);
      saveSettings(updatedSettings);
      setIsRecordingShortcut(false);

      if (window.electron?.updateGlobalShortcut) {
        window.electron.updateGlobalShortcut(recordedShortcut, settings.popupEnabled !== false)
          .then(res => setShortcutStatus(res));
      }
    };

    window.addEventListener('keydown', handleRecordKeyDown, true);
    return () => window.removeEventListener('keydown', handleRecordKeyDown, true);
  }, [isRecordingShortcut, settings]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const loadVoices = () => setSpeechVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    window.electron?.updater?.getStatus?.().then(setUpdateStatus);
    return window.electron?.updater?.onStatus?.(setUpdateStatus);
  }, []);

  const refreshUsageSummary = () => window.electron?.observability?.getSummary?.().then(setUsageSummary);

  useEffect(() => {
    refreshUsageSummary();
  }, []);

  const checkLocalAi = async () => {
    if (!window.electron?.localAi?.detect) return;
    setIsDetectingLocalAi(true);
    try {
      const res = await window.electron.localAi.detect();
      setLocalAiStatus(res);
    } catch (err) {
      console.warn('Error detecting local AI:', err);
    } finally {
      setIsDetectingLocalAi(false);
    }
  };

  useEffect(() => {
    checkLocalAi();
  }, []);
  
  const statusTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Handle Escape key to dismiss settings/modals or clear search, and / or Ctrl+K to search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'Escape') {
        if (isDeletingAllModalOpen && !isDeletingAll) {
          setIsDeletingAllModalOpen(false);
        } else if (isChangingConfigDirModalOpen && !isConfigDirLoading) {
          setIsChangingConfigDirModalOpen(false);
        } else if (isResetConfigDirModalOpen && !isConfigDirLoading) {
          setIsResetConfigDirModalOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        } else if (!isDeletingAllModalOpen && !isChangingConfigDirModalOpen && !isResetConfigDirModalOpen) {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isDeletingAllModalOpen, isDeletingAll, isChangingConfigDirModalOpen, isResetConfigDirModalOpen, isConfigDirLoading, searchQuery]);

  const CATEGORIES = useMemo(() => [
    { id: 'all', label: t('settings.navAll') || 'Todas', icon: Sliders, desc: 'Todas as configurações do aplicativo' },
    { id: 'interface', label: t('settings.navInterface') || 'Interface & Aparência', icon: Palette, desc: 'Personalize o modo de uso, temas, cores, tipografia e abas da tela' },
    { id: 'plugins', label: 'Módulos & Plugins', icon: Sparkles, desc: 'Gerenciamento de módulos e plugins com lazy-loading e zero overhead em repouso' },
    { id: 'features', label: t('settings.navFeatures') || 'Ativar/Desativar Recursos', icon: Zap, desc: 'Controle de voz Whisper, leitura TTS, busca web, ferramentas e atalhos' },
    { id: 'models', label: t('settings.navModels') || 'Modelos & Provedores', icon: Cpu, desc: 'Provedores de IA, chaves de API, parâmetros e catálogo de modelos' },
    { id: 'integrations', label: t('settings.navIntegrations') || 'Integrações & MCP', icon: Server, desc: 'Servidores MCP locais e remotos, conectores Google e permissões' },
    { id: 'system', label: t('settings.navSystem') || 'Sistema & Dados', icon: Folder, desc: 'Pasta de armazenamento, atualizações, backups e histórico' },
  ], [t]);

  const CARDS_METADATA = useMemo(() => [
    {
      id: 'pluginsHub',
      category: 'plugins',
      title: 'Módulos & Extensões (Plugins Hub)',
      desc: 'Ative ou desative módulos individuais para economizar recursos e memória',
      keywords: 'plugins modulos extensoes arena debate sandbox live preview podcast studio grafo conhecimento briefing vision',
      isPowerOnly: false
    },
    {
      id: 'interfaceMode',
      category: 'interface',
      title: t('settings.interfaceModeTitle') || 'Experiência da interface',
      desc: t('settings.interfaceModeDesc') || 'Modo Usuário vs Power User',
      keywords: 'modo usuario power interface experiencia layout controles tecnicos user switch',
      isPowerOnly: false
    },
    {
      id: 'language',
      category: 'interface',
      title: t('settings.langTitle') || 'Idioma da Interface',
      desc: t('settings.langDesc') || 'Português e Inglês',
      keywords: 'idioma lingua language portugues ingles english pt en brasil tradução',
      isPowerOnly: false
    },
    {
      id: 'appearance',
      category: 'interface',
      title: t('settings.appearanceTitle') || 'Aparência e Tema',
      desc: t('settings.appearanceDesc') || 'Cores, modo claro/escuro, fontes e tamanhos',
      keywords: 'tema aparencia cores modo escuro dark mode light fundo background tipografia font tamanho size preview oled slate warm zinc tinted',
      isPowerOnly: false
    },
    {
      id: 'trajectoryTab',
      category: 'interface',
      title: t('settings.trajectoryTabTitle') || 'Aba de Trajetória',
      desc: t('settings.trajectoryTabDesc') || 'Exibir ou ocultar a aba de raciocínio no chat',
      keywords: 'trajetoria trajectory aba tab raciocinio pensamento agente timeline passos ledger',
      isPowerOnly: true
    },
    {
      id: 'welcomeTips',
      category: 'interface',
      title: t('settings.welcomeTipsTitle') || 'Dicas de Boas-Vindas & Sobrevivência',
      desc: t('settings.welcomeTipsDesc') || 'Exibir ou ocultar card de dicas e humor na tela inicial',
      keywords: 'dica sobrevivencia regra de ouro humor frase welcome screen inicio card quotes dev tips',
      isPowerOnly: false
    },
    {
      id: 'welcomeSuggestions',
      category: 'interface',
      title: t('settings.welcomeSuggestionsTitle') || 'Sugestões de Prompts Rápidos',
      desc: t('settings.welcomeSuggestionsDesc') || 'Exibir ou ocultar atalhos e sugestões na tela inicial',
      keywords: 'atalhos sugestoes prompts chips botoes welcome tela inicial rapides inspiracao',
      isPowerOnly: false
    },
    {
      id: 'buttonLabels',
      category: 'interface',
      title: t('settings.buttonLabelsTitle') || 'Rótulos dos Botões',
      desc: t('settings.buttonLabelsDesc') || 'Exibir ou ocultar os textos nos botões',
      keywords: 'rotulos labels botoes texto icons icones toolbar barra cabecalho user power',
      isPowerOnly: false
    },
    {
      id: 'thinkingSummaries',
      category: 'interface',
      title: t('settings.thinkingSummariesTitle') || 'Resumos de Raciocínio',
      desc: t('settings.thinkingSummariesDesc') || 'Exibir ou ocultar blocos de raciocínio',
      keywords: 'raciocinio think thinking summaries resumo colapsavel pensamento deepseek qwen',
      isPowerOnly: true
    },
    {
      id: 'voiceInput',
      category: 'features',
      title: t('settings.voiceInputTitle') || 'Ditado e Entrada de Voz',
      desc: t('settings.voiceInputDesc') || 'Groq Whisper para transcrição rápida',
      keywords: 'voz ditado microfone whisper audio speech to text groq stt gravar falar atalho',
      isPowerOnly: false
    },
    {
      id: 'tts',
      category: 'features',
      title: t('settings.ttsTitle') || 'Leitura em voz alta',
      desc: t('settings.ttsDesc') || 'Vozes, velocidade e tom para leitura de respostas',
      keywords: 'tts leitura voz alta audio speech synthesis falar ouvir velocidade tom pitch rate vozes ler',
      isPowerOnly: false
    },
    {
      id: 'popupWindow',
      category: 'features',
      title: t('settings.popupWindowTitle') || 'Janela Popup & Atalhos',
      desc: t('settings.popupWindowDesc') || 'Janela flutuante rápida e atalho global',
      keywords: 'popup janela flutuante atalho shortcut global teclas teclado hotkey gravador recording ctrl space',
      isPowerOnly: true
    },
    {
      id: 'webSearch',
      category: 'features',
      title: t('settings.webSearchTitle') || 'Pesquisa Web Nativa',
      desc: t('settings.webSearchDesc') || 'Busca na web Local, Tavily e Brave',
      keywords: 'pesquisa busca web search google tavily brave duckduckgo internet navegar resultados api key chave teste',
      isPowerOnly: true
    },
    {
      id: 'userMemory',
      category: 'features',
      title: t('memory.title') || 'Memória Persistente (User Memory)',
      desc: t('memory.description') || 'A IA aprende e lembra automaticamente suas preferências de código, estilo e contexto entre conversas.',
      keywords: 'memoria user memory preferences persistente fatos regras perfil usuario aprendizado automatico contexto lembrar',
      isPowerOnly: false
    },
    {
      id: 'builtInTools',
      category: 'features',
      title: t('settings.builtinToolsTitle') || 'Ferramentas Integradas',
      desc: t('settings.builtinToolsDesc') || 'Code Interpreter e Browser Search',
      keywords: 'ferramentas integradas builtin tools code interpreter python browser search executar codigo script',
      isPowerOnly: true
    },
    {
      id: 'systemPrompt',
      category: 'features',
      title: t('settings.systemPromptTitle') || 'Prompt de Sistema Customizado',
      desc: t('settings.systemPromptDesc') || 'Instruções personalizadas para todas as conversas',
      keywords: 'prompt sistema custom system prompt instrucoes comportamento persona globais mensagem inicial',
      isPowerOnly: true
    },
    {
      id: 'promptTemplates',
      category: 'features',
      title: t('promptTemplates.modalTitle') || 'Biblioteca de Prompts & Comandos Slash',
      desc: t('promptTemplates.modalSubtitle') || 'Gerencie atalhos de prompt e comandos',
      keywords: 'templates prompt comandos slash barra atalhos modelos mensagens prontas atalho /',
      isPowerOnly: true
    },
    {
      id: 'api',
      category: 'models',
      title: t('settings.apiTitle') || 'Configuração da API & Provedores',
      desc: t('settings.apiDesc') || 'Provedores de IA, detecção de Ollama/LM Studio e chaves de API',
      keywords: 'api provedores providers groq openai anthropic claude deepseek ollama lmstudio local ai chaves tokens endpoint base url',
      isPowerOnly: true
    },
    {
      id: 'generationParams',
      category: 'models',
      title: t('settings.generationParamsTitle') || 'Parâmetros de Geração',
      desc: t('settings.generationParamsDesc') || 'Temperature, Top-P e Reasoning Effort',
      keywords: 'parametros geracao temperature temperatura top p reasoning effort amostragem criatividade esforco',
      isPowerOnly: true
    },
    {
      id: 'modelsByProvider',
      category: 'models',
      title: t('settings.modelsByProviderTitle') || 'Modelos Ativos por Provedor',
      desc: t('settings.modelsByProviderDesc') || 'Ativar e desativar modelos e grupos disponíveis',
      keywords: 'modelos ativos provider models ativar desativar habilitar grupos groq llama gpt claude deepseek lista',
      isPowerOnly: true
    },
    {
      id: 'customModels',
      category: 'models',
      title: t('settings.customModelsTitle') || 'Modelos Customizados',
      desc: t('settings.customModelsDesc') || 'Adicionar modelos manuais, em massa e importação JSON',
      keywords: 'modelos customizados custom models adicionar em massa bulk json import export filtro inclusao exclusao context vision tools',
      isPowerOnly: true
    },
    {
      id: 'agentHarness',
      category: 'integrations',
      title: t('settings.agentHarnessTitle') || 'Engine do Agente',
      desc: t('settings.agentHarnessDesc') || 'Escolha o runtime usado no modo Código',
      keywords: 'agent harness pi runtime engine coding code agente loop ferramentas permissões',
      isPowerOnly: true
    },
    {
      id: 'responses',
      category: 'integrations',
      title: t('settings.responsesTitle') || 'Responses API & Conectores Google',
      desc: t('settings.responsesDesc') || 'Gmail, Calendar, Drive e MCP Remoto',
      keywords: 'google gmail calendar agenda drive oauth conectores conectividade remote mcp servidores remotos huggingface tokens refresh',
      isPowerOnly: true
    },
    {
      id: 'mcpServers',
      category: 'integrations',
      title: t('settings.mcpServersTitle') || 'Servidores MCP Locais',
      desc: t('settings.mcpServersDesc') || 'Model Context Protocol: Stdio, SSE e Streamable HTTP',
      keywords: 'mcp servers servidores locais stdio sse streamable http ferramentas tools integracao node uvx python docker env headers',
      isPowerOnly: true
    },
    {
      id: 'toolApprovals',
      category: 'integrations',
      title: t('settings.toolApprovalsTitle') || 'Aprovações de Ferramentas',
      desc: t('settings.toolApprovalsDesc') || 'Políticas de segurança para chamadas de ferramentas',
      keywords: 'aprovacoes ferramentas tool approval permissions permissoes seguranca prompt allow deny redefinir reset',
      isPowerOnly: true
    },
    {
      id: 'observability',
      category: 'integrations',
      title: t('settings.observabilityTitle') || 'Observabilidade e Custos',
      desc: t('settings.observabilityDesc', { month: usageSummary?.month || '' }) || 'Consumo de tokens, custos e orçamento',
      keywords: 'observabilidade custos tokens metricas uso orcamento mensal budget rate exportar csv json consumo precos',
      isPowerOnly: true
    },
    {
      id: 'git',
      category: 'integrations',
      title: t('settings.gitTitle') || 'Integração Git',
      desc: t('settings.gitDesc') || 'Status, diff, commits e push no repositório',
      keywords: 'git controle versao repositorio commit push diff status filial branch pasta salvar versionamento',
      isPowerOnly: true
    },
    {
      id: 'configDir',
      category: 'system',
      title: t('settings.configDirTitle') || 'Pasta de Configurações e Dados',
      desc: t('settings.configDirDesc') || 'Local onde dados e conversas são armazenados',
      keywords: 'pasta diretorio configuracoes dados config folder dir caminho userdata storage migration arquivos',
      isPowerOnly: false
    },
    {
      id: 'updates',
      category: 'system',
      title: t('settings.updatesTitle') || 'Atualizações do Aplicativo',
      desc: t('settings.updatesDesc', { version: updateStatus.currentVersion || '' }) || 'Versão e canais de atualização',
      keywords: 'atualizacoes update versao version canal channel stable beta download instalar verificar updateStatus novidades',
      isPowerOnly: false
    },
    {
      id: 'apiLogging',
      category: 'system',
      title: t('settings.apiLoggingTitle') || 'Log de Requisições da API',
      desc: t('settings.apiLoggingDesc') || 'Registrar requisições e respostas para diagnóstico',
      keywords: 'log logs requisicoes api requests diagnostico depuracao debug inspecionar monitorar',
      isPowerOnly: true
    },
    {
      id: 'dataHistory',
      category: 'system',
      title: t('settings.dataHistoryTitle') || 'Dados e Histórico',
      desc: t('settings.dataHistoryDesc') || 'Exportar/importar backup e apagar conversas',
      keywords: 'backup exportar importar conversas historico data apagar excluir resetar limpar tudo delete chats',
      isPowerOnly: true
    }
  ], [t, updateStatus.currentVersion, usageSummary?.month]);

  const categoryMatchCounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const isPower = settings.interfaceMode === 'power';
    const counts = { all: 0, interface: 0, features: 0, models: 0, integrations: 0, system: 0 };
    
    CARDS_METADATA.forEach(card => {
      if (card.isPowerOnly && !isPower) return;
      const searchTarget = `${card.category} ${card.title} ${card.desc} ${card.keywords}`.toLowerCase();
      const queryWords = q.split(/\s+/).filter(Boolean);
      if (queryWords.every(word => searchTarget.includes(word))) {
        counts[card.category] = (counts[card.category] || 0) + 1;
        counts.all = (counts.all || 0) + 1;
      }
    });
    return counts;
  }, [searchQuery, settings.interfaceMode, CARDS_METADATA]);

  const visibleCardIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isPower = settings.interfaceMode === 'power';
    
    return new Set(
      CARDS_METADATA.filter(card => {
        if (card.isPowerOnly && !isPower) return false;
        
        if (q) {
          const searchTarget = `${card.category} ${card.title} ${card.desc} ${card.keywords}`.toLowerCase();
          const queryWords = q.split(/\s+/).filter(Boolean);
          const matches = queryWords.every(word => searchTarget.includes(word));
          if (!matches) return false;
          if (activeCategory !== 'all' && card.category !== activeCategory) return false;
          return true;
        }
        
        if (activeCategory === 'all') return true;
        return card.category === activeCategory;
      }).map(c => c.id)
    );
  }, [searchQuery, activeCategory, settings.interfaceMode, CARDS_METADATA]);

  useEffect(() => {
    const buildFallbackProviders = (settingsData) => {
      const targetSettings = settingsData || settings || {};
      const customItems = Array.isArray(targetSettings.customProviders) ? targetSettings.customProviders : [];
      const presets = POPULAR_PROVIDER_PRESETS.filter(p => p.id !== 'custom');
      const allMerged = [...presets, ...customItems.filter(c => !presets.some(p => p.id === c.id))];
      return allMerged.map(p => {
        const apiKey = targetSettings.apiKeys?.[p.id] || (p.id === 'groq' ? targetSettings.GROQ_API_KEY : '') || p.apiKey || '';
        const isConfigured = p.isLocal || Boolean(apiKey && apiKey !== '<replace me>' && apiKey.trim());
        const isEnabled = Array.isArray(targetSettings.enabledProviders)
          ? targetSettings.enabledProviders.includes(p.id)
          : (isConfigured || p.id === (targetSettings.provider || 'groq'));
        return {
          ...p,
          apiKey,
          baseUrl: targetSettings.providerUrls?.[p.id] || p.baseUrl || '',
          isConfigured,
          isEnabled,
          isPrimary: (targetSettings.provider || 'groq') === p.id,
          isFallback: Array.isArray(targetSettings.fallbackProviders) && targetSettings.fallbackProviders.includes(p.id)
        };
      });
    };

    const loadProviders = async (settingsData) => {
      try {
        const list = await window.electron.getProviders();
        if (Array.isArray(list) && list.length > 0) {
          setProviders(list);
          return list;
        }
      } catch (error) {
        console.error('Error fetching providers from electron:', error);
      }
      const fallbackList = buildFallbackProviders(settingsData);
      setProviders(fallbackList);
      return fallbackList;
    };

    const loadSettings = async () => {
      try {
        const settingsData = await window.electron.getSettings();
        const providerList = await loadProviders(settingsData);
        if (window.electron?.plugins?.list) {
          try {
            const pList = await window.electron.plugins.list();
            setPluginList(pList || []);
          } catch (e) {}
        }
        if (!settingsData.disabledMcpServers) {
            settingsData.disabledMcpServers = [];
        }
        settingsData.interfaceMode = settingsData.interfaceMode === 'power' ? 'power' : 'user';
        settingsData.agentHarness = settingsData.agentHarness === 'pi' ? 'pi' : 'native';
        if (!settingsData.builtInTools) {
            settingsData.builtInTools = {
                codeInterpreter: false,
                browserSearch: false
            };
        }
        if (!settingsData.webSearch) {
            settingsData.webSearch = {
                enabled: true,
                provider: 'local',
                apiKey: '',
                maxResults: 3,
                maxSearchesPerTurn: 2
            };
        }
        if (settingsData.webSearch.provider === 'duckduckgo') {
            settingsData.webSearch.provider = 'local';
        }
        if (!settingsData.reasoning_effort) {
            settingsData.reasoning_effort = 'medium';
        }
        if (settingsData.showTrajectoryTab === undefined) {
            settingsData.showTrajectoryTab = true;
        }
        if (settingsData.showWelcomeTips === undefined) {
            settingsData.showWelcomeTips = false;
        }
        if (settingsData.showWelcomeSuggestions === undefined) {
            settingsData.showWelcomeSuggestions = false;
        }
        if (settingsData.showButtonLabels === undefined) {
            settingsData.showButtonLabels = false;
        }
        if (settingsData.enableThinkingSummaries === undefined) {
            settingsData.enableThinkingSummaries = settingsData.disableThinkingSummaries !== undefined
                ? !settingsData.disableThinkingSummaries
                : true;
        }
        if (settingsData.useResponsesApi === undefined) {
            settingsData.useResponsesApi = false;
        }
        if (settingsData.logApiRequests === undefined) {
            settingsData.logApiRequests = false;
        }
        if (!settingsData.googleConnectors) {
            settingsData.googleConnectors = { gmail: false, calendar: false, drive: false };
        }
        if (!settingsData.googleConnectorsApproval) {
            settingsData.googleConnectorsApproval = { gmail: 'never', calendar: 'never', drive: 'never' };
        }
        if (!settingsData.googleOAuthToken) {
            settingsData.googleOAuthToken = '';
        }
        if (!settingsData.googleRefreshToken) {
            settingsData.googleRefreshToken = '';
        }
        if (!settingsData.googleClientId) {
            settingsData.googleClientId = '';
        }
        if (!settingsData.googleClientSecret) {
            settingsData.googleClientSecret = '';
        }
        if (!settingsData.remoteMcpServers) {
            settingsData.remoteMcpServers = {};
        }
        if (!settingsData.apiKeys) {
            settingsData.apiKeys = {};
        }
        if (!settingsData.provider) {
            settingsData.provider = 'groq';
        }
        // Migrate legacy GROQ_API_KEY into apiKeys.groq
        if (settingsData.GROQ_API_KEY && !settingsData.apiKeys.groq) {
            settingsData.apiKeys.groq = settingsData.GROQ_API_KEY;
        }
        if (!settingsData.providerFilterTab) {
            settingsData.providerFilterTab = 'active';
        }
        setProviderFilterTab(settingsData.providerFilterTab);
        setSettings(settingsData);
        const provider = (providerList || []).find(p => p.id === settingsData.provider);
        setActiveProvider(provider || null);

        // Fetch model configurations for all configured providers
        try {
          const configs = await window.electron.getModelConfigs();
          setModelConfigs(configs || {});
          setAllLoadedModels(Object.keys(configs || {}).filter(k => k !== 'default'));
        } catch (mErr) {
          console.error('Error fetching model configs in settings:', mErr);
        }
        
        // Fetch Google OAuth status
        try {
          const status = await window.electron.googleOAuth.getStatus();
          setGoogleOAuthStatus(status);
        } catch (e) {
          console.error('Error fetching Google OAuth status:', e);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(prev => ({
            ...prev,
            GROQ_API_KEY: '',
            temperature: 0.7,
            top_p: 0.95,
            mcpServers: {},
            disabledMcpServers: [],
            customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
            popupEnabled: true,
            customCompletionUrl: '',
            toolOutputLimit: 8000,
            customApiBaseUrl: '',
            customApiBaseUrlEnabled: false,
            customModels: {},
            builtInTools: {
                codeInterpreter: false,
                browserSearch: false
            },
            reasoning_effort: 'medium',
            showTrajectoryTab: true,
            showWelcomeTips: false,
            showWelcomeSuggestions: false,
            showButtonLabels: false,
            modelFilter: '',
            modelFilterExclude: '',
            enableThinkingSummaries: true,
            useResponsesApi: false,
            logApiRequests: false,
            googleConnectors: { gmail: false, calendar: false, drive: false },
            googleConnectorsApproval: { gmail: 'never', calendar: 'never', drive: 'never' },
            googleOAuthToken: '',
            googleRefreshToken: '',
            googleClientId: '',
            googleClientSecret: '',
            googleTokenExpiresAt: null,
            remoteMcpServers: {}
        }));
      }
    };

    const loadConfigDirInfo = async () => {
      try {
        if (window.electron?.configDir?.getInfo) {
          const info = await window.electron.configDir.getInfo();
          if (info) {
            setConfigDirInfo(info);
            setSettingsPath(info.settingsPath || info.currentPath);
          }
        } else if (window.electron?.getSettingsPath) {
          const path = await window.electron.getSettingsPath();
          setSettingsPath(path);
        }
      } catch (error) {
        console.error('Error getting config directory info:', error);
      }
    };

    loadSettings();
    loadConfigDirInfo();

    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Save settings immediately without debounce (used when adding/updating models/providers)
  const saveSettingsImmediate = async (updatedSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const settingsToSave = {
        ...updatedSettings,
        disabledMcpServers: updatedSettings.disabledMcpServers || []
      };
      const result = await window.electron.saveSettings(settingsToSave);
      if (result?.success) {
        setSaveStatus({ type: 'success', message: t('settings.savedSuccess') });
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus(null);
        }, 2000);
      } else {
        setSaveStatus({ type: 'error', message: t('settings.failedSave', { error: result?.error }) });
      }
      return result;
    } catch (error) {
      console.error('Error saving settings immediately:', error);
      setSaveStatus({ type: 'error', message: t('settings.errorSaving', { error: error.message }) });
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  // Save settings with debounce
  const saveSettings = (updatedSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const settingsToSave = {
            ...updatedSettings,
            disabledMcpServers: updatedSettings.disabledMcpServers || []
        };
        const result = await window.electron.saveSettings(settingsToSave);
        if (result?.success) {
          setSaveStatus({ type: 'success', message: t('settings.savedSuccess') });
          
          if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
          }
          statusTimeoutRef.current = setTimeout(() => {
            setSaveStatus(null);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', message: t('settings.failedSave', { error: result?.error }) });
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        setSaveStatus({ type: 'error', message: t('settings.errorSaving', { error: error.message }) });
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedSettings = { ...settings, [name]: value };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleSelectChange = (name, value) => {
    const updatedSettings = { ...settings, [name]: value };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleProviderFilterTabChange = (tab) => {
    setProviderFilterTab(tab);
    const updatedSettings = { ...settings, providerFilterTab: tab };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleSelectNewConfigFolder = async () => {
    try {
      if (!window.electron?.configDir?.selectFolder) return;
      const selected = await window.electron.configDir.selectFolder();
      if (selected) {
        setPendingNewConfigPath(selected);
        setCopyExistingFiles(true);
        setIsChangingConfigDirModalOpen(true);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
    }
  };

  const handleConfirmChangeConfigFolder = async () => {
    if (!pendingNewConfigPath) return;
    setIsConfigDirLoading(true);
    try {
      const result = await window.electron.configDir.changeFolder({
        newPath: pendingNewConfigPath,
        copyExisting: copyExistingFiles
      });
      if (result.success) {
        setSaveStatus({ type: 'success', message: t('settings.configDirSuccessChange') });
        setIsChangingConfigDirModalOpen(false);
        setPendingNewConfigPath('');
        if (window.electron?.configDir?.getInfo) {
          const info = await window.electron.configDir.getInfo();
          if (info) {
            setConfigDirInfo(info);
            setSettingsPath(info.settingsPath || info.currentPath);
          }
        }
        const reloaded = await window.electron.reloadSettings();
        if (reloaded?.settings) {
          setSettings(reloaded.settings);
        }
      } else {
        setSaveStatus({ type: 'error', message: result.error || t('settings.configDirError') });
      }
    } catch (err) {
      console.error('Error changing config folder:', err);
      setSaveStatus({ type: 'error', message: err.message });
    } finally {
      setIsConfigDirLoading(false);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleConfirmResetConfigFolder = async () => {
    setIsConfigDirLoading(true);
    try {
      const result = await window.electron.configDir.resetFolder({
        copyExisting: copyExistingFiles
      });
      if (result.success) {
        setSaveStatus({ type: 'success', message: t('settings.configDirSuccessReset') });
        setIsResetConfigDirModalOpen(false);
        if (window.electron?.configDir?.getInfo) {
          const info = await window.electron.configDir.getInfo();
          if (info) {
            setConfigDirInfo(info);
            setSettingsPath(info.settingsPath || info.currentPath);
          }
        }
        const reloaded = await window.electron.reloadSettings();
        if (reloaded?.settings) {
          setSettings(reloaded.settings);
        }
      } else {
        setSaveStatus({ type: 'error', message: result.error || t('settings.configDirError') });
      }
    } catch (err) {
      console.error('Error resetting config folder:', err);
      setSaveStatus({ type: 'error', message: err.message });
    } finally {
      setIsConfigDirLoading(false);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleOpenConfigFolder = async () => {
    try {
      if (window.electron?.configDir?.openFolder) {
        await window.electron.configDir.openFolder();
      }
    } catch (err) {
      console.error('Error opening config folder:', err);
    }
  };

  const refreshProvidersAndModels = async (forceRefresh = false) => {
    try {
      const list = await window.electron.getProviders();
      if (Array.isArray(list) && list.length > 0) {
        setProviders(list);
      } else {
        const customItems = Array.isArray(settings.customProviders) ? settings.customProviders : [];
        const presets = POPULAR_PROVIDER_PRESETS.filter(p => p.id !== 'custom');
        const allMerged = [...presets, ...customItems.filter(c => !presets.some(p => p.id === c.id))];
        const fallbackList = allMerged.map(p => {
          const apiKey = settings.apiKeys?.[p.id] || (p.id === 'groq' ? settings.GROQ_API_KEY : '') || p.apiKey || '';
          const isConfigured = p.isLocal || Boolean(apiKey && apiKey !== '<replace me>' && apiKey.trim());
          const isEnabled = Array.isArray(settings.enabledProviders)
            ? settings.enabledProviders.includes(p.id)
            : (isConfigured || p.id === (settings.provider || 'groq'));
          return {
            ...p,
            apiKey,
            baseUrl: settings.providerUrls?.[p.id] || p.baseUrl || '',
            isConfigured,
            isEnabled,
            isPrimary: (settings.provider || 'groq') === p.id,
            isFallback: Array.isArray(settings.fallbackProviders) && settings.fallbackProviders.includes(p.id)
          };
        });
        setProviders(fallbackList);
      }
      await fetchAndSetModelConfigs(forceRefresh);
    } catch (err) {
      console.error('Error refreshing providers and models:', err);
    }
  };

  const toggleProviderActive = async (providerId) => {
    const currentEnabled = Array.isArray(settings.enabledProviders)
      ? [...settings.enabledProviders]
      : providers.filter(p => p.isEnabled || p.isConfigured || p.id === (settings.provider || 'groq')).map(p => p.id);

    const isCurrentlyEnabled = currentEnabled.includes(providerId);
    let newEnabled;
    if (isCurrentlyEnabled) {
      newEnabled = currentEnabled.filter(id => id !== providerId);
    } else {
      newEnabled = [...currentEnabled, providerId];
    }

    const updatedSettings = {
      ...settings,
      enabledProviders: newEnabled
    };
    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    await refreshProvidersAndModels(true);
  };

  const handleSetPrimaryProvider = async (providerId) => {
    const currentEnabled = Array.isArray(settings.enabledProviders)
      ? [...settings.enabledProviders]
      : providers.filter(p => p.isEnabled || p.isConfigured || p.id === (settings.provider || 'groq')).map(p => p.id);

    if (!currentEnabled.includes(providerId)) {
      currentEnabled.push(providerId);
    }

    const updatedSettings = {
      ...settings,
      provider: providerId,
      enabledProviders: currentEnabled
    };
    setSettings(updatedSettings);
    const provider = providers.find(p => p.id === providerId);
    setActiveProvider(provider || null);
    await saveSettingsImmediate(updatedSettings);
    await refreshProvidersAndModels(true);
  };

  const handleProviderApiKeyChange = (providerId, value) => {
    const updatedSettings = {
      ...settings,
      apiKeys: {
        ...(settings.apiKeys || {}),
        [providerId]: value
      }
    };
    if (providerId === 'groq') {
      updatedSettings.GROQ_API_KEY = value;
    }
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleProviderBaseUrlChange = (providerId, value) => {
    const customList = Array.isArray(settings.customProviders) ? [...settings.customProviders] : [];
    const customIndex = customList.findIndex(p => p.id === providerId);

    let updatedSettings;
    if (customIndex >= 0) {
      customList[customIndex] = { ...customList[customIndex], baseUrl: value };
      updatedSettings = { ...settings, customProviders: customList };
    } else {
      updatedSettings = {
        ...settings,
        providerUrls: {
          ...(settings.providerUrls || {}),
          [providerId]: value
        }
      };
      if (providerId === 'custom') {
        updatedSettings.customApiBaseUrl = value;
      }
    }
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleTestProvider = async (providerId) => {
    setProviderTestResults(prev => ({
      ...prev,
      [providerId]: { testing: true }
    }));

    try {
      const apiKey = settings.apiKeys?.[providerId] || (providerId === 'groq' ? settings.GROQ_API_KEY : '');
      const baseUrl = settings.providerUrls?.[providerId];
      const result = await window.electron.testProvider({
        providerId,
        apiKey,
        baseUrl
      });

      setProviderTestResults(prev => ({
        ...prev,
        [providerId]: {
          testing: false,
          success: result.success,
          count: result.count || 0,
          latencyMs: result.latencyMs || 0,
          error: result.error || null
        }
      }));
    } catch (err) {
      setProviderTestResults(prev => ({
        ...prev,
        [providerId]: {
          testing: false,
          success: false,
          error: err.message || String(err)
        }
      }));
    }
  };

  const handleOpenAddProviderModal = (providerToEdit = null) => {
    setModalTestResult(null);
    setShowModalApiKey(false);
    if (providerToEdit) {
      setEditingCustomProvider(providerToEdit);
      setSelectedPresetId(providerToEdit.id || 'custom');
      setIsAdvancedOptionsOpen(true);
      setCustomProviderForm({
        id: providerToEdit.id || '',
        name: providerToEdit.name || '',
        baseUrl: providerToEdit.baseUrl || '',
        apiKey: settings.apiKeys?.[providerToEdit.id] || providerToEdit.apiKey || '',
        defaultModel: providerToEdit.defaultModel || '',
        description: providerToEdit.description || '',
        isLocal: Boolean(providerToEdit.isLocal),
        requiresApiKey: providerToEdit.requiresApiKey !== false,
        enabled: Array.isArray(settings.enabledProviders)
          ? settings.enabledProviders.includes(providerToEdit.id)
          : true
      });
    } else {
      setEditingCustomProvider(null);
      setSelectedPresetId(null);
      setIsAdvancedOptionsOpen(false);
      setCustomProviderForm({
        id: '',
        name: '',
        baseUrl: '',
        apiKey: '',
        defaultModel: '',
        description: '',
        isLocal: false,
        requiresApiKey: true,
        enabled: true
      });
    }
    setCustomProviderFormErrors({});
    setIsAddProviderModalOpen(true);
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setModalTestResult(null);
    const existingApiKey = settings.apiKeys?.[preset.id] || (preset.id === 'groq' ? settings.GROQ_API_KEY : '') || '';
    if (preset.id === 'custom') {
      setIsAdvancedOptionsOpen(true);
      setCustomProviderForm({
        id: '',
        name: '',
        baseUrl: '',
        apiKey: '',
        defaultModel: '',
        description: '',
        isLocal: false,
        requiresApiKey: true,
        enabled: true
      });
    } else {
      setIsAdvancedOptionsOpen(false);
      setCustomProviderForm({
        id: preset.id,
        name: preset.name,
        baseUrl: preset.baseUrl,
        apiKey: existingApiKey,
        defaultModel: preset.defaultModel,
        description: preset.description,
        isLocal: false,
        requiresApiKey: true,
        enabled: true
      });
    }
    setCustomProviderFormErrors({});
    setTimeout(() => {
      modalApiKeyInputRef.current?.focus();
    }, 120);
  };

  const handleTestModalConnection = async () => {
    const finalId = customProviderForm.id || 'custom';
    const baseUrl = customProviderForm.baseUrl;
    const apiKey = customProviderForm.apiKey;

    if (!baseUrl) {
      setModalTestResult({ testing: false, success: false, error: 'URL Base é obrigatória para testar conexão.' });
      return;
    }

    setModalTestResult({ testing: true });
    try {
      const result = await window.electron.testProvider({
        providerId: finalId,
        apiKey: apiKey || '',
        baseUrl: baseUrl || ''
      });

      setModalTestResult({
        testing: false,
        success: result.success,
        count: result.count || 0,
        latencyMs: result.latencyMs || 0,
        error: result.error || null
      });
    } catch (err) {
      setModalTestResult({
        testing: false,
        success: false,
        error: err.message || String(err)
      });
    }
  };

  const handleSaveCustomProvider = async () => {
    const errors = {};
    if (!customProviderForm.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    if (!customProviderForm.baseUrl.trim() && customProviderForm.requiresApiKey !== false) {
      errors.baseUrl = 'URL Base é obrigatória';
    }

    let finalId = customProviderForm.id.trim();
    if (!finalId) {
      finalId = customProviderForm.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    }
    if (!finalId) {
      errors.id = 'ID inválido';
    }

    if (Object.keys(errors).length > 0) {
      setCustomProviderFormErrors(errors);
      setIsAdvancedOptionsOpen(true);
      return;
    }

    const isBuiltIn = Boolean(
      POPULAR_PROVIDER_PRESETS.find(p => p.id === finalId && p.id !== 'custom') ||
      providers.find(p => p.id === finalId && !p.isCustom)
    );
    const customList = Array.isArray(settings.customProviders) ? [...settings.customProviders] : [];
    const isEdit = Boolean(editingCustomProvider);
    
    if (!isBuiltIn || isEdit) {
      const existingIndex = isEdit
        ? customList.findIndex(p => p.id === editingCustomProvider.id)
        : customList.findIndex(p => p.id === finalId);

      const providerObj = {
        id: finalId,
        name: customProviderForm.name.trim(),
        baseUrl: customProviderForm.baseUrl.trim(),
        apiKey: customProviderForm.apiKey.trim(),
        defaultModel: customProviderForm.defaultModel.trim(),
        description: customProviderForm.description.trim() || 'Provedor personalizado OpenAI-compatible',
        isLocal: Boolean(customProviderForm.isLocal),
        requiresApiKey: customProviderForm.requiresApiKey !== false,
        isCustom: !isBuiltIn,
        icon: 'Server'
      };

      if (existingIndex >= 0) {
        customList[existingIndex] = providerObj;
      } else if (!isBuiltIn) {
        customList.push(providerObj);
      }
    }

    const currentEnabled = Array.isArray(settings.enabledProviders)
      ? [...settings.enabledProviders]
      : providers.filter(p => p.isEnabled || p.isConfigured).map(p => p.id);

    if (customProviderForm.enabled && !currentEnabled.includes(finalId)) {
      currentEnabled.push(finalId);
    } else if (!customProviderForm.enabled && currentEnabled.includes(finalId)) {
      const idx = currentEnabled.indexOf(finalId);
      currentEnabled.splice(idx, 1);
    }

    const currentApiKeys = { ...(settings.apiKeys || {}) };
    if (customProviderForm.apiKey.trim()) {
      currentApiKeys[finalId] = customProviderForm.apiKey.trim();
    }

    const currentProviderUrls = { ...(settings.providerUrls || {}) };
    if (customProviderForm.baseUrl.trim()) {
      currentProviderUrls[finalId] = customProviderForm.baseUrl.trim();
    }

    let primaryProvider = settings.provider || 'groq';
    const isGroqConfigured = Boolean(
      (currentApiKeys.groq && currentApiKeys.groq !== '<replace me>') ||
      (settings.GROQ_API_KEY && settings.GROQ_API_KEY !== '<replace me>')
    );
    if (customProviderForm.enabled && (!settings.provider || (primaryProvider === 'groq' && !isGroqConfigured))) {
      primaryProvider = finalId;
    }

    const updatedSettings = {
      ...settings,
      provider: primaryProvider,
      customProviders: customList,
      enabledProviders: currentEnabled,
      apiKeys: currentApiKeys,
      providerUrls: currentProviderUrls
    };

    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    setIsAddProviderModalOpen(false);
    await refreshProvidersAndModels(true);
  };

  const handleDeleteCustomProviderConfirm = async () => {
    if (!deletingCustomProvider) return;
    const providerId = deletingCustomProvider.id;
    const customList = (settings.customProviders || []).filter(p => p.id !== providerId);
    const enabledProviders = (settings.enabledProviders || []).filter(id => id !== providerId);
    const fallbackProviders = (settings.fallbackProviders || []).filter(id => id !== providerId);
    const apiKeys = { ...(settings.apiKeys || {}) };
    delete apiKeys[providerId];
    const providerUrls = { ...(settings.providerUrls || {}) };
    delete providerUrls[providerId];

    let newPrimary = settings.provider;
    if (newPrimary === providerId) {
      newPrimary = enabledProviders[0] || 'groq';
    }

    const updatedSettings = {
      ...settings,
      customProviders: customList,
      enabledProviders,
      fallbackProviders,
      apiKeys,
      providerUrls,
      provider: newPrimary
    };

    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    setDeletingCustomProvider(null);
    await refreshProvidersAndModels(true);
  };

  const toggleProviderApiKeyVisibility = (providerId) => {
    setShowProviderApiKeyMap(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const getProviderIconComponent = (provider) => {
    if (!provider) return Server;
    if (provider.isLocal) return Laptop;
    switch (provider.id) {
      case 'groq': return Zap;
      case 'gemini': return Sparkles;
      case 'openai': return Sparkles;
      case 'anthropic': return Brain;
      case 'perplexity': return Globe;
      case 'deepseek': return Brain;
      case 'grok': return Sparkles;
      case 'cerebras': return Zap;
      case 'mistral': return Sparkles;
      case 'together': return Sparkles;
      case 'sambanova': return Cpu;
      case 'deepinfra': return Server;
      case 'cohere': return Sparkles;
      case 'fireworks': return Flame;
      case 'openrouter': return Globe;
      case 'ollama': return HardDrive;
      case 'lmstudio': return Laptop;
      default: return Server;
    }
  };

  const handleProviderChange = async (value) => {
    const updatedSettings = { ...settings, provider: value };
    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    const provider = providers.find(p => p.id === value);
    setActiveProvider(provider || null);
    await fetchAndSetModelConfigs(true);
  };

  const getActiveApiKeyValue = () => {
    const providerId = settings.provider || 'groq';
    const key = settings.apiKeys?.[providerId];
    if (key) return key;
    if (providerId === 'groq') return settings.GROQ_API_KEY || '';
    return '';
  };

  const handleApiKeyChange = (e) => {
    const value = e.target.value;
    const providerId = settings.provider || 'groq';
    const updatedSettings = {
      ...settings,
      apiKeys: {
        ...(settings.apiKeys || {}),
        [providerId]: value
      }
    };
    // Keep legacy GROQ_API_KEY in sync for the Groq provider
    if (providerId === 'groq') {
      updatedSettings.GROQ_API_KEY = value;
    }
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleToggleChange = (name, checked) => {
    const updatedSettings = { ...settings, [name]: checked };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleBuiltInToolToggle = (toolName, checked) => {
    const updatedSettings = {
      ...settings,
      builtInTools: {
        ...settings.builtInTools,
        [toolName]: checked
      }
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleWebSearchChange = (field, value) => {
    const updatedWebSearch = {
      ...(settings.webSearch || { enabled: true, provider: 'local', apiKey: '', maxResults: 3, maxSearchesPerTurn: 2 }),
      [field]: value
    };
    const updatedSettings = {
      ...settings,
      webSearch: updatedWebSearch
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleUserMemoryChange = (field, value) => {
    const updatedUserMemory = {
      ...(settings.userMemory || { enabled: true, autoExtract: true }),
      [field]: value
    };
    const updatedSettings = {
      ...settings,
      userMemory: updatedUserMemory
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleTestWebSearch = async () => {
    setIsTestingWebSearch(true);
    setWebSearchTestResult(null);
    try {
      const searchOpts = settings.webSearch || { provider: 'local', apiKey: '', maxResults: 3 };
      const res = await window.electron.testWebSearch('latest technology news', searchOpts);
      if (res && res.resultsCount > 0) {
        setWebSearchTestResult({
          success: true,
          message: t('settings.webSearchTestSuccess', { count: res.resultsCount }),
          data: res
        });
      } else {
        setWebSearchTestResult({
          success: false,
          message: 'Nenhum resultado retornado.'
        });
      }
    } catch (err) {
      setWebSearchTestResult({
        success: false,
        message: t('settings.webSearchTestError', { error: err.message })
      });
    } finally {
      setIsTestingWebSearch(false);
    }
  };

  const handleGoogleConnectorToggle = (connectorName, checked) => {
    const updatedSettings = {
      ...settings,
      googleConnectors: {
        ...settings.googleConnectors,
        [connectorName]: checked
      }
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleGoogleConnectorApprovalChange = (connectorName, value) => {
    const updatedSettings = {
      ...settings,
      googleConnectorsApproval: {
        ...settings.googleConnectorsApproval,
        [connectorName]: value
      }
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleGoogleOAuthRefresh = async () => {
    setIsRefreshingToken(true);
    try {
      const result = await window.electron.googleOAuth.refresh();
      if (result.success) {
        // Reload settings to get the new token
        const newSettings = await window.electron.getSettings();
        setSettings(prev => ({
          ...prev,
          googleOAuthToken: newSettings.googleOAuthToken,
          googleTokenExpiresAt: newSettings.googleTokenExpiresAt
        }));
        // Update status
        const status = await window.electron.googleOAuth.getStatus();
        setGoogleOAuthStatus(status);
        setSaveStatus({ type: 'success', message: 'Token refreshed successfully!' });
      } else {
        setSaveStatus({ type: 'error', message: result.message || 'Failed to refresh token' });
      }
    } catch (error) {
      console.error('Error refreshing Google OAuth token:', error);
      setSaveStatus({ type: 'error', message: 'Error refreshing token' });
    } finally {
      setIsRefreshingToken(false);
      // Clear status after 3 seconds
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const updatedSettings = { ...settings, [name]: parseFloat(value) };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleNewMcpServerChange = (e) => {
    const { name, value } = e.target;
    setNewMcpServer(prev => ({ ...prev, [name]: value }));
  };

  const handleTransportChange = (transportType) => {
    setNewMcpServer(prev => ({
        ...prev,
        transport: transportType,
        command: (transportType === 'sse' || transportType === 'streamableHttp') ? '' : prev.command,
        args: (transportType === 'sse' || transportType === 'streamableHttp') ? '' : prev.args,
        env: (transportType === 'sse' || transportType === 'streamableHttp') ? {} : prev.env,
        url: transportType === 'stdio' ? '' : prev.url,
        headers: transportType === 'stdio' ? {} : prev.headers
    }));
    setJsonInput('');
    setJsonError(null);
  };

  const addEnvVar = () => {
    if (!newEnvVar.key) return;
    
    console.log('Adding environment variable:', newEnvVar.key, '=', newEnvVar.value);
    
    setNewMcpServer(prev => ({
      ...prev,
      env: {
        ...prev.env,
        [newEnvVar.key]: newEnvVar.value
      }
    }));
    
    setNewEnvVar({ key: '', value: '' });
  };

  const removeEnvVar = (key) => {
    setNewMcpServer(prev => {
      const updatedEnv = { ...prev.env };
      delete updatedEnv[key];
      return { ...prev, env: updatedEnv };
    });
    setUseJsonInput(false);
    setJsonError(null);
  };

  const handleEnvVarChange = (e) => {
    const { name, value } = e.target;
    setNewEnvVar(prev => ({ ...prev, [name]: value }));
  };

  const addHeader = () => {
    if (!newHeader.key) return;
    
    console.log('Adding header:', newHeader.key, '=', newHeader.value);
    
    setNewMcpServer(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [newHeader.key]: newHeader.value
      }
    }));
    
    setNewHeader({ key: '', value: '' });
  };

  const removeHeader = (key) => {
    setNewMcpServer(prev => {
      const updatedHeaders = { ...prev.headers };
      delete updatedHeaders[key];
      return { ...prev, headers: updatedHeaders };
    });
    setUseJsonInput(false);
    setJsonError(null);
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setNewHeader(prev => ({ ...prev, [name]: value }));
  };

  const handleJsonInputChange = (e) => {
    setJsonInput(e.target.value);
    setJsonError(null);
  };

  const parseJsonInput = () => {
    try {
      if (!jsonInput.trim()) {
        throw new Error("JSON input is empty");
      }
      
      const parsedJson = JSON.parse(jsonInput);
      
      // Check if it's a valid MCP server config
      if (typeof parsedJson !== 'object') {
        throw new Error("JSON must be an object");
      }
      
      // Create a normalized server entry
      const serverEntry = {};
      
      // Check for transport type in JSON (optional, default to stdio if missing)
      const transport = parsedJson.transport === 'sse' ? 'sse' : 
                        parsedJson.transport === 'streamableHttp' ? 'streamableHttp' : 'stdio';
      serverEntry.transport = transport;

      if (transport === 'stdio') {
          if ('command' in parsedJson) {
              serverEntry.command = parsedJson.command;
          } else {
              throw new Error("Stdio server config must include 'command' field");
          }

          // Handle args field for stdio
          if ('args' in parsedJson) {
              if (Array.isArray(parsedJson.args)) {
              serverEntry.args = parsedJson.args;
              } else {
              throw new Error("'args' must be an array for stdio config");
              }
          } else {
              serverEntry.args = [];
          }

          // Handle env field for stdio
          if ('env' in parsedJson) {
              if (typeof parsedJson.env === 'object' && parsedJson.env !== null) {
              serverEntry.env = parsedJson.env;
              } else {
              throw new Error("'env' must be an object for stdio config");
              }
          } else {
              serverEntry.env = {};
          }
          // Ensure url field is not present or empty for stdio
          serverEntry.url = '';

      } else { // transport === 'sse'
          if ('url' in parsedJson && typeof parsedJson.url === 'string' && parsedJson.url.trim() !== '') {
              serverEntry.url = parsedJson.url;
          } else {
              throw new Error("SSE server config must include a non-empty 'url' field");
          }
           // Ensure stdio fields are not present or empty for sse
          serverEntry.command = '';
          serverEntry.args = [];
          serverEntry.env = {};
      }

      return serverEntry;
    } catch (error) {
      setJsonError(error.message);
      return null;
    }
  };

  // Helper function to parse args string into array
  const parseArgsString = (argsStr) => {
    if (!argsStr) return [];
    let args = [];
    const trimmedArgsStr = argsStr.trim();
    let current = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < trimmedArgsStr.length; i++) {
      const char = trimmedArgsStr[i];

      if ((char === '"' || char === "'") && (quoteChar === null || quoteChar === char)) {
        if (inQuotes) {
          // Ending quote
          inQuotes = false;
          quoteChar = null;
        } else {
          // Starting quote
          inQuotes = true;
          quoteChar = char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }
    return args;
  };

  // Switches view to Form, converting JSON state if valid
  const switchToFormView = () => {
    if (!useJsonInput) return; // Already in form view

    try {
      const parsedJson = JSON.parse(jsonInput || '{}');
      if (typeof parsedJson !== 'object' || parsedJson === null) {
        throw new Error("JSON must be an object.");
      }
      
      // Basic validation (can be more robust)
      const command = parsedJson.command || '';
      const args = Array.isArray(parsedJson.args) ? parsedJson.args : [];
      const env = typeof parsedJson.env === 'object' && parsedJson.env !== null ? parsedJson.env : {};
      const argsString = args.join(' ');

      setNewMcpServer(prev => ({ ...prev, command, args: argsString, env }));
      setJsonError(null);
      setUseJsonInput(false);
    } catch (error) {
      console.error("Error parsing JSON to switch to form view:", error);
      setJsonError(`Invalid JSON: ${error.message}. Cannot switch to form view.`);
      // Optionally keep the user in JSON view if parsing fails
    }
  };

  // Switches view to JSON, converting form state
  const switchToJsonView = () => {
    if (useJsonInput) return; // Already in JSON view

    try {
      let serverConfig = {};
      if (newMcpServer.transport === 'stdio') {
          const argsArray = parseArgsString(newMcpServer.args);
          serverConfig = {
              transport: 'stdio',
              command: newMcpServer.command,
              args: argsArray,
              env: newMcpServer.env
          };
      } else { // sse or streamableHttp
          serverConfig = {
              transport: newMcpServer.transport, // Keep the selected transport
              url: newMcpServer.url
          };
          // Explicitly exclude stdio fields if they somehow exist
          delete serverConfig.command;
          delete serverConfig.args;
          delete serverConfig.env;
      }

      const jsonString = JSON.stringify(serverConfig, null, 2);
      setJsonInput(jsonString);
      setJsonError(null); // Clear any previous JSON error
      setUseJsonInput(true);
    } catch (error) {
      console.error("Error converting form state to JSON:", error);
      // This should ideally not happen if form state is valid
      setJsonError(`Internal error: Failed to generate JSON. ${error.message}`);
    }
  };

  const handleSaveMcpServer = (e) => {
    e.preventDefault();
    
    let serverConfig;
    
    if (useJsonInput) {
      const parsedConfig = parseJsonInput();
      if (!parsedConfig) return;
      
      // Use the ID from the form field (which is disabled during edit)
      if (!newMcpServer.id.trim()) {
        setJsonError("Server ID is required");
        return;
      }
      
      serverConfig = parsedConfig;
    } else {
      // Use form state
      if (!newMcpServer.id) {
          setSaveStatus({ type: 'error', message: 'Server ID is required' });
          return;
      }

      if (newMcpServer.transport === 'stdio') {
          if (!newMcpServer.command) {
              setSaveStatus({ type: 'error', message: 'Command is required for stdio transport' });
              return;
          }
          // Parse args string from the form field
          const args = parseArgsString(newMcpServer.args);
          serverConfig = {
              transport: 'stdio',
              command: newMcpServer.command,
              args, // Use the parsed array
              env: newMcpServer.env
          };
      } else { // sse or streamableHttp
          if (!newMcpServer.url || !newMcpServer.url.trim()) {
              setSaveStatus({ type: 'error', message: 'URL is required for SSE or Streamable HTTP transport' });
              return;
          }
          try {
              // Basic URL validation
              new URL(newMcpServer.url);
          } catch (urlError) {
              setSaveStatus({ type: 'error', message: `Invalid URL: ${urlError.message}` });
              return;
          }
          serverConfig = {
              transport: newMcpServer.transport,
              url: newMcpServer.url
          };
          // Include headers if present
          if (newMcpServer.headers && Object.keys(newMcpServer.headers).length > 0) {
              serverConfig.headers = newMcpServer.headers;
          }
      }
    }

    console.log('Saving MCP server:', newMcpServer.id, 'with config:', serverConfig);
    
    // Update settings with new/updated MCP server
    const updatedSettings = {
      ...settings,
      mcpServers: {
        ...settings.mcpServers,
        [newMcpServer.id]: serverConfig // Use ID from state (disabled during edit)
      }
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    
    // Clear the form, reset to stdio default
    setNewMcpServer({ id: '', transport: 'stdio', command: '', args: '', env: {}, url: '', headers: {} });
    setJsonInput('');
    setJsonError(null);
    setEditingServerId(null); // Reset editing state after save
  };

  const removeMcpServer = (serverId) => {
    const updatedMcpServers = { ...settings.mcpServers };
    delete updatedMcpServers[serverId];
    
    const updatedSettings = {
      ...settings,
      mcpServers: updatedMcpServers
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    // If the removed server was being edited, cancel the edit
    if (editingServerId === serverId) {
      cancelEditing();
    }
  };

  // Function to handle starting the edit process for an MCP server
  const startEditing = (serverId) => {
    const serverToEdit = settings.mcpServers[serverId];
    if (!serverToEdit) return;

    setEditingServerId(serverId);

    // Determine transport type accurately
    let transport;
    if (serverToEdit.transport === 'sse') {
        transport = 'sse';
    } else if (serverToEdit.transport === 'streamableHttp') {
        transport = 'streamableHttp';
    } else {
        transport = 'stdio'; // Default to stdio if missing or other value
    }


    // Populate form fields based on transport type
    let command = '', argsArray = [], envObject = {}, argsString = '', url = '', headersObject = {};
    if (transport === 'stdio') {
        command = serverToEdit.command || '';
        argsArray = Array.isArray(serverToEdit.args) ? serverToEdit.args : [];
        envObject = typeof serverToEdit.env === 'object' && serverToEdit.env !== null ? serverToEdit.env : {};
        argsString = argsArray.join(' ');
    } else { // sse or streamableHttp
        url = serverToEdit.url || '';
        headersObject = typeof serverToEdit.headers === 'object' && serverToEdit.headers !== null ? serverToEdit.headers : {};
        // Ensure stdio fields are clear
        command = '';
        argsString = '';
        envObject = {};
    }

    setNewMcpServer({
      id: serverId, // Keep the original ID in the form
      transport: transport, // Set the correct transport type
      command: command,
      args: argsString,
      env: envObject,
      url: url, // URL will be populated correctly now
      headers: headersObject
    });

    // Also populate the JSON input field based on the correct structure
    try {
      let jsonConfig;
      if (transport === 'stdio') {
          jsonConfig = { transport: 'stdio', command, args: argsArray, env: envObject };
      } else { // sse or streamableHttp
          // Use the determined transport type for the JSON representation
          jsonConfig = { transport: transport, url };
          // Include headers if present
          if (headersObject && Object.keys(headersObject).length > 0) {
              jsonConfig.headers = headersObject;
          }
      }
      const jsonString = JSON.stringify(jsonConfig, null, 2);
      setJsonInput(jsonString);
    } catch (error) {
      console.error("Failed to stringify server config for JSON input:", error);
      setJsonInput(''); // Clear if error
    }

    // Switch to form view when editing starts
    setUseJsonInput(false);
    setJsonError(null);

    // Optional: Scroll to the form or highlight it
    // window.scrollTo({ top: document.getElementById('mcp-form').offsetTop, behavior: 'smooth' });
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingServerId(null);
    setNewMcpServer({ id: '', transport: 'stdio', command: '', args: '', env: {}, url: '', headers: {} }); // Reset form
    setJsonInput('');
    setJsonError(null);
  };

  // Model Management and Activation Handlers
  const fetchAndSetModelConfigs = async (forceRefresh = false) => {
    setIsRefreshingModels(true);
    try {
      const configs = await window.electron.getModelConfigs(forceRefresh);
      setModelConfigs(configs || {});
      const ids = Object.keys(configs || {}).filter(k => k !== 'default');
      setAllLoadedModels(ids);
    } catch (err) {
      console.error('Error refreshing model configs:', err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleToggleModelEnabled = async (modelId) => {
    const currentDisabled = Array.isArray(settings.disabledModels) ? settings.disabledModels : [];
    const cfg = modelConfigs[modelId];
    const rawId = cfg?.rawModelId;
    const isCurrentlyDisabled = currentDisabled.includes(modelId) || (rawId && currentDisabled.includes(rawId));
    
    let updatedDisabled;
    if (isCurrentlyDisabled) {
      // Re-enable: remove both modelId and rawId
      updatedDisabled = currentDisabled.filter(id => id !== modelId && id !== rawId);
    } else {
      // Disable: add modelId
      updatedDisabled = [...currentDisabled.filter(id => id !== rawId), modelId];
    }

    const updatedSettings = {
      ...settings,
      disabledModels: updatedDisabled
    };

    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    await fetchAndSetModelConfigs(false);
  };

  const handleEnableAllInGroup = async (modelIds) => {
    const currentDisabled = Array.isArray(settings.disabledModels) ? settings.disabledModels : [];
    const rawIdsToRemove = new Set(modelIds);
    modelIds.forEach(id => {
      const raw = modelConfigs[id]?.rawModelId;
      if (raw) rawIdsToRemove.add(raw);
    });
    const updatedDisabled = currentDisabled.filter(id => !rawIdsToRemove.has(id));
    const updatedSettings = {
      ...settings,
      disabledModels: updatedDisabled
    };
    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    await fetchAndSetModelConfigs(false);
  };

  const handleDisableAllInGroup = async (modelIds) => {
    const currentDisabled = Array.isArray(settings.disabledModels) ? settings.disabledModels : [];
    const toAdd = modelIds.filter(id => !currentDisabled.includes(id));
    const updatedDisabled = [...currentDisabled, ...toAdd];
    const updatedSettings = {
      ...settings,
      disabledModels: updatedDisabled
    };
    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    await fetchAndSetModelConfigs(false);
  };

  const toggleProviderGroup = (group) => {
    setExpandedProviderGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const handleExpandAllProviderGroups = (allGroups) => {
    setExpandedProviderGroups(new Set(allGroups));
  };

  const handleCollapseAllProviderGroups = () => {
    setExpandedProviderGroups(new Set());
  };

  // Custom Model Management Functions
  const handleNewCustomModelChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCustomModel(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'context' ? parseInt(value) || 1000000 : value)
    }));
  };

  const handleSaveCustomModel = async (e) => {
    e?.preventDefault?.();
    
    if (!newCustomModel.id.trim()) {
      setSaveStatus({ type: 'error', message: 'Model ID is required' });
      return;
    }

    if (!newCustomModel.displayName.trim()) {
      setSaveStatus({ type: 'error', message: 'Model display name is required' });
      return;
    }

    // Create the model configuration
    const modelConfig = {
      displayName: newCustomModel.displayName.trim(),
      context: newCustomModel.context,
      vision_supported: newCustomModel.vision_supported,
      builtin_tools_supported: newCustomModel.builtin_tools_supported,
      group: newCustomModel.group?.trim() || getModelGroup(newCustomModel.id.trim())
    };

    console.log('Saving custom model:', newCustomModel.id, 'with config:', modelConfig);
    
    // Update settings with new/updated custom model
    const updatedSettings = {
      ...settings,
      customModels: {
        ...settings.customModels,
        [newCustomModel.id.trim()]: modelConfig
      }
    };

    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    
    // Clear the form
    setNewCustomModel({ id: '', displayName: '', group: '', context: 1000000, vision_supported: false, builtin_tools_supported: false });
    setEditingModelId(null);
    setSaveStatus({ type: 'success', message: t('settings.savedSuccess') });
    await fetchAndSetModelConfigs(true);
  };

  const handleSaveBulkModels = async (e) => {
    e?.preventDefault?.();
    const parsedModels = parseBulkModelsInput(bulkModelsInput, {
      context: bulkDefaultContext,
      group: bulkDefaultGroup,
      vision_supported: bulkVisionSupported,
      builtin_tools_supported: bulkToolsSupported
    });

    if (parsedModels.length === 0) {
      setSaveStatus({ type: 'error', message: 'Nenhum modelo válido encontrado no texto.' });
      return;
    }

    const updatedCustomModels = { ...(settings.customModels || {}) };
    parsedModels.forEach(m => {
      updatedCustomModels[m.id] = {
        displayName: m.displayName || m.id,
        context: m.context || 1000000,
        vision_supported: !!m.vision_supported,
        builtin_tools_supported: !!m.builtin_tools_supported,
        group: m.group || getModelGroup(m.id)
      };
    });

    const updatedSettings = {
      ...settings,
      customModels: updatedCustomModels
    };

    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);
    setBulkModelsInput('');
    setSaveStatus({
      type: 'success',
      message: t('settings.modelsAddedSuccess', { count: parsedModels.length })
    });
    await fetchAndSetModelConfigs(true);
  };

  const handleImportCustomModelsJson = async () => {
    try {
      const parsedModels = parseBulkModelsInput(customModelsJsonInput);
      if (parsedModels.length === 0) {
        setSaveStatus({ type: 'error', message: t('settings.importJsonError') });
        return;
      }

      const updatedCustomModels = { ...(settings.customModels || {}) };
      parsedModels.forEach(m => {
        updatedCustomModels[m.id] = {
          displayName: m.displayName || m.id,
          context: m.context || 1000000,
          vision_supported: !!m.vision_supported,
          builtin_tools_supported: !!m.builtin_tools_supported,
          group: m.group || getModelGroup(m.id)
        };
      });

      const updatedSettings = {
        ...settings,
        customModels: updatedCustomModels
      };

      setSettings(updatedSettings);
      await saveSettingsImmediate(updatedSettings);
      setCustomModelsJsonInput('');
      setSaveStatus({
        type: 'success',
        message: t('settings.importJsonSuccess', { count: parsedModels.length })
      });
      await fetchAndSetModelConfigs(true);
    } catch (err) {
      setSaveStatus({ type: 'error', message: t('settings.importJsonError') });
    }
  };

  const handleExportCustomModelsJson = async () => {
    try {
      const jsonStr = JSON.stringify(settings.customModels || {}, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setSaveStatus({ type: 'success', message: 'JSON copiado para a área de transferência!' });
    } catch (err) {
      console.error('Error copying JSON:', err);
    }
  };

  const handleDeleteAllCustomModels = async () => {
    if (window.confirm(t('settings.deleteAllCustomModelsConfirm'))) {
      const updatedSettings = {
        ...settings,
        customModels: {}
      };
      setSettings(updatedSettings);
      await saveSettingsImmediate(updatedSettings);
      cancelModelEditing();
      setSaveStatus({ type: 'success', message: t('settings.savedSuccess') });
      await fetchAndSetModelConfigs(true);
    }
  };

  const removeCustomModel = async (modelId) => {
    const updatedCustomModels = { ...settings.customModels };
    delete updatedCustomModels[modelId];
    
    const updatedSettings = {
      ...settings,
      customModels: updatedCustomModels
    };
    
    setSettings(updatedSettings);
    await saveSettingsImmediate(updatedSettings);

    // If the removed model was being edited, cancel the edit
    if (editingModelId === modelId) {
      cancelModelEditing();
    }
    await fetchAndSetModelConfigs(true);
  };

  const startModelEditing = (modelId) => {
    const modelToEdit = settings.customModels[modelId];
    if (!modelToEdit) return;

    setCustomModelTab('single');
    setEditingModelId(modelId);
    setNewCustomModel({
      id: modelId,
      displayName: modelToEdit.displayName || '',
      group: modelToEdit.group || getModelGroup(modelId),
      context: modelToEdit.context || 1000000,
      vision_supported: modelToEdit.vision_supported || false,
      builtin_tools_supported: modelToEdit.builtin_tools_supported || false
    });
  };

  const cancelModelEditing = () => {
    setEditingModelId(null);
    setNewCustomModel({ id: '', displayName: '', group: '', context: 1000000, vision_supported: false, builtin_tools_supported: false });
  };

  // Remote MCP Server Management Functions
  const handleRemoteMcpServerToggle = (serverId, enabled) => {
    const serverConfig = settings.remoteMcpServers[serverId];
    if (!serverConfig) return;

    const updatedSettings = {
      ...settings,
      remoteMcpServers: {
        ...settings.remoteMcpServers,
        [serverId]: {
          ...serverConfig,
          enabled: enabled
        }
      }
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleNewRemoteMcpServerChange = (e) => {
    const { name, value } = e.target;
    setNewRemoteMcpServer(prev => ({ ...prev, [name]: value }));
  };

  const addRemoteMcpHeader = () => {
    if (!newRemoteMcpHeader.key) return;
    
    setNewRemoteMcpServer(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [newRemoteMcpHeader.key]: newRemoteMcpHeader.value
      }
    }));
    
    setNewRemoteMcpHeader({ key: '', value: '' });
  };

  const removeRemoteMcpHeader = (key) => {
    setNewRemoteMcpServer(prev => {
      const updatedHeaders = { ...prev.headers };
      delete updatedHeaders[key];
      return { ...prev, headers: updatedHeaders };
    });
  };

  const handleRemoteMcpHeaderChange = (e) => {
    const { name, value } = e.target;
    setNewRemoteMcpHeader(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveRemoteMcpServer = (e) => {
    e.preventDefault();
    
    if (!newRemoteMcpServer.id.trim()) {
      setSaveStatus({ type: 'error', message: 'Server ID is required' });
      return;
    }

    if (!newRemoteMcpServer.serverUrl.trim()) {
      setSaveStatus({ type: 'error', message: 'Server URL is required' });
      return;
    }

    // Validate URL
    try {
      new URL(newRemoteMcpServer.serverUrl);
    } catch (urlError) {
      setSaveStatus({ type: 'error', message: `Invalid URL: ${urlError.message}` });
      return;
    }

    // Create the server configuration
    const serverConfig = {
      serverUrl: newRemoteMcpServer.serverUrl.trim(),
      serverLabel: newRemoteMcpServer.serverLabel.trim() || newRemoteMcpServer.id.trim(),
      serverDescription: newRemoteMcpServer.serverDescription.trim(),
      requireApproval: newRemoteMcpServer.requireApproval || 'never'
    };

    // Include headers if present
    if (newRemoteMcpServer.headers && Object.keys(newRemoteMcpServer.headers).length > 0) {
      serverConfig.headers = newRemoteMcpServer.headers;
    }

    // Include allowedTools if present (filters which tools are available from the server)
    if (newRemoteMcpServer.allowedTools && newRemoteMcpServer.allowedTools.trim()) {
      const toolsList = newRemoteMcpServer.allowedTools
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      if (toolsList.length > 0) {
        serverConfig.allowedTools = toolsList;
      }
    }

    console.log('Saving remote MCP server:', newRemoteMcpServer.id, 'with config:', serverConfig);
    
    // Update settings with new/updated remote MCP server
    const updatedSettings = {
      ...settings,
      remoteMcpServers: {
        ...settings.remoteMcpServers,
        [newRemoteMcpServer.id]: serverConfig
      }
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    
    // Clear the form
    setNewRemoteMcpServer({
      id: '',
      serverUrl: '',
      serverLabel: '',
      serverDescription: '',
      requireApproval: 'never',
      allowedTools: '',
      headers: {}
    });
    setEditingRemoteMcpServerId(null);
  };

  const removeRemoteMcpServer = (serverId) => {
    const updatedRemoteMcpServers = { ...settings.remoteMcpServers };
    delete updatedRemoteMcpServers[serverId];
    
    const updatedSettings = {
      ...settings,
      remoteMcpServers: updatedRemoteMcpServers
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    // If the removed server was being edited, cancel the edit
    if (editingRemoteMcpServerId === serverId) {
      cancelRemoteMcpEditing();
    }
  };

  const startRemoteMcpEditing = (serverId) => {
    const serverToEdit = settings.remoteMcpServers[serverId];
    if (!serverToEdit) return;

    setEditingRemoteMcpServerId(serverId);
    setNewRemoteMcpServer({
      id: serverId,
      serverUrl: serverToEdit.serverUrl || '',
      serverLabel: serverToEdit.serverLabel || '',
      serverDescription: serverToEdit.serverDescription || '',
      requireApproval: serverToEdit.requireApproval || 'never',
      allowedTools: Array.isArray(serverToEdit.allowedTools) ? serverToEdit.allowedTools.join(', ') : '',
      headers: serverToEdit.headers || {}
    });
  };

  const cancelRemoteMcpEditing = () => {
    setEditingRemoteMcpServerId(null);
    setNewRemoteMcpServer({
      id: '',
      serverUrl: '',
      serverLabel: '',
      serverDescription: '',
      requireApproval: 'never',
      allowedTools: '',
      headers: {}
    });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const updatedSettings = { ...settings, language: newLang };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const getStatusMessage = () => {
    if (isSaving) return t('settings.saving');
    return saveStatus?.message || '';
  };

  const reloadSettingsFromDisk = async () => {
    setIsSaving(true);
    setSaveStatus({ type: 'info', message: t('settings.reloading') });

    try {
      const settingsData = await window.electron.getSettings();
      if (!settingsData.disabledMcpServers) {
          settingsData.disabledMcpServers = [];
      }
      setSettings(settingsData);
      setSaveStatus({ type: 'success', message: t('settings.reloaded') });
    } catch (error) {
      console.error('Error reloading settings:', error);
      setSaveStatus({ type: 'error', message: t('settings.errorReloading', { error: error.message }) });
    } finally {
      setIsSaving(false);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }
  };

  // Function to reset tool call approvals in localStorage
  const handleResetToolApprovals = async () => {
    setIsSaving(true);
    setSaveStatus({ type: 'info', message: t('settings.resettingApprovals') });

    try {
      await window.electron?.toolPermissions?.reset?.();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tool_approval_') || key === 'tool_approval_yolo_mode')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed tool approval key: ${key}`);
      });

      setSaveStatus({ type: 'success', message: t('settings.approvalsReset') });
    } catch (error) {
      console.error('Error resetting tool approvals:', error);
      setSaveStatus({ type: 'error', message: t('settings.errorResetting', { error: error.message }) });
    } finally {
      setIsSaving(false);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }
  };

  // Function to delete all chats and messages from disk
  const handleDeleteAllChats = async () => {
    setIsDeletingAll(true);
    try {
      const result = await window.electron.chatHistory.deleteAll();
      if (result && result.success) {
        setSaveStatus({ type: 'success', message: t('settings.deleteAllSuccess') });
      } else {
        setSaveStatus({ type: 'error', message: t('settings.errorDeletingAll', { error: result?.error || 'Unknown error' }) });
      }
    } catch (error) {
      console.error('Error deleting all chats in settings:', error);
      setSaveStatus({ type: 'error', message: t('settings.errorDeletingAll', { error: error.message }) });
    } finally {
      setIsDeletingAll(false);
      setIsDeletingAllModalOpen(false);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  const toggleFallbackProvider = (providerId) => {
    const current = settings.fallbackProviders || [];
    const fallbackProviders = current.includes(providerId) ? current.filter(id => id !== providerId) : [...current, providerId];
    const updatedSettings = { ...settings, fallbackProviders };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const updateTts = (updates) => {
    const updatedSettings = { ...settings, tts: { ...(settings.tts || {}), ...updates } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const updateVoiceInput = (updates) => {
    const updatedSettings = { ...settings, voiceInput: { ...(settings.voiceInput || {}), ...updates } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const updateAutoUpdate = (updates) => {
    const updatedSettings = { ...settings, autoUpdate: { ...(settings.autoUpdate || {}), ...updates } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const updateObservability = (updates) => {
    const updatedSettings = { ...settings, observability: { ...(settings.observability || {}), ...updates } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const updateGitRepository = (repositoryPath) => {
    const updatedSettings = { ...settings, gitIntegration: { ...(settings.gitIntegration || {}), repositoryPath } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const runGitAction = async (action) => {
    setIsGitBusy(true);
    try {
      const result = await action();
      setGitOutput(result?.success ? (result.status || result.stdout || t('settings.gitSuccess')) : (result?.error || t('settings.gitError')));
      return result;
    } finally {
      setIsGitBusy(false);
    }
  };

  const handleExportBackup = async () => {
    const result = await window.electron.backup.export();
    if (result?.success) setSaveStatus({ type: 'success', message: t('settings.backupExported') });
  };

  const handleImportBackup = async () => {
    if (!window.confirm(t('settings.backupImportConfirm'))) return;
    const result = await window.electron.backup.import();
    if (result?.success) {
      setSaveStatus({ type: 'success', message: t('settings.backupImported', { count: result.importedChats }) });
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const handleTogglePluginSetting = async (pluginId, currentEnabled) => {
    if (!window.electron?.plugins?.toggle) return;
    setIsTogglingPlugin(pluginId);
    try {
      const res = await window.electron.plugins.toggle(pluginId, !currentEnabled);
      if (res && res.success) {
        setPluginList(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: !currentEnabled } : p));
      }
    } catch (e) {
      console.error('Failed to toggle plugin:', e);
    } finally {
      setIsTogglingPlugin(null);
    }
  };

  // --- Section Render Helpers ---
  const renderPluginsSection = () => {
    const hasVisible = visibleCardIds.has('pluginsHub');
    if (!hasVisible && activeCategory !== 'plugins' && activeCategory !== 'all') return null;

    return (
      <div className="space-y-6">
        {(activeCategory === 'all' || activeCategory === 'plugins') && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">Módulos & Extensões (Plugins Hub)</h2>
              <p className="text-xs text-muted-foreground">
                Arquitetura sob demanda (Lazy Loading). Módulos inativos consomem 0 MB de memória em repouso.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Blocks className="w-5 h-5 text-primary" />
                  <span>Central de Módulos & Extensões</span>
                </CardTitle>
                <CardDescription>
                  Ative ou desative módulos individuais dinamicamente. Zero sobrecarga quando inativo.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                {pluginList.filter(p => p.enabled !== false).length} de {pluginList.length} ativos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pluginList.map(plugin => {
                const isEnabled = plugin.enabled !== false;
                const isToggling = isTogglingPlugin === plugin.id;

                return (
                  <div
                    key={plugin.id}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3',
                      isEnabled
                        ? 'bg-card border-border hover:border-primary/40'
                        : 'bg-muted/30 border-border/40 opacity-70'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">{plugin.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                            v{plugin.version || '1.0'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {plugin.description}
                        </p>
                      </div>

                      <Switch
                        checked={isEnabled}
                        disabled={isToggling}
                        onChange={() => handleTogglePluginSetting(plugin.id, isEnabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
                      <span className={cn(
                        'inline-flex items-center gap-1 font-medium',
                        isEnabled ? 'text-emerald-500' : 'text-muted-foreground'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')} />
                        {isEnabled ? 'Ativo (Lazy)' : 'Inativo (0 MB)'}
                      </span>
                      <span className="text-muted-foreground capitalize font-mono">{plugin.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInterfaceSection = () => {
    const hasVisible =
      visibleCardIds.has('interfaceMode') ||
      visibleCardIds.has('language') ||
      visibleCardIds.has('appearance') ||
      visibleCardIds.has('trajectoryTab') ||
      visibleCardIds.has('welcomeTips') ||
      visibleCardIds.has('welcomeSuggestions') ||
      visibleCardIds.has('buttonLabels') ||
      visibleCardIds.has('thinkingSummaries');

    if (!hasVisible) return null;

    return (
      <div className="space-y-6">
        {activeCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">{t('settings.navInterface')}</h2>
              <p className="text-xs text-muted-foreground">Personalize o modo de uso, temas, cores, tipografia e abas da tela</p>
            </div>
          </div>
        )}

        {visibleCardIds.has('interfaceMode') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>{t('settings.interfaceModeTitle')}</span>
                </CardTitle>
                <CardDescription>{t('settings.interfaceModeDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'user', icon: User, title: t('settings.userMode'), description: t('settings.userModeDesc') },
                    { id: 'power', icon: Wrench, title: t('settings.powerMode'), description: t('settings.powerModeDesc') }
                  ].map(({ id, icon: Icon, title, description }) => {
                    const selected = settings.interfaceMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectChange('interfaceMode', id)}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${selected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:bg-muted'}`}
                        aria-pressed={selected}
                      >
                        <Icon className={`h-5 w-5 mt-0.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="flex-1">
                          <span className="flex items-center justify-between font-semibold text-sm">
                            {title}
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </span>
                          <span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('language') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5 text-primary" />
                  <span>{t('settings.langTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.langDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'pt', label: t('settings.langPt'), flag: '🇧🇷', desc: t('settings.langPtDesc') },
                    { id: 'en', label: t('settings.langEn'), flag: '🇺🇸', desc: t('settings.langEnDesc') },
                  ].map(({ id, label, flag, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleLanguageChange(id)}
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                        language === id
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div className="flex items-center gap-2 font-semibold text-xs">
                          <span className="text-base leading-none">{flag}</span>
                          <span>{label}</span>
                        </div>
                        {language === id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('appearance') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <span>{t('settings.appearanceTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.appearanceDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1. Mode Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{t('theme.modeTitle')}</Label>
                    <span className="text-xs text-muted-foreground">{resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')} ativo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: t('theme.light'), icon: Sun, desc: t('theme.lightDesc') },
                      { id: 'dark', label: t('theme.dark'), icon: Moon, desc: t('theme.darkDesc') },
                      { id: 'system', label: t('theme.system'), icon: Laptop, desc: t('theme.systemDesc') },
                    ].map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTheme(id)}
                        className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                          theme === id
                            ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                            : 'border-border bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5 font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span>{label}</span>
                          </div>
                          {theme === id && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Primary Accent Color Themes */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>{t('theme.colorThemeTitle')}</span>
                    </Label>
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">
                      {COLOR_THEMES.find(c => c.id === colorTheme)?.name || colorTheme}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {COLOR_THEMES.map((c) => {
                      const isSelected = colorTheme === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColorTheme(c.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all group ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
                            style={{ backgroundColor: c.hex }}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {t(`theme.colors.${c.id}`, c.name)}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">{c.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Background Style */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{t('theme.bgThemeTitle')}</Label>
                    <span className="text-xs text-muted-foreground">{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(isDark
                      ? [
                          { id: 'slate', name: t('theme.backgrounds.slate', 'Dark Slate'), desc: t('theme.backgrounds.slateDesc', 'Azul escuro profundo') },
                          { id: 'oled', name: t('theme.backgrounds.oled', 'Preto OLED'), desc: t('theme.backgrounds.oledDesc', 'Preto absoluto (#000)') },
                          { id: 'zinc', name: t('theme.backgrounds.zinc', 'Cinza Neutro'), desc: t('theme.backgrounds.zincDesc', 'Carvão refinado') },
                          { id: 'tinted', name: t('theme.backgrounds.tinted', 'Acentuado'), desc: t('theme.backgrounds.tintedDesc', 'Reflexo suave do tema') },
                        ]
                      : [
                          { id: 'white', name: t('theme.backgrounds.white', 'Branco Puro'), desc: t('theme.backgrounds.whiteDesc', 'Alto contraste e nitidez') },
                          { id: 'warm', name: t('theme.backgrounds.warm', 'Papel Quente'), desc: t('theme.backgrounds.warmDesc', 'Bege acolhedor original') },
                          { id: 'slate', name: t('theme.backgrounds.slate', 'Cinza Frio'), desc: t('theme.backgrounds.slateDesc', 'Cinza neutro suave') },
                          { id: 'tinted', name: t('theme.backgrounds.tinted', 'Acentuado'), desc: t('theme.backgrounds.tintedDesc', 'Reflexo suave do tema') },
                        ]
                    ).map((b) => {
                      const isSelected = bgTheme === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBgTheme(b.id)}
                          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {b.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{b.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Font Typography Themes */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      <span>{t('theme.fontThemeTitle')}</span>
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {FONT_THEMES.find(f => f.id === fontTheme)?.name || fontTheme}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {FONT_THEMES.map((f) => {
                      const isSelected = fontTheme === f.id;
                      const sampleFontFamily =
                        f.id === 'montserrat' ? 'Montserrat, sans-serif' :
                        f.id === 'inter' ? 'Inter, sans-serif' :
                        f.id === 'roboto' ? 'Roboto, sans-serif' :
                        f.id === 'plus-jakarta' ? "'Plus Jakarta Sans', sans-serif" :
                        f.id === 'source-sans' ? "'Source Sans 3', sans-serif" :
                        f.id === 'jetbrains-mono' ? "'JetBrains Mono', monospace" :
                        f.id === 'fira-code' ? "'Fira Code', monospace" :
                        f.id === 'playfair' ? "'Playfair Display', serif" :
                        'system-ui, sans-serif';

                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontTheme(f.id)}
                          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                {f.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                                {f.category}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">{f.desc}</p>
                          <div
                            className="w-full px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 text-xs truncate"
                            style={{ fontFamily: sampleFontFamily }}
                          >
                            Aa Bb 123 • Rápido lebre
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Font Size Selector */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      <span>{t('theme.fontSizeTitle')}</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {FONT_SIZES.find(s => s.id === fontSize)?.scale}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {FONT_SIZES.map((s) => {
                      const isSelected = fontSize === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFontSize(s.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {s.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{s.scale}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Chat Width Layout Selector */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <AlignJustify className="w-4 h-4 text-primary" />
                      <span>{t('theme.chatWidthTitle')}</span>
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {chatWidth === 'wide' ? t('theme.chatWidths.wide') : t('theme.chatWidths.full')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('theme.chatWidthDesc')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setChatWidth('wide')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        chatWidth === 'wide'
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        chatWidth === 'wide' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <AlignJustify className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold ${chatWidth === 'wide' ? 'text-primary' : 'text-foreground'}`}>
                            {t('theme.chatWidths.wide')}
                          </span>
                          {chatWidth === 'wide' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {t('theme.chatWidths.wideDesc')}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatWidth('full')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        chatWidth === 'full'
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        chatWidth === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Maximize2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold ${chatWidth === 'full' ? 'text-primary' : 'text-foreground'}`}>
                            {t('theme.chatWidths.full')}
                          </span>
                          {chatWidth === 'full' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {t('theme.chatWidths.fullDesc')}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 7. Live Interactive Preview */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span>{t('theme.preview')}</span>
                  </Label>
                  <div className="p-4 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-xs space-y-3.5 shadow-inner">
                    {/* User bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-md px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-foreground text-xs shadow-2xs">
                        {t('theme.previewUserMessage')}
                      </div>
                    </div>

                    {/* Assistant bubble */}
                    <div className="flex justify-start">
                      <div className="max-w-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            N
                          </span>
                          <span className="text-xs font-bold text-foreground">NeoChat AI</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                            Online
                          </Badge>
                        </div>
                        <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-card text-card-foreground text-xs leading-relaxed space-y-2">
                          <p>{t('theme.previewAssistantMessage')}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                              {t('theme.previewButton')}
                            </Button>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              font: {fontTheme} ({fontSize})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('trajectoryTab') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Route className="h-5 w-5 text-primary" />
                  <span>{t('settings.trajectoryTabTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.trajectoryTabDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trajectory-tab-toggle" className="font-medium">
                      {t('settings.trajectoryTabLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.trajectoryTabHelp')}
                    </p>
                  </div>
                  <Switch
                    id="trajectory-tab-toggle"
                    checked={settings.showTrajectoryTab !== false}
                    onChange={(e) => handleToggleChange('showTrajectoryTab', e.target.checked)}
                  />
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('welcomeTips') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <span>{t('settings.welcomeTipsTitle')}</span>
              </CardTitle>
              <CardDescription>
                {t('settings.welcomeTipsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="welcome-tips-toggle" className="font-medium">
                    {t('settings.welcomeTipsLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.welcomeTipsHelp')}
                  </p>
                </div>
                <Switch
                  id="welcome-tips-toggle"
                  checked={settings.showWelcomeTips === true}
                  onChange={(e) => handleToggleChange('showWelcomeTips', e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {visibleCardIds.has('welcomeSuggestions') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>{t('settings.welcomeSuggestionsTitle')}</span>
              </CardTitle>
              <CardDescription>
                {t('settings.welcomeSuggestionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="welcome-suggestions-toggle" className="font-medium">
                    {t('settings.welcomeSuggestionsLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.welcomeSuggestionsHelp')}
                  </p>
                </div>
                <Switch
                  id="welcome-suggestions-toggle"
                  checked={settings.showWelcomeSuggestions === true}
                  onChange={(e) => handleToggleChange('showWelcomeSuggestions', e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {visibleCardIds.has('buttonLabels') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Type className="h-5 w-5 text-primary" />
                <span>{t('settings.buttonLabelsTitle')}</span>
              </CardTitle>
              <CardDescription>
                {t('settings.buttonLabelsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="button-labels-toggle" className="font-medium">
                    {t('settings.buttonLabelsLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.buttonLabelsHelp')}
                  </p>
                </div>
                <Switch
                  id="button-labels-toggle"
                  checked={settings.showButtonLabels === true}
                  onChange={(e) => handleToggleChange('showButtonLabels', e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {visibleCardIds.has('thinkingSummaries') && (
          <Card>
              <CardHeader>
                <CardTitle>{t('settings.thinkingSummariesTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.thinkingSummariesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-thinking-summaries" className="font-medium">
                    {t('settings.enableThinkingLabel') || t('settings.disableThinkingLabel')}
                  </Label>
                  <Switch
                    id="enable-thinking-summaries"
                    checked={settings.enableThinkingSummaries !== false}
                    onChange={(e) => handleToggleChange('enableThinkingSummaries', e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.enableThinkingHelp') || t('settings.disableThinkingHelp')}
                </p>
              </CardContent>
            </Card>
        )}
      </div>
    );
  };

  const renderFeaturesSection = () => {
    const hasVisible =
      visibleCardIds.has('voiceInput') ||
      visibleCardIds.has('tts') ||
      visibleCardIds.has('popupWindow') ||
      visibleCardIds.has('webSearch') ||
      visibleCardIds.has('builtInTools') ||
      visibleCardIds.has('promptTemplates') ||
      visibleCardIds.has('systemPrompt');

    if (!hasVisible) return null;

    return (
      <div className="space-y-6">
        {activeCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60 pt-4">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">{t('settings.navFeatures')}</h2>
              <p className="text-xs text-muted-foreground">Controle de voz Whisper, leitura TTS, busca web, ferramentas e atalhos</p>
            </div>
          </div>
        )}

        {visibleCardIds.has('voiceInput') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="h-5 w-5 text-primary" />
                  <span>{t('settings.voiceInputTitle')}</span>
                </CardTitle>
                <CardDescription>{t('settings.voiceInputDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.voiceInputEnabled')}</Label>
                    <p className="text-xs text-muted-foreground">{t('settings.voiceInputEnabledDesc')}</p>
                  </div>
                  <Switch
                    checked={settings.voiceInput?.enabled !== false}
                    onChange={event => updateVoiceInput({ enabled: event.target.checked })}
                  />
                </div>

                {/* Dedicated Groq API Key for Voice */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice-api-key" className="text-xs font-medium flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      <span>{t('settings.voiceInputApiKeyLabel')}</span>
                    </Label>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      console.groq.com/keys <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="voice-api-key"
                      type={showVoiceApiKey ? "text" : "password"}
                      value={settings.voiceInput?.apiKey || ''}
                      onChange={(e) => updateVoiceInput({ apiKey: e.target.value })}
                      placeholder={t('settings.voiceInputApiKeyPlaceholder')}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                      onClick={() => setShowVoiceApiKey(!showVoiceApiKey)}
                      tabIndex={-1}
                      title={showVoiceApiKey ? "Ocultar chave" : "Exibir chave"}
                    >
                      {showVoiceApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t('settings.voiceInputApiKeyHelp')}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="font-medium text-foreground/80">{t('settings.voiceInputGetApiKey')}</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      console.groq.com/keys <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* Explanatory Info Box (Collapsible) */}
                <details className="group rounded-xl border border-border/70 bg-muted/20 text-xs transition-colors">
                  <summary className="flex items-center justify-between p-3.5 cursor-pointer select-none text-foreground font-semibold hover:bg-muted/30 list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-2.5">
                      <Info className="w-4 h-4 text-primary shrink-0" />
                      <span>{t('settings.voiceInputInfoTitle')}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0" />
                  </summary>
                  <div className="px-3.5 pb-3.5 pt-2.5 space-y-1.5 pl-10 text-muted-foreground leading-relaxed border-t border-border/40">
                    <p>{t('settings.voiceInputInfoModel')}</p>
                    <p>{t('settings.voiceInputInfoDedicatedKey')}</p>
                    <p>{t('settings.voiceInputInfoUniversal')}</p>
                    <p>{t('settings.voiceInputInfoShortcut')}</p>
                  </div>
                </details>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('tts') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <span>{t('settings.ttsTitle')}</span>
                </CardTitle>
                <CardDescription>{t('settings.ttsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>{t('settings.ttsEnabled')}</Label><Switch checked={settings.tts?.enabled !== false} onChange={event => updateTts({ enabled: event.target.checked })} /></div>
                <div className="flex items-center justify-between"><Label>{t('settings.ttsAutoSpeak')}</Label><Switch checked={settings.tts?.autoSpeak === true} onChange={event => updateTts({ autoSpeak: event.target.checked })} /></div>
                <div className="space-y-2">
                  <Label>{t('settings.ttsVoice')}</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={settings.tts?.voiceURI || ''} onChange={event => updateTts({ voiceURI: event.target.value })}>
                    <option value="">{t('settings.ttsSystemVoice')}</option>
                    {speechVoices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t('settings.ttsRate')}: {settings.tts?.rate || 1.05}</Label><input className="w-full" type="range" min="0.5" max="2" step="0.05" value={settings.tts?.rate || 1.05} onChange={event => updateTts({ rate: Number(event.target.value) })} /></div>
                  <div className="space-y-2"><Label>{t('settings.ttsPitch')}: {settings.tts?.pitch || 1}</Label><input className="w-full" type="range" min="0.5" max="2" step="0.05" value={settings.tts?.pitch || 1} onChange={event => updateTts({ pitch: Number(event.target.value) })} /></div>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('popupWindow') && (
          <Card className="border-border">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <span>{t('settings.popupWindowTitle')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.popupWindowDesc')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="text-xs flex items-center gap-1.5 border-border hover:bg-muted shrink-0"
                >
                  <Keyboard className="w-3.5 h-3.5 text-primary" />
                  <span>{t('settings.viewAllShortcutsBtn')}</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="popup-enabled" className="font-medium">
                      {t('settings.popupWindowLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.popupWindowHelp')}
                    </p>
                  </div>
                  <Switch
                    id="popup-enabled"
                    checked={settings.popupEnabled !== false}
                    onChange={(e) => {
                      const newEnabled = e.target.checked;
                      handleToggleChange('popupEnabled', newEnabled);
                      if (window.electron?.updateGlobalShortcut) {
                        window.electron.updateGlobalShortcut(settings.popupShortcut || 'CommandOrControl+Shift+Space', newEnabled)
                          .then(res => setShortcutStatus(res));
                      }
                    }}
                  />
                </div>

                {/* Shortcut Configuration Section */}
                {settings.popupEnabled !== false && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Keyboard className="w-3.5 h-3.5 text-primary" />
                          <span>{t('settings.popupShortcutLabel')}</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.popupShortcutHelp')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <KeyCombo 
                          keys={formatAccelerator(settings.popupShortcut || 'CommandOrControl+Shift+Space', isMac)} 
                        />
                      </div>
                    </div>

                    {/* Presets & Custom Recorder */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                      <div className="w-full sm:w-64">
                        <Select
                          value={POPUP_SHORTCUT_PRESETS.some(p => p.value === settings.popupShortcut) ? settings.popupShortcut : 'custom'}
                          onValueChange={(val) => {
                            if (val === 'custom') {
                              setIsRecordingShortcut(true);
                            } else {
                              const updated = { ...settings, popupShortcut: val };
                              setSettings(updated);
                              saveSettings(updated);
                              if (window.electron?.updateGlobalShortcut) {
                                window.electron.updateGlobalShortcut(val, true).then(res => setShortcutStatus(res));
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder={t('settings.popupShortcutPreset')} />
                          </SelectTrigger>
                          <SelectContent>
                            {POPUP_SHORTCUT_PRESETS.map((preset) => (
                              <SelectItem key={preset.value} value={preset.value} className="text-xs">
                                {preset.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom" className="text-xs">
                              {t('settings.popupShortcutCustom')}...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRecordingShortcut ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span>{t('settings.popupShortcutRecording')}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsRecordingShortcut(false)}
                              className="h-5 px-1.5 text-[10px] hover:bg-primary/20 text-primary rounded"
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsRecordingShortcut(true)}
                              className="h-8 text-xs flex items-center gap-1.5 bg-background border-border hover:bg-muted"
                            >
                              <Keyboard className="w-3.5 h-3.5" />
                              <span>{t('settings.popupShortcutRecordBtn')}</span>
                            </Button>

                            {settings.popupShortcut !== 'CommandOrControl+Shift+Space' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = { ...settings, popupShortcut: 'CommandOrControl+Shift+Space' };
                                  setSettings(updated);
                                  saveSettings(updated);
                                  if (window.electron?.updateGlobalShortcut) {
                                    window.electron.updateGlobalShortcut('CommandOrControl+Shift+Space', true).then(res => setShortcutStatus(res));
                                  }
                                }}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {t('settings.popupShortcutResetBtn')}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="pt-1 flex items-center gap-2">
                      {shortcutStatus?.success !== false ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs py-0.5 px-2 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{t('settings.popupShortcutActive')}</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs py-0.5 px-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{t('settings.popupShortcutFailed')}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('webSearch') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>{t('settings.webSearchTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.webSearchDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable Switch */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="web-search-toggle" className="font-medium">
                      {t('settings.webSearchEnableLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.webSearchEnableHelp')}
                    </p>
                  </div>
                  <Switch
                    id="web-search-toggle"
                    checked={settings.webSearch?.enabled !== false}
                    onChange={(e) => handleWebSearchChange('enabled', e.target.checked)}
                  />
                </div>

                {settings.webSearch?.enabled !== false && (
                  <div className="space-y-4 pt-3 border-t border-border/60">
                    {/* Search Provider */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {t('settings.webSearchProviderLabel')}
                      </Label>
                      <Select
                        value={settings.webSearch?.provider || 'local'}
                        onValueChange={(val) => handleWebSearchChange('provider', val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">{t('settings.webSearchProviderLocal')}</SelectItem>
                          <SelectItem value="tavily">{t('settings.webSearchProviderTavily')}</SelectItem>
                          <SelectItem value="brave">{t('settings.webSearchProviderBrave')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Local Search Info Box */}
                    {(!settings.webSearch?.provider || settings.webSearch?.provider === 'local') && (
                      <div className="p-3 rounded-lg text-xs bg-primary/10 border border-primary/20 text-foreground flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-semibold text-primary">{t('settings.webSearchProviderLocal')}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {t('settings.webSearchLocalInfo')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* API Key for Tavily / Brave */}
                    {(settings.webSearch?.provider === 'tavily' || settings.webSearch?.provider === 'brave') && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">
                            {t('settings.webSearchApiKeyLabel')}
                          </Label>
                          {settings.webSearch?.provider === 'tavily' ? (
                            <a
                              href="https://tavily.com"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              tavily.com <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <a
                              href="https://brave.com/search/api"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              brave.com/search/api <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <Input
                          type="password"
                          value={settings.webSearch?.apiKey || ''}
                          onChange={(e) => handleWebSearchChange('apiKey', e.target.value)}
                          placeholder={t('settings.webSearchApiKeyPlaceholder')}
                        />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{t('settings.webSearchApiKeyHelp')}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="font-medium text-foreground/80">{t('settings.webSearchGetApiKey')}</span>
                          <a
                            href="https://tavily.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                          >
                            tavily.com <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className="text-muted-foreground/60">•</span>
                          <a
                            href="https://brave.com/search/api"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                          >
                            brave.com/search/api <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Max Results */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{t('settings.webSearchMaxResultsLabel')}</Label>
                          {(settings.webSearch?.maxResults || 3) <= 3 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ⚡ Econômico
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-primary">{settings.webSearch?.maxResults || 3}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.webSearch?.maxResults || 3}
                        onChange={(e) => handleWebSearchChange('maxResults', parseInt(e.target.value, 10))}
                        className="w-full accent-primary cursor-pointer"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.webSearchTokenSaverHelp')}
                      </p>
                    </div>

                    {/* Max Searches per Question (Rounds limit) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{t('settings.webSearchMaxSearchesPerTurnLabel')}</Label>
                          {(settings.webSearch?.maxSearchesPerTurn ?? 2) <= 2 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ⚡ Recomendado
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-primary">{settings.webSearch?.maxSearchesPerTurn ?? 2}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={settings.webSearch?.maxSearchesPerTurn ?? 2}
                        onChange={(e) => handleWebSearchChange('maxSearchesPerTurn', parseInt(e.target.value, 10))}
                        className="w-full accent-primary cursor-pointer"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.webSearchMaxSearchesPerTurnHelp')}
                      </p>
                    </div>

                    {/* Test Button & Result Box */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestWebSearch}
                        disabled={isTestingWebSearch}
                        className="flex items-center gap-2"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {isTestingWebSearch ? t('settings.webSearchTesting') : t('settings.webSearchTestBtn')}
                      </Button>

                      {webSearchTestResult && (
                        <div className={`mt-2.5 p-2.5 rounded-lg text-xs border flex items-start gap-2 ${
                          webSearchTestResult.success
                            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                          {webSearchTestResult.success ? (
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium">{webSearchTestResult.message}</div>
                            {webSearchTestResult.data?.results?.[0] && (
                              <div className="mt-1 text-[11px] opacity-90 truncate">
                                🔗 {webSearchTestResult.data.results[0].title} ({webSearchTestResult.data.results[0].domain})
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('userMemory') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>{t('memory.title')}</span>
                {memoryStats.total > 0 && (
                  <Badge variant="outline" className="text-xs font-normal ml-2">
                    {t('memory.activeCount', { active: memoryStats.active, total: memoryStats.total })}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('memory.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="user-memory-toggle" className="font-medium">
                    {t('memory.enabled')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('memory.enabledDesc')}
                  </p>
                </div>
                <Switch
                  id="user-memory-toggle"
                  checked={settings.userMemory?.enabled !== false}
                  onChange={(e) => handleUserMemoryChange('enabled', e.target.checked)}
                />
              </div>

              {settings.userMemory?.enabled !== false && (
                <div className="space-y-4 pt-3 border-t border-border/60">
                  {/* Auto Extract Switch */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="user-memory-auto-extract" className="font-medium">
                        {t('memory.autoExtract')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('memory.autoExtractDesc')}
                      </p>
                    </div>
                    <Switch
                      id="user-memory-auto-extract"
                      checked={settings.userMemory?.autoExtract !== false}
                      onChange={(e) => handleUserMemoryChange('autoExtract', e.target.checked)}
                    />
                  </div>

                  {/* Manage Memories Action Button */}
                  <div className="pt-2 flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/60">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        {t('memory.activeCount', { active: memoryStats.active, total: memoryStats.total })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Visualize, adicione, edite ou remova fatos e preferências aprendidos.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsMemoryModalOpen(true);
                        loadMemoryStats();
                      }}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{t('memory.manageMemories')}</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {visibleCardIds.has('builtInTools') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>{t('settings.builtinToolsTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.builtinToolsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="code-interpreter" className="font-medium">
                        {t('settings.codeInterpreterLabel')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.codeInterpreterHelp')}
                      </p>
                    </div>
                    <Switch
                      id="code-interpreter"
                      checked={settings.builtInTools?.codeInterpreter || false}
                      onChange={(e) => handleBuiltInToolToggle('codeInterpreter', e.target.checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="browser-search" className="font-medium">
                        {t('settings.browserSearchLabel')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.browserSearchHelp')}
                      </p>
                    </div>
                    <Switch
                      id="browser-search"
                      checked={settings.builtInTools?.browserSearch || false}
                      onChange={(e) => handleBuiltInToolToggle('browserSearch', e.target.checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('promptTemplates') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <span>{t('promptTemplates.modalTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('promptTemplates.modalSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      {t('slashCommands.title')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('slashCommands.pressToSelect')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPromptTemplatesModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs rounded-xl shadow-xs"
                  >
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    <span>{t('slashCommands.manageTemplates')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('systemPrompt') && (
          <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {t('settings.systemPromptTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.systemPromptDesc')}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleChange({
                      target: {
                        name: 'customSystemPrompt',
                        value: DEFAULT_SYSTEM_PROMPT
                      }
                    });
                  }}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title={t('settings.systemPromptResetDefault')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('settings.systemPromptResetDefault')}</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Textarea
                    id="custom-system-prompt"
                    name="customSystemPrompt"
                    value={settings.customSystemPrompt ?? DEFAULT_SYSTEM_PROMPT}
                    onChange={handleChange}
                    rows={4}
                    placeholder={DEFAULT_SYSTEM_PROMPT}
                    className="min-h-[110px] font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('settings.systemPromptDefaultHint')}
                  </p>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    );
  };

  const renderModelsSection = () => {
    const hasVisible =
      visibleCardIds.has('api') ||
      visibleCardIds.has('generationParams') ||
      visibleCardIds.has('modelsByProvider') ||
      visibleCardIds.has('customModels');

    if (!hasVisible && activeCategory !== 'models') return null;

    return (
      <div className="space-y-6">
        {activeCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60 pt-4">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">{t('settings.navModels')}</h2>
              <p className="text-xs text-muted-foreground">Provedores de IA, chaves de API, parâmetros e catálogo de modelos</p>
            </div>
          </div>
        )}

        {settings.interfaceMode !== 'power' && !searchQuery && activeCategory === 'models' && (
          <div className="p-6 rounded-2xl border border-dashed bg-muted/20 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Recursos disponíveis no Modo Power User
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                As configurações avançadas de modelos e provedores estão ocultas no Modo Usuário. Ative o Modo Power User para gerenciar chaves de API, parâmetros de geração e modelos customizados.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSelectChange('interfaceMode', 'power')}
              className="text-xs"
            >
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Ativar Modo Power User
            </Button>
          </div>
        )}

        {visibleCardIds.has('api') && (() => {
          const allProvidersList = providers && providers.length > 0 ? providers : [];
          const configuredCount = allProvidersList.filter(p => p.isConfigured || (settings.apiKeys?.[p.id] && settings.apiKeys[p.id] !== '<replace me>') || p.isLocal).length;
          const enabledList = Array.isArray(settings.enabledProviders)
            ? settings.enabledProviders
            : allProvidersList.filter(p => p.isEnabled || p.isConfigured || p.id === (settings.provider || 'groq')).map(p => p.id);
          const activeCount = allProvidersList.filter(p => enabledList.includes(p.id)).length;
          const localCount = allProvidersList.filter(p => p.isLocal).length;
          const customCount = allProvidersList.filter(p => p.isCustom).length;

          // Filtering
          const filteredProviders = allProvidersList.filter(p => {
            const isEnabled = enabledList.includes(p.id);
            const isConfigured = p.isConfigured || (settings.apiKeys?.[p.id] && settings.apiKeys[p.id] !== '<replace me>') || p.isLocal;

            if (providerFilterTab === 'active' && !isEnabled) return false;
            if (providerFilterTab === 'configured' && !isConfigured) return false;
            if (providerFilterTab === 'local' && !p.isLocal) return false;
            if (providerFilterTab === 'custom' && !p.isCustom) return false;

            if (providerSearchTerm.trim()) {
              const query = providerSearchTerm.trim().toLowerCase();
              const nameMatch = (p.name || '').toLowerCase().includes(query);
              const idMatch = (p.id || '').toLowerCase().includes(query);
              const descMatch = (p.description || '').toLowerCase().includes(query);
              const urlMatch = (p.baseUrl || '').toLowerCase().includes(query);
              return nameMatch || idMatch || descMatch || urlMatch;
            }
            return true;
          });

          return (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-primary" />
                      <span>{t('settings.apiTitle')}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t('settings.apiDesc')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
                    <Badge variant="outline" className="text-xs px-2.5 py-1 bg-muted/40 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                      {t('settings.providersSummary', { configured: configuredCount, active: activeCount })}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenAddProviderModal()}
                      className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('settings.addProvider')}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Local AI Auto-Detection Box */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground">
                        {t('settings.localAiTitle')}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={checkLocalAi}
                      disabled={isDetectingLocalAi}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-1", isDetectingLocalAi && "animate-spin")} />
                      <span>{isDetectingLocalAi ? t('settings.detectingLocalAi') : t('settings.refreshLocalAi')}</span>
                    </Button>
                  </div>

                  {localAiStatus && localAiStatus.detected ? (
                    <div className="space-y-2 pt-1">
                      {localAiStatus.providers.ollama?.running && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-green-700 dark:text-green-300">
                                🦙 {t('settings.ollamaDetected')}
                              </div>
                              <div className="text-[10.5px] text-muted-foreground truncate">
                                {t('settings.modelsFound', { count: localAiStatus.providers.ollama.models?.length || 0 })} ({localAiStatus.providers.ollama.latencyMs}ms)
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={enabledList.includes('ollama') ? "secondary" : "default"}
                              onClick={() => {
                                if (!enabledList.includes('ollama')) {
                                  toggleProviderActive('ollama');
                                }
                                handleSetPrimaryProvider('ollama');
                              }}
                              className="h-7 px-2.5 text-xs shrink-0"
                            >
                              {settings.provider === 'ollama' ? '✓ Principal' : t('settings.connectOllama')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {localAiStatus.providers.lmstudio?.running && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-green-700 dark:text-green-300">
                                💻 {t('settings.lmstudioDetected')}
                              </div>
                              <div className="text-[10.5px] text-muted-foreground truncate">
                                {t('settings.modelsFound', { count: localAiStatus.providers.lmstudio.models?.length || 0 })} ({localAiStatus.providers.lmstudio.latencyMs}ms)
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={enabledList.includes('lmstudio') ? "secondary" : "default"}
                              onClick={() => {
                                if (!enabledList.includes('lmstudio')) {
                                  toggleProviderActive('lmstudio');
                                }
                                handleSetPrimaryProvider('lmstudio');
                              }}
                              className="h-7 px-2.5 text-xs shrink-0"
                            >
                              {settings.provider === 'lmstudio' ? '✓ Principal' : t('settings.connectLmStudio')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {isDetectingLocalAi ? t('settings.detectingLocalAi') : t('settings.noLocalAiFound')}
                    </p>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      value={providerSearchTerm}
                      onChange={(e) => setProviderSearchTerm(e.target.value)}
                      placeholder={t('settings.searchProvidersPlaceholder')}
                      className="text-xs h-8 pl-8 pr-7"
                    />
                    {providerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setProviderSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    <button
                      type="button"
                      onClick={() => handleProviderFilterTabChange('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                        providerFilterTab === 'all'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t('settings.filterAllProviders', { count: allProvidersList.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProviderFilterTabChange('active')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                        providerFilterTab === 'active'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t('settings.filterActiveProviders', { count: activeCount })}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProviderFilterTabChange('configured')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                        providerFilterTab === 'configured'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t('settings.filterConfiguredProviders', { count: configuredCount })}
                    </button>
                    {localCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleProviderFilterTabChange('local')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                          providerFilterTab === 'local'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {t('settings.filterLocalProviders', { count: localCount })}
                      </button>
                    )}
                    {customCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleProviderFilterTabChange('custom')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                          providerFilterTab === 'custom'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {t('settings.filterCustomProviders', { count: customCount })}
                      </button>
                    )}
                  </div>
                </div>

                {/* Providers Cards Grid */}
                {filteredProviders.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl bg-muted/20">
                    {t('settings.noProvidersFound')}
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    {filteredProviders.map(provider => {
                      const isEnabled = enabledList.includes(provider.id);
                      const isConfigured = provider.isConfigured || (settings.apiKeys?.[provider.id] && settings.apiKeys[provider.id] !== '<replace me>') || provider.isLocal;
                      const isPrimary = (settings.provider || 'groq') === provider.id;
                      const isFallback = (settings.fallbackProviders || []).includes(provider.id);
                      const testResult = providerTestResults[provider.id];
                      const showKey = Boolean(showProviderApiKeyMap[provider.id]);
                      const currentKey = settings.apiKeys?.[provider.id] || (provider.id === 'groq' ? settings.GROQ_API_KEY : '') || '';
                      const currentBaseUrl = settings.providerUrls?.[provider.id] || (provider.id === 'custom' ? settings.customApiBaseUrl : '') || provider.baseUrl || '';
                      const IconComp = getProviderIconComponent(provider);

                      return (
                        <div
                          key={provider.id}
                          className={cn(
                            "border rounded-xl p-3.5 sm:p-4 transition-all space-y-3 shadow-xs",
                            isEnabled
                              ? "bg-card border-border hover:border-border/80"
                              : "bg-muted/20 border-dashed border-border/60 opacity-80"
                          )}
                        >
                          {/* Card Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                            {/* Left: Icon, Name & Badges */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                                isEnabled
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {provider.name}
                                  </span>
                                  {isPrimary && (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-black dark:text-white font-semibold text-[10px] px-1.5 py-0 shadow-xs">
                                      <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                                      {t('settings.primaryProvider')}
                                    </Badge>
                                  )}
                                  {isFallback && !isPrimary && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                                      🔄 Fallback
                                    </Badge>
                                  )}
                                  {provider.isCustom && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                      {t('settings.customProviderBadge')}
                                    </Badge>
                                  )}
                                  {provider.isLocal && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                      {t('settings.localProviderBadge')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {isConfigured ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                      <CheckCircle className="w-3 h-3" />
                                      {t('settings.statusConfigured')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {t('settings.statusNotConfigured')}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span className={isEnabled ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                    {isEnabled ? t('settings.statusActive') : t('settings.statusInactive')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Active Switch & Quick Actions */}
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                              {/* Primary Provider Selector */}
                              {!isPrimary && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetPrimaryProvider(provider.id)}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  title={t('settings.setAsPrimary')}
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  <span>{t('settings.setAsPrimary')}</span>
                                </Button>
                              )}

                              {/* Fallback Provider Toggle */}
                              {!isPrimary && (
                                <Button
                                  type="button"
                                  variant={isFallback ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => toggleFallbackProvider(provider.id)}
                                  className="h-7 px-2 text-xs"
                                  title="Fallback"
                                >
                                  {isFallback ? '✓ Fallback' : '+ Fallback'}
                                </Button>
                              )}

                              {/* Custom Provider Edit & Delete */}
                              {provider.isCustom && (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenAddProviderModal(provider)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title={t('common.edit')}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingCustomProvider(provider)}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title={t('common.delete')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}

                              {/* Active Toggle Switch */}
                              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                                <Label htmlFor={`provider-active-${provider.id}`} className="text-xs font-medium cursor-pointer">
                                  {isEnabled ? t('settings.statusActive') : t('settings.statusInactive')}
                                </Label>
                                <Switch
                                  id={`provider-active-${provider.id}`}
                                  checked={isEnabled}
                                  onChange={() => toggleProviderActive(provider.id)}
                                  aria-label={t('settings.toggleActive')}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Middle: Description & Endpoint Preview */}
                          <div className="space-y-1 text-xs">
                            <p className="text-muted-foreground">{provider.description}</p>
                            {provider.baseUrl && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>Endpoint:</span>
                                <code className="bg-muted/60 px-1.5 py-0.5 rounded text-foreground font-mono truncate max-w-full">
                                  {provider.baseUrl}
                                </code>
                              </div>
                            )}
                          </div>

                          {/* Bottom: Credentials & Test Connection */}
                          <div className="pt-2 border-t border-border/40 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              {/* API Key Input (if requires key or is custom) */}
                              {(provider.requiresApiKey !== false || provider.isCustom) && (() => {
                                const resolvedKeyUrl = provider.keyUrl || provider.apiKeyUrl || getKnownApiKeyUrl(provider.id, provider.baseUrl, provider.name);
                                return (
                                  <div className={cn(
                                    provider.isCustom || provider.id === 'custom' ? "md:col-span-6" : "md:col-span-8",
                                    "space-y-1.5"
                                  )}>
                                    <div className="flex items-center justify-between gap-2">
                                      <Label htmlFor={`api-key-${provider.id}`} className="text-xs font-medium">
                                        {t('settings.apiKeyLabel')}
                                      </Label>
                                      {resolvedKeyUrl && (
                                        <a
                                          href={resolvedKeyUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => {
                                            if (window.electron?.openExternal) {
                                              e.preventDefault();
                                              window.electron.openExternal(resolvedKeyUrl);
                                            }
                                          }}
                                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium group transition-colors cursor-pointer"
                                          title={t('settings.getApiKeyTooltip', { provider: provider.name })}
                                        >
                                          <span>{t('settings.getApiKey')}</span>
                                          <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </a>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type={showKey ? "text" : "password"}
                                        id={`api-key-${provider.id}`}
                                        value={currentKey}
                                        onChange={(e) => handleProviderApiKeyChange(provider.id, e.target.value)}
                                        placeholder={t('settings.providerCardApiKeyPlaceholder')}
                                        className="text-xs h-8 pr-8"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-8 w-8 text-muted-foreground"
                                        onClick={() => toggleProviderApiKeyVisibility(provider.id)}
                                      >
                                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Base URL (if custom or overriding) */}
                              {(provider.isCustom || provider.id === 'custom') && (
                                <div className="md:col-span-6 space-y-1.5">
                                  <Label htmlFor={`base-url-${provider.id}`} className="text-xs font-medium">
                                    {t('settings.customBaseUrlLabel')}
                                  </Label>
                                  <Input
                                    type="text"
                                    id={`base-url-${provider.id}`}
                                    value={currentBaseUrl}
                                    onChange={(e) => handleProviderBaseUrlChange(provider.id, e.target.value)}
                                    placeholder="https://api.exemplo.com/v1"
                                    className="text-xs h-8"
                                  />
                                </div>
                              )}

                              {/* Test Connection Button */}
                              <div className="md:col-span-4 flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestProvider(provider.id)}
                                  disabled={testResult?.testing}
                                  className="h-8 text-xs w-full justify-center gap-1.5"
                                >
                                  {testResult?.testing ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                      <span>{t('settings.testingConnection')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3 text-amber-500" />
                                      <span>{t('settings.testConnection')}</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Live Test Results Alert */}
                            {testResult && !testResult.testing && (
                              <div className="pt-1">
                                {testResult.success ? (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-700 dark:text-green-300">
                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      {t('settings.testSuccess', { count: testResult.count, latency: testResult.latencyMs })}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      {t('settings.testError', { error: testResult.error })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {visibleCardIds.has('generationParams') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span>{t('settings.generationParamsTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.generationParamsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="temperature">
                      {t('settings.temperatureLabel')} <Badge variant="outline">{settings.temperature}</Badge>
                    </Label>
                    <input
                      type="range"
                      id="temperature"
                      name="temperature"
                      min="0"
                      max="2"
                      step="0.01"
                      value={settings.temperature}
                      onChange={handleNumberChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.temperatureHelp')}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="top_p">
                      {t('settings.topPLabel')} <Badge variant="outline">{settings.top_p}</Badge>
                    </Label>
                    <input
                      type="range"
                      id="top_p"
                      name="top_p"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.top_p}
                      onChange={handleNumberChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.topPHelp')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="reasoning_effort">
                      {t('settings.reasoningEffortLabel')} <Badge variant="outline">{settings.reasoning_effort}</Badge>
                    </Label>
                    <Select
                      value={settings.reasoning_effort}
                      onValueChange={(value) => handleSelectChange('reasoning_effort', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.reasoningEffortPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('settings.reasoningLow')}</SelectItem>
                        <SelectItem value="medium">{t('settings.reasoningMedium')}</SelectItem>
                        <SelectItem value="high">{t('settings.reasoningHigh')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.reasoningEffortHelp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('modelsByProvider') && (
          <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      <span>{t('settings.modelsByProviderTitle')}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t('settings.modelsByProviderDesc')}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAndSetModelConfigs(true)}
                    disabled={isRefreshingModels}
                    className="text-xs h-8 self-start sm:self-auto shrink-0"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshingModels && "animate-spin")} />
                    <span>{isRefreshingModels ? t('settings.detectingLocalAi') : t('common.refresh')}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar & Global Expand/Collapse for provider models */}
                {allLoadedModels.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        value={providerModelSearchQuery}
                        onChange={(e) => setProviderModelSearchQuery(e.target.value)}
                        placeholder={t('settings.searchModelsPlaceholder')}
                        className="text-xs sm:text-sm h-9 pl-8 pr-8"
                      />
                      {providerModelSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setProviderModelSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                          title={t('common.clear')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {(() => {
                      const allGroupNames = Array.from(new Set(allLoadedModels.map(id => {
                        const cfg = modelConfigs[id] || {};
                        return cfg.group || cfg.provider || getModelGroup(id, cfg);
                      })));

                      return (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExpandAllProviderGroups(allGroupNames)}
                            className="text-xs h-9 px-2.5"
                            title={t('settings.expandAllModels')}
                          >
                            <ChevronDown className="h-3.5 w-3.5 mr-1" />
                            <span>{t('settings.expandAllModels')}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCollapseAllProviderGroups}
                            className="text-xs h-9 px-2.5"
                            title={t('settings.collapseAllModels')}
                          >
                            <ChevronUp className="h-3.5 w-3.5 mr-1" />
                            <span>{t('settings.collapseAllModels')}</span>
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {allLoadedModels.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const query = providerModelSearchQuery.trim().toLowerCase();
                      const isSearchActive = query.length > 0;
                      const filteredModelIds = isSearchActive
                        ? allLoadedModels.filter(id => {
                            const cfg = modelConfigs[id] || {};
                            const rawId = (cfg.rawModelId || (id.includes('::') ? id.split('::')[1] : id)).toLowerCase();
                            const name = (cfg.displayName || rawId).toLowerCase();
                            const grp = (cfg.group || cfg.provider || getModelGroup(id, cfg)).toLowerCase();
                            const contextStr = cfg.context ? String(cfg.context) : '';
                            const hasVision = cfg.vision_supported ? 'vision' : '';
                            const hasTools = cfg.builtin_tools_supported ? 'tools tool' : '';
                            return id.toLowerCase().includes(query) ||
                                   rawId.includes(query) ||
                                   name.includes(query) ||
                                   grp.includes(query) ||
                                   contextStr.includes(query) ||
                                   hasVision.includes(query) ||
                                   hasTools.includes(query);
                          })
                        : allLoadedModels;

                      if (filteredModelIds.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10 space-y-2">
                            <p className="font-medium text-sm text-foreground/80">{t('common.noModelsFound')}</p>
                            {isSearchActive && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setProviderModelSearchQuery('')}
                                className="text-xs h-7"
                              >
                                {t('common.clear')}
                              </Button>
                            )}
                          </div>
                        );
                      }

                      const groups = groupModels(filteredModelIds, modelConfigs);
                      const disabledList = Array.isArray(settings.disabledModels) ? settings.disabledModels : [];

                      return (
                        <>
                          {isSearchActive && (
                            <div className="text-xs text-muted-foreground flex items-center justify-between px-1 pb-1">
                              <span>
                                {t('settings.showingMatchingModels', { count: filteredModelIds.length, providers: groups.length })}
                              </span>
                              <button
                                type="button"
                                onClick={() => setProviderModelSearchQuery('')}
                                className="text-primary hover:underline text-xs"
                              >
                                {t('common.clear')}
                              </button>
                            </div>
                          )}

                          {groups.map(({ group, models: groupModelIds }) => {
                            const isModelActive = (id) => {
                              const cfg = modelConfigs[id];
                              const rawId = cfg?.rawModelId;
                              return !disabledList.includes(id) && (!rawId || !disabledList.includes(rawId));
                            };
                            const activeCount = groupModelIds.filter(isModelActive).length;
                            const totalCount = groupModelIds.length;
                            const isExpanded = isSearchActive ? true : expandedProviderGroups.has(group);

                            return (
                              <div
                                key={group}
                                className={cn(
                                  "border rounded-xl bg-card/60 shadow-xs transition-all duration-200 overflow-hidden",
                                  isExpanded ? "border-border/80" : "border-border/50 hover:border-border"
                                )}
                              >
                                {/* Group Header (Accordion Panel Trigger) */}
                                <div
                                  onClick={() => toggleProviderGroup(group)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleProviderGroup(group);
                                    }
                                  }}
                                  className={cn(
                                    "w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 cursor-pointer select-none transition-colors",
                                    isExpanded ? "bg-muted/30 border-b border-border/50" : "hover:bg-muted/20"
                                  )}
                                >
                                  {/* Left: Chevron & Provider Info */}
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                                      <ChevronDown
                                        className={cn(
                                          "h-4 w-4 transition-transform duration-200",
                                          isExpanded ? "rotate-0 text-foreground" : "-rotate-90 text-muted-foreground"
                                        )}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                      <span className="font-semibold text-sm text-foreground tracking-wide truncate">
                                        {group}
                                      </span>
                                      <Badge
                                        variant={activeCount > 0 ? "secondary" : "outline"}
                                        className={cn(
                                          "text-[11px] px-2 font-normal",
                                          activeCount > 0 && "bg-primary/10 text-primary border-primary/20"
                                        )}
                                      >
                                        {t('settings.activeModelsCount', { active: activeCount, total: totalCount })}
                                      </Badge>
                                      {!isExpanded && activeCount > 0 && (
                                        <span className="hidden md:inline-block text-[11px] text-muted-foreground truncate max-w-[280px]">
                                          ({groupModelIds
                                            .filter(isModelActive)
                                            .slice(0, 3)
                                            .map(id => modelConfigs[id]?.displayName || (id.includes('::') ? id.split('::')[1] : id))
                                            .join(', ')}
                                          {activeCount > 3 ? ` +${activeCount - 3}` : ''})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Enable/Disable All Buttons */}
                                  <div
                                    className="flex items-center gap-2 self-end sm:self-auto shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEnableAllInGroup(groupModelIds)}
                                      disabled={activeCount === totalCount}
                                      className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      {t('settings.enableAllModels')}
                                    </Button>
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDisableAllInGroup(groupModelIds)}
                                      disabled={activeCount === 0}
                                      className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                      {t('settings.disableAllModels')}
                                    </Button>
                                  </div>
                                </div>

                                {/* Model Grid (Visible when Expanded) */}
                                {isExpanded && (
                                  <div className="p-3 sm:p-4 pt-3 bg-card/30 animate-in fade-in-0 duration-150">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {groupModelIds.map(modelId => {
                                        const config = modelConfigs[modelId] || {};
                                        const rawId = config.rawModelId || (modelId.includes('::') ? modelId.split('::')[1] : modelId);
                                        const displayName = config.displayName || rawId;
                                        const isEnabled = isModelActive(modelId);

                                        return (
                                          <div
                                            key={modelId}
                                            className={cn(
                                              "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                              isEnabled
                                                ? "bg-background border-border/80 hover:border-border shadow-2xs"
                                                : "bg-muted/20 border-dashed border-border/40 opacity-70"
                                            )}
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0 mr-2">
                                              <Switch
                                                id={`toggle-${modelId}`}
                                                checked={isEnabled}
                                                onChange={() => handleToggleModelEnabled(modelId)}
                                                aria-label={`Toggle ${displayName}`}
                                              />
                                              <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5 truncate">
                                                  <span className="font-medium text-xs text-foreground truncate">
                                                    {displayName}
                                                  </span>
                                                  {config.vision_supported && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                                      Vision
                                                    </Badge>
                                                  )}
                                                  {config.builtin_tools_supported && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                                                      Tools
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="text-[10.5px] text-muted-foreground font-mono truncate">
                                                  {rawId} {config.context ? `(${Number(config.context).toLocaleString()} tokens)` : ''}
                                                </div>
                                              </div>
                                            </div>

                                            <Badge
                                              variant={isEnabled ? "secondary" : "outline"}
                                              className={cn(
                                                "text-[10px] shrink-0 font-normal",
                                                isEnabled ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" : "text-muted-foreground"
                                              )}
                                            >
                                              {isEnabled ? t('settings.statusActive') : t('settings.statusInactive')}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                    <Cpu className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                    <p className="text-sm font-medium">{t('settings.noModelsAvailable')}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAndSetModelConfigs(true)}
                      className="mt-3 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {t('common.refresh')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('customModels') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span>{t('settings.customModelsTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.customModelsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configured Custom Models Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span>{t('settings.configuredCustomModelsTitle', { count: Object.keys(settings.customModels || {}).length })}</span>
                    </h4>
                    {Object.keys(settings.customModels || {}).length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportCustomModelsJson}
                          className="text-xs h-8"
                          title="Exportar JSON para clipboard"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          {t('settings.exportJsonBtn')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteAllCustomModels}
                          className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title={t('settings.deleteAllCustomModels')}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          {t('common.clear')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {Object.keys(settings.customModels || {}).length > 0 ? (
                    <div className="space-y-4">
                      {/* Search / Filter configured models */}
                      {Object.keys(settings.customModels || {}).length > 3 && (
                        <div className="relative">
                          <Input
                            type="text"
                            value={customModelSearchQuery}
                            onChange={(e) => setCustomModelSearchQuery(e.target.value)}
                            placeholder={t('settings.searchCustomModelsPlaceholder')}
                            className="text-xs sm:text-sm h-8"
                          />
                          {customModelSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCustomModelSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}

                      {/* Grouped Models List */}
                      {(() => {
                        const allModelIds = Object.keys(settings.customModels || {});
                        const query = customModelSearchQuery.trim().toLowerCase();
                        const filteredIds = query
                          ? allModelIds.filter(id => {
                              const cfg = settings.customModels[id] || {};
                              const name = (cfg.displayName || id).toLowerCase();
                              const grp = (cfg.group || getModelGroup(id, cfg)).toLowerCase();
                              return id.toLowerCase().includes(query) || name.includes(query) || grp.includes(query);
                            })
                          : allModelIds;

                        if (filteredIds.length === 0) {
                          return (
                            <div className="text-center py-6 text-xs text-muted-foreground border rounded-xl bg-muted/20">
                              {t('common.noModelsFound')}
                            </div>
                          );
                        }

                        const grouped = groupModels(filteredIds, settings.customModels);

                        return grouped.map(({ group, models: groupModelIds }) => (
                          <div key={group} className="space-y-2">
                            <div className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <span>{group}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {groupModelIds.length}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {groupModelIds.map((id) => {
                                const config = settings.customModels[id] || {};
                                return (
                                  <Card key={id} className="border-border/50 bg-background/50 hover:bg-muted/20 transition-colors">
                                    <CardContent className="p-3 sm:p-4">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-sm text-foreground truncate">
                                              {config.displayName || id}
                                            </span>
                                            <Badge variant="outline" className="text-[11px] font-mono">
                                              {t('settings.tokensCount', { count: config.context?.toLocaleString() || '8,192' })}
                                            </Badge>
                                            {config.group && (
                                              <Badge variant="secondary" className="text-[10px] bg-muted/80">
                                                {config.group}
                                              </Badge>
                                            )}
                                            {config.vision_supported && (
                                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                                {t('settings.visionBadge')}
                                              </Badge>
                                            )}
                                            {config.builtin_tools_supported && (
                                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                                                {t('settings.builtinToolsBadge')}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground font-mono truncate">
                                            {t('settings.modelIdPrefix', { id })}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startModelEditing(id)}
                                            className="h-7 w-7 p-0"
                                            title={t('common.edit')}
                                          >
                                            <Edit3 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeCustomModel(id)}
                                            className="h-7 w-7 p-0"
                                            title={t('common.delete')}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                      <Cpu className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                      <p className="text-sm font-medium">{t('settings.noCustomModels')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('settings.addCustomModelGetStarted')}</p>
                    </div>
                  )}
                </div>

                {/* Add Custom Models Section with Tabs */}
                <div className="border-t pt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <span>{editingModelId ? t('settings.editCustomModelTitle') : t('settings.addNewCustomModelTitle')}</span>
                    </h4>

                    {/* Tabs */}
                    {!editingModelId && (
                      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 self-start">
                        <Button
                          type="button"
                          variant={customModelTab === 'single' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setCustomModelTab('single')}
                          className="text-xs h-7 px-2.5 rounded-lg"
                        >
                          {t('settings.tabSingleModel')}
                        </Button>
                        <Button
                          type="button"
                          variant={customModelTab === 'bulk' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setCustomModelTab('bulk')}
                          className="text-xs h-7 px-2.5 rounded-lg"
                        >
                          {t('settings.tabBulkAdd')}
                        </Button>
                        <Button
                          type="button"
                          variant={customModelTab === 'json' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setCustomModelTab('json')}
                          className="text-xs h-7 px-2.5 rounded-lg"
                        >
                          {t('settings.tabJsonImportExport')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* SINGLE MODEL FORM */}
                  {customModelTab === 'single' && (
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="model-id" className="text-xs font-medium">{t('settings.modelIdLabel')} *</Label>
                          <Input
                            id="model-id"
                            name="id"
                            value={newCustomModel.id}
                            onChange={handleNewCustomModelChange}
                            placeholder={t('settings.modelIdPlaceholder')}
                            disabled={editingModelId !== null}
                            className="text-xs sm:text-sm font-mono"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t('settings.modelIdHelp')}
                          </p>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="model-display-name" className="text-xs font-medium">{t('settings.displayNameLabel')} *</Label>
                          <Input
                            id="model-display-name"
                            name="displayName"
                            value={newCustomModel.displayName}
                            onChange={handleNewCustomModelChange}
                            placeholder={t('settings.displayNamePlaceholder')}
                            className="text-xs sm:text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t('settings.displayNameHelp')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="model-group" className="text-xs font-medium">{t('settings.groupLabel')}</Label>
                          <Input
                            id="model-group"
                            name="group"
                            value={newCustomModel.group || ''}
                            onChange={handleNewCustomModelChange}
                            placeholder={t('settings.groupPlaceholder')}
                            className="text-xs sm:text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t('settings.groupHelp')}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="model-context" className="text-xs font-medium">{t('settings.contextSizeLabel')}</Label>
                          <Input
                            id="model-context"
                            name="context"
                            type="number"
                            value={newCustomModel.context}
                            onChange={handleNewCustomModelChange}
                            placeholder="1000000"
                            min="1024"
                            max="2000000"
                            className="text-xs sm:text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t('settings.contextSizeHelp')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-border/40">
                        <Label className="text-xs font-medium">{t('settings.capabilitiesLabel')}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="model-vision"
                              name="vision_supported"
                              checked={newCustomModel.vision_supported}
                              onChange={handleNewCustomModelChange}
                              className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="model-vision" className="text-xs font-normal cursor-pointer">
                              {t('settings.visionSupportLabel')}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="model-builtin-tools"
                              name="builtin_tools_supported"
                              checked={newCustomModel.builtin_tools_supported}
                              onChange={handleNewCustomModelChange}
                              className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="model-builtin-tools" className="text-xs font-normal cursor-pointer">
                              {t('settings.toolsSupportLabel')}
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        {editingModelId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelModelEditing}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            {t('common.cancel')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewCustomModel({
                              id: '', displayName: '', group: '', context: 1000000, vision_supported: false, builtin_tools_supported: false
                            });
                            setEditingModelId(null);
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          {t('common.clear')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveCustomModel}
                          disabled={!newCustomModel.id || !newCustomModel.displayName}
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {editingModelId ? t('settings.updateModelBtn') : t('settings.addModelBtn')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* BULK ADD FORM */}
                  {customModelTab === 'bulk' && (
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                      <p className="text-xs text-muted-foreground">
                        {t('settings.bulkAddModelsHelp')}
                      </p>

                      <div className="space-y-1.5">
                        <Textarea
                          value={bulkModelsInput}
                          onChange={(e) => setBulkModelsInput(e.target.value)}
                          placeholder={t('settings.bulkAddPlaceholder')}
                          rows={6}
                          className="font-mono text-xs leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="bulk-context" className="text-xs font-medium">{t('settings.defaultContextSizeLabel')}</Label>
                          <Input
                            id="bulk-context"
                            type="number"
                            value={bulkDefaultContext}
                            onChange={(e) => setBulkDefaultContext(parseInt(e.target.value) || 1000000)}
                            placeholder="1000000"
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="bulk-group" className="text-xs font-medium">{t('settings.defaultGroupLabel')}</Label>
                          <Input
                            id="bulk-group"
                            value={bulkDefaultGroup}
                            onChange={(e) => setBulkDefaultGroup(e.target.value)}
                            placeholder={t('settings.groupPlaceholder')}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="bulk-vision"
                            checked={bulkVisionSupported}
                            onChange={(e) => setBulkVisionSupported(e.target.checked)}
                            className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="bulk-vision" className="text-xs font-normal cursor-pointer">
                            {t('settings.visionSupportLabel')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="bulk-builtin-tools"
                            checked={bulkToolsSupported}
                            onChange={(e) => setBulkToolsSupported(e.target.checked)}
                            className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="bulk-builtin-tools" className="text-xs font-normal cursor-pointer">
                            {t('settings.toolsSupportLabel')}
                          </Label>
                        </div>
                      </div>

                      {/* Live Detection Preview */}
                      {(() => {
                        const detected = parseBulkModelsInput(bulkModelsInput, {
                          context: bulkDefaultContext,
                          group: bulkDefaultGroup,
                          vision_supported: bulkVisionSupported,
                          builtin_tools_supported: bulkToolsSupported
                        });

                        return (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="text-xs">
                              {detected.length > 0 ? (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {t('settings.modelsDetectedCount', { count: detected.length })}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  Nenhum modelo digitado ainda.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkModelsInput('')}
                                disabled={!bulkModelsInput}
                              >
                                <X className="h-3.5 w-3.5 mr-1.5" />
                                {t('common.clear')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveBulkModels}
                                disabled={detected.length === 0}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                {t('settings.addBulkModelsBtn', { count: detected.length })}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* JSON IMPORT / EXPORT */}
                  {customModelTab === 'json' && (
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                      <p className="text-xs text-muted-foreground">
                        {t('settings.importJsonPlaceholder')}
                      </p>

                      <Textarea
                        value={customModelsJsonInput}
                        onChange={(e) => setCustomModelsJsonInput(e.target.value)}
                        placeholder={'{\n  "openai/gpt-oss-20b": {\n    "displayName": "GPT OSS 20B",\n    "context": 128000,\n    "group": "OpenAI"\n  }\n}'}
                        rows={6}
                        className="font-mono text-xs"
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportCustomModelsJson}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          {t('settings.exportJsonBtn')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleImportCustomModelsJson}
                          disabled={!customModelsJsonInput.trim()}
                        >
                          <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                          {t('settings.importJsonBtn')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Model Filter */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium text-sm">{t('settings.modelFilterInclusionTitle')}</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.modelFilterInclusionHelp')}
                    </p>
                    <Textarea
                      id="model-filter"
                      name="modelFilter"
                      value={settings.modelFilter || ''}
                      onChange={handleChange}
                      rows={6}
                      placeholder={t('settings.modelFilterInclusionPlaceholder')}
                      className="min-h-[120px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.modelFilterInclusionExample')}
                    </p>
                  </div>
                </div>

                {/* Model Filter Exclude */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium text-sm">{t('settings.modelFilterExcludeTitle')}</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.modelFilterExcludeHelp')}
                    </p>
                    <Textarea
                      id="model-filter-exclude"
                      name="modelFilterExclude"
                      value={settings.modelFilterExclude || ''}
                      onChange={handleChange}
                      rows={6}
                      placeholder={t('settings.modelFilterExcludePlaceholder')}
                      className="min-h-[120px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.modelFilterExcludeExample')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    );
  };

  const renderIntegrationsSection = () => {
    const hasVisible =
      visibleCardIds.has('agentHarness') ||
      visibleCardIds.has('responses') ||
      visibleCardIds.has('mcpServers') ||
      visibleCardIds.has('toolApprovals') ||
      visibleCardIds.has('observability') ||
      visibleCardIds.has('git');

    if (!hasVisible && activeCategory !== 'integrations') return null;

    return (
      <div className="space-y-6">
        {activeCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60 pt-4">
            <Server className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">{t('settings.navIntegrations')}</h2>
              <p className="text-xs text-muted-foreground">Servidores MCP locais e remotos, conectores Google, permissões e Git</p>
            </div>
          </div>
        )}

        {settings.interfaceMode !== 'power' && !searchQuery && activeCategory === 'integrations' && (
          <div className="p-6 rounded-2xl border border-dashed bg-muted/20 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Recursos disponíveis no Modo Power User
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                As configurações avançadas de integração MCP, Google OAuth e Git estão ocultas no Modo Usuário. Ative o Modo Power User para configurá-las.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSelectChange('interfaceMode', 'power')}
              className="text-xs"
            >
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Ativar Modo Power User
            </Button>
          </div>
        )}

        {visibleCardIds.has('agentHarness') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-primary" />
                <span>{t('settings.agentHarnessTitle')}</span>
              </CardTitle>
              <CardDescription>{t('settings.agentHarnessDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    id: 'native',
                    title: t('settings.agentHarnessNativeTitle'),
                    description: t('settings.agentHarnessNativeDesc'),
                    badge: t('settings.agentHarnessDefaultBadge')
                  },
                  {
                    id: 'pi',
                    title: t('settings.agentHarnessPiTitle'),
                    description: t('settings.agentHarnessPiDesc'),
                    badge: 'MIT'
                  }
                ].map(option => {
                  const selected = (settings.agentHarness || 'native') === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectChange('agentHarness', option.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                        selected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:bg-muted'
                      )}
                      aria-pressed={selected}
                    >
                      <Blocks className={cn('h-5 w-5 mt-0.5', selected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2 font-semibold text-sm">
                          <span>{option.title}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{option.badge}</Badge>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </span>
                        </span>
                        <span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
                {t('settings.agentHarnessSecurityNote')}
              </div>
            </CardContent>
          </Card>
        )}

        {visibleCardIds.has('responses') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>{t('settings.responsesTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.responsesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="use-responses-api" className="font-medium">
                      {t('settings.useResponsesApiLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.useResponsesApiHelp')}
                    </p>
                  </div>
                  <Switch
                    id="use-responses-api"
                    checked={settings.useResponsesApi || false}
                    onChange={(e) => handleToggleChange('useResponsesApi', e.target.checked)}
                  />
                </div>

                {settings.useResponsesApi && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted ml-2">
                    {/* Google OAuth Credentials Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{t('settings.googleAuthCredentialsTitle')}</Label>
                        {googleOAuthStatus?.hasRefreshCapability && (
                          <div className="flex items-center gap-2">
                            {googleOAuthStatus?.expiresInMinutes !== null && (
                              <span className={`text-xs ${googleOAuthStatus.isExpired ? 'text-red-500' : googleOAuthStatus.expiresInMinutes < 10 ? 'text-yellow-500' : 'text-green-500'}`}>
                                {googleOAuthStatus.isExpired 
                                  ? t('settings.googleTokenExpired') 
                                  : t('settings.googleExpiresIn', { minutes: googleOAuthStatus.expiresInMinutes })}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGoogleOAuthRefresh}
                              disabled={isRefreshingToken}
                              className="h-7 text-xs"
                            >
                              {isRefreshingToken ? t('settings.btnRefreshing') : t('settings.btnRefreshToken')}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Refresh Token */}
                      <div className="space-y-2">
                        <Label htmlFor="google-refresh-token" className="text-xs text-muted-foreground">
                          {t('settings.googleRefreshTokenLabel')}
                        </Label>
                        <Input
                          type="password"
                          id="google-refresh-token"
                          name="googleRefreshToken"
                          value={settings.googleRefreshToken || ''}
                          onChange={handleChange}
                          placeholder={t('settings.googleRefreshTokenPlaceholder')}
                          className="font-mono text-sm"
                        />
                      </div>

                      {/* Client ID & Secret */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="google-client-id" className="text-xs text-muted-foreground">
                            {t('settings.googleClientIdLabel')}
                          </Label>
                          <Input
                            type="password"
                            id="google-client-id"
                            name="googleClientId"
                            value={settings.googleClientId || ''}
                            onChange={handleChange}
                            placeholder="xxxxx.apps.googleusercontent.com"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="google-client-secret" className="text-xs text-muted-foreground">
                            {t('settings.googleClientSecretLabel')}
                          </Label>
                          <Input
                            type="password"
                            id="google-client-secret"
                            name="googleClientSecret"
                            value={settings.googleClientSecret || ''}
                            onChange={handleChange}
                            placeholder="GOCSPX-xxxxx"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      {/* Help Link */}
                      <p className="text-xs text-muted-foreground">
                        📖 {t('settings.googleHelpPrefix')}{' '}
                        <a 
                          href="https://console.cloud.google.com/apis/credentials" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t('settings.googleHelpLink')}
                        </a>
                        {' '}{t('settings.googleHelpSuffix')}
                      </p>

                      {/* Status Message */}
                      {settings.googleRefreshToken && settings.googleClientId && settings.googleClientSecret ? (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {t('settings.googleAutoRefreshActive')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t('settings.googleAutoRefreshHelp')}
                        </p>
                      )}

                      {/* Manual Access Token (fallback) */}
                      <details className="pt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          {t('settings.googleManualTokenSummary')}
                        </summary>
                        <div className="space-y-2 pt-2">
                          <Input
                            type="password"
                            id="google-oauth-token"
                            name="googleOAuthToken"
                            value={settings.googleOAuthToken || ''}
                            onChange={handleChange}
                            placeholder="ya29.xxxxx (expires in ~1 hour)"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('settings.googleManualTokenHelp')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            💡 {t('settings.googleManualTokenPlayground')}{' '}
                            <a 
                              href="https://developers.google.com/oauthplayground/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              OAuth Playground
                            </a>
                          </p>
                        </div>
                      </details>
                    </div>

                    <div className="space-y-4 pt-2">
                      <Label className="text-sm font-medium text-muted-foreground">{t('settings.googleConnectorsTitle')}</Label>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Switch
                              id="connector-gmail"
                              checked={settings.googleConnectors?.gmail || false}
                              onChange={(e) => handleGoogleConnectorToggle('gmail', e.target.checked)}
                            />
                            <Label htmlFor="connector-gmail" className="font-normal">{t('settings.gmailLabel')}</Label>
                          </div>
                          {settings.googleConnectors?.gmail && (
                            <Select
                              value={settings.googleConnectorsApproval?.gmail || 'never'}
                              onValueChange={(value) => handleGoogleConnectorApprovalChange('gmail', value)}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">{t('settings.approvalNever')}</SelectItem>
                                <SelectItem value="always">{t('settings.approvalAlways')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Switch
                              id="connector-calendar"
                              checked={settings.googleConnectors?.calendar || false}
                              onChange={(e) => handleGoogleConnectorToggle('calendar', e.target.checked)}
                            />
                            <Label htmlFor="connector-calendar" className="font-normal">{t('settings.calendarLabel')}</Label>
                          </div>
                          {settings.googleConnectors?.calendar && (
                            <Select
                              value={settings.googleConnectorsApproval?.calendar || 'never'}
                              onValueChange={(value) => handleGoogleConnectorApprovalChange('calendar', value)}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">{t('settings.approvalNever')}</SelectItem>
                                <SelectItem value="always">{t('settings.approvalAlways')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Switch
                              id="connector-drive"
                              checked={settings.googleConnectors?.drive || false}
                              onChange={(e) => handleGoogleConnectorToggle('drive', e.target.checked)}
                            />
                            <Label htmlFor="connector-drive" className="font-normal">{t('settings.driveLabel')}</Label>
                          </div>
                          {settings.googleConnectors?.drive && (
                            <Select
                              value={settings.googleConnectorsApproval?.drive || 'never'}
                              onValueChange={(value) => handleGoogleConnectorApprovalChange('drive', value)}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">{t('settings.approvalNever')}</SelectItem>
                                <SelectItem value="always">{t('settings.approvalAlways')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Remote MCP Servers Section */}
                    <div className="space-y-4 pt-4 border-t border-muted">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('settings.remoteMcpTitle')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.remoteMcpDesc')}
                        </p>
                      </div>

                      {/* Configured Remote MCP Servers List */}
                      {Object.keys(settings.remoteMcpServers || {}).length > 0 && (
                        <div className="space-y-3">
                          {Object.entries(settings.remoteMcpServers || {}).map(([id, config]) => {
                            const isEnabled = config.enabled !== false; // Default to true if not specified
                            return (
                              <Card key={id} className={`border-border/50 ${!isEnabled ? 'opacity-60' : ''}`}>
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-3">
                                      <Switch
                                        id={`remote-mcp-enabled-${id}`}
                                        checked={isEnabled}
                                        onChange={(e) => handleRemoteMcpServerToggle(id, e.target.checked)}
                                      />
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="secondary" className="text-xs">{config.serverLabel || id}</Badge>
                                          {config.requireApproval === 'always' && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                              {t('settings.approvalRequiredBadge')}
                                            </Badge>
                                          )}
                                          {!isEnabled && (
                                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
                                              {t('common.disabled')}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                                          {config.serverUrl}
                                        </div>
                                        
                                        {config.serverDescription && (
                                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                            {config.serverDescription}
                                          </div>
                                        )}
                                        
                                        {config.headers && Object.keys(config.headers).length > 0 && (
                                          <div className="text-xs text-muted-foreground">
                                            <span>{t('settings.customHeadersCount', { count: Object.keys(config.headers).length })}</span>
                                          </div>
                                        )}
                                        
                                        {config.allowedTools && config.allowedTools.length > 0 && (
                                          <div className="text-xs text-muted-foreground">
                                            <span>{t('settings.allowedToolsPrefix', { tools: config.allowedTools.join(', ') })}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex space-x-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => startRemoteMcpEditing(id)}
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={() => removeRemoteMcpServer(id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      {/* Add New Remote MCP Server Form */}
                      <div className="space-y-3 pt-2">
                        <h5 className="text-xs font-medium flex items-center space-x-1">
                          <Plus className="h-3 w-3" />
                          <span>{editingRemoteMcpServerId ? t('settings.editRemoteMcpTitle', { id: editingRemoteMcpServerId }) : t('settings.addRemoteMcpTitle')}</span>
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="remote-mcp-id" className="text-xs">{t('settings.serverIdLabel')}</Label>
                            <Input
                              id="remote-mcp-id"
                              name="id"
                              value={newRemoteMcpServer.id}
                              onChange={handleNewRemoteMcpServerChange}
                              placeholder="e.g., huggingface"
                              className="h-8 text-sm"
                              disabled={editingRemoteMcpServerId !== null}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="remote-mcp-label" className="text-xs">{t('settings.remoteLabelLabel')}</Label>
                            <Input
                              id="remote-mcp-label"
                              name="serverLabel"
                              value={newRemoteMcpServer.serverLabel}
                              onChange={handleNewRemoteMcpServerChange}
                              placeholder="e.g., Hugging Face"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="remote-mcp-url" className="text-xs">{t('settings.remoteUrlLabel')}</Label>
                          <Input
                            id="remote-mcp-url"
                            name="serverUrl"
                            value={newRemoteMcpServer.serverUrl}
                            onChange={handleNewRemoteMcpServerChange}
                            placeholder="https://mcp.example.com"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="remote-mcp-description" className="text-xs">{t('settings.remoteDescLabel')}</Label>
                          <Textarea
                            id="remote-mcp-description"
                            name="serverDescription"
                            value={newRemoteMcpServer.serverDescription}
                            onChange={handleNewRemoteMcpServerChange}
                            placeholder="e.g., Search and access AI models from Hugging Face"
                            className="min-h-[60px] text-sm"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="remote-mcp-require-approval" className="text-xs">{t('settings.requireApprovalLabel')}</Label>
                          <Select
                            value={newRemoteMcpServer.requireApproval || 'never'}
                            onValueChange={(value) => setNewRemoteMcpServer(prev => ({ ...prev, requireApproval: value }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="never">{t('settings.approvalNever')}</SelectItem>
                              <SelectItem value="always">{t('settings.approvalAlways')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="remote-mcp-allowed-tools" className="text-xs">{t('settings.allowedToolsLabel')}</Label>
                          <Input
                            id="remote-mcp-allowed-tools"
                            name="allowedTools"
                            value={newRemoteMcpServer.allowedTools}
                            onChange={handleNewRemoteMcpServerChange}
                            placeholder="e.g., model_search, paper_search"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Headers Section */}
                        <div className="space-y-2">
                          <Label className="text-xs">{t('settings.headersTitle')}</Label>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.remoteHeadersDesc')}
                          </p>
                          
                          {Object.entries(newRemoteMcpServer.headers || {}).length > 0 && (
                            <div className="space-y-1">
                              {Object.entries(newRemoteMcpServer.headers || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Input value={key} disabled className="bg-muted h-7 text-xs" />
                                    <Input 
                                      value={
                                        key.toLowerCase().includes('auth') || 
                                        key.toLowerCase().includes('key') || 
                                        key.toLowerCase().includes('token') || 
                                        key.toLowerCase().includes('secret')
                                          ? '*'.repeat(Math.min(value.length, 20))
                                          : (typeof value === 'string' && value.length > 20 ? `${value.substring(0, 17)}...` : value)
                                      } 
                                      disabled 
                                      className="bg-muted h-7 text-xs" 
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => removeRemoteMcpHeader(key)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Input
                              name="key"
                              value={newRemoteMcpHeader.key}
                              onChange={handleRemoteMcpHeaderChange}
                              placeholder={t('settings.headerKeyPlaceholder')}
                              className="flex-1 h-7 text-xs"
                            />
                            <Input
                              name="value"
                              value={newRemoteMcpHeader.value}
                              onChange={handleRemoteMcpHeaderChange}
                              placeholder={t('settings.headerValPlaceholder')}
                              className="flex-1 h-7 text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={addRemoteMcpHeader}
                              disabled={!newRemoteMcpHeader.key}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          {editingRemoteMcpServerId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelRemoteMcpEditing}
                            >
                              <X className="h-3 w-3 mr-1" />
                              {t('common.cancel')}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewRemoteMcpServer({
                                id: '',
                                serverUrl: '',
                                serverLabel: '',
                                serverDescription: '',
                                requireApproval: 'never',
                                allowedTools: '',
                                headers: {}
                              });
                              setEditingRemoteMcpServerId(null);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t('common.clear')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveRemoteMcpServer}
                            disabled={!newRemoteMcpServer.id || !newRemoteMcpServer.serverUrl}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {editingRemoteMcpServerId ? t('common.edit') : t('common.save')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('mcpServers') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-primary" />
                  <span>{t('settings.mcpServersTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.mcpServersDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configured Servers List */}
                {Object.keys(settings.mcpServers || {}).length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t('settings.configuredServersListTitle', { count: Object.keys(settings.mcpServers || {}).length })}</h4>
                    <div className="space-y-3">
                      {Object.entries(settings.mcpServers || {}).map(([id, config]) => (
                        <Card key={id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary">{id}</Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {config.transport === 'sse' ? 'SSE' : 
                                     config.transport === 'streamableHttp' ? 'Streamable HTTP' : 'Stdio'}
                                  </Badge>
                                </div>
                                
                                <div className="text-sm text-muted-foreground font-mono">
                                  {config.transport === 'sse' || config.transport === 'streamableHttp' ? (
                                    <span>URL: {config.url}</span>
                                  ) : (
                                    <span>$ {config.command} {(config.args || []).join(' ')}</span>
                                  )}
                                </div>
                                
                                {config.env && Object.keys(config.env).length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    <span>{t('settings.envVarsConfigured', { count: Object.keys(config.env).length })}</span>
                                  </div>
                                )}
                                
                                {config.headers && Object.keys(config.headers).length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    <span>{t('settings.customHeadersConfigured', { count: Object.keys(config.headers).length })}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditing(id)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeMcpServer(id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('settings.noServersConfigured')}</p>
                    <p className="text-sm">{t('settings.addServerGetStarted')}</p>
                  </div>
                )}

                {/* Add New Server Section */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium text-sm flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>{editingServerId ? t('settings.editMcpServerTitle', { id: editingServerId }) : t('settings.addMcpServerTitle')}</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="server-id">{t('settings.serverIdLabel')}</Label>
                      <Input
                        id="server-id"
                        name="id"
                        value={newMcpServer.id}
                        onChange={handleNewMcpServerChange}
                        placeholder={t('settings.serverIdPlaceholder')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transport">{t('settings.transportLabel')}</Label>
                      <Select
                        value={newMcpServer.transport}
                        onValueChange={handleTransportChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('settings.selectTransportPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stdio">Stdio</SelectItem>
                          <SelectItem value="sse">SSE</SelectItem>
                          <SelectItem value="streamableHttp">Streamable HTTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newMcpServer.transport === 'stdio' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="command">{t('settings.commandLabel')}</Label>
                        <Input
                          id="command"
                          name="command"
                          value={newMcpServer.command}
                          onChange={handleNewMcpServerChange}
                          placeholder={t('settings.commandPlaceholder')}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="args">{t('settings.argsLabel')}</Label>
                        <Input
                          id="args"
                          name="args"
                          value={newMcpServer.args}
                          onChange={handleNewMcpServerChange}
                          placeholder={t('settings.argsPlaceholder')}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="url">{t('settings.urlLabel')}</Label>
                      <Input
                        id="url"
                        name="url"
                        value={newMcpServer.url}
                        onChange={handleNewMcpServerChange}
                        placeholder={t('settings.urlPlaceholder')}
                      />
                    </div>
                  )}

                  {/* Headers Section for Remote Transports */}
                  {(newMcpServer.transport === 'sse' || newMcpServer.transport === 'streamableHttp') && (
                    <div className="space-y-4">
                      <div>
                        <Label>{t('settings.headersTitle')}</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          {t('settings.headersDesc')}
                        </p>
                        <div className="mt-2 space-y-2">
                          {Object.entries(newMcpServer.headers || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <Input value={key} disabled className="bg-muted" />
                                <Input 
                                  value={
                                    key.toLowerCase().includes('auth') || 
                                    key.toLowerCase().includes('key') || 
                                    key.toLowerCase().includes('token') || 
                                    key.toLowerCase().includes('secret')
                                      ? '*'.repeat(Math.min(value.length, 20))
                                      : (typeof value === 'string' && value.length > 30 ? `${value.substring(0, 27)}...` : value)
                                  } 
                                  disabled 
                                  className="bg-muted" 
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeHeader(key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <div className="flex items-center space-x-2">
                            <Input
                              name="key"
                              value={newHeader.key}
                              onChange={handleHeaderChange}
                              placeholder={t('settings.headerKeyPlaceholder')}
                              className="flex-1"
                            />
                            <Input
                              name="value"
                              value={newHeader.value}
                              onChange={handleHeaderChange}
                              placeholder={t('settings.headerValPlaceholder')}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addHeader}
                              disabled={!newHeader.key}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Environment Variables Section */}
                  {newMcpServer.transport === 'stdio' && (
                    <div className="space-y-4">
                      <div>
                        <Label>{t('settings.envVarsTitle')}</Label>
                        <div className="mt-2 space-y-2">
                          {Object.entries(newMcpServer.env || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <Input value={key} disabled className="bg-muted" />
                                <Input 
                                  value={
                                    key.toLowerCase().includes('key') || 
                                    key.toLowerCase().includes('token') || 
                                    key.toLowerCase().includes('secret')
                                      ? '*'.repeat(key.length)
                                      : (typeof value === 'string' && value.length > 30 ? `${value.substring(0, 27)}...` : value)
                                  } 
                                  disabled 
                                  className="bg-muted" 
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEnvVar(key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <div className="flex items-center space-x-2">
                            <Input
                              name="key"
                              value={newEnvVar.key}
                              onChange={handleEnvVarChange}
                              placeholder={t('settings.envKeyPlaceholder')}
                              className="flex-1"
                            />
                            <Input
                              name="value"
                              value={newEnvVar.value}
                              onChange={handleEnvVarChange}
                              placeholder={t('settings.envValPlaceholder')}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addEnvVar}
                              disabled={!newEnvVar.key}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewMcpServer({
                          id: '', transport: 'stdio', command: '', args: '', env: {}, url: '', headers: {}
                        });
                        setJsonInput('');
                        setJsonError(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('common.clear')}
                    </Button>
                    <Button
                      onClick={handleSaveMcpServer}
                      disabled={!newMcpServer.id || (newMcpServer.transport === 'stdio' && !newMcpServer.command) || ((newMcpServer.transport === 'sse' || newMcpServer.transport === 'streamableHttp') && !newMcpServer.url)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingServerId ? t('settings.updateServerBtn') : t('settings.addServerBtn')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('toolApprovals') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>{t('settings.toolApprovalsTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.toolApprovalsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.defaultToolPolicy')}</Label>
                  <Select
                    value={settings.toolPermissions?.defaultPolicy || 'prompt'}
                    onValueChange={async (value) => {
                      const toolPermissions = { ...(settings.toolPermissions || {}), defaultPolicy: value, allowAll: false };
                      setSettings(prev => ({ ...prev, toolPermissions }));
                      await window.electron?.toolPermissions?.setGlobal?.(toolPermissions);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt">{t('settings.policyPrompt')}</SelectItem>
                      <SelectItem value="allow">{t('settings.policyAllow')}</SelectItem>
                      <SelectItem value="deny">{t('settings.policyDeny')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleResetToolApprovals}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.resetToolApprovalsBtn')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.resetToolApprovalsHelp')}
                </p>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('observability') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><BarChart3 className="h-5 w-5 text-primary" /><span>{t('settings.observabilityTitle')}</span></CardTitle>
                <CardDescription>{t('settings.observabilityDesc', { month: usageSummary?.month || '' })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t('settings.usageChats')}</p><p className="text-lg font-semibold">{usageSummary?.chats || 0}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t('settings.usageMessages')}</p><p className="text-lg font-semibold">{usageSummary?.messages || 0}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t('settings.usageTokens')}</p><p className="text-lg font-semibold">{(usageSummary?.totalTokens || 0).toLocaleString()}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t('settings.usageCost')}</p><p className="text-lg font-semibold">${(usageSummary?.estimatedCostUsd || 0).toFixed(4)}</p></div>
                </div>
                {usageSummary?.monthlyBudgetUsd > 0 && <div className="space-y-1"><div className="flex justify-between text-xs"><span>{t('settings.monthlyBudget')}</span><span className={usageSummary.budgetExceeded ? 'text-destructive font-semibold' : ''}>{usageSummary.budgetPercent}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className={usageSummary.budgetExceeded ? 'h-full bg-destructive' : 'h-full bg-primary'} style={{ width: `${Math.min(100, usageSummary.budgetPercent)}%` }} /></div></div>}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>{t('settings.monthlyBudgetUsd')}</Label><Input type="number" min="0" step="0.01" value={settings.observability?.monthlyBudgetUsd || 0} onChange={event => updateObservability({ monthlyBudgetUsd: Number(event.target.value) })} /></div>
                  <div className="space-y-2"><Label>{t('settings.inputRate')}</Label><Input type="number" min="0" step="0.01" value={settings.observability?.defaultRate?.input || 0} onChange={event => updateObservability({ defaultRate: { ...(settings.observability?.defaultRate || {}), input: Number(event.target.value) } })} /></div>
                  <div className="space-y-2"><Label>{t('settings.outputRate')}</Label><Input type="number" min="0" step="0.01" value={settings.observability?.defaultRate?.output || 0} onChange={event => updateObservability({ defaultRate: { ...(settings.observability?.defaultRate || {}), output: Number(event.target.value) } })} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={refreshUsageSummary}><RefreshCw className="h-4 w-4 mr-2" />{t('settings.refreshUsage')}</Button>
                  <Button variant="outline" onClick={() => window.electron.observability.export('json')}><Download className="h-4 w-4 mr-2" />JSON</Button>
                  <Button variant="outline" onClick={() => window.electron.observability.export('csv')}><Download className="h-4 w-4 mr-2" />CSV</Button>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('git') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><GitBranch className="h-5 w-5 text-primary" /><span>{t('settings.gitTitle')}</span></CardTitle>
                <CardDescription>{t('settings.gitDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2"><Input readOnly value={settings.gitIntegration?.repositoryPath || ''} placeholder={t('settings.gitRepository')} /><Button variant="outline" onClick={async () => { const result = await window.electron.git.selectRepository(); if (result?.success) updateGitRepository(result.path); }}>{t('settings.selectFolder')}</Button></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={isGitBusy || !settings.gitIntegration?.repositoryPath} onClick={() => runGitAction(() => window.electron.git.status(settings.gitIntegration.repositoryPath))}>{t('settings.gitStatus')}</Button>
                  <Button variant="outline" disabled={isGitBusy || !settings.gitIntegration?.repositoryPath} onClick={() => runGitAction(() => window.electron.git.diff(settings.gitIntegration.repositoryPath))}>{t('settings.gitDiff')}</Button>
                </div>
                <div className="flex gap-2"><Input value={gitCommitMessage} onChange={event => setGitCommitMessage(event.target.value)} placeholder={t('settings.gitCommitMessage')} /><Button disabled={isGitBusy || !gitCommitMessage.trim() || !settings.gitIntegration?.repositoryPath} onClick={() => runGitAction(() => window.electron.git.commit(settings.gitIntegration.repositoryPath, gitCommitMessage))}>{t('settings.gitCommit')}</Button></div>
                <Button disabled={isGitBusy || !settings.gitIntegration?.repositoryPath} onClick={() => { if (window.confirm(t('settings.gitPushConfirm'))) runGitAction(() => window.electron.git.push(settings.gitIntegration.repositoryPath)); }}>{t('settings.gitPush')}</Button>
                {gitOutput && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs">{gitOutput}</pre>}
              </CardContent>
            </Card>
        )}
      </div>
    );
  };

  const renderSystemSection = () => {
    const hasVisible =
      (visibleCardIds.has('configDir') && (configDirInfo.currentPath || settingsPath)) ||
      visibleCardIds.has('updates') ||
      visibleCardIds.has('apiLogging') ||
      visibleCardIds.has('dataHistory');

    if (!hasVisible) return null;

    return (
      <div className="space-y-6">
        {activeCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/60 pt-4">
            <Folder className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">{t('settings.navSystem')}</h2>
              <p className="text-xs text-muted-foreground">Pasta de armazenamento, atualizações, backups e histórico</p>
            </div>
          </div>
        )}

        {visibleCardIds.has('configDir') && (configDirInfo.currentPath || settingsPath) && (
          <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Folder className="h-5 w-5 text-primary" />
                      <span>{t('settings.configDirTitle')}</span>
                    </CardTitle>
                    <Badge
                      variant={configDirInfo.isCustom ? "secondary" : "outline"}
                      className={configDirInfo.isCustom ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium" : "text-[11px] font-medium"}
                    >
                      {configDirInfo.isCustom ? t('settings.configDirBadgeCustom') : t('settings.configDirBadgeDefault')}
                    </Badge>
                  </div>
                  <CardDescription>
                    {t('settings.configDirDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-medium text-muted-foreground">{t('settings.configDirCurrent')}</span>
                      <code className="font-mono bg-background px-2 py-0.5 rounded border select-all break-all text-[11px]">
                        {configDirInfo.currentPath || settingsPath}
                      </code>
                    </div>
                    {settingsPath && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-border/50">
                        <span className="font-medium text-muted-foreground">{t('settings.configDirSettingsFile')}</span>
                        <code className="font-mono bg-background px-2 py-0.5 rounded border select-all break-all text-[11px]">
                          {settingsPath}
                        </code>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectNewConfigFolder}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>{t('settings.configDirChangeBtn')}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenConfigFolder}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{t('settings.configDirOpenBtn')}</span>
                    </Button>

                    {configDirInfo.isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCopyExistingFiles(false);
                          setIsResetConfigDirModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{t('settings.configDirResetBtn')}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
        )}

        {visibleCardIds.has('updates') && (
          <Card>
              <CardHeader>
                <CardTitle>{t('settings.updatesTitle')}</CardTitle>
                <CardDescription>{t('settings.updatesDesc', { version: updateStatus.currentVersion || '' })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>{t('settings.checkUpdatesStartup')}</Label><Switch checked={settings.autoUpdate?.checkOnStartup !== false} onChange={event => updateAutoUpdate({ checkOnStartup: event.target.checked })} /></div>
                <div className="flex items-center gap-3">
                  <Label>{t('settings.updateChannel')}</Label>
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={settings.autoUpdate?.channel || 'stable'} onChange={event => updateAutoUpdate({ channel: event.target.value })}><option value="stable">Stable</option><option value="beta">Beta</option></select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => window.electron.updater.check()} disabled={updateStatus.status === 'checking'}><RefreshCw className={`w-4 h-4 mr-2 ${updateStatus.status === 'checking' ? 'animate-spin' : ''}`} />{t('settings.checkUpdates')}</Button>
                  {updateStatus.status === 'available' && <Button onClick={() => window.electron.updater.download()}><Download className="w-4 h-4 mr-2" />{t('settings.downloadUpdate', { version: updateStatus.version })}</Button>}
                  {updateStatus.status === 'downloaded' && <Button onClick={() => window.electron.updater.install()}>{t('settings.installUpdate', { version: updateStatus.version })}</Button>}
                  <span className="text-xs text-muted-foreground">{t(`settings.updateStatus_${updateStatus.status}`, { percent: updateStatus.percent, error: updateStatus.error || '' })}</span>
                </div>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('apiLogging') && (
          <Card>
              <CardHeader>
                <CardTitle>{t('settings.apiLoggingTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.apiLoggingDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="log-api-requests" className="font-medium">
                    {t('settings.apiLoggingLabel')}
                  </Label>
                  <Switch
                    id="log-api-requests"
                    checked={settings.logApiRequests || false}
                    onChange={(e) => handleToggleChange('logApiRequests', e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.apiLoggingHelp')}
                </p>
              </CardContent>
            </Card>
        )}

        {visibleCardIds.has('dataHistory') && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <span>{t('settings.dataHistoryTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.dataHistoryDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleExportBackup}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('settings.exportBackup')}
                  </Button>
                  <Button variant="outline" onClick={handleImportBackup}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    {t('settings.importBackup')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.backupSecurityHelp')}</p>
                <div className="border-t border-border pt-5">
                <Button
                  variant="destructive"
                  onClick={() => setIsDeletingAllModalOpen(true)}
                  disabled={isSaving || isDeletingAll}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.deleteAllChatsBtn')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.deleteAllChatsHelp')}
                </p>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center space-x-3 shrink-0">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground" title={t('settings.backToChat')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground hidden sm:block">{t('settings.title')}</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md mx-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('settings.searchSettingsPlaceholder')}
              className="pl-9 pr-14 h-9 text-xs sm:text-sm bg-muted/40 border-border/80 focus:bg-background rounded-xl transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 rounded-md hover:bg-muted"
                title={t('settings.searchClearBtn')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted border border-border/60 text-muted-foreground shadow-2xs">
                  /
                </kbd>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={reloadSettingsFromDisk}
              disabled={isSaving}
              className="text-xs"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('settings.reloadBtn')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Status Message */}
      {(isSaving || saveStatus) && (
        <div className="border-b bg-background">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
            <div className={`flex items-center space-x-2 text-xs ${
              saveStatus?.type === 'error'
                ? 'text-destructive'
                : saveStatus?.type === 'success'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`}>
              {saveStatus?.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : saveStatus?.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              <span>{getStatusMessage()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24 space-y-3">
            <div className="p-2.5 bg-card rounded-2xl border border-border/80 shadow-xs space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Categorias
              </p>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                const count = categoryMatchCounts ? categoryMatchCounts[cat.id] : null;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left group",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary-foreground" : "text-primary group-hover:scale-110 transition-transform")} />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {count !== null && (
                      <Badge
                        variant={isSelected ? "outline" : "secondary"}
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono shrink-0 ml-1.5",
                          isSelected ? "border-primary-foreground/40 text-primary-foreground" : count > 0 ? "bg-primary/15 text-primary font-semibold" : "opacity-40"
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Mode Switcher Widget */}
            <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {settings.interfaceMode === 'power' ? t('settings.powerMode') : t('settings.userMode')}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {settings.interfaceMode === 'power' ? 'Power' : 'User'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {settings.interfaceMode === 'power'
                  ? 'Acesso completo a modelos, MCP, conectores e configurações técnicas.'
                  : 'Interface limpa. Alterne para Power User para acessar configurações avançadas.'}
              </p>
            </div>
          </aside>

          {/* Mobile Horizontal Tabs */}
          <div className="lg:hidden w-full overflow-x-auto pb-2 -mt-2 flex items-center gap-1.5 no-scrollbar border-b border-border/60">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              const count = categoryMatchCounts ? categoryMatchCounts[cat.id] : null;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  {count !== null && (
                    <Badge
                      variant={isSelected ? "outline" : "secondary"}
                      className={cn(
                        "text-[9px] px-1 py-0 h-3.5 min-w-3.5 flex items-center justify-center font-mono ml-0.5",
                        isSelected ? "border-primary-foreground/40 text-primary-foreground" : "bg-primary/10 text-primary"
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Cards */}
          <div className="flex-1 min-w-0 max-w-4xl space-y-6">
            {/* Search feedback banner */}
            {searchQuery && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">
                    {t('settings.searchResultsCount', { count: visibleCardIds.size })} para &quot;{searchQuery}&quot;
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-7 text-xs text-primary hover:bg-primary/20 shrink-0"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t('settings.searchClearBtn')}
                </Button>
              </div>
            )}

            {/* Category header for specific category view */}
            {activeCategory !== 'all' && !searchQuery && (() => {
              const currentCat = CATEGORIES.find(c => c.id === activeCategory);
              if (!currentCat) return null;
              const Icon = currentCat.icon;
              return (
                <div className="space-y-1 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">{currentCat.label}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">{currentCat.desc}</p>
                </div>
              );
            })()}

            {/* Empty State when search returns 0 results */}
            {searchQuery && visibleCardIds.size === 0 && (
              <div className="text-center py-16 px-4 border border-dashed rounded-2xl bg-muted/10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Search className="w-6 h-6 opacity-60" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-semibold text-sm text-foreground">
                    {t('settings.searchNoResultsTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('settings.searchNoResultsDesc', { query: searchQuery })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs mt-2"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  {t('settings.searchClearBtn')}
                </Button>
              </div>
            )}

            {/* Render sections according to active filter / category */}
            {(activeCategory === 'all' || activeCategory === 'interface' || searchQuery) && renderInterfaceSection()}
            {(activeCategory === 'all' || activeCategory === 'plugins' || searchQuery) && renderPluginsSection()}
            {(activeCategory === 'all' || activeCategory === 'features' || searchQuery) && renderFeaturesSection()}
            {(activeCategory === 'all' || activeCategory === 'models' || searchQuery) && renderModelsSection()}
            {(activeCategory === 'all' || activeCategory === 'integrations' || searchQuery) && renderIntegrationsSection()}
            {(activeCategory === 'all' || activeCategory === 'system' || searchQuery) && renderSystemSection()}
          </div>
        </div>
      </main>


      {/* Delete All Chats Confirmation Modal */}
      {isDeletingAllModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingAll) {
              setIsDeletingAllModalOpen(false);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {t('sidebar.deleteAllConfirmTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('sidebar.deleteAllChats')}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('sidebar.deleteAllConfirmMessage')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeletingAllModalOpen(false)}
                disabled={isDeletingAll}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAllChats}
                disabled={isDeletingAll}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('sidebar.deleteAllConfirmButton')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Change Configuration Folder Modal */}
      {isChangingConfigDirModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isConfigDirLoading) {
              setIsChangingConfigDirModalOpen(false);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {t('settings.configDirModalTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.configDirModalDesc')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1">
                  {t('settings.configDirModalTarget')}
                </span>
                <code className="block p-2.5 bg-muted/60 border rounded-lg break-all text-xs font-mono select-all">
                  {pendingNewConfigPath}
                </code>
              </div>

              <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={copyExistingFiles}
                    onChange={(e) => setCopyExistingFiles(e.target.checked)}
                    disabled={isConfigDirLoading}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-foreground block">
                      {t('settings.configDirCopyOption')}
                    </span>
                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                      {t('settings.configDirCopyOptionHelp')}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsChangingConfigDirModalOpen(false)}
                disabled={isConfigDirLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('settings.configDirCancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmChangeConfigFolder}
                disabled={isConfigDirLoading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConfigDirLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('settings.configDirChanging')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('settings.configDirConfirmBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Configuration Folder Modal */}
      {isResetConfigDirModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isConfigDirLoading) {
              setIsResetConfigDirModalOpen(false);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {t('settings.configDirResetConfirmTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.configDirResetConfirmDesc', { defaultPath: configDirInfo.defaultPath })}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={copyExistingFiles}
                  onChange={(e) => setCopyExistingFiles(e.target.checked)}
                  disabled={isConfigDirLoading}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-medium text-foreground block">
                    {t('settings.configDirResetCopyOption')}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsResetConfigDirModalOpen(false)}
                disabled={isConfigDirLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('settings.configDirCancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmResetConfigFolder}
                disabled={isConfigDirLoading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConfigDirLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('settings.configDirChanging')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('settings.configDirResetBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Custom Provider Modal */}
      {isAddProviderModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddProviderModalOpen(false);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-5 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {editingCustomProvider ? t('settings.editProviderModalTitle') : t('settings.addProviderModalTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.selectPopularProviderDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProviderModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-lg hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Provider Catalog (if no preset is selected and not editing) */}
            {!selectedPresetId && !editingCustomProvider ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {t('settings.selectPopularProvider')}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {POPULAR_PROVIDER_PRESETS.length} opções disponíveis
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {POPULAR_PROVIDER_PRESETS.map((preset) => {
                    const PresetIcon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          "flex flex-col text-left p-3 rounded-xl border transition-all duration-150 relative group select-none shadow-xs",
                          "bg-card hover:bg-accent/40 border-border/80 hover:border-primary/50 hover:shadow-md cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-gradient-to-br", preset.color)}>
                              <PresetIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-foreground block truncate">
                                {preset.name}
                              </span>
                              <span className="text-[10.5px] text-primary/80 font-medium truncate block">
                                {preset.badge}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-normal group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {preset.id === 'custom' ? 'Manual' : '+ Ativar'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Config Form for Selected Provider */
              <div className="space-y-4 text-xs">
                {/* Active Provider Info Banner */}
                {(() => {
                  const currentPreset = POPULAR_PROVIDER_PRESETS.find(p => p.id === selectedPresetId);
                  const PresetIcon = currentPreset?.icon || Server;

                  return (
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          <PresetIcon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {customProviderForm.name || currentPreset?.name || 'Provedor'}
                            </span>
                            {currentPreset?.badge && (
                              <Badge variant="outline" className="text-[10.5px] px-1.5 py-0 bg-background/80 text-primary border-primary/30">
                                {currentPreset.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                            {customProviderForm.description || currentPreset?.description}
                          </p>
                        </div>
                      </div>

                      {!editingCustomProvider && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPresetId(null);
                            setModalTestResult(null);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('settings.chooseProviderPreset')}</span>
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {/* Primary Action: API Key Input */}
                <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label htmlFor="cp-apiKey" className="text-xs font-semibold text-foreground">
                      {t('settings.onlyApiKeyPrompt')}
                    </Label>
                    {(() => {
                      const preset = POPULAR_PROVIDER_PRESETS.find(p => p.id === selectedPresetId);
                      const keyUrl = preset?.keyUrl || customProviderForm.keyUrl || getKnownApiKeyUrl(customProviderForm.id, customProviderForm.baseUrl, customProviderForm.name);
                      if (keyUrl) {
                        return (
                          <a
                            href={keyUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              if (window.electron?.openExternal) {
                                window.electron.openExternal(keyUrl);
                              } else {
                                window.open(keyUrl, '_blank');
                              }
                            }}
                            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{t('settings.getKeyHelp')} ({preset?.keyUrlLabel || customProviderForm.name || 'Console'}) ↗</span>
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="relative">
                    <Input
                      ref={modalApiKeyInputRef}
                      type={showModalApiKey ? "text" : "password"}
                      id="cp-apiKey"
                      value={customProviderForm.apiKey}
                      onChange={(e) => setCustomProviderForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveCustomProvider();
                        }
                      }}
                      placeholder={POPULAR_PROVIDER_PRESETS.find(p => p.id === selectedPresetId)?.keyPlaceholder || "Insira sua chave de API (sk-...)"}
                      className="text-xs h-9 pr-10 font-mono bg-background"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowModalApiKey(prev => !prev)}
                      tabIndex={-1}
                    >
                      {showModalApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Test Connection in Modal */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestModalConnection}
                      disabled={modalTestResult?.testing || !customProviderForm.baseUrl}
                      className="h-7 text-xs gap-1.5 px-2.5"
                    >
                      {modalTestResult?.testing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                          <span>{t('settings.testingConnection')}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{t('settings.testConnection')}</span>
                        </>
                      )}
                    </Button>

                    {modalTestResult && !modalTestResult.testing && (
                      <div className="text-[11px] font-medium truncate">
                        {modalTestResult.success ? (
                          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('settings.testSuccessInModal', { count: modalTestResult.count, latency: modalTestResult.latencyMs })}
                          </span>
                        ) : (
                          <span className="text-destructive inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {t('settings.testErrorInModal', { error: modalTestResult.error })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Advanced Options Toggle */}
                <div className="border border-border/70 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOptionsOpen(prev => !prev)}
                    className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      <span>{t('settings.advancedSettingsToggle')}</span>
                    </div>
                    {isAdvancedOptionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isAdvancedOptionsOpen && (
                    <div className="p-3.5 pt-1 space-y-3 border-t border-border/60 bg-muted/10">
                      {/* Provider Name */}
                      <div className="space-y-1">
                        <Label htmlFor="cp-name" className="text-xs font-medium">
                          {t('settings.providerNameLabel')} *
                        </Label>
                        <Input
                          id="cp-name"
                          value={customProviderForm.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setCustomProviderForm(prev => ({
                              ...prev,
                              name,
                              id: prev.id || (!editingCustomProvider ? name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') : prev.id)
                            }));
                          }}
                          placeholder={t('settings.providerNamePlaceholder')}
                          className={cn("text-xs h-8", customProviderFormErrors.name && "border-destructive")}
                        />
                        {customProviderFormErrors.name && (
                          <p className="text-[11px] text-destructive">{customProviderFormErrors.name}</p>
                        )}
                      </div>

                      {/* Provider ID (Slug) */}
                      <div className="space-y-1">
                        <Label htmlFor="cp-id" className="text-xs font-medium">
                          {t('settings.providerIdLabel')}
                        </Label>
                        <Input
                          id="cp-id"
                          value={customProviderForm.id}
                          disabled={Boolean(editingCustomProvider)}
                          onChange={(e) => setCustomProviderForm(prev => ({ ...prev, id: e.target.value }))}
                          placeholder={t('settings.providerIdPlaceholder')}
                          className="text-xs h-8 font-mono"
                        />
                      </div>

                      {/* Provider Base URL */}
                      <div className="space-y-1">
                        <Label htmlFor="cp-baseUrl" className="text-xs font-medium">
                          {t('settings.providerBaseUrlLabel')} *
                        </Label>
                        <Input
                          id="cp-baseUrl"
                          value={customProviderForm.baseUrl}
                          onChange={(e) => setCustomProviderForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                          placeholder={t('settings.providerBaseUrlPlaceholder')}
                          className={cn("text-xs h-8 font-mono", customProviderFormErrors.baseUrl && "border-destructive")}
                        />
                        {customProviderFormErrors.baseUrl && (
                          <p className="text-[11px] text-destructive">{customProviderFormErrors.baseUrl}</p>
                        )}
                      </div>

                      {/* Default Model */}
                      <div className="space-y-1">
                        <Label htmlFor="cp-model" className="text-xs font-medium">
                          {t('settings.providerDefaultModelLabel')}
                        </Label>
                        <Input
                          id="cp-model"
                          value={customProviderForm.defaultModel}
                          onChange={(e) => setCustomProviderForm(prev => ({ ...prev, defaultModel: e.target.value }))}
                          placeholder={t('settings.providerDefaultModelPlaceholder')}
                          className="text-xs h-8"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <Label htmlFor="cp-desc" className="text-xs font-medium">
                          {t('settings.providerDescLabel')}
                        </Label>
                        <Input
                          id="cp-desc"
                          value={customProviderForm.description}
                          onChange={(e) => setCustomProviderForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={t('settings.providerDescPlaceholder')}
                          className="text-xs h-8"
                        />
                      </div>

                      {/* Toggles */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            {t('settings.statusActive')}
                          </span>
                          <Switch
                            checked={customProviderForm.enabled}
                            onChange={(e) => setCustomProviderForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            {t('settings.providerIsLocal')}
                          </span>
                          <Switch
                            checked={customProviderForm.isLocal}
                            onChange={(e) => setCustomProviderForm(prev => ({ ...prev, isLocal: e.target.checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            {t('settings.providerRequiresApiKey')}
                          </span>
                          <Switch
                            checked={customProviderForm.requiresApiKey}
                            onChange={(e) => setCustomProviderForm(prev => ({ ...prev, requiresApiKey: e.target.checked }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddProviderModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              {(selectedPresetId || editingCustomProvider) && (
                <button
                  type="button"
                  onClick={handleSaveCustomProvider}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('settings.saveAndActivate')}</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Custom Provider Confirmation Modal */}
      {deletingCustomProvider && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeletingCustomProvider(null);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {t('settings.deleteProviderConfirmTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.deleteProviderConfirmMsg', { name: deletingCustomProvider.name })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeletingCustomProvider(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomProviderConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('common.delete')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Prompt Templates Modal */}
      <PromptTemplatesModal
        isOpen={isPromptTemplatesModalOpen}
        onClose={() => setIsPromptTemplatesModalOpen(false)}
      />

      {/* Keyboard Shortcuts Central Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* User Persistent Memory Modal */}
      <UserMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => {
          setIsMemoryModalOpen(false);
          loadMemoryStats();
        }}
      />
    </div>
  );
}

export default Settings;

