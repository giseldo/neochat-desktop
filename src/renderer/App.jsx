import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import ThemeToggle from './components/ThemeToggle';
import PersonaSelector, { DEFAULT_PERSONAS, getStoredActivePersona, getStoredPersonas, ACTIVE_PERSONA_STORAGE_KEY } from './components/PersonaSelector';
import WelcomeScreen from './components/WelcomeScreen';
import { useChat } from './context/ChatContext';
import { useCanvas } from './context/CanvasContext';
import { useProjects } from './context/ProjectContext';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import { Settings, PanelLeftClose, PanelLeft, Radio, MessagesSquare, Sparkles, Store, Columns2, X, FolderKanban, BookOpen, Scale, Bot, Workflow, ChevronDown, Keyboard, Key, AlertCircle, PenSquare, Terminal, Folder, Briefcase, MessageSquare, Globe, Clock, Activity, LayoutGrid, MoreHorizontal, Brain, FolderTree } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { groupModels } from './lib/modelGrouping';
import { extractThinking } from './lib/messageUtils';
import { createStreamThrottler } from './lib/streamThrottler';
import { useAgentRuntime } from './hooks/useAgentRuntime';
import { useCompanionPanels } from './hooks/useCompanionPanels';
import { useToolsDropdown } from './hooks/useToolsDropdown';
import { getToolApprovalStatus, setToolApprovalStatus } from './services/toolApprovalService';
import { composeAgentSystemPrompt } from './utils/agentPrompt';
import { filterModels } from './utils/modelFilters';

// Lazy-loaded heavy panels & modals for maximum startup speed and memory efficiency
const ToolsPanel = lazy(() => import('./components/ToolsPanel'));
const ToolApprovalModal = lazy(() => import('./components/ToolApprovalModal'));
const ArtifactsPanel = lazy(() => import('./components/ArtifactsPanel'));
const CanvasPanel = lazy(() => import('./components/CanvasPanel'));
const WorkspaceExplorerPanel = lazy(() => import('./components/WorkspaceExplorerPanel'));
const McpCatalogModal = lazy(() => import('./components/McpCatalogModal'));
const ConversationStats = lazy(() => import('./components/ConversationStats'));
const TrajectoryView = lazy(() => import('./components/TrajectoryView'));
const ProjectModal = lazy(() => import('./components/ProjectModal'));
const MoveToProjectModal = lazy(() => import('./components/MoveToProjectModal'));
const KnowledgeBaseModal = lazy(() => import('./components/KnowledgeBaseModal'));
const CompareChatView = lazy(() => import('./components/CompareChatView'));
const WorkflowsModal = lazy(() => import('./components/WorkflowsModal'));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));
const TerminalPanel = lazy(() => import('./components/TerminalPanel'));
const BackgroundTasksPanel = lazy(() => import('./components/BackgroundTasksPanel'));
const BrowserPanel = lazy(() => import('./components/BrowserPanel'));
const CommandPaletteModal = lazy(() => import('./components/CommandPaletteModal'));
const SwarmTeamModal = lazy(() => import('./components/SwarmTeamModal'));
const SnipModal = lazy(() => import('./components/SnipModal'));
const PluginsManagerModal = lazy(() => import('./components/PluginsManagerModal'));
const ArenaModal = lazy(() => import('./components/ArenaModal'));
const LiveSandboxModal = lazy(() => import('./components/LiveSandboxModal'));
const PodcastStudioModal = lazy(() => import('./components/PodcastStudioModal'));
const KnowledgeGraphModal = lazy(() => import('./components/KnowledgeGraphModal'));
const DailyBriefingModal = lazy(() => import('./components/DailyBriefingModal'));
const McpHubModal = lazy(() => import('./components/McpHubModal'));
const ComputerVisionModal = lazy(() => import('./components/ComputerVisionModal'));
const UserMemoryModal = lazy(() => import('./components/UserMemoryModal'));
const SkillsModal = lazy(() => import('./components/SkillsModal'));

function App() {
  // const [messages, setMessages] = useState([]); // Remove local state
  const { 
    messages, 
    setMessages, 
    currentChatId,
    chatList,
    createNewChat, 
    loadChat,
    loadChatList,
    startFreshChat,
    clearCurrentChat,
    isSidebarCollapsed,
    toggleSidebar,
    needsTitleGeneration
  } = useChat(); // Use context state
  const {
    canvasDoc,
    isOpen: isCanvasOpen,
    openCanvas,
    closeCanvas,
    createNewDocument,
    loadChatCanvas,
    clearCanvas,
    selectedText
  } = useCanvas();
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    openCreateProjectModal,
    openEditProjectModal,
    isKnowledgeBaseModalOpen,
    openKnowledgeBaseModal,
    closeKnowledgeBaseModal
  } = useProjects();
  const { t } = useLanguage();
  const { chatWidth } = useTheme();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'trajectory'
  const [showTrajectoryTab, setShowTrajectoryTab] = useState(true);
  const [showWelcomeTips, setShowWelcomeTips] = useState(false);
  const [showWelcomeSuggestions, setShowWelcomeSuggestions] = useState(false);
  const [showButtonLabels, setShowButtonLabels] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState('user');
  const isPowerUser = interfaceMode === 'power';
  const [loading, setLoading] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [mcpServersStatus, setMcpServersStatus] = useState({ loading: false, message: "" });
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollingRef = useRef(false); // Immediate ref for preventing race conditions
  const lastScrollTopRef = useRef(0); // Tracks previous scrollTop to detect scroll direction
  const isProgrammaticScrollRef = useRef(false); // Flags programmatic scrolls vs user scroll
  const scrollThrottleRef = useRef(null); // For throttling scroll during streaming
  const rafRef = useRef(null); // For requestAnimationFrame during streaming
  // Store the list of models from capabilities keys
  // const models = Object.keys(MODEL_CONTEXT_SIZES).filter(key => key !== 'default'); // Old way
  const [modelConfigs, setModelConfigs] = useState({}); // State for model configurations
  const [models, setModels] = useState([]); // State for model list
  const [enabledModels, setEnabledModels] = useState([]); // State for enabled models list (strict opt-in)
  const [disabledModels, setDisabledModels] = useState([]); // State for disabled models list (legacy compatibility)
  const [favoriteModels, setFavoriteModels] = useState([]); // State for favorite models list

  // State for current model's vision capability
  const [visionSupported, setVisionSupported] = useState(false);
  // Add state to track if initial model/settings load is complete
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Track if using Responses API (needed for chat history compatibility)
  const [useResponsesApi, setUseResponsesApi] = useState(false);

  // --- State for Chat Input Focus ---
  const [chatFocusSignal, setChatFocusSignal] = useState(0);
  // --- End State for Chat Input Focus ---

  // --- State for Tool Approval Flow ---
  const [pendingApprovalCall, setPendingApprovalCall] = useState(null); // Holds the tool call object needing approval
  const [pausedChatState, setPausedChatState] = useState(null); // Holds { currentMessages, finalAssistantMessage, accumulatedResponses }
  // --- End Tool Approval State ---

  // --- Context Sharing State ---
  const [externalContext, setExternalContext] = useState(null);
  // --- End Context Sharing State ---

  // --- Persona, Artifacts & Catalog State ---
  const [activePersona, setActivePersona] = useState(() => getStoredActivePersona());
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isMcpCatalogOpen, setIsMcpCatalogOpen] = useState(false);
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSwarmModalOpen, setIsSwarmModalOpen] = useState(false);
  const [isAppSnipModalOpen, setIsAppSnipModalOpen] = useState(false);
  const [isPluginsManagerOpen, setIsPluginsManagerOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [skillsModalInitialTab, setSkillsModalInitialTab] = useState('installed');
  const [isArenaModalOpen, setIsArenaModalOpen] = useState(false);
  const [isLiveSandboxOpen, setIsLiveSandboxOpen] = useState(false);
  const [isPodcastStudioOpen, setIsPodcastStudioOpen] = useState(false);
  const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false);
  const [isDailyBriefingOpen, setIsDailyBriefingOpen] = useState(false);
  const [isMcpHubOpen, setIsMcpHubOpen] = useState(false);
  const [isComputerVisionOpen, setIsComputerVisionOpen] = useState(false);
  const { isToolsDropdownOpen, setIsToolsDropdownOpen, toolsDropdownRef } = useToolsDropdown();

  const handleOpenSkillsModal = useCallback((tab = 'installed') => {
    setSkillsModalInitialTab(tab);
    setIsSkillsModalOpen(true);
  }, []);

  const handleStartSnip = useCallback(() => {
    setIsAppSnipModalOpen(true);
  }, []);

  const handleExportChat = useCallback(async () => {
    if (!messages || messages.length === 0) return;
    const currentChat = chatList?.find(c => c.id === currentChatId);
    const title = currentChat?.title || 'conversa';
    const content = messages.map(m => `### ${m.role === 'user' ? 'Usuário' : 'Assistente'}\n\n${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}\n`).join('\n---\n\n');
    if (window.electron?.exportChatFile) {
      await window.electron.exportChatFile({ format: 'md', title, content });
    }
  }, [messages, chatList, currentChatId]);

  const handleToggleCanvas = useCallback(() => {
    if (isCanvasOpen) {
      closeCanvas();
    } else {
      if (activeArtifact) {
        setActiveArtifact(null);
      }
      if (canvasDoc) {
        openCanvas();
      } else {
        createNewDocument({
          title: t('canvas.defaultTitle') || 'Documento Sem Título',
          language: 'markdown',
          content: '',
          summary: 'Documento criado no Canvas'
        });
      }
    }
  }, [isCanvasOpen, canvasDoc, closeCanvas, openCanvas, createNewDocument, activeArtifact, t]);

  const handleToggleCodeInterpreter = useCallback(() => {
    if (activeArtifact) {
      setActiveArtifact(null);
    } else {
      if (isCanvasOpen) {
        closeCanvas();
      }
      setActiveArtifact({
        id: 'code_interpreter',
        title: t('header.codeInterpreter') || 'Interpretador de Código (Python / JS)',
        type: 'python',
        code: `# Interpretador de Código Python & JS\n# Pressione Ctrl+Enter ou clique em Executar para rodar\n\nprint("Hello, World!")\n`
      });
    }
  }, [activeArtifact, isCanvasOpen, closeCanvas, t]);

  useEffect(() => {
    if (activePersona?.id) {
      try {
        localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, activePersona.id);
      } catch (err) {
        console.error('Failed to persist active persona:', err);
      }
    } else if (activePersona === null) {
      try {
        localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, 'none');
      } catch (err) {
        console.error('Failed to persist active persona:', err);
      }
    }
  }, [activePersona]);
  // --- End Persona, Artifacts & Catalog State ---

  // --- Multi-Model Comparison State ---
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareModelA, setCompareModelA] = useState('');
  const [compareModelB, setCompareModelB] = useState('');
  const [streamStateA, setStreamStateA] = useState({ isLoading: false, content: '', reasoning: '', ttft: null, metrics: null, error: null });
  const [streamStateB, setStreamStateB] = useState({ isLoading: false, content: '', reasoning: '', ttft: null, metrics: null, error: null });
  // --- End Multi-Model Comparison State ---

  // --- User Persistent Long-Term Memory State ---
  const [isUserMemoryModalOpen, setIsUserMemoryModalOpen] = useState(false);
  const [memoryToast, setMemoryToast] = useState(null);

  useEffect(() => {
    if (!window.electron?.memory?.onMemoryUpdated) return;
    const cleanup = window.electron.memory.onMemoryUpdated((data) => {
      if (data?.action === 'added' && data.memory?.content) {
        setMemoryToast({
          type: 'added',
          message: data.memory.content,
          category: data.memory.category
        });
        setTimeout(() => setMemoryToast(null), 6000);
      } else if (data?.action === 'deleted' && data.forgottenMemory?.content) {
        setMemoryToast({
          type: 'deleted',
          message: data.forgottenMemory.content
        });
        setTimeout(() => setMemoryToast(null), 4000);
      }
    });
    return () => cleanup && cleanup();
  }, []);
  // --- End User Memory State ---

  // --- Autonomous Agent & Workspace State ---
  const [agentStep, setAgentStep] = useState(0);
  const [agentHarness, setAgentHarness] = useState('native');
  const [harnessMode, setHarnessMode] = useState(() => {
    try {
      const saved = localStorage.getItem('neochat_harness_mode');
      return saved === 'code' ? 'code' : 'chat';
    } catch (e) {
      return 'chat';
    }
  });
  const [workspacePath, setWorkspacePath] = useState(() => {
    try {
      return localStorage.getItem('neochat_workspace_path') || '';
    } catch (e) {
      return '';
    }
  });
  const [workspaceInfo, setWorkspaceInfo] = useState(null);

  useEffect(() => {
    if (workspacePath && window.electron?.agent?.getWorkspaceInfo) {
      window.electron.agent.getWorkspaceInfo(workspacePath)
        .then(info => setWorkspaceInfo(info))
        .catch(err => console.warn('Could not inspect workspace:', err));
    } else {
      setWorkspaceInfo(null);
    }
  }, [workspacePath]);

  const handleSelectWorkspace = useCallback(async () => {
    try {
      if (window.electron?.agent?.selectWorkspace) {
        const result = await window.electron.agent.selectWorkspace();
        if (result?.success && result.path) {
          setWorkspacePath(result.path);
          setWorkspaceInfo(result.info);
          try {
            localStorage.setItem('neochat_workspace_path', result.path);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error selecting workspace:', err);
    }
  }, []);

  const handleModeChange = useCallback((mode) => {
    setHarnessMode(mode);
    try {
      localStorage.setItem('neochat_harness_mode', mode);
      localStorage.setItem('neochat_agent_mode', String(mode === 'code'));
    } catch (e) {}
  }, []);

  const buildAgentSystemPrompt = useCallback(() => {
    return composeAgentSystemPrompt({ activeProject, activePersona, canvasDoc, selectedText });
  }, [activeProject, activePersona, canvasDoc, selectedText]);

  const { runAgent, cancelAgent, isRunning: isAgentRunning } = useAgentRuntime({
    setMessages,
    setLoading,
    setAgentStep,
    setPendingApprovalCall
  });
  // --- End Autonomous Agent & Workspace State ---

  // --- Terminal, Background Tasks & Browser Companion State ---
  const {
    isTerminalOpen, setIsTerminalOpen, isTerminalMaximized, setIsTerminalMaximized,
    isTasksOpen, setIsTasksOpen, isTasksMaximized, setIsTasksMaximized,
    isBrowserOpen, setIsBrowserOpen, isBrowserMaximized, setIsBrowserMaximized,
    isExplorerOpen, setIsExplorerOpen, isExplorerMaximized, setIsExplorerMaximized,
    runningTasksCount
  } = useCompanionPanels(setIsCommandPaletteOpen);
  // --- End Terminal, Tasks & Browser State ---

  // Open workspace file in Canvas side-by-side
  const handleOpenFileInCanvas = useCallback(async (filePath) => {
    try {
      if (!window.electron?.agent?.readWorkspaceFile) return;
      const res = await window.electron.agent.readWorkspaceFile(workspacePath, filePath);
      if (res?.success) {
        const ext = (res.extension || '').replace('.', '').toLowerCase();
        const langMap = {
          js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
          py: 'python', json: 'json', md: 'markdown', css: 'css', html: 'html',
          yml: 'yaml', yaml: 'yaml', toml: 'toml', sh: 'bash', ps1: 'powershell',
          sql: 'sql', c: 'c', cpp: 'cpp', rs: 'rust', go: 'go', php: 'php'
        };
        createNewDocument({
          title: res.name || filePath,
          language: langMap[ext] || ext || 'text',
          content: res.content,
          summary: `Arquivo aberto do workspace: ${res.relativePath || filePath}`
        });
      }
    } catch (err) {
      console.error('Error opening file in Canvas:', err);
    }
  }, [workspacePath, createNewDocument]);

  // Insert file reference into chat prompt
  const handleInsertPrompt = useCallback((filePath) => {
    if (!filePath) return;
    setPresetInputMessage(prev => {
      const ref = `@${filePath}`;
      return prev ? `${prev} ${ref} ` : `${ref} `;
    });
  }, []);

  // --- Preset Input Message State for Welcome suggestions ---
  const [presetInputMessage, setPresetInputMessage] = useState('');
  // --- End Preset Input Message State ---

  useEffect(() => {
    if (!isPowerUser) {
      setActiveTab('chat');
      setIsCompareMode(false);
      setIsToolsPanelOpen(false);
      setIsMcpCatalogOpen(false);
      setIsTerminalOpen(false);
      setIsTasksOpen(false);
      setIsBrowserOpen(false);
      setIsExplorerOpen(false);
      closeCanvas();
      setActiveArtifact(null);
    }
  }, [isPowerUser, closeCanvas]);

  const currentChatTitle = useMemo(() => {
    if (!currentChatId || !chatList) return '';
    const found = chatList.find(c => c.id === currentChatId);
    return found?.title || '';
  }, [currentChatId, chatList]);

  // --- Cancellation State ---
  const cancelledRef = useRef(false); // Track if current operation is cancelled
  const loadingRef = useRef(false); // Track loading state for cleanup
  // --- End Cancellation State ---

  const handleRemoveLastMessage = () => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      // Create a copy without the last message
      return prev.slice(0, prev.length - 1);
    });
  };

  // Handle reloading from a specific message (remove all messages after it and resend)
  const handleReloadFromMessage = async (messageIndex) => {
    // Find the last user message at or before the messageIndex
    let lastUserMessageIndex = -1;
    for (let i = messageIndex; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) {
      console.warn('No user message found to reload from');
      return;
    }

    // Get messages up to and including the last user message
    const messagesToKeep = messages.slice(0, lastUserMessageIndex + 1);
    
    // Reset messages to only include up to the last user message
    setMessages(messagesToKeep);

    // Reset cancellation flag
    cancelledRef.current = false;
    
    // Reset user scrolling flag
    userScrollingRef.current = false;
    setIsUserScrolling(false);

    setLoading(true);

    let currentApiMessages = messagesToKeep;
    let conversationStatus = 'processing';

    let toolIterationsCount = 0;
    const MAX_TOOL_ITERATIONS = 12;

    try {
        while (conversationStatus === 'processing' || conversationStatus === 'completed_with_tools') {
            if (conversationStatus === 'completed_with_tools') {
                toolIterationsCount++;
                if (toolIterationsCount >= MAX_TOOL_ITERATIONS) {
                    console.warn(`[Frontend] Maximum tool iterations (${MAX_TOOL_ITERATIONS}) reached in reload. Stopping.`);
                    break;
                }
            }

            const { status, assistantMessage, toolResponseMessages } = await executeChatTurn(currentApiMessages);

            conversationStatus = status;

            if (status === 'paused') {
                break;
            } else if (status === 'cancelled') {
                console.log('Conversation cancelled by user');
                break;
            } else if (status === 'error') {
                break;
            } else if (status === 'completed_with_tools') {
                if (assistantMessage && toolResponseMessages.length > 0) {
                    const formattedToolResponses = toolResponseMessages.map(msg => ({
                        role: 'tool',
                        content: msg.content,
                        tool_call_id: msg.tool_call_id
                    }));
                    currentApiMessages = [
                        ...currentApiMessages,
                        {
                          role: assistantMessage.role,
                          content: assistantMessage.content,
                          tool_calls: assistantMessage.tool_calls
                        },
                        ...formattedToolResponses
                    ];
                } else {
                    console.warn("Status 'completed_with_tools' but no assistant message or tool responses found.");
                    conversationStatus = 'error';
                    break;
                }
            } else if (status === 'completed_no_tools') {
                break;
            }
        }
    } catch (error) {
        console.error('Error in handleReloadFromMessage:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        conversationStatus = 'error';
    } finally {
        if (conversationStatus !== 'paused') {
            setLoading(false);
        }
    }
  };
  
  // Models list derived from capabilities keys
  // const models = Object.keys(MODEL_CAPABILITIES).filter(key => key !== 'default');

  // Sort and group models by provider/category and display name
  // and apply model filter if configured
  const sortedModels = useMemo(() => {
    // Strict opt-in: filter using enabledModels (with fallback to disabledModels if not set)
    const filteredModels = filterModels(models, modelConfigs, enabledModels?.length > 0 ? enabledModels : { enabledModels, disabledModels });
    
    // Group and sort models logically by group and display name
    const groups = groupModels(filteredModels, modelConfigs);
    return groups.flatMap(g => g.models);
  }, [models, modelConfigs, enabledModels, disabledModels]);

  // Initialize compare models when sortedModels change
  useEffect(() => {
    if (sortedModels.length > 0) {
      if (!compareModelA) setCompareModelA(sortedModels[0]);
      if (!compareModelB) setCompareModelB(sortedModels[1] || sortedModels[0]);
    }
  }, [sortedModels]);

  const persistChatMessages = async (chatId, msgs) => {
    if (!chatId || !msgs) return;
    try {
      const fn = window.electron?.chatHistory?.updateMessages || window.electron?.chatHistory?.saveMessages;
      if (typeof fn === 'function') {
        await fn(chatId, msgs);
      }
    } catch (e) {
      console.warn('Failed to persist chat messages:', e);
    }
  };

  const handleSelectWinningResponse = async (winningContent, winningModel) => {
    const assistantMsg = {
      role: 'assistant',
      content: winningContent,
      model: winningModel,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    const updated = [...messages, assistantMsg];
    setMessages(updated);
    if (currentChatId) {
      await persistChatMessages(currentChatId, updated);
    }
    setIsCompareMode(false);
  };

  // Function to update the server status display - moved outside useEffect
  const updateServerStatus = (tools, settings) => {
    try {
      // Get number of configured servers
      if (settings && settings.mcpServers) {
        const configuredCount = Object.keys(settings.mcpServers).length;
        
        // Get unique server IDs from the tools
        const connectedServerIds = new Set();
        if (Array.isArray(tools)) {
          tools.forEach(tool => {
            if (tool && tool.serverId) {
              connectedServerIds.add(tool.serverId);
            }
          });
        }
        const connectedCount = connectedServerIds.size;
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        
        if (configuredCount > 0) {
          if (connectedCount === configuredCount) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else if (connectedCount > 0) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, No MCP servers connected (${configuredCount} configured)` 
            });
          }
        } else {
          setMcpServersStatus({ loading: false, message: `${toolCount} tools, No MCP servers configured` });
        }
      } else {
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        setMcpServersStatus({ loading: false, message: `${toolCount} tools available` });
      }
    } catch (error) {
      console.error('Error updating server status:', error);
      setMcpServersStatus({ loading: false, message: "Error updating server status" });
    }
  };

  // Load settings, MCP tools, and model configs when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Set loading status
        setMcpServersStatus({ loading: true, message: "Connecting to MCP servers..." });

        // Load model configurations first
        const configs = await window.electron.getModelConfigs(); // Await configs
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels); // Set models list

        // THEN Load settings
        const settings = await window.electron.getSettings(); // Await settings
        setInterfaceMode(settings.interfaceMode === 'power' ? 'power' : 'user');
        setAgentHarness(settings.agentHarness === 'pi' ? 'pi' : 'native');
        setShowTrajectoryTab(settings.showTrajectoryTab !== false);
        setShowWelcomeTips(settings.showWelcomeTips === true);
        setShowWelcomeSuggestions(settings.showWelcomeSuggestions === true);
        setShowButtonLabels(settings.showButtonLabels === true);
        setEnabledModels(settings.enabledModels || []);
        setDisabledModels(settings.disabledModels || []);
        setFavoriteModels(settings.favoriteModels || []);
        // Load useResponsesApi setting
        setUseResponsesApi(settings.useResponsesApi || false);

        // Strict opt-in: filter available models by enabledModels
        const activeModels = filterModels(availableModels, configs, settings.enabledModels || []);
        const validCandidates = activeModels.length > 0 ? activeModels : availableModels;
        let effectiveModel = validCandidates.length > 0 ? validCandidates[0] : 'default';

        const isInvalidChatModel = (m) => !m || m.includes('canopylabs') || m.includes('orpheus');

        if (settings && settings.model) {
            // Ensure the saved model is still valid against the loaded configs and is active
            const isSavedModelActive = activeModels.includes(settings.model) || (configs[settings.model]?.rawModelId && activeModels.includes(configs[settings.model].rawModelId));
            if (configs[settings.model] && !isInvalidChatModel(settings.model) && isSavedModelActive) {
                effectiveModel = settings.model;
            } else {
                // Try finding matching active model
                const matchingKey = validCandidates.find(k =>
                  (k === settings.model ||
                  configs[k]?.rawModelId === settings.model ||
                  k.endsWith(`::${settings.model}`)) && !isInvalidChatModel(k)
                );
                if (matchingKey) {
                  effectiveModel = matchingKey;
                } else if (validCandidates.length > 0) {
                  const fallback = validCandidates.find(m => m.includes('llama-3.3-70b') || m.includes('llama-3.1-70b') || m.includes('gpt')) || validCandidates[0];
                  effectiveModel = fallback;
                  console.warn(`Saved model "${settings.model}" inactive or not found. Falling back to ${effectiveModel}.`);
                }
            }
        } else if (validCandidates.length > 0) {
            const fallback = validCandidates.find(m => m.includes('llama-3.3-70b') || m.includes('llama-3.1-70b') || m.includes('gpt')) || validCandidates[0];
            effectiveModel = fallback;
        }

        setSelectedModel(effectiveModel); // Set the final selected model state


        // Initial load of MCP tools (can happen after model/settings)
        const mcpToolsResult = await window.electron.getMcpTools();
        // Use the already loaded settings object here for initial status update
        if (mcpToolsResult && mcpToolsResult.tools) {
          setMcpTools(mcpToolsResult.tools);
          updateServerStatus(mcpToolsResult.tools, settings); // Pass loaded settings
        } else {
           // Handle case where no tools are found initially, but update status
          updateServerStatus([], settings);
        }

        // Set up event listener for MCP server status changes
        const removeListener = window.electron.onMcpServerStatusChanged((data) => {
          if (data && data.tools !== undefined) { // Check if tools property exists
            setMcpTools(data.tools);
            // Fetch latest settings again when status changes, as they might have been updated
            window.electron.getSettings().then(currentSettings => {
              updateServerStatus(data.tools, currentSettings);
            }).catch(err => {
                console.error("Error fetching settings for status update:", err);
                // Fallback to updating status without settings info
                updateServerStatus(data.tools, null);
            });
          }
        });

        // Clean up the event listener when component unmounts
        return () => {
          if (removeListener) removeListener();
        };
      } catch (error) {
        console.error('Error loading initial data:', error);
        setMcpServersStatus({ loading: false, message: "Error loading initial data" });
      } finally {
          // Mark initial load as complete regardless of success/failure
          setInitialLoadComplete(true);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Reload settings when window gains focus (in case settings changed)
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const settings = await window.electron.getSettings();
        setInterfaceMode(settings.interfaceMode === 'power' ? 'power' : 'user');
        const trajectoryEnabled = settings.showTrajectoryTab !== false;
        setShowTrajectoryTab(trajectoryEnabled);
        setShowWelcomeTips(settings.showWelcomeTips === true);
        setShowWelcomeSuggestions(settings.showWelcomeSuggestions === true);
        setShowButtonLabels(settings.showButtonLabels === true);
        if (!trajectoryEnabled) {
          setActiveTab('chat');
        }
        setEnabledModels(settings.enabledModels || []);
        setDisabledModels(settings.disabledModels || []);
        setFavoriteModels(settings.favoriteModels || []);
        setUseResponsesApi(settings.useResponsesApi || false);

        // Refresh model configs (e.g., after switching provider in Settings).
        // The main process force-refetches models when the provider/key changed.
        const configs = await window.electron.getModelConfigs();
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels);

        const activeModels = filterModels(availableModels, configs, settings.enabledModels || []);
        const validCandidates = activeModels.length > 0 ? activeModels : availableModels;

        // If the currently selected model is no longer active, fallback to an active one
        const isInvalidChatModel = (m) => !m || m.includes('canopylabs') || m.includes('orpheus');
        const isSelectedActive = activeModels.includes(selectedModel) || (configs[selectedModel]?.rawModelId && activeModels.includes(configs[selectedModel].rawModelId));

        if (validCandidates.length > 0 && selectedModel && (!configs[selectedModel] || isInvalidChatModel(selectedModel) || !isSelectedActive)) {
          const matchingKey = validCandidates.find(k =>
            (k === selectedModel ||
            configs[k]?.rawModelId === selectedModel ||
            k.endsWith(`::${selectedModel}`)) && !isInvalidChatModel(k)
          );
          if (matchingKey) {
            setSelectedModel(matchingKey);
          } else {
            const fallback = validCandidates.find(m => m.includes('llama-3.3-70b') || m.includes('llama-3.1-70b') || m.includes('gpt')) || validCandidates[0];
            setSelectedModel(fallback);
          }
        }
      } catch (error) {
        console.error('Error reloading settings:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedModel]);

  // Save model selection to settings when it changes, ONLY after initial load
  useEffect(() => {
    // Prevent saving during initial setup before models/settings are loaded/validated
    if (!initialLoadComplete) {
        return;
    }

    // Also ensure models list isn't empty and selectedModel is valid
    if (models.length === 0 || !selectedModel) {
        console.warn("Skipping model save: Models not loaded or no model selected.");
        return;
    }

    const saveModelSelection = async () => {
      try {
        console.log(`Attempting to save selected model: ${selectedModel}`); // Debug log
        const settings = await window.electron.getSettings();
        // Check if the model actually changed before saving
        if (settings.model !== selectedModel) {
            console.log(`Saving new model selection: ${selectedModel}`);
            await window.electron.saveSettings({ ...settings, model: selectedModel });
        } else {
            // console.log("Model selection hasn't changed, skipping save."); // Optional: Log skips
        }
      } catch (error) {
        console.error('Error saving model selection:', error);
      }
    };

    saveModelSelection();
    // Depend on initialLoadComplete as well to trigger after load finishes
  }, [selectedModel, initialLoadComplete, models]);

  // Callback when model parameters / context size are updated via ModelParametersModal
  const handleModelConfigUpdated = useCallback(async (modelId, newConfig) => {
    try {
      const updatedConfigs = await window.electron.getModelConfigs();
      setModelConfigs(updatedConfigs);
    } catch (error) {
      console.error('Error refreshing model configs after update:', error);
      if (modelId && newConfig) {
        setModelConfigs(prev => ({
          ...prev,
          [modelId]: { ...prev[modelId], ...newConfig }
        }));
      }
    }
  }, []);

  // Callback to toggle favorite model
  const handleToggleFavoriteModel = useCallback(async (modelId) => {
    try {
      const currentSettings = await window.electron.getSettings();
      const currentFavorites = Array.isArray(currentSettings.favoriteModels) ? currentSettings.favoriteModels : [];
      const cfg = modelConfigs[modelId];
      const rawId = cfg?.rawModelId;
      const isFav = currentFavorites.includes(modelId) || (rawId && currentFavorites.includes(rawId));

      let updatedFavorites;
      if (isFav) {
        updatedFavorites = currentFavorites.filter(id => id !== modelId && id !== rawId);
      } else {
        updatedFavorites = [...currentFavorites, modelId];
      }

      setFavoriteModels(updatedFavorites);
      await window.electron.saveSettings({
        ...currentSettings,
        favoriteModels: updatedFavorites
      });
    } catch (err) {
      console.error('Error toggling favorite model:', err);
    }
  }, [modelConfigs]);

  // Callback to toggle interfaceMode (user / power) from Quick Menu
  const handleInterfaceModeChange = useCallback(async (newMode) => {
    const validMode = newMode === 'power' ? 'power' : 'user';
    setInterfaceMode(validMode);
    try {
      const currentSettings = await window.electron.getSettings();
      await window.electron.saveSettings({
        ...currentSettings,
        interfaceMode: validMode
      });
    } catch (error) {
      console.error('Error saving interfaceMode from quick menu:', error);
    }
  }, []);

  // Callback to toggle agentHarness (native / pi) from Top Bar
  const handleAgentHarnessChange = useCallback(async (newHarness) => {
    const validHarness = newHarness === 'pi' ? 'pi' : 'native';
    setAgentHarness(validHarness);
    try {
      if (window.electron?.saveSettings) {
        const currentSettings = await window.electron.getSettings();
        await window.electron.saveSettings({
          ...currentSettings,
          agentHarness: validHarness
        });
      }
    } catch (error) {
      console.error('Error saving agentHarness from top bar:', error);
    }
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    if (userScrollingRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    isProgrammaticScrollRef.current = true;

    if (instant) {
      container.scrollTop = container.scrollHeight;
      lastScrollTopRef.current = container.scrollTop;
      requestAnimationFrame(() => {
        if (container) {
          lastScrollTopRef.current = container.scrollTop;
        }
        isProgrammaticScrollRef.current = false;
      });
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      setTimeout(() => {
        if (container) {
          lastScrollTopRef.current = container.scrollTop;
        }
        isProgrammaticScrollRef.current = false;
      }, 350);
    }
  }, []);

  // Handle scroll and wheel events to detect when user manually scrolls
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const cancelPendingAutoScroll = () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
        scrollThrottleRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const { scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight;
      const prevScrollTop = lastScrollTopRef.current;
      lastScrollTopRef.current = currentScrollTop;

      if (isProgrammaticScrollRef.current) {
        return;
      }

      // If user scrolled up (scrollTop decreased by more than 1px)
      if (currentScrollTop < prevScrollTop - 1) {
        userScrollingRef.current = true;
        setIsUserScrolling(true);
        cancelPendingAutoScroll();
      }
      // If user scrolled down and is at/near the bottom (within 30px)
      else if (distanceFromBottom <= 30) {
        userScrollingRef.current = false;
        setIsUserScrolling(false);
      }
    };

    // Detect scroll wheel intent immediately (before scroll position changes)
    const handleWheel = (e) => {
      if (e.deltaY < 0) {
        // Any wheel UP immediately disables auto-scroll
        userScrollingRef.current = true;
        setIsUserScrolling(true);
        cancelPendingAutoScroll();
      } else if (e.deltaY > 0) {
        // Wheel DOWN: check if near bottom to resume auto-scroll
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom <= 30) {
          userScrollingRef.current = false;
          setIsUserScrolling(false);
        }
      }
    };

    const handleTouchStart = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom > 30) {
        userScrollingRef.current = true;
        setIsUserScrolling(true);
        cancelPendingAutoScroll();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // When switching chats, reset user scrolling and scroll to bottom
  useEffect(() => {
    userScrollingRef.current = false;
    setIsUserScrolling(false);
    const timer = setTimeout(() => {
      scrollToBottom(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentChatId, scrollToBottom]);

  // Auto-scroll to bottom when messages change, but only if user hasn't scrolled up
  useEffect(() => {
    // Check both state and ref for maximum responsiveness
    if (!isUserScrolling && !userScrollingRef.current) {
      // Check if any message is actively streaming
      const isStreaming = messages.some(msg => msg.isStreaming === true);
      
      if (isStreaming) {
        // Use requestAnimationFrame for smooth scrolling aligned with browser rendering
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        if (scrollThrottleRef.current) {
          clearTimeout(scrollThrottleRef.current);
        }
        
        // Throttle with rAF for optimal performance
        scrollThrottleRef.current = setTimeout(() => {
          rafRef.current = requestAnimationFrame(() => {
            scrollToBottom(true); // instant scroll
            rafRef.current = null;
          });
          scrollThrottleRef.current = null;
        }, 50);
      } else {
        // Clear any pending throttled scroll and rAF
        if (scrollThrottleRef.current) {
          clearTimeout(scrollThrottleRef.current);
          scrollThrottleRef.current = null;
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        // Non-streaming: scroll smoothly immediately
        scrollToBottom(false);
      }
    }
    
    // Cleanup function
    return () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [messages, isUserScrolling, scrollToBottom]);

  const executeToolCall = async (toolCall) => {
    const startTime = Date.now();
    try {
      const response = await window.electron.executeToolCall(toolCall);
      const durationMs = Date.now() - startTime;
      
      // If a canvas document was created or updated, synchronize CanvasContext and open panel
      if (response.canvasData?.document) {
        openCanvas(response.canvasData.document);
      } else if (response.result && toolCall.function?.name?.startsWith('canvas_')) {
        try {
          const parsed = JSON.parse(response.result);
          if (parsed.document) {
            openCanvas(parsed.document);
          }
        } catch (e) {}
      }

      // Return the tool response message in the correct format
      return {
        role: 'tool',
        content: response.error ? JSON.stringify({ error: response.error }) : (response.result || ''),
        tool_call_id: toolCall.id,
        durationMs,
        status: response.error ? 'error' : 'completed',
        error: response.error || null,
        createdAt: new Date().toISOString(),
        timestamp: startTime
      };
    } catch (error) {
      console.error('Error executing tool call:', error);
      const durationMs = Date.now() - startTime;
      return { 
        role: 'tool', 
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id,
        durationMs,
        status: 'error',
        error: error.message,
        createdAt: new Date().toISOString(),
        timestamp: startTime
      };
    }
  };

  // Refactored processToolCalls to handle sequential checking and pausing
  const processToolCalls = async (assistantMessage, currentMessagesBeforeAssistant) => {
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return { status: 'completed', toolResponseMessages: [] };
    }

    const toolResponseMessages = [];
    let needsPause = false;

    for (const toolCall of assistantMessage.tool_calls) {
      // Check if operation was cancelled
      if (cancelledRef.current) {
        console.log('Tool execution cancelled by user');
        return { status: 'cancelled', toolResponseMessages };
      }

      // Skip remote MCP tool calls - they are executed server-side by Groq
      // and their results are already handled via pre_calculated_tool_responses
      // Remote MCP tools have server_label set (mcp_call events set this in chatHandler)
      const toolName = toolCall.function.name;
      if (toolCall.server_label) {
        console.log(`Tool '${toolName}' is a remote MCP tool (server: ${toolCall.server_label}). Skipping client-side execution.`);
        continue;
      }

      const approvalStatus = await getToolApprovalStatus(toolName, toolCall.server_label);

      if (approvalStatus === 'allow' || approvalStatus === 'always' || approvalStatus === 'yolo') {
        console.log(`Tool '${toolName}' automatically approved (${approvalStatus}). Executing...`);
        try {
          // Check again before executing (in case cancelled during previous tool execution)
          if (cancelledRef.current) {
            console.log('Tool execution cancelled by user before executing tool');
            return { status: 'cancelled', toolResponseMessages };
          }
          
          const resultMsg = await executeToolCall(toolCall);
          
          // Check again after execution completes
          if (cancelledRef.current) {
            console.log('Tool execution cancelled by user after tool completed');
            return { status: 'cancelled', toolResponseMessages };
          }
          
          toolResponseMessages.push(resultMsg);
          // Update UI immediately for executed tool calls
          setMessages(prev => [...prev, resultMsg]);
        } catch (error) {
            console.error(`Error executing automatically approved tool call '${toolName}':`, error);
            const errorMsg = {
                role: 'tool',
                content: JSON.stringify({ error: `Error executing tool '${toolName}': ${error.message}` }),
                tool_call_id: toolCall.id
            };
            toolResponseMessages.push(errorMsg);
           setMessages(prev => [...prev, errorMsg]); // Show error in UI
        }
      } else if (approvalStatus === 'deny') {
        const deniedMsg = { role: 'tool', content: JSON.stringify({ error: `Tool '${toolName}' blocked by permission policy.` }), tool_call_id: toolCall.id };
        toolResponseMessages.push(deniedMsg);
        setMessages(prev => [...prev, deniedMsg]);
      } else { // status === 'prompt'
        console.log(`Tool '${toolName}' requires user approval.`);
        setPendingApprovalCall(toolCall);
        setPausedChatState({
          currentMessages: currentMessagesBeforeAssistant, // History before this assistant message
          finalAssistantMessage: assistantMessage,
          accumulatedResponses: toolResponseMessages // Responses gathered *before* this pause
        });
        needsPause = true;
        break; // Stop processing further tools for this turn
      }
    }

    if (needsPause) {
      return { status: 'paused', toolResponseMessages };
    } else {
      return { status: 'completed', toolResponseMessages };
    }
  };

  // Update vision support when selectedModel or modelConfigs changes
  useEffect(() => {
    if (modelConfigs && selectedModel && modelConfigs[selectedModel]) {
      const capabilities = modelConfigs[selectedModel] || modelConfigs['default'];
      setVisionSupported(capabilities.vision_supported);
    } else {
      // Handle case where configs aren't loaded yet or model is invalid
      setVisionSupported(false);
    }
  }, [selectedModel, modelConfigs]);

  // Function to stop the ongoing generation
  const handleStopGeneration = async () => {
    console.log('Stopping generation...');
    cancelledRef.current = true; // Set cancellation flag
    const cancelledAgent = await cancelAgent();
    if (!cancelledAgent) window.electron.stopChatStream();
    setLoading(false); // Immediately set loading to false
    // Clear any pending tool approval state
    setPendingApprovalCall(null);
    setPausedChatState(null);
  };

  // Keep loadingRef in sync with loading state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Cleanup function to stop any active streams when component unmounts (page reload/navigation/HMR)
  useEffect(() => {
    return () => {
      // Always clean up IPC listeners on unmount (important for HMR)
      console.log('Component unmounting, cleaning up...');
      
      // Clean up chat stream listeners to prevent duplicates on HMR
      if (window.electron.cleanupChatStreamListeners) {
        window.electron.cleanupChatStreamListeners();
      }
      
      // Stop any active streams when the component actually unmounts
      if (loadingRef.current) {
        console.log('Stopping active streams...');
        cancelledRef.current = true;
        window.electron.stopChatStream();
      }
    };
  }, []); // Empty dependency array - only run on actual mount/unmount

  // Revert the last file change made by the autonomous agent
  const handleRollback = async () => {
    try {
      if (window.electron?.agent?.rollback) {
        const result = await window.electron.agent.rollback(currentChatId || 'default');
        if (result?.success) {
          alert(t('chat.agentRollbackSuccess') || `Restored file: ${result.revertedFile}`);
        } else {
          alert(result?.error || t('chat.agentRollbackError', { error: 'No checkpoints available' }));
        }
      }
    } catch (err) {
      console.error('Error rolling back agent action:', err);
      alert(`Rollback error: ${err.message}`);
    }
  };

  // Core function to execute a chat turn (fetch response, handle tools)
  // Refactored from the main loop of handleSendMessage
  const executeChatTurn = async (turnMessages) => {
    let currentTurnStatus = 'processing'; // processing, completed, paused, error
    let turnAssistantMessage = null;
    let turnToolResponses = [];
    const turnStartTime = Date.now();

    try {
        // Prepare messages to send, including active project instructions and active persona system prompt if defined
        let messagesToSend = [...turnMessages];
        const systemParts = [];
        const injectedParts = [];

        if (activeProject?.customPrompt && activeProject.customPrompt.trim()) {
            const projectText = `[Instruções do Projeto "${activeProject.name}"]:\n${activeProject.customPrompt.trim()}`;
            systemParts.push(projectText);
            injectedParts.push({
                type: 'project',
                title: activeProject.name,
                content: activeProject.customPrompt.trim(),
                raw: projectText
            });
        }
        if (activePersona?.systemPrompt && activePersona.systemPrompt.trim()) {
            const personaName = activePersona.name || (activePersona.nameKey ? t(activePersona.nameKey) : activePersona.id);
            const personaText = activePersona.systemPrompt.trim();
            systemParts.push(personaText);
            injectedParts.push({
                type: 'persona',
                title: personaName,
                content: personaText,
                raw: personaText
            });
        }
        if (workspaceInfo?.agentsDoc?.content) {
            const docName = workspaceInfo.agentsDoc.filename || 'AGENTS.md';
            const wText = `[Regras do Workspace / ${docName}]:\n${workspaceInfo.agentsDoc.content.trim()}`;
            systemParts.push(wText);
            injectedParts.push({
                type: 'workspace',
                title: `${docName} (${workspaceInfo.name || 'Workspace'})`,
                content: workspaceInfo.agentsDoc.content.trim(),
                raw: wText
            });
        } else if (workspaceInfo?.readmeDoc?.content) {
            const wText = `[README do Workspace]:\n${workspaceInfo.readmeDoc.content.trim()}`;
            systemParts.push(wText);
            injectedParts.push({
                type: 'workspace',
                title: `README (${workspaceInfo.name || 'Workspace'})`,
                content: workspaceInfo.readmeDoc.content.trim(),
                raw: wText
            });
        }
        if (harnessMode === 'code') {
            const harnessText = `[Diretrizes do Coding Agent Harness]:\nAcesso autônomo a ferramentas de arquivos ('read_file', 'write_file', 'edit_file', 'list_directory', 'glob_search', 'grep_search'), terminal ('shell_exec') e Git ('git_status', 'git_diff', 'git_commit'). Diretório raiz: "${workspacePath || 'Workspace'}".`;
            systemParts.push(harnessText);
            injectedParts.push({
                type: 'harness',
                title: 'Coding Agent Harness (Filesystem & Terminal)',
                content: harnessText,
                raw: harnessText
            });
        }
        if (canvasDoc && canvasDoc.content) {
            let canvasContextPrompt = `[Documento Canvas Ativo no Espaço de Trabalho]:\nTítulo: "${canvasDoc.title}" (v${canvasDoc.version || 1}, formato: ${canvasDoc.language || 'markdown'})\nTotal de Palavras: ${canvasDoc.stats?.words || 0}\n`;
            if (selectedText) {
                canvasContextPrompt += `Trecho Selecionado pelo Usuário no Canvas:\n"""\n${selectedText}\n"""\n`;
            }
            canvasContextPrompt += `Conteúdo do Documento no Canvas:\n\`\`\`${canvasDoc.language || ''}\n${canvasDoc.content}\n\`\`\``;
            systemParts.push(canvasContextPrompt);
            injectedParts.push({
                type: 'canvas',
                title: `${canvasDoc.title} (v${canvasDoc.version || 1})`,
                content: canvasDoc.content,
                selectedText: selectedText || null,
                raw: canvasContextPrompt
            });
        }

        const existingSystem = messagesToSend.find(m => m.role === 'system');
        if (existingSystem) {
            injectedParts.unshift({
                type: 'system',
                title: 'System Prompt',
                content: typeof existingSystem.content === 'string' ? existingSystem.content : JSON.stringify(existingSystem.content),
                raw: typeof existingSystem.content === 'string' ? existingSystem.content : JSON.stringify(existingSystem.content)
            });
        }

        if (systemParts.length > 0 && !existingSystem) {
            messagesToSend = [{ role: 'system', content: systemParts.join('\n\n') }, ...messagesToSend];
        }

        const turnInjectedContext = (systemParts.length > 0 || injectedParts.length > 0) ? {
            systemPrompt: systemParts.join('\n\n') || (existingSystem ? (typeof existingSystem.content === 'string' ? existingSystem.content : JSON.stringify(existingSystem.content)) : ''),
            parts: injectedParts,
            timestamp: turnStartTime
        } : null;

        // Create a streaming assistant message placeholder
        const assistantPlaceholder = {
            role: 'assistant',
            content: '',
            isStreaming: true,
            reasoningSummaries: [],
            timestamp: turnStartTime,
            createdAt: new Date().toISOString(),
            injectedContext: turnInjectedContext
        };
        setMessages(prev => [...prev, assistantPlaceholder]);

        // Start streaming chat with active runtime context (Canvas, Project, Workspace, etc.)
        const streamOptions = {
            isCanvasOpen: Boolean(isCanvasOpen),
            canvasDoc: isCanvasOpen && canvasDoc ? canvasDoc : null,
            canvasEnabled: harnessMode === 'code' ? true : Boolean(isCanvasOpen),
            selectedCanvasText: isCanvasOpen ? selectedText : '',
            activeProject: activeProject ? { id: activeProject.id, name: activeProject.name, folders: activeProject.folders } : null,
            agentModeActive: harnessMode === 'code',
            mode: harnessMode,
            workspaceRoot: workspacePath || undefined
        };
        const streamHandler = window.electron.startChatStream(messagesToSend, selectedModel, streamOptions);

        // Collect the final message data
        let finalAssistantData = {
            role: 'assistant',
            content: '',
            tool_calls: undefined,
            reasoning: undefined,
            executed_tools: undefined,
            liveReasoning: '',
            liveExecutedTools: [],
            reasoningSummaries: [],
            reasoningStartTime: null,
            reasoningDuration: null,
            pre_calculated_tool_responses: undefined,
            injectedContext: turnInjectedContext
        };

        // Setup event handlers for streaming
        const streamThrottler = createStreamThrottler((latestState) => {
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { 
                        ...newMessages[idx], 
                        content: latestState.content,
                        reasoningDuration: latestState.reasoningDuration,
                        liveReasoning: latestState.liveReasoning,
                        reasoningSummaries: [...latestState.reasoningSummaries]
                    };
                }
                return newMessages;
            });
        }, 16);

        streamHandler.onStart(() => { /* Placeholder exists */ });

        streamHandler.onContent(({ content }) => {
            finalAssistantData.content += content;
            
            // Check if thinking tag is detected in streaming content
            const thinkResult = extractThinking(finalAssistantData.content);
            if (thinkResult.hasThink && !finalAssistantData.reasoningStartTime) {
                finalAssistantData.reasoningStartTime = Date.now();
            }

            // If we have a reasoning start time and reasoning duration isn't set yet:
            // Mark complete if think tag has closed and content started, or if regular content without think
            if (finalAssistantData.reasoningStartTime && !finalAssistantData.reasoningDuration) {
                if (thinkResult.hasThink && !thinkResult.isStreamingThink && thinkResult.cleanContent.length > 0) {
                    finalAssistantData.reasoningDuration = Math.round((Date.now() - finalAssistantData.reasoningStartTime) / 1000);
                } else if (!thinkResult.hasThink && finalAssistantData.content === content) {
                    finalAssistantData.reasoningDuration = Math.round((Date.now() - finalAssistantData.reasoningStartTime) / 1000);
                }
            }
            
            streamThrottler.push({
                content: finalAssistantData.content,
                reasoningDuration: finalAssistantData.reasoningDuration,
                liveReasoning: finalAssistantData.liveReasoning,
                reasoningSummaries: finalAssistantData.reasoningSummaries
            });
        });

        streamHandler.onToolCalls(({ tool_calls }) => {
            streamThrottler.flush();
            finalAssistantData.tool_calls = tool_calls;
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { ...newMessages[idx], tool_calls: finalAssistantData.tool_calls };
                }
                return newMessages;
            });
        });

        // Handle compound-beta reasoning streaming
        streamHandler.onReasoning(({ reasoning, accumulated }) => {
            // Track when reasoning starts and add initial "Thinking" placeholder
            if (!finalAssistantData.reasoningStartTime) {
                finalAssistantData.reasoningStartTime = Date.now();
                
                // Add initial "Thinking" placeholder if no summaries yet
                if (finalAssistantData.reasoningSummaries.length === 0) {
                    finalAssistantData.reasoningSummaries.push({ index: 0, summary: 'Thinking', isPlaceholder: true });
                }
            }
            
            finalAssistantData.liveReasoning = accumulated;
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { 
                        ...newMessages[idx], 
                        liveReasoning: accumulated,
                        reasoningSummaries: [...finalAssistantData.reasoningSummaries]
                    };
                }
                return newMessages;
            });
        });

        // Handle reasoning summaries
        streamHandler.onReasoningSummary(({ streamId, summaryIndex, summary }) => {
            // Remove the placeholder "Thinking" when first real summary arrives
            if (finalAssistantData.reasoningSummaries.length > 0 && 
                finalAssistantData.reasoningSummaries[0].isPlaceholder) {
                finalAssistantData.reasoningSummaries.shift();
            }
            
            finalAssistantData.reasoningSummaries.push({ index: summaryIndex, summary });
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { 
                        ...newMessages[idx], 
                        reasoningSummaries: [...finalAssistantData.reasoningSummaries] 
                    };
                }
                return newMessages;
            });
        });

        // Handle MCP approval requests (remote MCP tools requiring user approval)
        streamHandler.onMcpApprovalRequest((approvalRequest) => {
            // MCP approval request received during streaming
            // Store in finalAssistantData to be processed after stream completes
            if (!finalAssistantData.mcpApprovalRequests) {
                finalAssistantData.mcpApprovalRequests = [];
            }
            finalAssistantData.mcpApprovalRequests.push({
                ...approvalRequest,
                type: 'mcp_approval_request' // Mark type for handleToolApproval
            });
        });

        // Handle compound-beta tool execution streaming
        streamHandler.onToolExecution(({ type, tool }) => {
            // Ensure liveExecutedTools is an array (defensive against race conditions with onComplete)
            if (!Array.isArray(finalAssistantData.liveExecutedTools)) {
                finalAssistantData.liveExecutedTools = [];
            }
            
            if (type === 'start') {
                // Add or update tool in live list
                const updatedLiveTools = [...finalAssistantData.liveExecutedTools];
                const existingIndex = updatedLiveTools.findIndex(t => t.index === tool.index);
                
                if (existingIndex === -1) {
                    updatedLiveTools.push(tool);
                } else {
                    // Merge tool data to preserve any existing properties
                    updatedLiveTools[existingIndex] = { ...updatedLiveTools[existingIndex], ...tool };
                }
                
                finalAssistantData.liveExecutedTools = updatedLiveTools;
            } else if (type === 'complete') {
                // Update tool with complete data including output
                const updatedLiveTools = [...finalAssistantData.liveExecutedTools];
                // Try to match by index first, then by name as fallback
                let existingIndex = updatedLiveTools.findIndex(t => t.index === tool.index);
                if (existingIndex === -1 && tool.name) {
                    // Fallback: find by name if index doesn't match
                    existingIndex = updatedLiveTools.findIndex(t => t.name === tool.name && !t.output);
                }
                
                if (existingIndex !== -1) {
                    // Merge complete data with existing tool to preserve properties like type, arguments
                    updatedLiveTools[existingIndex] = { 
                        ...updatedLiveTools[existingIndex], 
                        ...tool,
                        // Ensure output is set (this is the key property for completion)
                        output: tool.output 
                    };
                    finalAssistantData.liveExecutedTools = updatedLiveTools;
                } else {
                    // Handle case where complete event arrives before start (shouldn't happen but defensive)
                    console.warn(`Received complete event for tool ${tool.name} (index ${tool.index}) without corresponding start event`);
                    updatedLiveTools.push(tool);
                    finalAssistantData.liveExecutedTools = updatedLiveTools;
                }
            }
            
            // Double-check before spreading (extra safety)
            const toolsToSet = Array.isArray(finalAssistantData.liveExecutedTools) 
                ? [...finalAssistantData.liveExecutedTools] 
                : [];
            
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { ...newMessages[idx], liveExecutedTools: toolsToSet };
                }
                return newMessages;
            });
        });

        // Handle stream completion
        await new Promise((resolve, reject) => {
            streamHandler.onComplete((data) => {
                const rawContent = data.content || finalAssistantData.content || '';
                const thinkResult = extractThinking(rawContent);
                let finalContent = rawContent;
                let finalReasoning = data.reasoning;

                if (thinkResult.hasThink) {
                    finalContent = thinkResult.cleanContent;
                    finalReasoning = [data.reasoning, thinkResult.thinking].filter(Boolean).join('\n\n---\n\n');
                }

                // Use existing duration if already set, otherwise calculate it now
                let reasoningDuration = finalAssistantData.reasoningDuration;
                if (!reasoningDuration && finalAssistantData.reasoningStartTime && (finalReasoning || data.reasoning)) {
                    reasoningDuration = Math.round((Date.now() - finalAssistantData.reasoningStartTime) / 1000);
                }
                
                finalAssistantData = {
                    role: 'assistant',
                    content: finalContent,
                    tool_calls: data.tool_calls,
                    reasoning: finalReasoning,
                    executed_tools: data.executed_tools,
                    // Clear live streaming data on completion
                    liveReasoning: undefined,
                    liveExecutedTools: undefined,
                    // Keep the reasoning summaries
                    reasoningSummaries: finalAssistantData.reasoningSummaries,
                    reasoningDuration: reasoningDuration,
                    usage: data.usage,
                    pre_calculated_tool_responses: data.pre_calculated_tool_responses,
                    // MCP approval requests from server
                    mcp_approval_requests: data.mcp_approval_requests || finalAssistantData.mcpApprovalRequests,
                    finish_reason: data.finish_reason,
                    timestamp: turnStartTime,
                    createdAt: new Date().toISOString(),
                    durationMs: Date.now() - turnStartTime,
                    injectedContext: turnInjectedContext
                };
                turnAssistantMessage = finalAssistantData; // Store the completed message
                streamThrottler.cancel();

                setMessages(prev => {
                    const newMessages = [...prev];
                    const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                    if (idx !== -1) {
                        newMessages[idx] = finalAssistantData; // Replace placeholder
                    } else {
                        // Should not happen if placeholder logic is correct
                        console.warn("Streaming placeholder not found for replacement.");
                        newMessages.push(finalAssistantData);
                    }
                    return newMessages;
                });
                resolve();
            });

            streamHandler.onError(({ error }) => {
                streamThrottler.cancel();
                console.error('Stream error received:', error);
                console.log('Error details:', { error });
                // Replace placeholder with error
                setMessages(prev => {
                    const newMessages = [...prev];
                    const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                    const errorMsg = { role: 'assistant', content: `Error: ${error}`, isStreaming: false };
                    if (idx !== -1) {
                        newMessages[idx] = errorMsg;
                    } else {
                        newMessages.push(errorMsg);
                    }
                    return newMessages;
                });
                reject(new Error(error));
            });

            streamHandler.onCancelled(() => {
                streamThrottler.cancel();
                console.log('Stream was cancelled by user');
                // Remove the streaming placeholder or mark it as cancelled
                setMessages(prev => {
                    const newMessages = [...prev];
                    const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                    if (idx !== -1) {
                        // If there's content, keep it; otherwise remove the placeholder
                        if (finalAssistantData.content.trim()) {
                            newMessages[idx] = {
                                role: 'assistant',
                                content: finalAssistantData.content,
                                isStreaming: false
                            };
                        } else {
                            // Remove empty placeholder
                            newMessages.splice(idx, 1);
                        }
                    }
                    return newMessages;
                });
                // Resolve with a special status to indicate cancellation
                currentTurnStatus = 'cancelled';
                reject(new Error('CANCELLED'));
            });

            streamHandler.onRetry(({ attempt, maxAttempts, error, newTemperature }) => {
                console.log(`🔄 Retry attempt ${attempt}/${maxAttempts}:`);
                console.log(`  Error: ${error}`);
                console.log(`  New temperature: ${newTemperature}`);
            });
        });

        // Clean up stream handlers
        streamHandler.cleanup();

        // Check and process tool calls if any
            if (turnAssistantMessage && turnAssistantMessage.tool_calls?.length > 0) {
            let handledIds = new Set();
            let preCalculatedMessages = [];

            if (turnAssistantMessage.pre_calculated_tool_responses) {
                 // Map pre-calculated responses to message format
                 preCalculatedMessages = turnAssistantMessage.pre_calculated_tool_responses.map(r => ({
                     role: 'tool',
                     content: r.content,
                     tool_call_id: r.tool_call_id
                 }));
                 
                 preCalculatedMessages.forEach(m => handledIds.add(m.tool_call_id));

                 // Update UI with tool results immediately
                 setMessages(prev => [...prev, ...preCalculatedMessages]);
                 
                 // Add to turnToolResponses accumulator
                 turnToolResponses = [...preCalculatedMessages];
            }

            // Check for unhandled tool calls
            // Filter out:
            // 1. Tool calls that have pre-calculated responses (already in handledIds)
            // 2. Remote MCP tool calls (have server_label set) - these are executed server-side by Groq
            const unhandledToolCalls = turnAssistantMessage.tool_calls.filter(tc => {
                return !handledIds.has(tc.id) && !tc.server_label;
            });
            
            if (unhandledToolCalls.length > 0) {
                // Create a proxy message with only unhandled tool calls for the processor
                const proxyAssistantMessage = {
                    ...turnAssistantMessage,
                    tool_calls: unhandledToolCalls
                };
                
                // Standard processing: Execute unhandled tools locally
                // IMPORTANT: Pass the messages *before* this assistant message was added
                const { status: toolProcessingStatus, toolResponseMessages } = await processToolCalls(
                    proxyAssistantMessage,
                    turnMessages // Pass the input messages for this turn
                );
    
                turnToolResponses = [...turnToolResponses, ...toolResponseMessages]; // Combine responses
    
                if (toolProcessingStatus === 'paused') {
                    currentTurnStatus = 'paused'; // Signal pause to the caller
                } else if (toolProcessingStatus === 'cancelled') {
                    currentTurnStatus = 'cancelled'; // Signal cancellation to the caller
                } else if (toolProcessingStatus === 'completed') {
                     // If tools completed, the caller might loop
                    currentTurnStatus = 'completed_with_tools';
                } else { // Handle potential errors from processToolCalls if added
                    currentTurnStatus = 'error';
                }
            } else {
                 // All tools were handled by server
                 currentTurnStatus = 'completed_no_tools';
            }
        } else {
             // No tools, this turn is complete
            currentTurnStatus = 'completed_no_tools';
        }

        // Handle MCP approval requests (remote tools requiring user approval)
        // These are received when require_approval is set to "always" for a connector/remote MCP server
        if (turnAssistantMessage?.mcp_approval_requests?.length > 0 || 
            turnAssistantMessage?.finish_reason === 'mcp_approval_required') {
            
            const mcpApprovalRequests = turnAssistantMessage.mcp_approval_requests || [];
            
            if (mcpApprovalRequests.length > 0) {
                // Process the first MCP approval request
                const firstApprovalRequest = mcpApprovalRequests[0];
                
                // Show approval modal for the first request
                setPendingApprovalCall({
                    ...firstApprovalRequest,
                    type: 'mcp_approval_request' // Ensure type is set for modal
                });
                
                // Store state for resuming after approval
                // IMPORTANT: We need to store the approval requests themselves to include them in the next input
                setPausedChatState({
                    currentMessages: turnMessages,
                    finalAssistantMessage: turnAssistantMessage,
                    accumulatedResponses: turnToolResponses,
                    pendingMcpApprovals: mcpApprovalRequests.slice(1), // Remaining approvals
                    mcpApprovalRequestItems: mcpApprovalRequests // Store all approval request items
                });
                
                currentTurnStatus = 'paused';
            }
        }

    } catch (error) {
      console.error('Error in executeChatTurn:', error);
      
      // Check if this was a cancellation
      if (error.message === 'CANCELLED') {
        console.log('Chat turn was cancelled');
        currentTurnStatus = 'cancelled';
      } else {
        // Ensure placeholder is replaced (without duplicating if streamHandler.onError already handled it)
        setMessages(prev => {
            const newMessages = [...prev];
            const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
            if (idx !== -1) {
                const errorMsg = { role: 'assistant', content: `Error: ${error.message}`, isStreaming: false };
                newMessages[idx] = errorMsg;
            }
            return newMessages;
        });
        currentTurnStatus = 'error';
      }
    }

    // Return the outcome of the turn
    return {
        status: currentTurnStatus, // 'completed_no_tools', 'completed_with_tools', 'paused', 'error', 'cancelled'
        assistantMessage: turnAssistantMessage,
        toolResponseMessages: turnToolResponses,
    };
  };

  // Handle sending message (text, structured content, or image generation)
  const handleSendMessage = async (content, options = {}) => {
    // Check if content is structured (array) or just text (string)
    const isStructuredContent = Array.isArray(content);
    const hasContent = isStructuredContent ? content.some(part => (part.type === 'text' && part.text.trim()) || part.type === 'image_url') : (typeof content === 'string' ? content.trim() : Boolean(content));

    if (!hasContent) return;

    // If no current chat exists, create one first with current API mode
    let activeChatId = currentChatId;
    if (!activeChatId) {
      const createdChat = await createNewChat(selectedModel, useResponsesApi);
      activeChatId = createdChat?.id;
      if (!activeChatId) return;
    }

    // Reset cancellation flag for new message
    cancelledRef.current = false;
    
    // Reset user scrolling flag so new messages auto-scroll
    userScrollingRef.current = false;
    setIsUserScrolling(false);

    // --- Special Mode: Image Generation ---
    if (options?.isImageGeneration) {
      const promptText = typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content.map(p => p.text || '').join(' ').trim()
          : String(content).trim();

      const userMessage = {
        role: 'user',
        content: promptText,
        isImagePrompt: true,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      const initialMessages = [...messages, userMessage];
      setMessages(initialMessages);

      const assistantLoading = {
        role: 'assistant',
        content: '',
        isGeneratingImage: true,
        imagePrompt: promptText,
        imageModel: options.imageSettings?.model,
        createdAt: new Date().toISOString(),
        timestamp: Date.now() + 1
      };

      setMessages([...initialMessages, assistantLoading]);
      setLoading(true);

      try {
        if (typeof window.electron?.generateImage !== 'function') {
          throw new Error('O aplicativo NeoChat precisa ser reiniciado para carregar as novas funções nativas de imagem do Electron. Por favor, feche a janela do NeoChat e reabra o aplicativo (ou reinicie o terminal com `pnpm dev`).');
        }
        const res = await window.electron.generateImage({
          prompt: promptText,
          provider: options.imageSettings?.provider,
          model: options.imageSettings?.model,
          aspectRatio: options.imageSettings?.aspectRatio,
          quality: options.imageSettings?.quality
        });

        if (res?.success) {
          const completedAssistantMessage = {
            role: 'assistant',
            content: res.revisedPrompt && res.revisedPrompt !== promptText ? res.revisedPrompt : '',
            isGeneratedImage: true,
            image: {
              dataUrl: res.dataUrl,
              url: res.rawUrl || res.dataUrl,
              revisedPrompt: res.revisedPrompt,
              model: res.model,
              provider: res.provider,
              prompt: promptText
            },
            createdAt: new Date().toISOString(),
            timestamp: Date.now() + 2
          };
          const finalMessages = [...initialMessages, completedAssistantMessage];
          setMessages(finalMessages);
          if (activeChatId) {
            await persistChatMessages(activeChatId, finalMessages);
          }
        } else {
          const errorMsg = {
            role: 'assistant',
            content: `❌ **${t('chat.imageGenerationFailed', { error: res?.error || 'Erro desconhecido' })}**`,
            isError: true,
            createdAt: new Date().toISOString(),
            timestamp: Date.now() + 2
          };
          const finalMessages = [...initialMessages, errorMsg];
          setMessages(finalMessages);
          if (activeChatId) {
            await persistChatMessages(activeChatId, finalMessages);
          }
        }
      } catch (err) {
        const errorMsg = {
          role: 'assistant',
          content: `❌ **${t('chat.imageGenerationFailed', { error: err.message || 'Erro inesperado' })}**`,
          isError: true,
          createdAt: new Date().toISOString(),
          timestamp: Date.now() + 2
        };
        const finalMessages = [...initialMessages, errorMsg];
        setMessages(finalMessages);
        if (activeChatId) {
          await persistChatMessages(activeChatId, finalMessages);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Format the user message based on content type
    const userMessage = {
      role: 'user',
      content: content, // Assumes ChatInput now sends the correct structured format
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    // Add user message optimistically BEFORE the API call
    const initialMessages = [...messages, userMessage];
    setMessages(initialMessages);

    // Validate that models exist before attempting API calls
    if (sortedModels.length === 0 || !selectedModel || selectedModel === 'default') {
      const warningMsg = {
        role: 'assistant',
        content: `⚠️ **${t('chat.noModelsBannerTitle')}**\n\n${t('chat.noModelsAlert')}\n\n👉 [${t('header.settings')}](#/settings)`,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      const updatedMessages = [...initialMessages, warningMsg];
      setMessages(updatedMessages);
      if (currentChatId) {
        await persistChatMessages(currentChatId, updatedMessages);
      }
      return;
    }

    const isAgentModeActive = harnessMode === 'code' || localStorage.getItem('neochat_agent_mode') === 'true';
    if (isAgentModeActive && !isCompareMode) {
      try {
        await runAgent({
          sessionId: activeChatId,
          message: userMessage,
          seedMessages: messages,
          model: selectedModel,
          workspaceRoot: workspacePath || undefined,
          systemPrompt: buildAgentSystemPrompt(),
          agentHarness
        });
      } catch (error) {
        console.error('Agent runtime execution failed:', error);
      }
      return;
    }

    // If in Multi-Model Comparison mode, run both streams concurrently
    if (isCompareMode) {
      setStreamStateA({ isLoading: true, content: '', reasoning: '', ttft: null, metrics: null, error: null });
      setStreamStateB({ isLoading: true, content: '', reasoning: '', ttft: null, metrics: null, error: null });

      const stream = window.electron.startCompareChatStream(
        initialMessages,
        compareModelA || selectedModel,
        compareModelB || selectedModel
      );

      stream.onStartA((data) => setStreamStateA(prev => ({ ...prev, ttft: data.ttft })));
      stream.onContentA((data) => setStreamStateA(prev => ({ ...prev, content: (prev.content || '') + data.content })));
      stream.onReasoningA((data) => setStreamStateA(prev => ({ ...prev, reasoning: (prev.reasoning || '') + data.reasoning })));
      stream.onCompleteA((data) => setStreamStateA(prev => ({ ...prev, isLoading: false, metrics: data })));
      stream.onErrorA((data) => setStreamStateA(prev => ({ ...prev, isLoading: false, error: data.error })));

      stream.onStartB((data) => setStreamStateB(prev => ({ ...prev, ttft: data.ttft })));
      stream.onContentB((data) => setStreamStateB(prev => ({ ...prev, content: (prev.content || '') + data.content })));
      stream.onReasoningB((data) => setStreamStateB(prev => ({ ...prev, reasoning: (prev.reasoning || '') + data.reasoning })));
      stream.onCompleteB((data) => setStreamStateB(prev => ({ ...prev, isLoading: false, metrics: data })));
      stream.onErrorB((data) => setStreamStateB(prev => ({ ...prev, isLoading: false, error: data.error })));

      return;
    }

    setLoading(true);

    let currentApiMessages = initialMessages; // Start with messages including the new user one
    let conversationStatus = 'processing'; // Start the conversation flow
    let emptyResponseRetries = 0; // Track retries for empty responses
    const MAX_EMPTY_RETRIES = 3; // Maximum retries for empty responses
    let toolIterationsCount = 0;
    const MAX_TOOL_ITERATIONS = 12; // Chat mode safety limit; Agent Mode runs in the main-process runtime.

    if (isAgentModeActive) {
      setAgentStep(1);
    }

    try {
        while (conversationStatus === 'processing' || conversationStatus === 'completed_with_tools') {
            if (conversationStatus === 'completed_with_tools') {
                toolIterationsCount++;
                if (isAgentModeActive) {
                    setAgentStep(toolIterationsCount + 1);
                }
                if (toolIterationsCount >= MAX_TOOL_ITERATIONS) {
                    console.warn(`[Frontend] Maximum tool iterations (${MAX_TOOL_ITERATIONS}) reached. Stopping tool loop.`);
                    break;
                }
            }

            const { status, assistantMessage, toolResponseMessages } = await executeChatTurn(currentApiMessages);

            conversationStatus = status; // Update status for loop condition

            if (status === 'paused') {
                 // Pause initiated by executeChatTurn/processToolCalls
                 // Loading state remains true, waiting for modal interaction
                 break; // Exit the loop
            } else if (status === 'cancelled') {
                 // Stream was cancelled by user
                 console.log('Conversation cancelled by user');
                 break;
            } else if (status === 'error') {
                 // Error occurred, stop the loop
                  break;
            } else if (status === 'completed_with_tools') {
                  // Reset empty response retry counter since we got valid tool calls
                  emptyResponseRetries = 0;
                  
                  // Prepare messages for the next turn ONLY if tools were completed
                  if (assistantMessage && toolResponseMessages.length > 0) {
                      // Format tool responses for the API
                      const formattedToolResponses = toolResponseMessages.map(msg => ({
                          role: 'tool',
                          content: msg.content, // Ensure this is a string
                          tool_call_id: msg.tool_call_id
                      }));
                      // Append assistant message and tool responses for the next API call
                      currentApiMessages = [
                          ...currentApiMessages,
                          { // Assistant message that included the tool calls
                            role: assistantMessage.role,
                            content: assistantMessage.content,
                            tool_calls: assistantMessage.tool_calls
                          },
                          ...formattedToolResponses
                      ];
                      // Loop continues as conversationStatus is 'completed_with_tools'
                  } else {
                      // Should not happen if status is completed_with_tools, but safety break
                      console.warn("Status 'completed_with_tools' but no assistant message or tool responses found.");
                      conversationStatus = 'error'; // Treat as error
                      break;
                  }
            } else if (status === 'completed_no_tools') {
                  // Conversation turn finished without tools
                  // Check if we got an empty response (only reasoning, no content)
                  // Note: Don't treat as empty if there are tool calls (e.g. Responses API might return tool calls with no content if that was the intent)
                  const hasContent = assistantMessage.content && assistantMessage.content.trim() !== '';
                  const hasToolCalls = assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0;
                  
                  if (assistantMessage && !hasContent && !hasToolCalls) {
                      if (emptyResponseRetries < MAX_EMPTY_RETRIES) {
                          emptyResponseRetries++;
                          console.warn(`[Frontend] Model completed with no content. Retrying (${emptyResponseRetries}/${MAX_EMPTY_RETRIES})...`);
                          
                          // Remove the empty assistant message from the UI
                          setMessages(prev => {
                              const newMessages = [...prev];
                              // Find and remove the last assistant message (which has empty content)
                              const lastAssistantIdx = newMessages.map((m, i) => ({ idx: i, msg: m }))
                                  .reverse()
                                  .find(({ msg }) => msg.role === 'assistant')?.idx;
                              if (lastAssistantIdx !== undefined) {
                                  newMessages.splice(lastAssistantIdx, 1);
                              }
                              return newMessages;
                          });
                          
                          // Retry with the same messages (don't modify currentApiMessages)
                          conversationStatus = 'processing';
                      } else {
                          // Max retries reached, show error
                          console.error('[Frontend] Max retries reached for empty response. Stopping.');
                          setMessages(prev => {
                              const newMessages = [...prev];
                              // Find and replace the last assistant message with error
                              const lastAssistantIdx = newMessages.map((m, i) => ({ idx: i, msg: m }))
                                  .reverse()
                                  .find(({ msg }) => msg.role === 'assistant')?.idx;
                              if (lastAssistantIdx !== undefined) {
                                  newMessages[lastAssistantIdx] = {
                                      role: 'assistant',
                                      content: 'Error: Model failed to generate a response after multiple attempts.'
                                  };
                              }
                              return newMessages;
                          });
                          break;
                      }
                  } else {
                      // Normal completion with content, stop the loop
                      break;
                  }
            }
        } // End while loop

    } catch (error) {
        // Catch errors originating directly in handleSendMessage loop (unlikely with refactor)
        console.error('Error in handleSendMessage conversation flow:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        conversationStatus = 'error'; // Ensure loading state is handled
    } finally {
        setAgentStep(0);
        // Only set loading false if the conversation is not paused
        if (conversationStatus !== 'paused') {
            setLoading(false);
        }
    }
  };

  useEffect(() => {
    if (!window.electron?.schedules?.onRun) return undefined;
    return window.electron.schedules.onRun(async ({ prompt }) => {
      if (loading || !prompt) return;
      localStorage.setItem('neochat_agent_mode', 'true');
      await handleSendMessage(prompt);
    });
  }, [loading, currentChatId, messages]);

  // --- Placeholder for resuming chat after modal interaction ---
  const resumeChatFlow = async (handledToolResponse) => {
      if (!pausedChatState) {
          console.error("Attempted to resume chat flow without paused state.");
          setLoading(false); // Ensure loading indicator stops
          return;
      }

      // Check if operation was cancelled
      if (cancelledRef.current) {
          console.log('Resume chat flow cancelled by user');
          setLoading(false);
          return;
      }

      const { currentMessages, finalAssistantMessage, accumulatedResponses } = pausedChatState;
      setPausedChatState(null); // Clear the paused state

      const allResponsesForTurn = [...accumulatedResponses, handledToolResponse];

      // Find the index of the tool that caused the pause
      const pausedToolIndex = finalAssistantMessage.tool_calls.findIndex(
          tc => tc.id === handledToolResponse.tool_call_id // Match based on ID
      );

      if (pausedToolIndex === -1) {
          console.error("Could not find the paused tool call in the original message.");
          setLoading(false);
          return; // Cannot proceed
      }

      const remainingTools = finalAssistantMessage.tool_calls.slice(pausedToolIndex + 1);
      let needsPauseAgain = false;

      // Process remaining tools
      for (const nextToolCall of remainingTools) {
        // Check if operation was cancelled
        if (cancelledRef.current) {
            console.log('Tool execution cancelled by user during resume');
            setLoading(false);
            return;
        }

        const toolName = nextToolCall.function.name;
        const approvalStatus = await getToolApprovalStatus(toolName, nextToolCall.server_label);

        if (approvalStatus === 'allow' || approvalStatus === 'always' || approvalStatus === 'yolo') {
            console.log(`Resuming: Tool '${toolName}' automatically approved (${approvalStatus}). Executing...`);
            try {
                // Check before executing
                if (cancelledRef.current) {
                    console.log('Tool execution cancelled by user before executing');
                    setLoading(false);
                    return;
                }
                
                const resultMsg = await executeToolCall(nextToolCall);
                
                // Check after executing
                if (cancelledRef.current) {
                    console.log('Tool execution cancelled by user after tool completed');
                    setLoading(false);
                    return;
                }
                
                allResponsesForTurn.push(resultMsg);
                setMessages(prev => [...prev, resultMsg]); // Update UI immediately
            } catch (error) {
                console.error(`Resuming: Error executing tool call '${toolName}':`, error);
                const errorMsg = { role: 'tool', content: JSON.stringify({ error: `Error executing tool '${toolName}': ${error.message}` }), tool_call_id: nextToolCall.id };
                allResponsesForTurn.push(errorMsg);
                setMessages(prev => [...prev, errorMsg]);
            }
        } else if (approvalStatus === 'deny') {
            const deniedMsg = { role: 'tool', content: JSON.stringify({ error: `Tool '${toolName}' blocked by permission policy.` }), tool_call_id: nextToolCall.id };
            allResponsesForTurn.push(deniedMsg);
            setMessages(prev => [...prev, deniedMsg]);
        } else { // Needs prompt again
            console.log(`Resuming: Tool '${toolName}' requires user approval.`);
            setPendingApprovalCall(nextToolCall);
            // Save state again, including the responses gathered *during* this resume attempt
            setPausedChatState({
                currentMessages: currentMessages, // Original messages before assistant response
                finalAssistantMessage: finalAssistantMessage,
                accumulatedResponses: allResponsesForTurn // All responses UP TO this new pause
            });
            needsPauseAgain = true;
            break; // Stop processing remaining tools
        }
      }

      if (needsPauseAgain) {
        // Loading state remains true, waiting for the next modal interaction
        console.log("Chat flow paused again for the next tool.");
      } else {
        // All remaining tools were processed. Prepare for the next API call.
        console.log("All tools for the turn processed. Continuing conversation.");
        setLoading(true); // Show loading for the next API call

        const nextApiMessages = [
            ...currentMessages, // History BEFORE the assistant message with tools
            { // The assistant message itself
                role: finalAssistantMessage.role,
                content: finalAssistantMessage.content,
                tool_calls: finalAssistantMessage.tool_calls,
            },
            // Map ALL tool responses for the completed turn
            ...allResponsesForTurn.map(msg => ({
                role: 'tool',
                content: msg.content,
                tool_call_id: msg.tool_call_id
            }))
        ];

        // Continue the conversation loop by executing the next turn
        // This recursively calls the main logic, effectively continuing the loop
        // Pass the fully prepared message list for the *next* API call
        // We need to handle the loading state correctly after this returns
        try {
             // Start the next turn
              const { status: nextTurnStatus } = await executeChatTurn(nextApiMessages);
              // If the *next* turn also pauses, loading state remains true
              if (nextTurnStatus !== 'paused') {
                  setLoading(false);
              }
        } catch (error) {
            // Check if this was a cancellation
            if (error.message !== 'CANCELLED') {
                console.error("Error during resumed chat turn:", error);
                setMessages(prev => [...prev, { role: 'assistant', content: `Error after resuming: ${error.message}` }]);
            }
            setLoading(false); // Stop loading on error or cancellation
        }
      }
  };

  // --- Placeholder for handling modal choice ---
  const handleToolApproval = async (choice, toolCall) => {
      if (!toolCall || !toolCall.id) {
          console.error("handleToolApproval called with invalid toolCall:", toolCall);
          return;
      }
      
      if (toolCall._agentRuntime) {
          setPendingApprovalCall(null);
          const approved = !['deny', 'never'].includes(choice);
          if (approved) {
              await window.electron.agent.approveTool(
                  toolCall._agentSessionId,
                  toolCall.id,
                  ['always', 'yolo'].includes(choice)
              );
          } else {
              await window.electron.agent.rejectTool(toolCall._agentSessionId, toolCall.id, 'User denied tool execution');
          }
          return;
      }

      // Check if this is an MCP approval request (remote tool)
      const isMcpApprovalRequest = toolCall.type === 'mcp_approval_request';
      const toolName = isMcpApprovalRequest ? toolCall.name : toolCall.function?.name;
      

      // Clear the pending call *before* executing/resuming
      setPendingApprovalCall(null);

      // Update localStorage based on choice
      await setToolApprovalStatus(toolName, choice, toolCall.server_label);

      if (isMcpApprovalRequest) {
          // Handle MCP approval request - need to send approval/denial back to the API
          await handleMcpApprovalResponse(choice, toolCall);
      } else {
          // Handle local tool call
          let handledToolResponse;

          if (choice === 'deny' || choice === 'never') {
              handledToolResponse = {
                  role: 'tool',
                  content: JSON.stringify({ error: 'Tool execution denied by user.' }),
                  tool_call_id: toolCall.id
              };
              setMessages(prev => [...prev, handledToolResponse]); // Show denial in UI
              // Resume processing potential subsequent tools
              await resumeChatFlow(handledToolResponse);
          } else { // 'once', 'always', 'yolo' -> Execute the tool
              setLoading(true); // Show loading specifically for tool execution phase
              try {
                  console.log(`Executing tool '${toolName}' after user approval...`);
                  handledToolResponse = await executeToolCall(toolCall);
                  setMessages(prev => [...prev, handledToolResponse]); // Show result in UI
                  // Resume processing potential subsequent tools
                  await resumeChatFlow(handledToolResponse);
              } catch (error) {
                  console.error(`Error executing approved tool call '${toolName}':`, error);
                  handledToolResponse = {
                      role: 'tool',
                      content: JSON.stringify({ error: `Error executing tool '${toolName}' after approval: ${error.message}` }),
                      tool_call_id: toolCall.id
                  };
                  setMessages(prev => [...prev, handledToolResponse]); // Show error in UI
                  // Still try to resume processing subsequent tools even if this one failed
                  await resumeChatFlow(handledToolResponse);
              } finally {
                  // Loading state will be handled by resumeChatFlow or set to false if it errors/completes fully
                  // setLoading(false); // Don't set false here, resumeChatFlow handles it
              }
          }
      }
  };

  // Handle MCP approval response - send approval/denial back to the API
  const handleMcpApprovalResponse = async (choice, approvalRequest) => {
      if (!pausedChatState) {
          console.error("handleMcpApprovalResponse called without paused state");
          setLoading(false);
          return;
      }

      const { currentMessages, finalAssistantMessage, accumulatedResponses, pendingMcpApprovals, mcpApprovalRequestItems } = pausedChatState;
      
      // Determine approval decision
      const approved = choice !== 'deny' && choice !== 'never';
      

      // Create the approval response item for the API
      const approvalResponseItem = {
          type: 'mcp_approval_response',
          approval_request_id: approvalRequest.id,
          approve: approved,
          // Include reason if denied
          ...((!approved) && { reason: 'User denied the tool execution' })
      };

      // Check if there are more pending approvals
      if (pendingMcpApprovals && pendingMcpApprovals.length > 0) {
          // Show modal for the next approval request
          const nextApproval = pendingMcpApprovals[0];
          setPendingApprovalCall({
              ...nextApproval,
              type: 'mcp_approval_request'
          });
          
          // Update paused state with the response and remaining approvals
          setPausedChatState({
              currentMessages,
              finalAssistantMessage,
              accumulatedResponses: [...accumulatedResponses, approvalResponseItem],
              pendingMcpApprovals: pendingMcpApprovals.slice(1),
              mcpApprovalRequestItems
          });
          return; // Wait for next approval
      }

      // All approvals handled, continue the conversation
      setPausedChatState(null);
      setLoading(true);

      try {
          // Build the input for the next API call
          // For Responses API with MCP approvals:
          // 1. Include original conversation history
          // 2. Include the mcp_approval_request items (output from previous response)
          // 3. Include the mcp_approval_response items (our responses)
          
          const allApprovalResponses = [...accumulatedResponses, approvalResponseItem]
              .filter(r => r.type === 'mcp_approval_response');
          
          // Build messages for the next turn
          const nextApiMessages = [
              ...currentMessages,
              // Include the assistant's message content if any
              ...(finalAssistantMessage.content ? [{
                  role: 'assistant',
                  content: finalAssistantMessage.content,
                  // Include any tool calls that were made
                  ...(finalAssistantMessage.tool_calls && { tool_calls: finalAssistantMessage.tool_calls })
              }] : []),
              // Include the mcp_approval_request items from the response
              // These need to be in the input so the API knows what we're responding to
              ...(mcpApprovalRequestItems || []).map(req => ({
                  type: 'mcp_approval_request',
                  id: req.id,
                  name: req.name,
                  server_label: req.server_label,
                  arguments: req.arguments
              })),
              // Add our approval responses
              ...allApprovalResponses.map(r => ({
                  type: 'mcp_approval_response',
                  approval_request_id: r.approval_request_id,
                  approve: r.approve,
                  ...(r.reason && { reason: r.reason })
              }))
          ];


          // Continue the conversation with the approval responses
          const { status: nextTurnStatus } = await executeChatTurn(nextApiMessages);
          
          if (nextTurnStatus !== 'paused') {
              setLoading(false);
          }
      } catch (error) {
          if (error.message !== 'CANCELLED') {
              console.error("Error during MCP approval continuation:", error);
              setMessages(prev => [...prev, { role: 'assistant', content: `Error after approval: ${error.message}` }]);
          }
          setLoading(false);
      }
  };

  // Disconnect from an MCP server
  const disconnectMcpServer = async (serverId) => {
    try {
      const result = await window.electron.disconnectMcpServer(serverId);
      if (result && result.success) {
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else {
          // If we don't get allTools back, just filter out the tools from this server
          setMcpTools(prev => prev.filter(tool => tool.serverId !== serverId));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
      return false;
    }
  };
  
  // Reconnect to an MCP server
  const reconnectMcpServer = async (serverId) => {
    try {
      // Get server configuration from settings
      const settings = await window.electron.getSettings();
      if (!settings.mcpServers || !settings.mcpServers[serverId]) {
        console.error(`Server configuration not found for ${serverId}`);
        return false;
      }
      
      // Get the full configuration object for the server
      const serverConfig = settings.mcpServers[serverId];

      // Connect to the server
      const result = await window.electron.connectMcpServer({
        ...serverConfig, // Spread the loaded config (includes transport, url/command, args, env)
        id: serverId      // Ensure ID is explicitly included
      });

      // --- Update tools state ONLY on success ---
      if (result && result.success) {
        // Update tools based on the result
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else if (result.tools) {
          // Fallback logic if allTools isn't provided but tools is
          setMcpTools(prev => {
            const filteredTools = prev.filter(tool => tool.serverId !== serverId);
            return [...filteredTools, ...(result.tools || [])];
          });
        }
        // Do NOT return true here, let the full result propagate
      }

      // Return the result object regardless of success/failure/requiresAuth
      // ToolsPanel will handle the requiresAuth flag
      return result;
    } catch (error) {
      console.error('Error reconnecting to MCP server:', error);
      // Return an error structure consistent with what ToolsPanel might expect
      return { success: false, error: error.message || 'An unknown error occurred', requiresAuth: false }; 
    }
  };

  // Add this function to explicitly refresh MCP tools
  const refreshMcpTools = async () => {
    try {
      setMcpServersStatus({ loading: true, message: "Refreshing MCP connections..." });
      
      // Get latest settings
      const settings = await window.electron.getSettings();
      
      // Manually fetch the current tools
      const mcpToolsResult = await window.electron.getMcpTools();
      
      if (mcpToolsResult && mcpToolsResult.tools) {
        setMcpTools(mcpToolsResult.tools);
        updateServerStatus(mcpToolsResult.tools, settings);
      } else {
        console.warn("No MCP tools available");
        setMcpServersStatus({ loading: false, message: "No MCP tools available" });
      }
    } catch (error) {
      console.error('Error refreshing MCP tools:', error);
      setMcpServersStatus({ loading: false, message: "Error refreshing MCP tools" });
    }
  };

  // Handle creating a new chat
  const handleNewChat = useCallback(async (targetProjectId = undefined) => {
    // Stop any ongoing streams before clearing
    if (loading) {
      console.log('Stopping streams before starting new chat...');
      window.electron.stopChatStream();
      setLoading(false);
      // Clear any pending tool approval state
      setPendingApprovalCall(null);
      setPausedChatState(null);
    }

    // Switch back to chat tab if currently on trajectory or other tab
    setActiveTab('chat');
    
    const projId = targetProjectId !== undefined ? targetProjectId : activeProjectId;
    if (targetProjectId !== undefined) {
      setActiveProjectId(targetProjectId);
    }
    
    // Clear canvas and artifacts when creating a new chat
    clearCanvas();
    closeCanvas();
    setActiveArtifact(null);

    // Create a new chat in history with the current API mode and target project
    await createNewChat(selectedModel, useResponsesApi, projId);

    // Signal the ChatInput to focus on the text area
    setChatFocusSignal(s => s + 1);
  }, [loading, createNewChat, selectedModel, useResponsesApi, activeProjectId, setActiveProjectId, clearCanvas, closeCanvas]);

  // Global Keyboard shortcuts:
  // - Ctrl/Cmd + N -> New Chat
  // - Ctrl/Cmd + / or '?' (when outside inputs) -> Toggle Shortcuts Central
  // - Ctrl/Cmd + , -> Settings
  // - Ctrl/Cmd + B -> Toggle Sidebar
  // - '/' (when outside inputs) -> Focus Chat Input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable;
      
      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + N: New Chat
      if (isModifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Ctrl/Cmd + /: Keyboard Shortcuts Modal
      if (isModifier && e.key === '/') {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // '?' outside inputs: Keyboard Shortcuts Modal
      if (!isModifier && !e.altKey && e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      // Ctrl/Cmd + ,: Settings
      if (isModifier && e.key === ',') {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // Ctrl/Cmd + B: Toggle Sidebar
      if (isModifier && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl/Cmd + Shift + C: Toggle Canvas
      if (isModifier && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleToggleCanvas();
        return;
      }

      // Ctrl/Cmd + Shift + X: Toggle Code Interpreter
      if (isModifier && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleToggleCodeInterpreter();
        return;
      }

      // Ctrl/Cmd + Shift + U: Toggle Interface Mode (User / Power)
      if (isModifier && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        const nextMode = interfaceMode === 'power' ? 'user' : 'power';
        handleInterfaceModeChange(nextMode);
        return;
      }

      // '/' outside inputs: Focus Chat Input
      if (!isModifier && !e.altKey && e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setChatFocusSignal(s => s + 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewChat, toggleSidebar, handleToggleCanvas, handleToggleCodeInterpreter, navigate, interfaceMode, handleInterfaceModeChange]);

  // Handle when a chat is loaded from history - switch API mode and sync active project if needed
  const handleChatLoaded = useCallback(async (chat) => {
    if (!chat) return;

    // Reset active artifact preview when switching chats
    setActiveArtifact(null);

    // Switch back to chat tab
    setActiveTab('chat');

    // Load canvas document if this chat has one
    if (chat.canvasDoc) {
      loadChatCanvas(chat.canvasDoc);
    } else {
      loadChatCanvas(null);
    }

    // Sync activeProjectId with chat's project
    if (chat.projectId !== undefined) {
      setActiveProjectId(chat.projectId || null);
    } else {
      setActiveProjectId(null);
    }

    if (chat.useResponsesApi !== undefined) {
      const chatApiMode = chat.useResponsesApi;
      
      // If the chat's API mode differs from current setting, update it
      if (chatApiMode !== useResponsesApi) {
        console.log(`[App] Switching API mode for chat: useResponsesApi=${chatApiMode}`);
        setUseResponsesApi(chatApiMode);
        
        // Also update the setting in storage so the chat handler uses it
        try {
          const settings = await window.electron.getSettings();
          if (settings.useResponsesApi !== chatApiMode) {
            await window.electron.saveSettings({ ...settings, useResponsesApi: chatApiMode });
          }
        } catch (error) {
          console.error('Error updating API mode setting:', error);
        }
      }
    }
  }, [useResponsesApi, setActiveProjectId, loadChatCanvas]);

  const handleBranchFromMessage = useCallback(async (messageIndex) => {
    if (!currentChatId || loading) return;
    const result = await window.electron.chatHistory.branch(currentChatId, messageIndex);
    if (!result?.success || !result.chat) {
      console.error('Unable to branch conversation:', result?.error);
      return;
    }
    await loadChatList();
    const branch = await loadChat(result.chat.id);
    await handleChatLoaded(branch);
    setChatFocusSignal(signal => signal + 1);
  }, [currentChatId, loading, loadChat, loadChatList, handleChatLoaded]);


  return (
    <div className="flex h-screen bg-background">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar 
        onNewChat={handleNewChat}
        onChatLoaded={handleChatLoaded}
        loading={loading}
        harnessMode={harnessMode}
        onModeChange={handleModeChange}
        workspacePath={workspacePath}
        workspaceInfo={workspaceInfo}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenFileInCanvas={handleOpenFileInCanvas}
        onInsertPrompt={handleInsertPrompt}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Modern Sticky Header */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between px-4 max-w-full">
            <div className="flex items-center space-x-3">
              {/* Sidebar toggle for mobile/collapsed state */}
              {isSidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title={t('header.expandSidebar')}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Trajectory (Trajetória) View Toggle Switch */}
              {showTrajectoryTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab(prev => prev === 'trajectory' ? 'chat' : 'trajectory')}
                  className={cn(
                    "h-7 px-2.5 text-xs flex items-center gap-2 rounded-lg transition-all cursor-pointer select-none",
                    activeTab === 'trajectory'
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 font-medium"
                  )}
                  title={activeTab === 'trajectory' ? 'Voltar para o Chat' : (t('trajectory.trajectoryTab') || 'Visualizar Trajetória')}
                >
                  <Activity className={cn("w-3.5 h-3.5 transition-colors", activeTab === 'trajectory' ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className="hidden sm:inline">{t('trajectory.trajectoryTab') || 'Trajetória'}</span>
                </button>
              )}

              {/* In Code Mode: Workspace Directory Selector Button */}
              {isPowerUser && harnessMode === 'code' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectWorkspace}
                  className="h-7 px-2.5 text-xs flex items-center gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium shadow-2xs transition-all cursor-pointer"
                  title={t('chat.selectWorkspaceTooltip')}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="max-w-[140px] sm:max-w-[200px] truncate font-semibold">
                    {workspaceInfo?.name || (workspacePath ? workspacePath.split(/[/\\]/).pop() : t('chat.selectWorkspace'))}
                  </span>
                  {workspaceInfo?.git?.branch && (
                    <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono shrink-0">
                      🌿 {workspaceInfo.git.branch}
                    </span>
                  )}
                  {workspaceInfo?.agentsDoc && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title={t('chat.agentsDocDetected')} />
                  )}
                </Button>
              )}
              
              {/* Persona Selector */}
              {isPowerUser && (
                <PersonaSelector
                  activePersona={activePersona}
                  onSelectPersona={setActivePersona}
                />
              )}

              {/* Active Project Badge */}
              {isPowerUser && activeProject && (
                <div 
                  className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs hover:opacity-90"
                  style={{ 
                    backgroundColor: `${activeProject.color || '#f55036'}18`, 
                    borderColor: `${activeProject.color || '#f55036'}40`,
                    color: activeProject.color || '#f55036' 
                  }}
                  onClick={() => openEditProjectModal(activeProject)}
                  title={`${t('projects.activeBadge')}: ${activeProject.name}`}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[11px] leading-none shrink-0 select-none">{activeProject.icon || '📁'}</span>
                  <span className="max-w-[120px] truncate font-semibold">{activeProject.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveProjectId(null);
                    }}
                    className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                    title={t('projects.backToAll')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Project Knowledge Base (RAG) Button */}
              {isPowerUser && activeProject && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openKnowledgeBaseModal}
                  className="h-7 px-2.5 text-xs flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  title={t('rag.viewKnowledge')}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {showButtonLabels && (
                    <span className="hidden sm:inline font-medium">
                      {activeProject.folders?.length > 0
                        ? `${activeProject.folders.length} ${activeProject.folders.length === 1 ? 'pasta' : 'pastas'}`
                        : t('rag.knowledgeBase')}
                    </span>
                  )}
                </Button>
              )}

              {/* Total Conversation Metrics & Token Summation */}
              {isPowerUser && (
                <Suspense fallback={null}>
                  <ConversationStats messages={messages} />
                </Suspense>
              )}
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Consolidated Tools Menu Popover */}
              {isPowerUser && (
                <div className="relative" ref={toolsDropdownRef}>
                  <Button
                    variant={isToolsDropdownOpen ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                    className={cn(
                      "h-8 w-8 rounded-xl relative transition-all",
                      isToolsDropdownOpen
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={t('header.toolsMenu') || 'Ferramentas e Recursos'}
                    aria-label={t('header.toolsMenu') || 'Ferramentas e Recursos'}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    {(runningTasksCount > 0 || isTerminalOpen || isCanvasOpen || isExplorerOpen) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Button>

                  {/* Dropdown Menu */}
                  {isToolsDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain custom-scrollbar p-1.5 rounded-2xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 space-y-0.5 text-xs">
                      {/* Terminal Workspace */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsTerminalOpen(!isTerminalOpen);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Terminal className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>Terminal Shell</span>
                            {isTerminalOpen && <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">Aberto</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">PowerShell & comandos (Ctrl+`)</div>
                        </div>
                      </button>

                      {/* Workspace File Explorer */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsExplorerOpen(!isExplorerOpen);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left cursor-pointer"
                      >
                        <FolderTree className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>{t('header.workspaceExplorer') || 'Explorador de Arquivos'}</span>
                            {isExplorerOpen && <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono">Aberto</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{t('header.workspaceExplorerSubtitle') || 'Estrutura de pastas e arquivos (Ctrl+Shift+E)'}</div>
                        </div>
                      </button>

                      {/* Canvas Workspace */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          handleToggleCanvas();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <PenSquare className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>Espaço Canvas</span>
                            {isCanvasOpen && <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[10px] font-mono">Aberto</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Editor lado a lado (Ctrl+Shift+C)</div>
                        </div>
                      </button>

                      {/* Swarm */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsSwarmModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Bot className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Equipe Swarm</div>
                          <div className="text-[10px] text-muted-foreground truncate">Multi-agentes autônomos</div>
                        </div>
                      </button>

                      {/* MCP Catalog */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsMcpCatalogOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Store className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{t('mcpCatalog.title') || 'Loja MCP'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">Servidores de ferramentas e integrações</div>
                        </div>
                      </button>

                      {/* Workflows */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsWorkflowsOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Workflow className="w-4 h-4 text-teal-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{t('workflows.title') || 'Workflows'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">Fluxos de trabalho automatizados</div>
                        </div>
                      </button>

                      {/* Compare Models */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsCompareMode(!isCompareMode);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Scale className="w-4 h-4 text-purple-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>{t('header.compareModels') || 'Comparar Modelos'}</span>
                            {isCompareMode && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Visualização lado a lado</div>
                        </div>
                      </button>

                      {/* User Long-Term Memory */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsUserMemoryModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{t('memory.title') || 'Memória Persistente'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">Preferências e fatos lembrados pela IA</div>
                        </div>
                      </button>

                      {/* In-App Browser */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsBrowserOpen(!isBrowserOpen);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>Navegador Web</span>
                            {isBrowserOpen && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Painel embutido (Ctrl+Shift+B)</div>
                        </div>
                      </button>

                      {/* Background Tasks */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsTasksOpen(!isTasksOpen);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>Tarefas em Segundo Plano</span>
                            {runningTasksCount > 0 ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-bold">
                                {runningTasksCount}
                              </span>
                            ) : isTasksOpen ? (
                              <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            ) : null}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Processos e tarefas ativas</div>
                        </div>
                      </button>

                      {/* Code Interpreter */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          handleToggleCodeInterpreter();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Terminal className="w-4 h-4 text-violet-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>{t('header.codeInterpreter') || 'Interpretador de Código'}</span>
                            {activeArtifact && <span className="w-2 h-2 rounded-full bg-violet-500" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Python & JavaScript interativo</div>
                        </div>
                      </button>

                      <div className="my-1 border-t border-border/60" />

                      {/* Plugins & Modules Hub */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsPluginsManagerOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>Módulos & Extensões</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-semibold">Hub</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">Ativar/desativar módulos (0MB idle)</div>
                        </div>
                      </button>

                      {/* AI Arena */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsArenaModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Bot className="w-4 h-4 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">AI Arena & Debate</div>
                          <div className="text-[10px] text-muted-foreground truncate">Debate em rodadas & consenso</div>
                        </div>
                      </button>

                      {/* Web Sandbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsLiveSandboxOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <LayoutGrid className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Live Dev Sandbox</div>
                          <div className="text-[10px] text-muted-foreground truncate">Preview HTML/Tailwind/React</div>
                        </div>
                      </button>

                      {/* Podcast Studio */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsPodcastStudioOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Radio className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Podcast & Audio Studio</div>
                          <div className="text-[10px] text-muted-foreground truncate">NotebookLM style 2-hosts TTS</div>
                        </div>
                      </button>

                      {/* Knowledge Graph */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsKnowledgeGraphOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Grafo & Data Studio</div>
                          <div className="text-[10px] text-muted-foreground truncate">Grafo 2D do RAG & gráficos</div>
                        </div>
                      </button>

                      {/* Daily Briefing */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsDailyBriefingOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Proactive Daily Briefing</div>
                          <div className="text-[10px] text-muted-foreground truncate">Resumo matinal inteligente</div>
                        </div>
                      </button>

                      <div className="my-1 border-t border-border/60" />

                      {/* Command Palette */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsCommandPaletteOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">Paleta de Comandos</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border/80 rounded text-muted-foreground">Ctrl+Shift+P</kbd>
                      </button>

                      {/* Keyboard Shortcuts */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsDropdownOpen(false);
                          setIsShortcutsModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{t('header.keyboardShortcuts') || 'Atalhos de Teclado'}</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border/80 rounded text-muted-foreground">?</kbd>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Theme & Quick Appearance / Mode Toggle */}
              {isPowerUser && (
                <ThemeToggle
                  interfaceMode={interfaceMode}
                  onInterfaceModeChange={handleInterfaceModeChange}
                />
              )}

              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-muted rounded-xl" title={t('header.settings')}>
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

      {/* Floating Agent Execution Tracker Banner */}
      {agentStep > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 backdrop-blur-md shadow-xl text-xs text-amber-700 dark:text-amber-300 animate-in slide-in-from-top-4 duration-300">
          <Bot className="w-4 h-4 animate-bounce text-amber-500" />
          <span className="font-semibold">Modo Agente Autônomo</span>
          <span className="opacity-60">•</span>
           <span>Passo {agentStep} de {isAgentRunning ? 25 : 12}</span>
          <button
            type="button"
            onClick={handleStopGeneration}
            className="ml-2 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[10.5px] font-medium transition-colors"
          >
            Interromper
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className={cn(
              "mx-auto h-full transition-all duration-200",
              chatWidth === 'wide'
                ? "max-w-4xl lg:max-w-5xl xl:max-w-5xl py-6 px-4 sm:px-6 w-full"
                : "max-w-[1600px] w-full py-6 px-6 sm:px-8"
            )}>
              <div className="h-full">
              {isCompareMode ? (
                /* Multi-Model Compare View */
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 overflow-hidden min-h-0 mb-4">
                    <Suspense fallback={<div className="flex items-center justify-center h-full p-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                      <CompareChatView
                        modelA={compareModelA}
                        modelB={compareModelB}
                        onModelAChange={setCompareModelA}
                        onModelBChange={setCompareModelB}
                        availableModels={sortedModels.map(id => ({ id, displayName: modelConfigs[id]?.displayName || id }))}
                        streamStateA={streamStateA}
                        streamStateB={streamStateB}
                        onSelectWinningResponse={handleSelectWinningResponse}
                        onPreviewArtifact={(art) => setActiveArtifact(art)}
                      />
                    </Suspense>
                  </div>
                  <div className="flex-shrink-0 bg-background/95 backdrop-blur pt-3 max-w-4xl lg:max-w-5xl mx-auto w-full">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onStopGeneration={handleStopGeneration}
                      loading={streamStateA.isLoading || streamStateB.isLoading}
                      visionSupported={visionSupported}
                      models={sortedModels}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                      toolsCount={mcpTools.length}
                      modelConfigs={modelConfigs}
                      focusSignal={chatFocusSignal}
                      onModelConfigUpdated={handleModelConfigUpdated}
                      powerUserMode={isPowerUser}
                      showButtonLabels={showButtonLabels}
                      harnessMode={harnessMode}
                      agentHarness={agentHarness}
                      onHarnessChange={handleAgentHarnessChange}
                      workspaceInfo={workspaceInfo}
                      onSelectWorkspace={handleSelectWorkspace}
                      favoriteModels={favoriteModels}
                      onToggleFavoriteModel={handleToggleFavoriteModel}
                    />
                  </div>
                </div>
              ) : (messages.length === 0 && (activeTab === 'chat' || !showTrajectoryTab)) ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center h-full max-w-4xl lg:max-w-5xl mx-auto w-full px-4 py-6 overflow-y-auto">
                  <WelcomeScreen
                    showTips={showWelcomeTips}
                    showSuggestions={showWelcomeSuggestions}
                    hasNoModels={initialLoadComplete && sortedModels.length === 0}
                    onSelectPrompt={(promptText) => {
                      setPresetInputMessage(promptText);
                      setChatFocusSignal(prev => prev + 1);
                    }}
                  />
                  {/* Chat Input */}
                  <div className="w-full">
                    <ChatInput
                      onSendMessage={(msg, opts) => {
                        setPresetInputMessage('');
                        handleSendMessage(msg, opts);
                      }}
                      onStopGeneration={handleStopGeneration}
                      loading={loading}
                      visionSupported={visionSupported}
                      models={sortedModels}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                      toolsCount={mcpTools.length}
                      modelConfigs={modelConfigs}
                      focusSignal={chatFocusSignal}
                      onModelConfigUpdated={handleModelConfigUpdated}
                      powerUserMode={isPowerUser}
                      showButtonLabels={showButtonLabels}
                      presetMessage={presetInputMessage}
                      harnessMode={harnessMode}
                      agentHarness={agentHarness}
                      onHarnessChange={handleAgentHarnessChange}
                      workspaceInfo={workspaceInfo}
                      onSelectWorkspace={handleSelectWorkspace}
                      favoriteModels={favoriteModels}
                      onToggleFavoriteModel={handleToggleFavoriteModel}
                    />
                  </div>
                </div>
              ) : (activeTab === 'trajectory' && showTrajectoryTab) ? (
                /* Trajectory View */
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 overflow-hidden min-h-0 mb-4">
                    <Suspense fallback={<div className="flex items-center justify-center h-full p-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                      <TrajectoryView
                        messages={messages}
                        currentChatTitle={currentChatTitle}
                        activeProject={activeProject}
                        activePersona={activePersona}
                        workspaceInfo={workspaceInfo}
                        harnessMode={harnessMode}
                        canvasDoc={canvasDoc}
                        selectedText={selectedText}
                        selectedModel={selectedModel}
                        mcpTools={mcpTools}
                        loading={loading}
                        onPreviewArtifact={(art) => setActiveArtifact(art)}
                        onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                        onRollback={handleRollback}
                      />
                    </Suspense>
                  </div>

                  <div className="flex-shrink-0 bg-background/95 backdrop-blur pt-3">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onStopGeneration={handleStopGeneration}
                      loading={loading}
                      visionSupported={visionSupported}
                      models={sortedModels}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                      toolsCount={mcpTools.length}
                      modelConfigs={modelConfigs}
                      focusSignal={chatFocusSignal}
                      onModelConfigUpdated={handleModelConfigUpdated}
                      powerUserMode={isPowerUser}
                      showButtonLabels={showButtonLabels}
                      harnessMode={harnessMode}
                      agentHarness={agentHarness}
                      onHarnessChange={handleAgentHarnessChange}
                      workspaceInfo={workspaceInfo}
                      onSelectWorkspace={handleSelectWorkspace}
                      favoriteModels={favoriteModels}
                      onToggleFavoriteModel={handleToggleFavoriteModel}
                    />
                  </div>
                </div>
              ) : (
                /* Chat View */
                <div className="flex flex-col h-full min-h-0 relative">
                  {initialLoadComplete && sortedModels.length === 0 && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-foreground shadow-sm animate-in fade-in duration-300 flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Key className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs text-foreground/90 font-medium truncate">
                          {t('chat.noModelsAlert')}
                        </span>
                      </div>
                      <Link
                        to="/settings"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-medium transition-colors shrink-0 shadow-2xs"
                      >
                        <Key className="w-3 h-3" />
                        <span>{t('common.goToSettings')}</span>
                      </Link>
                    </div>
                  )}
                  <div 
                    ref={messagesContainerRef} 
                    className="flex-1 overflow-y-auto mb-6 min-h-0 custom-scrollbar"
                    style={{ willChange: 'scroll-position' }}
                  >
                    <MessageList 
                      messages={messages} 
                      onToolCallExecute={executeToolCall} 
                      onRemoveLastMessage={handleRemoveLastMessage}
                      onReloadFromMessage={handleReloadFromMessage}
                      onBranchFromMessage={handleBranchFromMessage}
                      loading={loading}
                      onActionsVisible={scrollToBottom}
                      onPreviewArtifact={(art) => setActiveArtifact(art)}
                      interfaceMode={interfaceMode}
                    />
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Floating Scroll to Bottom button */}
                  {isUserScrolling && messages.length > 0 && (
                    <button
                      onClick={() => {
                        userScrollingRef.current = false;
                        setIsUserScrolling(false);
                        scrollToBottom(false);
                      }}
                      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center p-2.5 rounded-full bg-card/95 hover:bg-accent text-foreground shadow-lg border border-border/80 backdrop-blur transition-all duration-200 hover:scale-105"
                      aria-label="Scroll to bottom"
                      title={t('chat.scrollToBottom') || "Rolar para o final"}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                  
                  <div className="flex-shrink-0 bg-background/95 backdrop-blur pt-6">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onStopGeneration={handleStopGeneration}
                      loading={loading}
                      visionSupported={visionSupported}
                      models={sortedModels}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                      onOpenSkillsModal={() => handleOpenSkillsModal('installed')}
                      toolsCount={mcpTools.length}
                      modelConfigs={modelConfigs}
                      focusSignal={chatFocusSignal}
                      onModelConfigUpdated={handleModelConfigUpdated}
                      powerUserMode={isPowerUser}
                      showButtonLabels={showButtonLabels}
                      harnessMode={harnessMode}
                      agentHarness={agentHarness}
                      onHarnessChange={handleAgentHarnessChange}
                      workspaceInfo={workspaceInfo}
                      onSelectWorkspace={handleSelectWorkspace}
                      favoriteModels={favoriteModels}
                      onToggleFavoriteModel={handleToggleFavoriteModel}
                    />
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side Artifacts Panel */}
        {activeArtifact && !isCanvasOpen && (
          <Suspense fallback={null}>
            <ArtifactsPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          </Suspense>
        )}

        {/* Side-by-side Canvas Panel */}
        {isCanvasOpen && canvasDoc && (
          <Suspense fallback={null}>
            <CanvasPanel
              onSendPrompt={(prompt) => handleSendMessage(prompt)}
            />
          </Suspense>
        )}

        {/* Side-by-side Interactive Terminal Panel */}
        {isTerminalOpen && (
          <Suspense fallback={null}>
            <TerminalPanel
              onClose={() => setIsTerminalOpen(false)}
              isMaximized={isTerminalMaximized}
              onToggleMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
              initialCwd={workspacePath}
            />
          </Suspense>
        )}

        {/* Side-by-side Background Tasks Panel */}
        {isTasksOpen && (
          <Suspense fallback={null}>
            <BackgroundTasksPanel
              onClose={() => setIsTasksOpen(false)}
              isMaximized={isTasksMaximized}
              onToggleMaximize={() => setIsTasksMaximized(!isTasksMaximized)}
            />
          </Suspense>
        )}

        {/* Side-by-side Embedded Browser Panel */}
        {isBrowserOpen && (
          <Suspense fallback={null}>
            <BrowserPanel
              onClose={() => setIsBrowserOpen(false)}
              isMaximized={isBrowserMaximized}
              onToggleMaximize={() => setIsBrowserMaximized(!isBrowserMaximized)}
            />
          </Suspense>
        )}

        {/* Side-by-side Workspace File Explorer Panel */}
        {isExplorerOpen && (
          <Suspense fallback={null}>
            <WorkspaceExplorerPanel
              onClose={() => setIsExplorerOpen(false)}
              isMaximized={isExplorerMaximized}
              onToggleMaximize={() => setIsExplorerMaximized(!isExplorerMaximized)}
              workspacePath={workspacePath}
              workspaceInfo={workspaceInfo}
              onSelectWorkspace={handleSelectWorkspace}
              onOpenFileInCanvas={handleOpenFileInCanvas}
              onInsertPrompt={handleInsertPrompt}
            />
          </Suspense>
        )}
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {isToolsPanelOpen && (
          <ToolsPanel
            tools={mcpTools}
            onClose={() => setIsToolsPanelOpen(false)}
            onDisconnectServer={disconnectMcpServer}
            onReconnectServer={reconnectMcpServer}
          />
        )}

        {pendingApprovalCall && (
          <ToolApprovalModal
            toolCall={pendingApprovalCall}
            onApprove={handleToolApproval}
          />
        )}

        {isMcpCatalogOpen && (
          <McpCatalogModal
            isOpen={isMcpCatalogOpen}
            onClose={() => setIsMcpCatalogOpen(false)}
            onServerInstalled={async () => {
              await refreshMcpTools();
            }}
          />
        )}

        <WorkflowsModal
          isOpen={isWorkflowsOpen}
          onClose={() => setIsWorkflowsOpen(false)}
          onRun={async (workflow) => {
            const result = await window.electron.workflows.buildPrompt(workflow.id, {});
            if (!result?.success) return;
            localStorage.setItem('neochat_agent_mode', 'true');
            setIsWorkflowsOpen(false);
            await handleSendMessage(result.prompt);
          }}
        />

        {/* Project Modals */}
        <ProjectModal />
        <MoveToProjectModal />
        <KnowledgeBaseModal
          isOpen={isKnowledgeBaseModalOpen}
          onClose={closeKnowledgeBaseModal}
          projectId={activeProjectId}
          projectName={activeProject?.name}
        />

        {/* Keyboard Shortcuts Central Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />

        {/* Command Palette Global Launcher (Ctrl+Shift+P) */}
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenSettings={() => navigate('/settings')}
          onOpenKnowledgeBase={openKnowledgeBaseModal}
          onOpenWorkflows={() => setIsWorkflowsOpen(true)}
          onOpenProjects={openCreateProjectModal}
          onOpenMcpCatalog={() => setIsMcpCatalogOpen(true)}
          onToggleCompareMode={() => setIsCompareMode(prev => !prev)}
          onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
          onToggleBackgroundTasks={() => setIsTasksOpen(prev => !prev)}
          onToggleBrowser={() => setIsBrowserOpen(prev => !prev)}
          onOpenSwarmModal={() => setIsSwarmModalOpen(true)}
          onOpenPluginsManager={() => setIsPluginsManagerOpen(true)}
          onOpenSkills={(tab) => handleOpenSkillsModal(tab || 'installed')}
          onOpenArenaModal={() => setIsArenaModalOpen(true)}
          onOpenLiveSandbox={() => setIsLiveSandboxOpen(true)}
          onOpenPodcastStudio={() => setIsPodcastStudioOpen(true)}
          onOpenKnowledgeGraph={() => setIsKnowledgeGraphOpen(true)}
          onOpenDailyBriefing={() => setIsDailyBriefingOpen(true)}
          onOpenMcpHub={() => setIsMcpHubOpen(true)}
          onOpenComputerVision={() => setIsComputerVisionOpen(true)}
          onTriggerSnip={handleStartSnip}
          onTriggerVoice={() => {
            // Trigger voice push-to-talk
          }}
          availableModels={models}
          currentModel={selectedModel}
          onSelectModel={(m) => setSelectedModel(m)}
          personas={getStoredPersonas(t)}
          activePersona={activePersona}
          onSelectPersona={(p) => setActivePersona(p)}
          onClearChat={clearCurrentChat}
          onNewChat={handleNewChat}
          onExportChat={handleExportChat}
        />

        {/* Multi-Agent Swarm Team Modal */}
        <SwarmTeamModal
          isOpen={isSwarmModalOpen}
          onClose={() => setIsSwarmModalOpen(false)}
          currentModel={selectedModel}
          onSendToChat={(content) => {
            handleSendMessage(content);
          }}
        />

        {/* Snip & Ask Screen Capture Modal */}
        <SnipModal
          isOpen={isAppSnipModalOpen}
          onClose={() => setIsAppSnipModalOpen(false)}
          onCaptureComplete={(capturedFile) => {
            setIsAppSnipModalOpen(false);
            if (capturedFile) {
              handleSendMessage('', [capturedFile]);
            }
          }}
        />

        {/* Modular Plugins Manager Hub Modal */}
        <PluginsManagerModal
          isOpen={isPluginsManagerOpen}
          onClose={() => setIsPluginsManagerOpen(false)}
          onOpenPluginModal={(pluginId) => {
            if (pluginId === 'arena') setIsArenaModalOpen(true);
            else if (pluginId === 'live-preview') setIsLiveSandboxOpen(true);
            else if (pluginId === 'podcast-studio') setIsPodcastStudioOpen(true);
            else if (pluginId === 'knowledge-graph') setIsKnowledgeGraphOpen(true);
            else if (pluginId === 'daily-briefing') setIsDailyBriefingOpen(true);
            else if (pluginId === 'mcp-hub') setIsMcpHubOpen(true);
            else if (pluginId === 'computer-vision') setIsComputerVisionOpen(true);
            else if (pluginId === 'rag') openKnowledgeBaseModal();
            else if (pluginId === 'canvas') handleToggleCanvas();
            else if (pluginId === 'workflows') setIsWorkflowsOpen(true);
            else if (pluginId === 'swarm') setIsSwarmModalOpen(true);
            else if (pluginId === 'terminal') setIsTerminalOpen(true);
            else if (pluginId === 'browser') setIsBrowserOpen(true);
          }}
        />

        {/* AI Arena & Debate Multi-Modelos */}
        <ArenaModal
          isOpen={isArenaModalOpen}
          onClose={() => setIsArenaModalOpen(false)}
          currentModel={selectedModel}
          availableModels={sortedModels}
          modelConfigs={modelConfigs}
          activeProject={activeProject}
          projects={projects}
          onSendToChat={(content) => handleSendMessage(content)}
          onOpenCanvas={() => handleToggleCanvas()}
        />

        {/* Web Sandbox & Live Preview */}
        <LiveSandboxModal
          isOpen={isLiveSandboxOpen}
          onClose={() => setIsLiveSandboxOpen(false)}
        />

        {/* Podcast & Audio Studio */}
        <PodcastStudioModal
          isOpen={isPodcastStudioOpen}
          onClose={() => setIsPodcastStudioOpen(false)}
        />

        {/* Knowledge Graph & Data Studio */}
        <KnowledgeGraphModal
          isOpen={isKnowledgeGraphOpen}
          onClose={() => setIsKnowledgeGraphOpen(false)}
        />

        {/* Proactive Daily Briefing */}
        <DailyBriefingModal
          isOpen={isDailyBriefingOpen}
          onClose={() => setIsDailyBriefingOpen(false)}
          onSendToChat={(content) => handleSendMessage(content)}
        />

        {/* Community MCP Hub & Store */}
        <McpHubModal
          isOpen={isMcpHubOpen}
          onClose={() => setIsMcpHubOpen(false)}
          onOpenSettingsMcp={() => navigate('/settings?tab=integrations')}
        />

        {/* Computer Vision & Desktop Assistant */}
        <ComputerVisionModal
          isOpen={isComputerVisionOpen}
          onClose={() => setIsComputerVisionOpen(false)}
          onSendToChat={(content) => handleSendMessage(content)}
        />

        {/* User Persistent Long-Term Memory */}
        <UserMemoryModal
          isOpen={isUserMemoryModalOpen}
          onClose={() => setIsUserMemoryModalOpen(false)}
        />

        {/* AI Skills & Capabilities Central Hub */}
        <SkillsModal
          isOpen={isSkillsModalOpen}
          onClose={() => setIsSkillsModalOpen(false)}
          initialTab={skillsModalInitialTab}
          onInvokeSkill={(skill) => {
            const cmd = skill.slashCommand || skill.id;
            handleSendMessage(`/${cmd} `);
          }}
        />
      </Suspense>

      {/* Floating Memory Notification Toast */}
      {memoryToast && (
        <div className="fixed bottom-6 right-6 z-[10000] max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-3.5 rounded-2xl bg-card border border-purple-500/30 text-foreground shadow-2xl flex items-start gap-3 bg-card/95 backdrop-blur-md">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
                <span>{memoryToast.type === 'added' ? '🧠 Nova memória aprendida' : '🧠 Memória esquecida'}</span>
                {memoryToast.category && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-normal">
                    {memoryToast.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                &ldquo;{memoryToast.message}&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUserMemoryModalOpen(true)}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0 self-center"
            >
              Ver
            </button>
            <button
              type="button"
              onClick={() => setMemoryToast(null)}
              className="p-1 rounded text-muted-foreground hover:text-foreground shrink-0 self-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default App;
