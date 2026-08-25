import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Trash2, Edit3, Save, X, RefreshCw, Key, Settings as SettingsIcon, Zap, Cpu, Server, AlertCircle, CheckCircle, Sun, Moon, Laptop, Languages, Check, Terminal, Globe, Palette, Type, Sparkles, Sliders, ExternalLink, Route, User, Wrench, Download, UploadCloud } from 'lucide-react';
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
    resolvedTheme,
    isDark
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isPromptTemplatesModalOpen, setIsPromptTemplatesModalOpen] = useState(false);
  const [isTestingWebSearch, setIsTestingWebSearch] = useState(false);
  const [webSearchTestResult, setWebSearchTestResult] = useState(null);
  const [settings, setSettings] = useState({
    language: 'pt',
    interfaceMode: 'user',
    showTrajectoryTab: true,
    GROQ_API_KEY: '',
    temperature: 0.7,
    top_p: 0.95,
    reasoning_effort: 'medium',
    mcpServers: {},
    disabledMcpServers: [],
    customSystemPrompt: '',
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
    webSearch: {
      enabled: true,
      provider: 'local',
      apiKey: '',
      maxResults: 5
    },
    modelFilter: '',
    modelFilterExclude: '',
    disableThinkingSummaries: false,
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
    autoUpdate: { checkOnStartup: true, channel: 'stable' }
  });
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });
  const [editingServerId, setEditingServerId] = useState(null);
  const [newCustomModel, setNewCustomModel] = useState({
    id: '',
    displayName: '',
    context: 8192,
    vision_supported: false,
    builtin_tools_supported: false
  });
  const [editingModelId, setEditingModelId] = useState(null);
  
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

  // Handle Escape key to dismiss settings or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDeletingAllModalOpen && !isDeletingAll) {
          setIsDeletingAllModalOpen(false);
        } else if (!isDeletingAllModalOpen) {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isDeletingAllModalOpen, isDeletingAll]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const list = await window.electron.getProviders();
        setProviders(list || []);
        return list || [];
      } catch (error) {
        console.error('Error fetching providers:', error);
        return [];
      }
    };

    const loadSettings = async () => {
      try {
        const providerList = await loadProviders();
        const settingsData = await window.electron.getSettings();
        if (!settingsData.disabledMcpServers) {
            settingsData.disabledMcpServers = [];
        }
        settingsData.interfaceMode = settingsData.interfaceMode === 'power' ? 'power' : 'user';
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
                maxResults: 5
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
        if (settingsData.disableThinkingSummaries === undefined) {
            settingsData.disableThinkingSummaries = false;
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
        setSettings(settingsData);
        const provider = (providerList || []).find(p => p.id === settingsData.provider);
        setActiveProvider(provider || null);
        
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
            customSystemPrompt: '',
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
            modelFilter: '',
            modelFilterExclude: '',
            disableThinkingSummaries: false,
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

    const getSettingsPath = async () => {
      try {
        const path = await window.electron.getSettingsPath();
        setSettingsPath(path);
      } catch (error) {
        console.error('Error getting settings path:', error);
      }
    };

    loadSettings();
    getSettingsPath();

    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

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
        if (result.success) {
          setSaveStatus({ type: 'success', message: t('settings.savedSuccess') });
          
          if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
          }
          statusTimeoutRef.current = setTimeout(() => {
            setSaveStatus(null);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', message: t('settings.failedSave', { error: result.error }) });
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

  const handleProviderChange = (value) => {
    const updatedSettings = { ...settings, provider: value };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    const provider = providers.find(p => p.id === value);
    setActiveProvider(provider || null);
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
      ...(settings.webSearch || { enabled: true, provider: 'local', apiKey: '', maxResults: 5 }),
      [field]: value
    };
    const updatedSettings = {
      ...settings,
      webSearch: updatedWebSearch
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleTestWebSearch = async () => {
    setIsTestingWebSearch(true);
    setWebSearchTestResult(null);
    try {
      const searchOpts = settings.webSearch || { provider: 'local', apiKey: '', maxResults: 5 };
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

  // Custom Model Management Functions
  const handleNewCustomModelChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCustomModel(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'context' ? parseInt(value) || 8192 : value)
    }));
  };

  const handleSaveCustomModel = (e) => {
    e.preventDefault();
    
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
      builtin_tools_supported: newCustomModel.builtin_tools_supported
    };

    console.log('Saving custom model:', newCustomModel.id, 'with config:', modelConfig);
    
    // Update settings with new/updated custom model
    const updatedSettings = {
      ...settings,
      customModels: {
        ...settings.customModels,
        [newCustomModel.id]: modelConfig
      }
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    
    // Clear the form
    setNewCustomModel({ id: '', displayName: '', context: 8192, vision_supported: false, builtin_tools_supported: false });
    setEditingModelId(null);
  };

  const removeCustomModel = (modelId) => {
    const updatedCustomModels = { ...settings.customModels };
    delete updatedCustomModels[modelId];
    
    const updatedSettings = {
      ...settings,
      customModels: updatedCustomModels
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    // If the removed model was being edited, cancel the edit
    if (editingModelId === modelId) {
      cancelModelEditing();
    }
  };

  const startModelEditing = (modelId) => {
    const modelToEdit = settings.customModels[modelId];
    if (!modelToEdit) return;

    setEditingModelId(modelId);
    setNewCustomModel({
      id: modelId,
      displayName: modelToEdit.displayName || '',
      context: modelToEdit.context || 8192,
      vision_supported: modelToEdit.vision_supported || false,
      builtin_tools_supported: modelToEdit.builtin_tools_supported || false
    });
  };

  const cancelModelEditing = () => {
    setEditingModelId(null);
    setNewCustomModel({ id: '', displayName: '', context: 8192, vision_supported: false, builtin_tools_supported: false });
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

  const updateAutoUpdate = (updates) => {
    const updatedSettings = { ...settings, autoUpdate: { ...(settings.autoUpdate || {}), ...updates } };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground" title={t('settings.backToChat')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reloadSettingsFromDisk}
              disabled={isSaving}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
              {t('settings.reloadBtn')}
            </Button>
          </div>
        </div>
      </header>

      {/* Status Message */}
      {(isSaving || saveStatus) && (
        <div className="border-b bg-background">
          <div className="container px-6 py-3">
            <div className={`flex items-center space-x-2 text-sm ${
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
      <main>
        <div className="container px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Interface experience */}
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
            
            {/* Settings Path Info */}
            {settings.interfaceMode === 'power' && settingsPath && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span>{t('settings.settingsFile')} <code className="text-xs bg-muted px-1 py-0.5 rounded">{settingsPath}</code></span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interface Language Settings */}
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

            {/* Theme & Appearance Settings */}
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

                {/* 6. Live Interactive Preview */}
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

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.ttsTitle')}</CardTitle>
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

            {settings.interfaceMode === 'power' && <>
            {/* API Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-primary" />
                  <span>{t('settings.apiTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.apiDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          <Button
                            type="button"
                            size="sm"
                            variant={settings.provider === 'ollama' ? "secondary" : "default"}
                            onClick={() => handleProviderChange('ollama')}
                            className="h-7 px-2.5 text-xs shrink-0"
                          >
                            {settings.provider === 'ollama' ? '✓ Ativo' : t('settings.connectOllama')}
                          </Button>
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
                          <Button
                            type="button"
                            size="sm"
                            variant={settings.provider === 'lmstudio' ? "secondary" : "default"}
                            onClick={() => handleProviderChange('lmstudio')}
                            className="h-7 px-2.5 text-xs shrink-0"
                          >
                            {settings.provider === 'lmstudio' ? '✓ Ativo' : t('settings.connectLmStudio')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {isDetectingLocalAi ? t('settings.detectingLocalAi') : t('settings.noLocalAiFound')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">{t('settings.providerLabel')}</Label>
                  <Select value={settings.provider || 'groq'} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings.providerPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeProvider && (
                    <p className="text-xs text-muted-foreground">
                      {activeProvider.description}.{' '}
                      {activeProvider.baseUrl
                        ? <>{t('settings.providerEndpoint')} <code className="text-xs bg-muted px-1 py-0.5 rounded">{activeProvider.baseUrl}</code></>
                        : t('settings.providerCustomDesc')}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-border">
                  <Label>{t('settings.fallbackProviders')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.fallbackProvidersHelp')}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {providers.filter(provider => provider.id !== settings.provider).map(provider => {
                      const selected = (settings.fallbackProviders || []).includes(provider.id);
                      return (
                        <button key={provider.id} type="button" onClick={() => toggleFallbackProvider(provider.id)} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                          <span>{provider.name}</span>
                          {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">
                    {t('settings.apiKeyLabel')} {activeProvider ? `(${activeProvider.name})` : ''}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      id="api-key"
                      name="apiKey"
                      value={getActiveApiKeyValue()}
                      onChange={handleApiKeyChange}
                      placeholder={t('settings.apiKeyPlaceholder', { provider: activeProvider?.name || 'provider' })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.apiKeyHelp')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom-api-base-url">
                      {settings.provider === 'custom' ? t('settings.customBaseUrlLabel') : t('settings.customBaseUrlOptional')}
                    </Label>
                    {settings.provider !== 'custom' && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="custom-api-base-url-enabled" className="text-sm font-normal text-muted-foreground">
                          {settings.customApiBaseUrlEnabled ? t('common.enabled') : t('common.disabled')}
                        </Label>
                        <Switch
                          id="custom-api-base-url-enabled"
                          checked={settings.customApiBaseUrlEnabled || false}
                          onChange={(e) => handleToggleChange('customApiBaseUrlEnabled', e.target.checked)}
                        />
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    id="custom-api-base-url"
                    name="customApiBaseUrl"
                    value={settings.customApiBaseUrl || ''}
                    onChange={handleChange}
                    placeholder={t('settings.customBaseUrlPlaceholder')}
                    disabled={settings.provider === 'custom' ? false : !settings.customApiBaseUrlEnabled}
                    className={settings.provider === 'custom' || settings.customApiBaseUrlEnabled ? '' : 'opacity-50'}
                  />
                  {settings.provider === 'custom' ? (
                    <p className="text-xs text-muted-foreground">
                      {t('settings.customBaseUrlHelpCustom')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('settings.customBaseUrlHelpOptional')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Responses API & Connectors */}
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
                              onChange={handleRemoteMcpServerChange}
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

            {/* Generation Parameters */}
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

            {/* Popup Window Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.popupWindowTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.popupWindowDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="popup-enabled" className="font-medium">
                    {t('settings.popupWindowLabel')}
                  </Label>
                  <Switch
                    id="popup-enabled"
                    checked={settings.popupEnabled}
                    onChange={(e) => handleToggleChange('popupEnabled', e.target.checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trajectory Tab Settings */}
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

            {/* Thinking Summaries Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.thinkingSummariesTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.thinkingSummariesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="disable-thinking-summaries" className="font-medium">
                    {t('settings.disableThinkingLabel')}
                  </Label>
                  <Switch
                    id="disable-thinking-summaries"
                    checked={settings.disableThinkingSummaries || false}
                    onChange={(e) => handleToggleChange('disableThinkingSummaries', e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.disableThinkingHelp')}
                </p>
              </CardContent>
            </Card>

            {/* API Request Logging */}
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

            {/* Native Web Search Settings */}
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
                        <Label className="font-medium">{t('settings.webSearchMaxResultsLabel')}</Label>
                        <span className="font-semibold text-primary">{settings.webSearch?.maxResults || 5}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.webSearch?.maxResults || 5}
                        onChange={(e) => handleWebSearchChange('maxResults', parseInt(e.target.value, 10))}
                        className="w-full accent-primary cursor-pointer"
                      />
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

            {/* Built-in Tools Settings */}
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

            {/* Custom System Prompt */}
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.systemPromptTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.systemPromptDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    id="custom-system-prompt"
                    name="customSystemPrompt"
                    value={settings.customSystemPrompt || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder={t('settings.systemPromptPlaceholder')}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Prompt Templates Library & Slash Shortcuts */}
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

            {/* MCP Servers */}
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

            {/* Tool Approvals */}
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

            {/* Data & History */}
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

            {/* Custom Models */}
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
              <CardContent className="space-y-4">
                {/* Configured Custom Models List */}
                {Object.keys(settings.customModels || {}).length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t('settings.configuredCustomModelsTitle', { count: Object.keys(settings.customModels || {}).length })}</h4>
                    <div className="space-y-3">
                      {Object.entries(settings.customModels || {}).map(([id, config]) => (
                        <Card key={id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary">{config.displayName || id}</Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {t('settings.tokensCount', { count: config.context?.toLocaleString() || '8,192' })}
                                  </Badge>
                                  {config.vision_supported && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                      {t('settings.visionBadge')}
                                    </Badge>
                                  )}
                                  {config.builtin_tools_supported && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                      {t('settings.builtinToolsBadge')}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-sm text-muted-foreground font-mono">
                                  {t('settings.modelIdPrefix', { id })}
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startModelEditing(id)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeCustomModel(id)}
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
                    <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('settings.noCustomModels')}</p>
                    <p className="text-sm">{t('settings.addCustomModelGetStarted')}</p>
                  </div>
                )}

                {/* Add New Custom Model Section */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium text-sm flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>{editingModelId ? t('settings.editCustomModelTitle') : t('settings.addNewCustomModelTitle')}</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-id">{t('settings.modelIdLabel')}</Label>
                      <Input
                        id="model-id"
                        name="id"
                        value={newCustomModel.id}
                        onChange={handleNewCustomModelChange}
                        placeholder={t('settings.modelIdPlaceholder')}
                        disabled={editingModelId !== null}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('settings.modelIdHelp')}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model-display-name">{t('settings.displayNameLabel')}</Label>
                      <Input
                        id="model-display-name"
                        name="displayName"
                        value={newCustomModel.displayName}
                        onChange={handleNewCustomModelChange}
                        placeholder={t('settings.displayNamePlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('settings.displayNameHelp')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-context">{t('settings.contextSizeLabel')}</Label>
                      <Input
                        id="model-context"
                        name="context"
                        type="number"
                        value={newCustomModel.context}
                        onChange={handleNewCustomModelChange}
                        placeholder="8192"
                        min="1024"
                        max="1000000"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('settings.contextSizeHelp')}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model-vision">{t('settings.capabilitiesLabel')}</Label>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="model-vision"
                            name="vision_supported"
                            checked={newCustomModel.vision_supported}
                            onChange={handleNewCustomModelChange}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="model-vision" className="text-sm font-normal">
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
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="model-builtin-tools" className="text-sm font-normal">
                            {t('settings.toolsSupportLabel')}
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.capabilitiesHelp')}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    {editingModelId && (
                      <Button
                        variant="outline"
                        onClick={cancelModelEditing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('common.cancel')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewCustomModel({
                          id: '', displayName: '', context: 8192, vision_supported: false, builtin_tools_supported: false
                        });
                        setEditingModelId(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('common.clear')}
                    </Button>
                    <Button
                      onClick={handleSaveCustomModel}
                      disabled={!newCustomModel.id || !newCustomModel.displayName}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingModelId ? t('settings.updateModelBtn') : t('settings.addModelBtn')}
                    </Button>
                  </div>
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
            </>}
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

      {/* Prompt Templates Modal */}
      <PromptTemplatesModal
        isOpen={isPromptTemplatesModalOpen}
        onClose={() => setIsPromptTemplatesModalOpen(false)}
      />
    </div>
  );
}

export default Settings;
