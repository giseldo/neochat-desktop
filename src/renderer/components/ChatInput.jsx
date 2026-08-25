import { ArrowUp, Loader2, ImagePlus, Hammer, Upload, Zap, ZapOff, Square, Mic, MicOff, Terminal, Globe, BookOpen, SlidersHorizontal, Camera, Bot } from "lucide-react";
import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import TextAreaAutosize from "react-textarea-autosize";
import { SearchableSelect } from "./ui/SearchableSelect";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { useLanguage } from "../context/LanguageContext";
import { useProjects } from "../context/ProjectContext";
import SlashCommandsPopover from "./SlashCommandsPopover";
import PromptTemplatesModal from "./PromptTemplatesModal";
import ModelParametersModal from "./ModelParametersModal";
import SnipModal from "./SnipModal";
import { getAllPromptCommands, PROMPT_TEMPLATES_STORAGE_KEY } from "../lib/defaultPromptCommands";

function ChatInput({
	onSendMessage,
	onStopGeneration,
	loading = false,
	visionSupported = false,
	models = [],
	selectedModel = "",
	onModelChange,
	onOpenMcpTools,
	toolsCount = 0,
	mcpTools = [],
	modelConfigs = {},
	focusSignal = 0,
	onModelConfigUpdated,
	powerUserMode = false,
}) {
	const effectiveToolsCount = typeof toolsCount === 'number' && toolsCount > 0
		? toolsCount
		: (Array.isArray(mcpTools) ? mcpTools.length : 0);
	const { t, language } = useLanguage();
	const { activeProject, openKnowledgeBaseModal } = useProjects();
	const [message, setMessage] = useState("");
	const [suggestion, setSuggestion] = useState("");
	const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
	const [webSearchActive, setWebSearchActive] = useState(false);
	const suggestionTimeout = useRef(null);
	const { messages, activeContext } = useContext(ChatContext);

	// Slash Commands & Prompt Templates state
	const [customTemplates, setCustomTemplates] = useState([]);
	const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
	const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
	const [slashFilterQuery, setSlashFilterQuery] = useState("");
	const [isPromptTemplatesModalOpen, setIsPromptTemplatesModalOpen] = useState(false);
	const [isModelParamsModalOpen, setIsModelParamsModalOpen] = useState(false);

	const [files, setFiles] = useState([]); // Changed from images to files to handle all file types
	const [textareaHeight, setTextareaHeight] = useState(null);
	const [rowHeight, setRowHeight] = useState(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isSnipModalOpen, setIsSnipModalOpen] = useState(false);
	const [agentModeActive, setAgentModeActive] = useState(() => {
		try {
			return localStorage.getItem('neochat_agent_mode') === 'true';
		} catch (e) {
			return false;
		}
	});
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const isRecordingRef = useRef(false);
	const isTranscribingRef = useRef(false);
	const loadingRef = useRef(loading);
	const isHoldingVoiceRef = useRef(false);
	const shouldStopImmediatelyRef = useRef(false);

	useEffect(() => {
		isRecordingRef.current = isRecording;
	}, [isRecording]);

	useEffect(() => {
		isTranscribingRef.current = isTranscribing;
	}, [isTranscribing]);

	useEffect(() => {
		loadingRef.current = loading;
	}, [loading]);

	// Load custom prompt templates on mount
	useEffect(() => {
		const loadCustomTemplates = async () => {
			try {
				if (window.electron?.getSettings) {
					const settings = await window.electron.getSettings();
					if (Array.isArray(settings?.customPromptTemplates)) {
						setCustomTemplates(settings.customPromptTemplates);
						return;
					}
				}
				const saved = localStorage.getItem(PROMPT_TEMPLATES_STORAGE_KEY);
				if (saved) {
					setCustomTemplates(JSON.parse(saved));
				}
			} catch (err) {
				console.error("Error loading custom prompt templates in ChatInput:", err);
			}
		};
		loadCustomTemplates();
	}, []);

	// Sync web search state with settings
	useEffect(() => {
		let isMounted = true;
		const syncWebSearchSetting = async () => {
			try {
				if (window.electron?.getSettings) {
					const settings = await window.electron.getSettings();
					if (isMounted && settings?.webSearch) {
						setWebSearchActive(settings.webSearch.enabled !== false);
					}
				}
			} catch (err) {
				console.error("Error loading webSearch setting in ChatInput:", err);
			}
		};
		syncWebSearchSetting();
		return () => { isMounted = false; };
	}, [focusSignal]);

	const handleToggleWebSearch = async () => {
		const nextState = !webSearchActive;
		setWebSearchActive(nextState);
		if (window.electron?.getSettings && window.electron?.saveSettings) {
			try {
				const currentSettings = await window.electron.getSettings();
				await window.electron.saveSettings({
					...currentSettings,
					webSearch: {
						...(currentSettings.webSearch || {}),
						enabled: nextState
					}
				});
			} catch (err) {
				console.error("Failed to save webSearch setting on toggle:", err);
			}
		}
	};

	// All available prompt commands
	const allPromptCommands = useMemo(() => {
		return getAllPromptCommands(customTemplates, t, language);
	}, [customTemplates, t, language]);

	// Filtered slash commands based on typed query
	const filteredSlashCommands = useMemo(() => {
		if (!slashFilterQuery) return allPromptCommands;
		const q = slashFilterQuery.toLowerCase();
		return allPromptCommands.filter(
			(c) =>
				c.command.toLowerCase().includes(q) ||
				(c.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
				(c.title || "").toLowerCase().includes(q) ||
				(c.description || "").toLowerCase().includes(q)
		);
	}, [allPromptCommands, slashFilterQuery]);

	// Handle input change and slash detection
	const handleMessageChange = (e) => {
		const val = e.target.value;
		setMessage(val);

		if (val.startsWith("/")) {
			const query = val.slice(1);
			if (!query.includes(" ") && !query.includes("\n")) {
				setIsSlashMenuOpen(true);
				setSlashFilterQuery(query);
				setSelectedSlashIndex(0);
			} else {
				setIsSlashMenuOpen(false);
			}
		} else {
			if (isSlashMenuOpen) {
				setIsSlashMenuOpen(false);
			}
		}
	};

	// Apply a selected slash command
	const applySlashCommand = (cmd) => {
		if (!cmd) return;

		if (cmd.action === 'open_tools' || cmd.id === 'tools') {
			setIsSlashMenuOpen(false);
			setSlashFilterQuery("");
			setMessage("");
			if (onOpenMcpTools) {
				onOpenMcpTools();
			}
			return;
		}

		const template = cmd.template || "";

		// If the user typed "/cmd some text" or selected a command with existing text
		let trailingText = "";
		if (message.startsWith("/")) {
			const firstSpaceIndex = message.indexOf(" ");
			if (firstSpaceIndex !== -1) {
				trailingText = message.slice(firstSpaceIndex + 1).trim();
			}
		} else if (message.trim()) {
			trailingText = message.trim();
		}

		if (template.includes("{{input}}")) {
			if (trailingText) {
				const newText = template.replace("{{input}}", trailingText);
				setMessage(newText);
				setIsSlashMenuOpen(false);
				setSlashFilterQuery("");

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus();
						const endPos = newText.length;
						textareaRef.current.setSelectionRange(endPos, endPos);
					}
				}, 50);
			} else {
				const inputPos = template.indexOf("{{input}}");
				const newText = template.replace("{{input}}", "");
				setMessage(newText);
				setIsSlashMenuOpen(false);
				setSlashFilterQuery("");

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus();
						textareaRef.current.setSelectionRange(inputPos, inputPos);
					}
				}, 50);
			}
		} else {
			const finalMsg = trailingText ? `${template}\n\n${trailingText}` : (template ? `${template}\n\n` : "");
			setMessage(finalMsg);
			setIsSlashMenuOpen(false);
			setSlashFilterQuery("");

			setTimeout(() => {
				if (textareaRef.current) {
					textareaRef.current.focus();
				}
			}, 50);
		}
	};

	// Start voice recording for Whisper STT
	const startRecording = async () => {
		if (loadingRef.current || isTranscribingRef.current || isRecordingRef.current) return;
		shouldStopImmediatelyRef.current = false;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			// If user released the key before media stream resolved
			if (shouldStopImmediatelyRef.current) {
				stream.getTracks().forEach(track => track.stop());
				shouldStopImmediatelyRef.current = false;
				return;
			}

			audioChunksRef.current = [];
			const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
			const mediaRecorder = new MediaRecorder(stream, { mimeType });
			mediaRecorderRef.current = mediaRecorder;

			mediaRecorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
				stream.getTracks().forEach(track => track.stop());

				if (audioBlob.size < 100) {
					setIsRecording(false);
					return;
				}

				setIsTranscribing(true);

				try {
					const reader = new FileReader();
					reader.onloadend = async () => {
						const base64Audio = reader.result;
						const res = await window.electron.transcribeAudio({
							audioBase64: base64Audio,
							mimeType: audioBlob.type || 'audio/webm'
						});

						if (res && res.success && res.text) {
							setMessage(prev => (prev ? `${prev.trim()} ${res.text.trim()}` : res.text.trim()));
							setTimeout(() => {
								if (textareaRef.current) {
									textareaRef.current.focus();
								}
							}, 50);
						} else if (res && res.error) {
							alert(t('chat.transcriptionError', { error: res.error }));
						}
						setIsTranscribing(false);
					};
					reader.readAsDataURL(audioBlob);
				} catch (err) {
					console.error('Error reading audio blob:', err);
					setIsTranscribing(false);
				}
			};

			mediaRecorder.start(250);
			setIsRecording(true);

			if (shouldStopImmediatelyRef.current) {
				shouldStopImmediatelyRef.current = false;
				stopRecording();
			}
		} catch (err) {
			console.error('Microphone access denied or error:', err);
			alert(t('chat.micError'));
		}
	};

	// Stop voice recording
	const stopRecording = () => {
		shouldStopImmediatelyRef.current = true;
		if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || isRecordingRef.current)) {
			try {
				if (mediaRecorderRef.current.state === 'recording') {
					mediaRecorderRef.current.stop();
				}
			} catch (e) {
				console.error('Error stopping MediaRecorder:', e);
			}
			setIsRecording(false);
		}
	};

	// Toggle voice recording (for mouse clicks)
	const toggleRecording = () => {
		if (loadingRef.current || isTranscribingRef.current) return;
		if (isRecordingRef.current) {
			isHoldingVoiceRef.current = false;
			stopRecording();
		} else {
			isHoldingVoiceRef.current = false;
			startRecording();
		}
	};

	// Keyboard shortcut: Hold Ctrl+Alt (or Cmd+Alt / Ctrl+Alt+V / Ctrl+Alt+Space) to record, release to transcribe
	useEffect(() => {
		const handleVoiceKeyDown = (e) => {
			const hasCtrlOrMeta = e.ctrlKey || e.metaKey;
			const hasAlt = e.altKey;

			if (hasCtrlOrMeta && hasAlt) {
				const isModifierCombo = e.key === 'Alt' || e.key === 'Control' || e.key === 'AltGraph';
				const isVoiceKey = e.key?.toLowerCase() === 'v' || e.code === 'Space';

				if (isModifierCombo || isVoiceKey) {
					e.preventDefault();
					e.stopPropagation();

					if (e.repeat) return;

					if (!isRecordingRef.current && !loadingRef.current && !isTranscribingRef.current) {
						isHoldingVoiceRef.current = true;
						startRecording();
					}
				}
			}
		};

		const handleVoiceKeyUp = (e) => {
			if (isHoldingVoiceRef.current || isRecordingRef.current) {
				const isModifier = e.key === 'Alt' || e.key === 'Control' || e.key === 'AltGraph' ||
					e.code?.includes('Control') || e.code?.includes('Alt');
				const isVoiceKey = e.key?.toLowerCase() === 'v' || e.code === 'Space';

				if (isModifier || isVoiceKey) {
					e.preventDefault();
					e.stopPropagation();
					isHoldingVoiceRef.current = false;
					stopRecording();
				}
			}
		};

		const handleBlur = () => {
			if (isHoldingVoiceRef.current || isRecordingRef.current) {
				isHoldingVoiceRef.current = false;
				stopRecording();
			}
		};

		window.addEventListener('keydown', handleVoiceKeyDown, true);
		window.addEventListener('keyup', handleVoiceKeyUp, true);
		window.addEventListener('blur', handleBlur);

		return () => {
			window.removeEventListener('keydown', handleVoiceKeyDown, true);
			window.removeEventListener('keyup', handleVoiceKeyUp, true);
			window.removeEventListener('blur', handleBlur);
			if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
				try {
					mediaRecorderRef.current.stop();
				} catch (e) {}
			}
		};
	}, []);

	// Helper function to get display name for a model
	const getModelDisplayName = (modelId) => {
		const modelInfo = modelConfigs[modelId];
		if (modelInfo && modelInfo.displayName) {
			return modelInfo.displayName;
		}
		
		// If no explicit displayName is configured, return the raw modelId without auto-capitalization
		return modelId;
	};

	// Sort models alphabetically by display name
	const sortedModels = useMemo(() => {
		return [...models].sort((a, b) => {
			const nameA = getModelDisplayName(a).toLowerCase();
			const nameB = getModelDisplayName(b).toLowerCase();
			return nameA.localeCompare(nameB);
		});
	}, [models, modelConfigs]);
	const [isDragOver, setIsDragOver] = useState(false);
	const [fullScreenImage, setFullScreenImage] = useState(null);
	const textareaRef = useRef(null);
	const fileInputRef = useRef(null); // Ref for file input
	const prevLoadingRef = useRef(loading);
	

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
					// For documents and code files, read text content directly
					const textReader = new FileReader();
					textReader.onloadend = () => {
						resolve({
							name: file.name,
							type: file.type || 'text/plain',
							size: file.size,
							fileType: 'document',
							textContent: textReader.result,
						});
					};
					textReader.onerror = () => {
						resolve({
							name: file.name,
							type: file.type || 'application/octet-stream',
							size: file.size,
							fileType: 'document',
							textContent: `[${file.name}]`,
						});
					};
					textReader.readAsText(file);
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
				alert(t('chat.errorReadingFiles'));
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

	// Drag and drop handlers
	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		// Only set dragOver to false if we're leaving the entire input area
		if (!e.currentTarget.contains(e.relatedTarget)) {
			setIsDragOver(false);
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		
		const droppedFiles = Array.from(e.dataTransfer.files);
		if (droppedFiles.length > 0) {
			// Use the existing handleFileChange logic by creating a fake event
			const fakeEvent = {
				target: {
					files: droppedFiles
				}
			};
			handleFileChange(fakeEvent);
		}
	};



	// Focus the textarea after component mounts
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.focus();
		}
	}, []);

	// Focus the textarea whenever a new chat is created (focusSignal changes)
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [focusSignal]);

	// Focus the textarea when loading changes from true to false (completion finished)
	useEffect(() => {
		// Check if loading just changed from true to false
		if (prevLoadingRef.current && !loading) {
			if (textareaRef.current) {
				textareaRef.current.focus();
			}
		}
		// Update the ref with current loading state
		prevLoadingRef.current = loading;
	}, [loading]);

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

	const handleSubmit = (e) => {
		e.preventDefault();
		const textContent = message.trim();
		const hasText = textContent.length > 0;
		const hasFiles = files.length > 0;

		if ((hasText || hasFiles) && !loading) {
			let contentToSend;
			if (hasFiles) {
				// Format content as array with text and file parts
				const contentParts = [];
				
				// Add text part only if there is text
				if (hasText) {
					contentParts.push({ type: "text", text: textContent });
				}
				
				// Add file parts
				files.forEach((file) => {
					if (file.fileType === 'image' && file.base64) {
						// For images, send as image_url
						contentParts.push({
							type: "image_url",
							image_url: { url: file.base64 },
						});
					} else if (file.textContent) {
						// For documents/code files, include the extracted text content
						contentParts.push({
							type: "text",
							text: `\n\n${t('chat.fileAttachedDoc', { name: file.name })}\n\`\`\`\n${file.textContent}\n\`\`\`\n`,
						});
					} else {
						contentParts.push({
							type: "text",
							text: `\n\n${t('chat.fileAttachedFallback', { name: file.name, size: formatFileSize(file.size) })}\n`,
						});
					}
				});
				
				contentToSend = contentParts;
			} else {
				// If no files, send only the text string
				contentToSend = [{ type: "text", text: textContent }];
			}

			onSendMessage(contentToSend);
			setMessage("");
			setFiles([]); // Clear files after sending
			setSuggestion(""); // Clear suggestion on send
		}
	};

	const handleKeyDown = (e) => {
		// Slash menu keyboard navigation
		if (isSlashMenuOpen && filteredSlashCommands.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
				return;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				applySlashCommand(filteredSlashCommands[selectedSlashIndex]);
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setIsSlashMenuOpen(false);
				return;
			}
		}

		if (e.key === "Escape" && isSlashMenuOpen) {
			e.preventDefault();
			setIsSlashMenuOpen(false);
			return;
		}

		// Accept suggestion on Tab (only if autocomplete is enabled and slash menu is not active)
		if (e.key === "Tab" && autocompleteEnabled && suggestion && !isSlashMenuOpen) {
			e.preventDefault();
			setMessage(message + suggestion);
			setSuggestion("");
			return; // Prevent other key handlers from firing
		}

		// Clear suggestion on escape
		if (e.key === "Escape" && suggestion) {
			e.preventDefault();
			setSuggestion("");
			return;
		}

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Prevent submission during loading
			if (!loading) {
				handleSubmit(e);
			}
		}
	};

	// Handle paste events to ensure textarea resizes properly
	const handlePaste = (e) => {
		// Don't prevent default - let the paste happen naturally
		// Just ensure the textarea resizes properly after paste
		setTimeout(() => {
			// Force a resize check after paste completes
			if (textareaRef.current && textareaRef.current._resizeComponent) {
				textareaRef.current._resizeComponent();
			}
		}, 0);
	};

	// Handle height changes to track when resizing occurs
	const handleHeightChange = (height, info) => {
		// Track the current height and row height
		setTextareaHeight(height);
		if (info && info.rowHeight) {
			setRowHeight(info.rowHeight);
		}
	};

	// Calculate if we're at max height (10 rows + padding)
	// Account for padding (py-3 = 0.75rem * 2 = 1.5rem = 24px at default font size)
	const maxHeightThreshold = rowHeight ? (rowHeight * 10) + 24 : null;
	const isAtMaxHeight = textareaHeight && maxHeightThreshold && textareaHeight >= maxHeightThreshold;

	return (
    <div 
			className={cn(
				"flex flex-col gap-4 border border-border/80 rounded-2xl w-full p-3 bg-muted/60 dark:bg-muted/30 backdrop-blur-sm relative",
				isDragOver 
					? "border-primary border-2 bg-primary/5 transition-all duration-200" 
					: ""
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			{/* File Previews Area */}
			{files.length > 0 && (
				<div className="flex flex-col gap-3">
					<p className="text-sm font-medium text-muted-foreground">
						{t('chat.attachedFiles', { count: files.length })}
					</p>
					<div className="flex flex-wrap gap-3 p-3 border border-border/30 rounded-xl bg-muted/20">
						{files.map((file, index) => (
							<div key={index} className="relative group">
								{file.fileType === 'image' ? (
									// Image preview
									<div className="w-20 h-20">
										<img
											src={file.base64}
											alt={`Preview ${index + 1}`}
											className="w-full h-full object-cover rounded-lg cursor-pointer shadow-sm hover:opacity-80 transition-opacity"
											onClick={() => setFullScreenImage(file.base64)}
										/>
										<button
											type="button"
											onClick={() => removeFile(index)}
											className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110"
											aria-label={t('chat.removeFile', { index: index + 1 })}
										>
											✕
										</button>
									</div>
								) : (
									// Document preview
									<div className="flex items-center gap-2 bg-background/80 rounded-lg p-3 border border-border/50 min-w-[200px]">
										<div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
											<Upload className="w-4 h-4 text-primary" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-foreground truncate">{file.name}</p>
											<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
										</div>
										<button
											type="button"
											onClick={() => removeFile(index)}
											className="text-muted-foreground hover:text-destructive transition-colors"
											aria-label={t('chat.removeFile', { index: index + 1 })}
										>
											✕
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			<div className="flex flex-col gap-3">
				{/* Input Area with Submit Button */}
				<div className="flex items-center gap-3">
					<div className="flex-1 relative">
						{/* Slash Commands Popover */}
						{isSlashMenuOpen && (
							<SlashCommandsPopover
								commands={filteredSlashCommands}
								selectedIndex={selectedSlashIndex}
								onSelectCommand={applySlashCommand}
								onOpenManageModal={() => {
									setIsSlashMenuOpen(false);
									setIsPromptTemplatesModalOpen(true);
								}}
								onClose={() => setIsSlashMenuOpen(false)}
								filterQuery={slashFilterQuery}
							/>
						)}

						<TextAreaAutosize
							ref={textareaRef}
							value={message}
							onChange={handleMessageChange}
							onKeyDown={handleKeyDown}
							onPaste={handlePaste}
							onHeightChange={handleHeightChange}
							placeholder={isDragOver ? t('chat.dropFilesHere') : t('chat.askAnything')}
							className={cn(
								"w-full px-4 py-3 bg-transparent resize-none border-0 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none",
								// Control overflow based on whether we're at max height
								isAtMaxHeight ? "overflow-y-auto" : "overflow-y-hidden"
							)}
							style={{
								// Ensure smooth scrollbar appearance
								scrollbarWidth: 'thin',
								scrollbarGutter: 'stable'
							}}
							minRows={1}
							maxRows={10}
							cacheMeasurements={true}
						/>
						{/* Drag overlay */}
						{isDragOver && (
							<div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
								<div className="text-primary font-medium flex items-center gap-2">
									<ImagePlus className="w-5 h-5" />
									{t('chat.dropFilesHere')}
								</div>
							</div>
						)}
					</div>
					<div className="self-start">
						<Button
							type={loading ? "button" : "submit"}
							size="icon"
							className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
							disabled={!loading && (!message.trim() && files.length === 0)}
							onClick={loading ? (e) => {
								e.preventDefault();
								onStopGeneration?.();
							} : undefined}
						>
							{loading ? (
								<Square className="w-5 h-5" aria-hidden="true" />
							) : (
								<ArrowUp className="w-5 h-5" aria-hidden="true" />
							)}
						</Button>
					</div>
				</div>

				{/* Bottom Controls */}
				<div className="flex items-center justify-between gap-2 px-1 sm:px-2 flex-wrap min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap min-w-0">
						{/* File Upload Button */}
						{files.length < 5 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								className="text-muted-foreground hover:text-foreground hover:bg-white/40 hover:shadow-sm transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium"
								title={visionSupported ? t('chat.uploadTooltipVision') : t('chat.uploadTooltipNoVision')}
								disabled={loading}
							>
								<ImagePlus className="w-4 h-4 mr-1.5 flex-shrink-0" />
								<span>{t('chat.upload')}</span>
							</Button>
						)}

						{/* Snip & Ask (Screen Capture) Button */}
						{files.length < 5 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setIsSnipModalOpen(true)}
								className="text-muted-foreground hover:text-foreground hover:bg-white/40 hover:shadow-sm transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium"
								title={t('chat.snipTooltip')}
								disabled={loading}
							>
								<Camera className="w-4 h-4 mr-1.5 flex-shrink-0 text-cyan-500" />
								<span>{t('chat.snip')}</span>
							</Button>
						)}
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							accept={visionSupported ? "*/*" : ".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.java,.cpp,.c,.h,.log,.sql"}
							multiple
							style={{ display: "none" }}
							disabled={loading || files.length >= 5}
						/>

						{/* Slash Commands (/) Button */}
						{powerUserMode && <Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								if (!message) {
									setMessage("/");
									setIsSlashMenuOpen(true);
									setSlashFilterQuery("");
									setSelectedSlashIndex(0);
									textareaRef.current?.focus();
								} else {
									setIsPromptTemplatesModalOpen(true);
								}
							}}
							className="text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm transition-all duration-200 rounded-xl px-2 py-1.5 font-mono text-xs"
							title={t('slashCommands.buttonTooltip')}
							disabled={loading}
						>
							<Terminal className="w-4 h-4 mr-1 text-primary flex-shrink-0" />
							<span>/</span>
						</Button>}

						{/* Voice Dictation (Whisper) Button */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={toggleRecording}
							className={cn(
								"transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium",
								isRecording
									? "bg-red-500/20 text-red-500 animate-pulse border border-red-500/40"
									: isTranscribing
										? "text-primary animate-pulse"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm"
							)}
							title={isRecording ? t('chat.voiceRecordingTooltip') : isTranscribing ? t('chat.voiceTranscribingTooltip') : t('chat.voiceTooltip')}
							disabled={loading || isTranscribing}
						>
							{isTranscribing ? (
								<Loader2 className="w-4 h-4 mr-1.5 animate-spin flex-shrink-0" />
							) : isRecording ? (
								<MicOff className="w-4 h-4 mr-1.5 text-red-500 flex-shrink-0" />
							) : (
								<Mic className="w-4 h-4 mr-1.5 flex-shrink-0" />
							)}
							<span>{isRecording ? t('chat.recording') : isTranscribing ? t('chat.transcribing') : t('chat.voice')}</span>
						</Button>

						{/* MCP Tools Button */}
						{powerUserMode && onOpenMcpTools && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onOpenMcpTools}
								className="text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium"
								title={t('chat.toolsTooltip')}
								disabled={loading}
							>
								<Hammer className="w-4 h-4 mr-1.5 flex-shrink-0" />
								<span>
									{t('chat.tools')}
									{effectiveToolsCount > 0 ? ` (${effectiveToolsCount})` : ''}
								</span>
							</Button>
						)}

						{/* Web Search Toggle Button */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleToggleWebSearch}
							className={cn(
								"transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5",
								webSearchActive
									? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-xs"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-xs"
							)}
							title={webSearchActive ? t('chat.webSearchActive') : t('chat.webSearchTooltip')}
							disabled={loading}
						>
							<Globe className={cn("w-4 h-4 flex-shrink-0", webSearchActive && "text-blue-500 animate-pulse")} />
							<span>{t('chat.webSearch')}</span>
							{webSearchActive && (
								<span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
							)}
						</Button>

						{/* Knowledge Base (RAG) Button */}
						{powerUserMode && activeProject && openKnowledgeBaseModal && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={openKnowledgeBaseModal}
								className={cn(
									"transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5",
									(activeProject.folders?.length || 0) > 0
										? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-xs"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-xs"
								)}
								title={t('rag.viewKnowledge')}
								disabled={loading}
							>
								<BookOpen className="w-4 h-4 flex-shrink-0 text-indigo-500" />
								<span>
									{activeProject.folders?.length > 0
										? `${activeProject.folders.length} ${activeProject.folders.length === 1 ? 'pasta' : 'pastas'}`
										: t('rag.knowledgeBase')}
								</span>
							</Button>
						)}

						{/* Agent Mode (Autonomous Loop) Toggle Button */}
						{powerUserMode && <Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								const next = !agentModeActive;
								setAgentModeActive(next);
								try {
									localStorage.setItem('neochat_agent_mode', String(next));
								} catch (e) {}
							}}
							className={cn(
								"transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 border",
								agentModeActive
									? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs ring-1 ring-amber-500/20 font-semibold"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-transparent"
							)}
							title={agentModeActive ? t('chat.agentModeActive') : t('chat.agentModeTooltip')}
							disabled={loading}
						>
							<Bot className={cn("w-4 h-4 flex-shrink-0", agentModeActive && "text-amber-500 animate-bounce")} />
							<span>{t('chat.agentMode')}</span>
							{agentModeActive && (
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"></span>
							)}
						</Button>}
					</div>

					<div className="flex items-center gap-2 flex-shrink-0 ml-auto min-w-0">
						{/* Autocomplete hint */}
						{autocompleteEnabled && suggestion && !loading && !isSlashMenuOpen && (
							<div className="text-xs text-muted-foreground flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Tab</kbd>
								{t('chat.toAccept')}
							</div>
						)}
						
						{/* Model Selector & Parameters */}
						{powerUserMode && <div className="flex items-center gap-1">
							<SearchableSelect
								value={selectedModel}
								onValueChange={onModelChange}
								options={sortedModels}
								placeholder={t('chat.selectModel')}
								className="w-36 sm:w-44 max-w-[180px] min-w-[110px]"
								disabled={loading}
								getDisplayValue={(value) => getModelDisplayName(value)}
								getOptionLabel={(model) => getModelDisplayName(model)}
								getOptionValue={(model) => model}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => setIsModelParamsModalOpen(true)}
								title={t('chat.modelParameters') || 'Parâmetros do Modelo'}
								className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors flex-shrink-0"
								disabled={loading || !selectedModel}
							>
								<SlidersHorizontal className="w-3.5 h-3.5" />
							</Button>
						</div>}
					</div>
				</div>
			</div>
		</form>

		{/* Fullscreen Image Modal */}
		{fullScreenImage && (
			<div 
				className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 cursor-pointer"
				onClick={() => setFullScreenImage(null)}
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

		{/* Prompt Templates Management Modal */}
		<PromptTemplatesModal
			isOpen={isPromptTemplatesModalOpen}
			onClose={() => setIsPromptTemplatesModalOpen(false)}
			onTemplatesUpdated={(updated) => setCustomTemplates(updated)}
		/>

		{/* Model Parameters Modal */}
		<ModelParametersModal
			isOpen={isModelParamsModalOpen}
			onClose={() => setIsModelParamsModalOpen(false)}
			selectedModel={selectedModel}
			modelConfigs={modelConfigs}
			onModelConfigUpdated={onModelConfigUpdated}
		/>

		{/* Snip & Ask Screen Capture Modal */}
		<SnipModal
			isOpen={isSnipModalOpen}
			onClose={() => setIsSnipModalOpen(false)}
			onCaptureComplete={(capturedFile) => setFiles(prev => [...prev, capturedFile])}
		/>
    </div>
	);
}

export default ChatInput;
