import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ImagePlus, Hammer, X, FileText, Send, NotebookPen, ChevronDown, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import MessageList from '../components/MessageList';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { extractThinking } from '../lib/messageUtils';
import { getModelGroup, groupModels } from '../lib/modelGrouping';

const ContextPill = ({ title, onRemove }) => (
  <Badge variant="outline" className="inline-flex items-center gap-2 bg-background/50 backdrop-blur-sm border-border/50 text-foreground shadow-sm">
    <FileText size={12} className="text-muted-foreground" />
    <span className="text-xs font-medium text-foreground">{title.slice(0, 30)}</span>
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={(e) => { e.stopPropagation(); onRemove(); }} 
      className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
    >
      <X size={10} />
    </Button>
  </Badge>
);

// Helper function to filter models based on modelFilter setting and disabledModels
const filterModels = (modelList, filterText, excludeText, configs, disabledList = []) => {
  let filteredModels = modelList;

  if (Array.isArray(disabledList) && disabledList.length > 0) {
    filteredModels = filteredModels.filter(m => !disabledList.includes(m));
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
      filteredModels = modelList.filter(modelId => {
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

const CustomModelSelector = ({ selectedModel, models, onModelChange, isCompact = false, modelConfigs = {}, placeholder = "Select model" }) => {
  const getDisplayName = (model) => {
    const modelInfo = modelConfigs[model];
    let displayName = model;
    
    // Use custom display name if available
    if (modelInfo && modelInfo.displayName) {
      displayName = modelInfo.displayName;
    } else {
      // If no explicit displayName is configured, return the raw model name without auto-capitalization
      displayName = model;
    }
    
    if (isCompact) {
      // For compact view, show a shortened version
      const words = displayName.split(' ');
      return words.slice(0, 2).join(' ');
    }
    return displayName;
  };

  // Sort and group models
  const sortedModels = useMemo(() => {
    const groups = groupModels(models, modelConfigs);
    return groups.flatMap(g => g.models);
  }, [models, modelConfigs]);

  return (
    <div className={cn("relative", isCompact ? "w-36" : "w-52")}>
      <SearchableSelect
        value={selectedModel}
        onValueChange={onModelChange}
        options={sortedModels}
        placeholder={placeholder}
        className="w-full"
        getDisplayValue={(value) => getDisplayName(value)}
        getOptionLabel={(model) => getDisplayName(model)}
        getOptionValue={(model) => model}
        groupBy={(model) => getModelGroup(model, modelConfigs[model])}
        dropdownWidthClass="w-72"
      />
    </div>
  );
};

const PopupPage = () => {
  const { t } = useLanguage();
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [models, setModels] = useState([]);
  const [modelConfigs, setModelConfigs] = useState({});
  const [modelFilter, setModelFilter] = useState(''); // State for model filter setting
  const [modelFilterExclude, setModelFilterExclude] = useState(''); // State for model filter exclude setting
  const [showContext, setShowContext] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [visionSupported, setVisionSupported] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const userScrollingRef = useRef(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastScrollTopRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const scrollThrottleRef = useRef(null);
  const rafRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const popupRef = useRef(null);

  // Load models and context on mount
  useEffect(() => {
    initializePopup();
    
    // Listen for context sent from main process
    const removeListener = window.electron.onPopupContext((popupContext) => {
      console.log('Received popup context:', popupContext);
      setContext(popupContext);
      setShowContext(true);
    });

    // Focus input on mount
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);

    return () => {
      if (removeListener) removeListener();
    };
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

      if (currentScrollTop < prevScrollTop - 1) {
        userScrollingRef.current = true;
        setIsUserScrolling(true);
        cancelPendingAutoScroll();
      } else if (distanceFromBottom <= 30) {
        userScrollingRef.current = false;
        setIsUserScrolling(false);
      }
    };

    const handleWheel = (e) => {
      if (e.deltaY < 0) {
        userScrollingRef.current = true;
        setIsUserScrolling(true);
        cancelPendingAutoScroll();
      } else if (e.deltaY > 0) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom <= 30) {
          userScrollingRef.current = false;
          setIsUserScrolling(false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Auto-scroll to bottom when messages change, but only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrolling && !userScrollingRef.current) {
      const isStreaming = messages.some(msg => msg.isStreaming === true);
      
      if (isStreaming) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        if (scrollThrottleRef.current) {
          clearTimeout(scrollThrottleRef.current);
        }
        
        scrollThrottleRef.current = setTimeout(() => {
          rafRef.current = requestAnimationFrame(() => {
            scrollToBottom(true);
            rafRef.current = null;
          });
          scrollThrottleRef.current = null;
        }, 50);
      } else {
        if (scrollThrottleRef.current) {
          clearTimeout(scrollThrottleRef.current);
          scrollThrottleRef.current = null;
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        scrollToBottom(false);
      }
    }
    
    return () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [messages, isUserScrolling, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Dynamic popup resizing
  
  useEffect(() => {
    const popupElement = popupRef.current;
    if (!popupElement) return;

    const resizePopup = () => {
      if (popupRef.current) {
        const newHeight = popupRef.current.scrollHeight;
        const maxHeight = window.screen.availHeight * 0.85; // Cap at 85% of screen height
        
        let clampedHeight = Math.min(newHeight, maxHeight);
        clampedHeight = Math.max(clampedHeight, 100); // Min height

        window.electron.resizePopup(500, Math.ceil(clampedHeight), isExpanded);
      }
    };

    // Use MutationObserver to detect content changes that affect height
    const observer = new MutationObserver(resizePopup);
    observer.observe(popupElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial resize
    resizePopup();

    return () => {
      observer.disconnect();
    };
  }, [isExpanded]);

  const initializePopup = async () => {
    try {
      // Load model configurations
      const configs = await window.electron.getModelConfigs();
      setModelConfigs(configs);
      const availableModels = Object.keys(configs).filter(key => key !== 'default');
      
      // Load settings to get model filter
      const settings = await window.electron.getSettings();
      const filterText = settings.modelFilter || '';
      const excludeText = settings.modelFilterExclude || '';
      setModelFilter(filterText);
      setModelFilterExclude(excludeText);
      
      // Apply filter and sort models alphabetically by display name
      const getDisplayName = (modelId) => {
        const modelInfo = configs[modelId];
        return modelInfo?.displayName || modelId;
      };
      
      // Filter models first (inclusion, exclude, disabled)
      const filteredModels = filterModels(availableModels, filterText, excludeText, configs, settings.disabledModels || []);
      
      // Then sort
      const sortedModels = filteredModels.sort((a, b) => {
        const nameA = getDisplayName(a).toLowerCase();
        const nameB = getDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setModels(sortedModels);
      
      if (sortedModels.length > 0) {
        setSelectedModel(sortedModels[0]);
        // Check if the selected model supports vision
        const modelInfo = configs[sortedModels[0]];
        setVisionSupported(modelInfo?.vision_supported || false);
      }

      // Try to get any existing captured context
      const capturedContext = await window.electron.getCapturedContext();
      if (capturedContext) {
        setContext(capturedContext);
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  };

  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    
    try {
      // Update vision support based on the new model
      const modelConfigs = await window.electron.getModelConfigs();
      const modelInfo = modelConfigs[newModel];
      setVisionSupported(modelInfo?.vision_supported || false);
      
      // Clear any uploaded files if the new model doesn't support vision
      if (!(modelInfo?.vision_supported || false)) {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

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

  const closePopup = () => {
    window.close();
  };

  const handleKeyPress = (e) => {
    // Accept suggestion on Tab (only if autocomplete is enabled)
    if (e.key === 'Tab' && autocompleteEnabled && suggestion) {
      e.preventDefault();
      setInputValue(inputValue + suggestion);
      setSuggestion('');
      return; // Prevent other key handlers from firing
    }

    // Clear suggestion on escape, but only if there's a suggestion
    if (e.key === 'Escape' && suggestion) {
      e.preventDefault();
      setSuggestion('');
      return;
    }

    if (e.key === 'Escape') {
      closePopup();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    const textContent = inputValue.trim();
    const hasText = textContent.length > 0;
    const hasFiles = files.length > 0;

    if (!hasText && !hasFiles) return;

    // Expand the popup on the first message
    if (!isExpanded) {
      setIsExpanded(true);
    }
    
    let uiMessageContent = textContent;
    let modelMessageContent;

    // Handle files and text content
    if (hasFiles) {
      // Format content as array with text and file parts
      const contentParts = [];
      
      // Add text part only if there is text
      if (hasText) {
        contentParts.push({ type: "text", text: textContent });
      }
      
      // Add image parts
      files.forEach((file) => {
        if (file.fileType === 'image') {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: file.base64,
            },
          });
        }
        // Note: Non-image files would need additional handling here
      });
      
      modelMessageContent = contentParts;
      
      // For UI display, show text + file count
      if (hasText) {
        uiMessageContent = `${textContent}\n\n📎 ${files.length} file(s) attached`;
      } else {
        uiMessageContent = `📎 ${files.length} file(s) attached`;
      }
    } else {
      // Just text content
      modelMessageContent = textContent;
    }

    // If there is context that hasn't been manually added, prepend it to the message for the model.
    if (context && showContext && context.text) {
      let contextText = context.text;
      const lines = contextText.split('\n');
      const firstContentIndex = lines.findIndex(line => !line.startsWith('Context captured from'));

      if (firstContentIndex !== -1) {
        contextText = lines.slice(firstContentIndex).join('\n').trim();
      }
      
      if (contextText) {
        if (typeof modelMessageContent === 'string') {
          modelMessageContent = `<context>${contextText}</context>\n${modelMessageContent}`;
        } else if (Array.isArray(modelMessageContent)) {
          // For array content, prepend context to the first text part
          const firstTextPart = modelMessageContent.find(part => part.type === 'text');
          if (firstTextPart) {
            firstTextPart.text = `<context>${contextText}</context>\n${firstTextPart.text}`;
          } else {
            // If no text part exists, add one at the beginning
            modelMessageContent.unshift({
              type: 'text',
              text: `<context>${contextText}</context>`
            });
          }
        }
      }
      
      // Mark context as used
      setShowContext(false);
    }

    // Create message for UI
    const userMessageForUi = {
      role: 'user',
      content: uiMessageContent,
    };

    // Reset user scrolling flag
    userScrollingRef.current = false;
    setIsUserScrolling(false);

    setMessages(prev => [...prev, userMessageForUi]);
    setInputValue('');
    setFiles([]); // Clear files after sending
    setSuggestion(''); // Clear suggestion on send
    setLoading(true);
    
    // Create message for model
    const userMessageForModel = {
      role: 'user',
      content: modelMessageContent
    };

    try {
      // Create assistant message placeholder
      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      setMessages(prev => [...prev, assistantPlaceholder]);

      // Start streaming
      const streamHandler = window.electron.startChatStream([...messages, userMessageForModel], selectedModel);
      
      let finalContent = '';

      streamHandler.onContent(({ content }) => {
        finalContent += content;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex] && newMessages[lastIndex].isStreaming) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: finalContent
            };
          }
          return newMessages;
        });
      });

      streamHandler.onComplete((data) => {
        const rawContent = data.content || finalContent;
        const thinkResult = extractThinking(rawContent);
        const completionContent = thinkResult.hasThink ? thinkResult.cleanContent : rawContent;
        const completionReasoning = thinkResult.hasThink
          ? [data.reasoning, thinkResult.thinking].filter(Boolean).join('\n\n---\n\n')
          : data.reasoning;

        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex] && newMessages[lastIndex].isStreaming) {
            newMessages[lastIndex] = {
              role: 'assistant',
              content: completionContent,
              reasoning: completionReasoning,
              isStreaming: false
            };
          }
          return newMessages;
        });
        setLoading(false);
        streamHandler.cleanup();
      });

      streamHandler.onError(({ error }) => {
        console.error('Stream error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex] && newMessages[lastIndex].isStreaming) {
            newMessages[lastIndex] = {
              role: 'assistant',
              content: `Error: ${error}`,
              isStreaming: false
            };
          }
          return newMessages;
        });
        setLoading(false);
        streamHandler.cleanup();
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message}`
        }
      ]);
      setLoading(false);
    }
  };

  // Function to handle file selection (images and other files)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const remainingSlots = 5 - files.length;

    // Check if any images are being uploaded with a non-vision model
    const hasImages = selectedFiles.some(file => file.type.startsWith("image/"));
    if (hasImages && !visionSupported) {
      alert(t('chat.nonVisionAlert'));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      alert(t('chat.maxFilesAlert', { count: remainingSlots > 0 ? remainingSlots : 0 }));
    }

    const filePromises = selectedFiles.slice(0, remainingSlots).map((file) => {
      return new Promise((resolve, reject) => {
        // Handle different file types
        if (file.type.startsWith("image/")) {
          // For images, create base64 preview
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              base64: reader.result,
              name: file.name,
              type: file.type,
              size: file.size,
              fileType: 'image',
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } else {
          // For other files, just store file info without base64
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            fileType: 'document',
            file: file, // Store the actual file for later processing
          });
        }
      });
    });

    Promise.all(filePromises)
      .then((newFiles) => {
        const validFiles = newFiles.filter((file) => file !== null);
        setFiles((prev) => [...prev, ...validFiles]);
        // Reset file input value to allow selecting the same file again
        if (fileInputRef.current) fileInputRef.current.value = "";
      })
      .catch((error) => {
        console.error("Error reading files:", error);
        alert("Error processing files.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  // Function to remove a file
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle Escape key for closing fullscreen image
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && fullScreenImage) {
        setFullScreenImage(null);
      }
    };

    if (fullScreenImage) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullScreenImage]);

  return (
    <div 
      ref={popupRef} 
      className="flex flex-col bg-neutral-50 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-300 scrollbar-none" 
      style={{ WebkitAppRegion: 'drag' }}
    >
      
      {/* Exit Button - Always in top right */}
      {!isExpanded && (
        <div className="absolute top-3 right-3 z-50" style={{ WebkitAppRegion: 'no-drag' }}>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-200" 
            onClick={closePopup}
            title={t('common.close')}
          >
            <X size={14} />
          </Button>
        </div>
      )}
      
      {isExpanded && (
        <>
          {/* Header - Only shows when expanded */}
          <div className="px-4 pt-3 pb-2 flex justify-between items-center sticky top-0 z-50 bg-background/95 backdrop-blur-sm" style={{ WebkitAppRegion: 'drag' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-foreground">Groq Chat</span>
              </div>
              {/* Model Selector */}
              <div style={{ WebkitAppRegion: 'no-drag' }}>
                <CustomModelSelector 
                  selectedModel={selectedModel}
                  models={models}
                  onModelChange={handleModelChange}
                  modelConfigs={modelConfigs}
                  placeholder={t('chat.selectModel')}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" 
              style={{ WebkitAppRegion: 'no-drag' }}
              title={t('header.newChat')}
              onClick={() => {
              setMessages([]);
              setIsExpanded(false);
            }}>
              <NotebookPen size={14} />
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              onClick={closePopup} 
              title={t('common.close')}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <X size={14} />
            </Button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="p-4 space-y-4 rounded-t-3xl overflow-y-auto max-h-[50vh]" 
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <MessageList 
              messages={messages} 
            />
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {/* Input Area */}
      <div className={cn("bg-white backdrop-blur-sm rounded-b-3xl sticky bottom-0", {
        "flex-1 flex items-center rounded-3xl": !isExpanded,
      })}>
        <div className="p-4 w-full space-y-3">
          {/* Header with Logo and Model Selector - Always visible */}
          <div className="flex items-center justify-between h-4 mb-2">
            <div className="flex items-center gap-2">
              <img 
                src="./neoLogo.png" 
                alt="NEO Logo" 
                className="h-4 w-auto object-contain"
              />
            </div>
            {/* Compact Model Selector - Always visible when not expanded */}
            {!isExpanded && (
              <div style={{ WebkitAppRegion: 'no-drag' }}>
                <CustomModelSelector 
                  selectedModel={selectedModel}
                  models={models}
                  onModelChange={handleModelChange}
                  isCompact={true}
                  modelConfigs={modelConfigs}
                  placeholder={t('chat.selectModel')}
                />
              </div>
            )}
          </div>

          {/* Context Pill */}
          {context && showContext && (
            <div className="flex mb-2" style={{ WebkitAppRegion: 'no-drag' }}>
              <ContextPill 
                title={context.title || t('popup.capturedContext')} 
                onRemove={() => setShowContext(false)}
              />
            </div>
          )}
          
          {/* File Previews */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2" style={{ WebkitAppRegion: 'no-drag' }}>
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  {file.fileType === 'image' ? (
                    // Image preview
                    <div className="w-16 h-16">
                      <img
                        src={file.base64}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg cursor-pointer shadow-sm"
                        onClick={() => setFullScreenImage(file.base64)}
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110"
                        aria-label={t('chat.removeFile', { index: index + 1 })}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    // Document preview
                    <div className="w-16 h-16 bg-muted rounded-lg flex flex-col items-center justify-center p-1 shadow-sm">
                      <FileText size={20} className="text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground text-center leading-tight truncate w-full">
                        {file.name.split('.').pop()?.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110"
                        aria-label={t('chat.removeFile', { index: index + 1 })}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-1 w-full">
            {files.length < 5 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-9 w-9 shrink-0 rounded-xl transition-all mb-1 duration-200 hover:scale-105",
                  visionSupported 
                    ? "text-muted-foreground hover:text-foreground hover:bg-accent/50" 
                    : "text-muted-foreground/50 cursor-not-allowed"
                )}
                style={{ WebkitAppRegion: 'no-drag' }}
                title={visionSupported ? t('chat.uploadTooltipVision') : t('chat.uploadTooltipNoVision')}
                disabled={!visionSupported}
              >
                <ImagePlus size={18} className={visionSupported ? "text-emerald-500" : ""} />
              </Button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              style={{ display: "none" }}
              disabled={loading || files.length >= 5}
            />

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t('chat.askAnything')}
                className="min-h-[44px] max-h-[200px] resize-none border-border/50 bg-background/80 backdrop-blur-sm focus:none pt-[10px] pr-12 rounded-2xl transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                rows={1}
                disabled={loading}
                style={{ WebkitAppRegion: 'no-drag' }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || loading}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={14} />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Actions (Spotlight / Raycast style) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1" style={{ WebkitAppRegion: 'no-drag' }}>
            {[
              { label: t('popup.quickExplain'), prompt: t('popup.quickExplainPrompt') },
              { label: t('popup.quickSummarize'), prompt: t('popup.quickSummarizePrompt') },
              { label: t('popup.quickFix'), prompt: t('popup.quickFixPrompt') },
              { label: t('popup.quickTranslate'), prompt: t('popup.quickTranslatePrompt') },
              { label: t('popup.quickRefactor'), prompt: t('popup.quickRefactorPrompt') },
            ].map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputValue(prev => prev ? `${action.prompt}${prev}` : action.prompt);
                  textareaRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/60"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setFullScreenImage(null)}
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <img 
            src={fullScreenImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
            aria-label={t('message.fullscreenClose')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default PopupPage; 