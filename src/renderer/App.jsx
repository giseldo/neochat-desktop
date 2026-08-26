import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ToolsPanel from './components/ToolsPanel';
import ToolApprovalModal from './components/ToolApprovalModal';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import ThemeToggle from './components/ThemeToggle';
import PersonaSelector, { DEFAULT_PERSONAS, getStoredActivePersona, ACTIVE_PERSONA_STORAGE_KEY } from './components/PersonaSelector';
import ArtifactsPanel from './components/ArtifactsPanel';
import McpCatalogModal from './components/McpCatalogModal';
import ConversationStats from './components/ConversationStats';
import TrajectoryView from './components/TrajectoryView';
import ProjectModal from './components/ProjectModal';
import MoveToProjectModal from './components/MoveToProjectModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import CompareChatView from './components/CompareChatView';
import WorkflowsModal from './components/WorkflowsModal';
import WelcomeScreen from './components/WelcomeScreen';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useChat } from './context/ChatContext';
import { useProjects } from './context/ProjectContext';
import { useLanguage } from './context/LanguageContext';
import { Settings, PanelLeftClose, PanelLeft, Radio, MessagesSquare, Sparkles, Store, Columns2, X, FolderKanban, BookOpen, Scale, Bot, Workflow, ChevronDown, Keyboard } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { groupModels } from './lib/modelGrouping';
import { extractThinking } from './lib/messageUtils';

// LocalStorage keys
const TOOL_APPROVAL_PREFIX = 'tool_approval_';
const YOLO_MODE_KEY = 'tool_approval_yolo_mode';

// --- LocalStorage Helper Functions ---
const getToolApprovalStatus = async (toolName, serverLabel) => {
  if (window.electron?.toolPermissions?.resolve) {
    return window.electron.toolPermissions.resolve(toolName, serverLabel);
  }
  try {
    const yoloMode = localStorage.getItem(YOLO_MODE_KEY);
    if (yoloMode === 'true') {
      return 'yolo';
    }
    const toolStatus = localStorage.getItem(`${TOOL_APPROVAL_PREFIX}${toolName}`);
    if (toolStatus === 'always') {
      return 'always';
    }
    // Default: prompt the user
    return 'prompt';
  } catch (error) {
    console.error("Error reading tool approval status from localStorage:", error);
    return 'prompt'; // Fail safe: prompt user if localStorage fails
  }
};

const setToolApprovalStatus = async (toolName, status, serverLabel) => {
  if (window.electron?.toolPermissions) {
    if (status === 'always') return window.electron.toolPermissions.set(toolName, 'allow', serverLabel);
    if (status === 'never') return window.electron.toolPermissions.set(toolName, 'deny', serverLabel);
    if (status === 'yolo') return window.electron.toolPermissions.setGlobal({ allowAll: true });
    return;
  }
  try {
    if (status === 'yolo') {
      localStorage.setItem(YOLO_MODE_KEY, 'true');
      // Optionally clear specific tool settings when YOLO is enabled?
      // Object.keys(localStorage).forEach(key => {
      //   if (key.startsWith(TOOL_APPROVAL_PREFIX)) {
      //     localStorage.removeItem(key);
      //   }
      // });
    } else if (status === 'always') {
      localStorage.setItem(`${TOOL_APPROVAL_PREFIX}${toolName}`, 'always');
      // Ensure YOLO mode is off if a specific tool is set to always
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'once') {
      // 'once' doesn't change persistent storage, just allows current execution
      // Ensure YOLO mode is off if 'once' is chosen for a specific tool
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'deny') {
       // 'deny' also doesn't change persistent storage by default.
       // Could potentially add a 'never' status if needed.
       // Ensure YOLO mode is off if 'deny' is chosen
       localStorage.removeItem(YOLO_MODE_KEY);
    }
  } catch (error) {
    console.error("Error writing tool approval status to localStorage:", error);
  }
};
// --- End LocalStorage Helper Functions ---


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
    isSidebarCollapsed,
    toggleSidebar,
    needsTitleGeneration
  } = useChat(); // Use context state
  const {
    activeProject,
    activeProjectId,
    setActiveProjectId,
    openEditProjectModal,
    isKnowledgeBaseModalOpen,
    openKnowledgeBaseModal,
    closeKnowledgeBaseModal
  } = useProjects();
  const { t } = useLanguage();
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
  const [modelFilter, setModelFilter] = useState(''); // State for model filter setting
  const [modelFilterExclude, setModelFilterExclude] = useState(''); // State for model filter exclude setting
  const [disabledModels, setDisabledModels] = useState([]); // State for disabled models list

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

  useEffect(() => {
    if (activePersona?.id) {
      try {
        localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, activePersona.id);
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

  // --- Autonomous Agent Mode State ---
  const [agentStep, setAgentStep] = useState(0);
  // --- End Autonomous Agent Mode State ---

  // --- Preset Input Message State for Welcome suggestions ---
  const [presetInputMessage, setPresetInputMessage] = useState('');
  // --- End Preset Input Message State ---

  useEffect(() => {
    if (!isPowerUser) {
      setActiveTab('chat');
      setIsCompareMode(false);
      setIsToolsPanelOpen(false);
      setIsMcpCatalogOpen(false);
    }
  }, [isPowerUser]);

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

  // Helper function to filter models based on modelFilter setting and disabledModels list
  const filterModels = (modelList, filterText, excludeText, configs, disabledList = []) => {
    let filteredModels = modelList;

    // Filter out disabled models
    if (Array.isArray(disabledList) && disabledList.length > 0) {
      filteredModels = filteredModels.filter(modelId => !disabledList.includes(modelId));
    }

    // First, apply inclusion filter if specified
    if (filterText && filterText.trim()) {
      // Split filter text into lines and filter out empty lines
      const filterTerms = filterText
        .split('\n')
        .map(term => term.trim())
        .filter(term => term.length > 0);

      if (filterTerms.length > 0) {
        // Helper to get display name for a model
        const getDisplayName = (modelId) => {
          const modelInfo = configs[modelId];
          if (modelInfo && modelInfo.displayName) {
            return modelInfo.displayName;
          }
          return modelId;
        };

        // Filter models that match any filter term (case-insensitive)
        filteredModels = filteredModels.filter(modelId => {
          const displayName = getDisplayName(modelId).toLowerCase();
          const modelIdLower = modelId.toLowerCase();
          
          // Check if any filter term matches either the model ID or display name
          return filterTerms.some(term => {
            const termLower = term.toLowerCase();
            return modelIdLower.includes(termLower) || displayName.includes(termLower);
          });
        });
      }
    }

    // Then, apply exclude filter (applies regardless of inclusion filter)
    if (excludeText && excludeText.trim()) {
      // Split exclude text into lines and filter out empty lines
      const excludeTerms = excludeText
        .split('\n')
        .map(term => term.trim())
        .filter(term => term.length > 0);

      if (excludeTerms.length > 0) {
        // Helper to get display name for a model
        const getDisplayName = (modelId) => {
          const modelInfo = configs[modelId];
          if (modelInfo && modelInfo.displayName) {
            return modelInfo.displayName;
          }
          return modelId;
        };

        // Filter out models that match any exclude term (case-insensitive)
        filteredModels = filteredModels.filter(modelId => {
          const displayName = getDisplayName(modelId).toLowerCase();
          const modelIdLower = modelId.toLowerCase();
          
          // Check if any exclude term matches either the model ID or display name
          const matchesExclude = excludeTerms.some(term => {
            const termLower = term.toLowerCase();
            return modelIdLower.includes(termLower) || displayName.includes(termLower);
          });
          
          // Return false (exclude) if it matches, true (keep) if it doesn't
          return !matchesExclude;
        });
      }
    }

    return filteredModels;
  };

  // Sort and group models by provider/category and display name
  // and apply model filter if configured
  const sortedModels = useMemo(() => {
    // First apply the filters (inclusion, exclude, disabled)
    const filteredModels = filterModels(models, modelFilter, modelFilterExclude, modelConfigs, disabledModels);
    
    // Group and sort models logically by group and display name
    const groups = groupModels(filteredModels, modelConfigs);
    return groups.flatMap(g => g.models);
  }, [models, modelConfigs, modelFilter, modelFilterExclude, disabledModels]);

  // Initialize compare models when sortedModels change
  useEffect(() => {
    if (sortedModels.length > 0) {
      if (!compareModelA) setCompareModelA(sortedModels[0]);
      if (!compareModelB) setCompareModelB(sortedModels[1] || sortedModels[0]);
    }
  }, [sortedModels]);

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
      await window.electron.chatHistory.saveMessages(currentChatId, updated);
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
        setShowTrajectoryTab(settings.showTrajectoryTab !== false);
        setShowWelcomeTips(settings.showWelcomeTips === true);
        setShowWelcomeSuggestions(settings.showWelcomeSuggestions === true);
        setShowButtonLabels(settings.showButtonLabels === true);
        // Load model filter settings
        setModelFilter(settings.modelFilter || '');
        setModelFilterExclude(settings.modelFilterExclude || '');
        setDisabledModels(settings.disabledModels || []);
        // Load useResponsesApi setting
        setUseResponsesApi(settings.useResponsesApi || false);
        let effectiveModel = availableModels.length > 0 ? availableModels[0] : 'default'; // Default fallback if no models or no setting

        if (settings && settings.model) {
            // Ensure the saved model is still valid against the loaded configs
            if (configs[settings.model]) {
                effectiveModel = settings.model; // Use saved model if valid
            } else {
                // If saved model is invalid, keep the default fallback (first available model)
                console.warn(`Saved model "${settings.model}" not found in loaded configs. Falling back to ${effectiveModel}.`);
            }
        } else if (availableModels.length > 0) {
             // If no model saved in settings, but models are available, use the first one
            effectiveModel = availableModels[0];
        }
        // If no model in settings and no available models, effectiveModel remains 'default'

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
        setModelFilter(settings.modelFilter || '');
        setModelFilterExclude(settings.modelFilterExclude || '');
        setDisabledModels(settings.disabledModels || []);
        setUseResponsesApi(settings.useResponsesApi || false);

        // Refresh model configs (e.g., after switching provider in Settings).
        // The main process force-refetches models when the provider/key changed.
        const configs = await window.electron.getModelConfigs();
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels);

        // If the currently selected model no longer exists (provider switched),
        // fall back to the first available model.
        if (availableModels.length > 0 && selectedModel && !configs[selectedModel]) {
          setSelectedModel(availableModels[0]);
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
  const handleStopGeneration = () => {
    console.log('Stopping generation...');
    cancelledRef.current = true; // Set cancellation flag
    window.electron.stopChatStream();
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

  // Core function to execute a chat turn (fetch response, handle tools)
  // Refactored from the main loop of handleSendMessage
  const executeChatTurn = async (turnMessages) => {
    let currentTurnStatus = 'processing'; // processing, completed, paused, error
    let turnAssistantMessage = null;
    let turnToolResponses = [];
    const turnStartTime = Date.now();

    try {
        // Create a streaming assistant message placeholder
        const assistantPlaceholder = {
            role: 'assistant',
            content: '',
            isStreaming: true,
            reasoningSummaries: [],
            timestamp: turnStartTime,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantPlaceholder]);

        // Prepare messages to send, including active project instructions and active persona system prompt if defined
        let messagesToSend = [...turnMessages];
        const systemParts = [];
        if (activeProject?.customPrompt && activeProject.customPrompt.trim()) {
            systemParts.push(`[Instruções do Projeto "${activeProject.name}"]:\n${activeProject.customPrompt.trim()}`);
        }
        if (activePersona?.systemPrompt && activePersona.systemPrompt.trim()) {
            systemParts.push(activePersona.systemPrompt.trim());
        }
        if (systemParts.length > 0 && !messagesToSend.some(m => m.role === 'system')) {
            messagesToSend = [{ role: 'system', content: systemParts.join('\n\n') }, ...messagesToSend];
        }

        // Start streaming chat
        const streamHandler = window.electron.startChatStream(messagesToSend, selectedModel);

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
            pre_calculated_tool_responses: undefined
        };

        // Setup event handlers for streaming
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
            
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { 
                        ...newMessages[idx], 
                        content: finalAssistantData.content,
                        reasoningDuration: finalAssistantData.reasoningDuration,
                        liveReasoning: finalAssistantData.liveReasoning,
                        reasoningSummaries: [...finalAssistantData.reasoningSummaries]
                    };
                }
                return newMessages;
            });
        });

        streamHandler.onToolCalls(({ tool_calls }) => {
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
                    durationMs: Date.now() - turnStartTime
                };
                turnAssistantMessage = finalAssistantData; // Store the completed message

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

  // Handle sending message (text or structured content with images)
  const handleSendMessage = async (content) => {
    // Check if content is structured (array) or just text (string)
    const isStructuredContent = Array.isArray(content);
    const hasContent = isStructuredContent ? content.some(part => (part.type === 'text' && part.text.trim()) || part.type === 'image_url') : content.trim();

    if (!hasContent) return;

    // If no current chat exists, create one first with current API mode
    if (!currentChatId) {
      await createNewChat(selectedModel, useResponsesApi);
    }

    // Reset cancellation flag for new message
    cancelledRef.current = false;
    
    // Reset user scrolling flag so new messages auto-scroll
    userScrollingRef.current = false;
    setIsUserScrolling(false);

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
    const isAgentModeActive = localStorage.getItem('neochat_agent_mode') === 'true';
    const MAX_TOOL_ITERATIONS = isAgentModeActive ? 25 : 12; // Prevent infinite tool execution loops

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
    
    const projId = targetProjectId !== undefined ? targetProjectId : activeProjectId;
    if (targetProjectId !== undefined) {
      setActiveProjectId(targetProjectId);
    }
    
    // Create a new chat in history with the current API mode and target project
    await createNewChat(selectedModel, useResponsesApi, projId);

    // Signal the ChatInput to focus on the text area
    setChatFocusSignal(s => s + 1);
  }, [loading, createNewChat, selectedModel, useResponsesApi, activeProjectId, setActiveProjectId]);

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
  }, [handleNewChat, toggleSidebar, navigate]);

  // Handle when a chat is loaded from history - switch API mode and sync active project if needed
  const handleChatLoaded = useCallback(async (chat) => {
    if (!chat) return;

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
  }, [useResponsesApi, setActiveProjectId]);

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
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Modern Sticky Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm shadow-xs">
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

              {/* Chat / Trajectory Tab Switcher */}
              {isPowerUser && showTrajectoryTab && (
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'chat'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('trajectory.chatTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('trajectory')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      activeTab === 'trajectory'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{t('trajectory.trajectoryTab')}</span>
                    {messages.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </div>
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
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs hover:opacity-90"
                  style={{ 
                    backgroundColor: `${activeProject.color || '#f55036'}18`, 
                    borderColor: `${activeProject.color || '#f55036'}40`,
                    color: activeProject.color || '#f55036' 
                  }}
                  onClick={() => openEditProjectModal(activeProject)}
                  title={`${t('projects.activeBadge')}: ${activeProject.name}`}
                >
                  <span className="text-xs">{activeProject.icon || '📁'}</span>
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
                  className="h-7 px-2.5 text-xs flex items-center gap-1.5 rounded-lg border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 shadow-2xs"
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
              {isPowerUser && <ConversationStats messages={messages} />}
            </div>

            <div className="flex items-center space-x-2">
              {isPowerUser && <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWorkflowsOpen(true)}
                className="text-xs text-foreground border-border hover:bg-muted"
                title={t('workflows.title')}
              >
                <Workflow className={cn("h-3.5 w-3.5 text-primary", showButtonLabels && "mr-1.5")} />
                {showButtonLabels && <span className="hidden lg:inline">{t('workflows.title')}</span>}
              </Button>}
              {/* MCP Catalog Button */}
              {isPowerUser && <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMcpCatalogOpen(true)}
                className="text-xs text-foreground border-border hover:bg-muted"
                title={t('mcpCatalog.title')}
              >
                <Store className={cn("h-3.5 w-3.5 text-primary", showButtonLabels && "mr-1.5")} />
                {showButtonLabels && <span className="hidden md:inline">{t('header.mcpStore')}</span>}
              </Button>}

              {/* Compare Mode Toggle Button */}
              {isPowerUser && <Button
                variant={isCompareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCompareMode(!isCompareMode)}
                className={cn(
                  "text-xs border-border transition-colors",
                  isCompareMode 
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" 
                    : "text-foreground hover:bg-muted"
                )}
                title={t('header.compareModels')}
              >
                <Scale className={cn("h-3.5 w-3.5 text-purple-400", showButtonLabels && "mr-1.5")} />
                {showButtonLabels && <span className="hidden md:inline">{t('header.compareModels')}</span>}
              </Button>}

              {/* Theme & Quick Appearance / Mode Toggle */}
              <ThemeToggle
                interfaceMode={interfaceMode}
                onInterfaceModeChange={handleInterfaceModeChange}
              />

              
              {/* Keyboard Shortcuts Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsShortcutsModalOpen(true)}
                className="text-foreground hover:bg-muted" 
                title={t('header.keyboardShortcuts')}
              >
                <Keyboard className="h-5 w-5" />
              </Button>

              <Link to="/settings">
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted" title={t('header.settings')}>
                  <Settings className="h-5 w-5" />
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
          <span>Passo {agentStep} de {localStorage.getItem('neochat_agent_mode') === 'true' ? 25 : 12}</span>
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
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto py-8 px-8 h-full">
              <div className="h-full">
              {isCompareMode ? (
                /* Multi-Model Compare View */
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 overflow-hidden min-h-0 mb-4">
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
                    />
                  </div>
                </div>
              ) : (messages.length === 0 && (activeTab === 'chat' || !showTrajectoryTab)) ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center h-full max-w-4xl lg:max-w-5xl mx-auto w-full px-4 py-6 overflow-y-auto">
                  <WelcomeScreen
                    showTips={showWelcomeTips}
                    showSuggestions={showWelcomeSuggestions}
                    onSelectPrompt={(promptText) => {
                      setPresetInputMessage(promptText);
                      setChatFocusSignal(prev => prev + 1);
                    }}
                  />
                  {/* Chat Input */}
                  <div className="w-full">
                    <ChatInput
                      onSendMessage={(msg, files) => {
                        setPresetInputMessage('');
                        handleSendMessage(msg, files);
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
                    />
                  </div>
                </div>
              ) : (activeTab === 'trajectory' && showTrajectoryTab) ? (
                /* Trajectory View */
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 overflow-hidden min-h-0 mb-4">
                    <TrajectoryView
                      messages={messages}
                      currentChatTitle={currentChatTitle}
                      activeProject={activeProject}
                      selectedModel={selectedModel}
                      mcpTools={mcpTools}
                      loading={loading}
                      onPreviewArtifact={(art) => setActiveArtifact(art)}
                      onOpenMcpTools={() => setIsToolsPanelOpen(true)}
                    />
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
                    />
                  </div>
                </div>
              ) : (
                /* Chat View */
                <div className="flex flex-col h-full min-h-0 relative">
                  <div 
                    ref={messagesContainerRef} 
                    className="flex-1 overflow-y-auto mb-6 min-h-0"
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
                      className="absolute bottom-28 right-6 z-20 flex items-center justify-center p-2.5 rounded-full bg-card/95 hover:bg-accent text-foreground shadow-lg border border-border/80 backdrop-blur transition-all duration-200 hover:scale-105"
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
                      toolsCount={mcpTools.length}
                      modelConfigs={modelConfigs}
                      focusSignal={chatFocusSignal}
                      onModelConfigUpdated={handleModelConfigUpdated}
                      powerUserMode={isPowerUser}
                      showButtonLabels={showButtonLabels}
                    />
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side Artifacts Panel */}
        {activeArtifact && (
          <div className="w-full md:w-[480px] lg:w-[580px] flex-shrink-0 h-full border-l border-border">
            <ArtifactsPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
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

      </div>
    </div>
  );
}

export default App;
