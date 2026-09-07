import { ArrowRight, Loader2, ImagePlus, Hammer, Upload, Zap, ZapOff, Square, Mic, MicOff, Terminal, Globe, BookOpen, SlidersHorizontal, Camera, Bot, Key, Layout, X, Code2, Briefcase, MessageSquare, RotateCcw, Plus, Check, Cpu, Blocks, Sparkles } from "lucide-react";
import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import TextAreaAutosize from "react-textarea-autosize";
import { SearchableSelect } from "./ui/SearchableSelect";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { useCanvas } from "../context/CanvasContext";
import { useLanguage } from "../context/LanguageContext";
import { useProjects } from "../context/ProjectContext";
import SlashCommandsPopover from "./SlashCommandsPopover";
const PromptTemplatesModal = React.lazy(() => import("./PromptTemplatesModal"));
const ModelParametersModal = React.lazy(() => import("./ModelParametersModal"));
const SnipModal = React.lazy(() => import("./SnipModal"));
import { getAllPromptCommands, PROMPT_TEMPLATES_STORAGE_KEY } from "../lib/defaultPromptCommands";
import { getModelGroup, getModelDisplayName as getModelDisplayNameLib, groupModels } from "../lib/modelGrouping";

function isVoiceFeatureAvailable(settings) {
	if (!settings || settings.voiceInput?.enabled === false) {
		return false;
	}
	const isKeyValid = (k) => Boolean(k && typeof k === 'string' && k.trim() && k.trim() !== '<replace me>');
	const hasVoiceApiKey = isKeyValid(settings.voiceInput?.apiKey);
	const groqProviderKey = settings.apiKeys?.groq || settings.GROQ_API_KEY;
	const isGroqProviderEnabled = !Array.isArray(settings.enabledProviders) || settings.enabledProviders.includes('groq');
	const hasGeneralGroqKey = isKeyValid(groqProviderKey) && isGroqProviderEnabled;
	return hasVoiceApiKey || hasGeneralGroqKey;
}

function ChatInput({
	onSendMessage,
	onStopGeneration,
	loading = false,
	visionSupported = false,
	models = [],
	selectedModel = "",
	onModelChange,
	onOpenMcpTools,
	onOpenSkillsModal,
	toolsCount = 0,
	mcpTools = [],
	modelConfigs = {},
	focusSignal = 0,
	onModelConfigUpdated,
	powerUserMode = false,
	showButtonLabels = false,
	presetMessage = "",
	harnessMode = "chat",
	agentHarness = "native",
	onHarnessChange,
	workspaceInfo = null,
	onSelectWorkspace,
	favoriteModels = [],
	onToggleFavoriteModel,
}) {
	const effectiveToolsCount = typeof toolsCount === 'number' && toolsCount > 0
		? toolsCount
		: (Array.isArray(mcpTools) ? mcpTools.length : 0);
	const { t, language } = useLanguage();
	const { activeProject, openKnowledgeBaseModal } = useProjects();
	const { canvasDoc, isOpen: isCanvasOpen, toggleCanvas, selectedText, setSelectedText, clearCanvas } = useCanvas();
	const [message, setMessage] = useState("");
	const [webSearchActive, setWebSearchActive] = useState(false);
	const { messages, activeContext } = useContext(ChatContext);

	useEffect(() => {
		if (presetMessage) {
			setMessage(presetMessage);
			setTimeout(() => {
				if (textareaRef.current) {
					textareaRef.current.focus();
					const len = presetMessage.length;
					textareaRef.current.setSelectionRange(len, len);
				}
			}, 50);
		}
	}, [presetMessage]);

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
	const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
	const [imageGenerationSettings, setImageGenerationSettings] = useState({
		enabled: true,
		provider: 'grok',
		model: 'grok-imagine-image'
	});
	const [imageMode, setImageMode] = useState(false);
	const [isSnipModalOpen, setIsSnipModalOpen] = useState(false);
	const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
	const plusMenuRef = useRef(null);
	const agentModeActive = harnessMode === 'code';
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const isRecordingRef = useRef(false);
	const isTranscribingRef = useRef(false);
	const voiceInputEnabledRef = useRef(false);
	const loadingRef = useRef(loading);
	const isHoldingVoiceRef = useRef(false);
	const shouldStopImmediatelyRef = useRef(false);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
				setIsPlusMenuOpen(false);
			}
		};
		if (isPlusMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isPlusMenuOpen]);

	useEffect(() => {
		isRecordingRef.current = isRecording;
	}, [isRecording]);

	useEffect(() => {
		isTranscribingRef.current = isTranscribing;
	}, [isTranscribing]);

	useEffect(() => {
		voiceInputEnabledRef.current = voiceInputEnabled;
	}, [voiceInputEnabled]);

	useEffect(() => {
		loadingRef.current = loading;
	}, [loading]);

	// Load custom prompt templates and settings on mount
	useEffect(() => {
		let isMounted = true;
		const loadInputSettings = async () => {
			try {
				if (window.electron?.getSettings) {
					const settings = await window.electron.getSettings();
					if (isMounted && settings) {
						if (settings.imageGeneration) {
							setImageGenerationSettings(settings.imageGeneration);
						}
						setVoiceInputEnabled(isVoiceFeatureAvailable(settings));
						if (Array.isArray(settings.customPromptTemplates)) {
							setCustomTemplates(settings.customPromptTemplates);
							return;
						}
					}
				}
				const saved = localStorage.getItem(PROMPT_TEMPLATES_STORAGE_KEY);
				if (saved && isMounted) {
					setCustomTemplates(JSON.parse(saved));
				}
			} catch (err) {
				console.error("Error loading settings in ChatInput:", err);
			}
		};
		loadInputSettings();
		return () => { isMounted = false; };
	}, []);

	// Installed AI Skills state
	const [installedSkills, setInstalledSkills] = useState([]);
	useEffect(() => {
		let isMounted = true;
		const loadSkills = async () => {
			if (window.electron?.skills?.list) {
				try {
					const list = await window.electron.skills.list(workspaceInfo?.root || null);
					if (isMounted) setInstalledSkills(list || []);
				} catch (err) {
					console.warn("Failed to load skills in ChatInput:", err);
				}
			}
		};
		loadSkills();
		return () => { isMounted = false; };
	}, [focusSignal, workspaceInfo?.root]);

	// Sync web search and voice input states with settings
	useEffect(() => {
		let isMounted = true;
		const syncSettings = async (targetSettings) => {
			try {
				const settings = targetSettings || (window.electron?.getSettings ? await window.electron.getSettings() : null);
				if (isMounted && settings) {
					if (settings.webSearch) {
						setWebSearchActive(Boolean(settings.webSearch.enabled));
					}
					if (settings.imageGeneration) {
						setImageGenerationSettings(settings.imageGeneration);
					}
					setVoiceInputEnabled(isVoiceFeatureAvailable(settings));
				}
			} catch (err) {
				console.error("Error loading settings in ChatInput:", err);
			}
		};
		syncSettings();

		const handleWindowFocus = () => {
			syncSettings();
		};

		const handleSettingsUpdated = (e) => {
			syncSettings(e?.detail || null);
		};

		window.addEventListener('focus', handleWindowFocus);
		window.addEventListener('neochat:settings-updated', handleSettingsUpdated);

		return () => {
			isMounted = false;
			window.removeEventListener('focus', handleWindowFocus);
			window.removeEventListener('neochat:settings-updated', handleSettingsUpdated);
		};
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

	// All available prompt commands (Templates + Installed Skills)
	const allPromptCommands = useMemo(() => {
		const baseCommands = getAllPromptCommands(customTemplates, t, language);
		const skillCommands = (installedSkills || []).map(skill => ({
			id: `skill-${skill.id}`,
			command: skill.slashCommand || skill.id,
			title: skill.displayName || skill.name,
			description: skill.description || '',
			icon: skill.icon || 'Sparkles',
			isSkill: true,
			isBuiltIn: false,
			template: `/${skill.slashCommand || skill.id} {{input}}`,
			skillData: skill
		}));
		return [...skillCommands, ...baseCommands];
	}, [customTemplates, installedSkills, t, language]);

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
		if (!voiceInputEnabled || loadingRef.current || isTranscribingRef.current) return;
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
			if (!voiceInputEnabledRef.current) return;
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
		return getModelDisplayNameLib(modelId, modelInfo);
	};

	// Sort and group models by provider/category and display name
	const sortedModels = useMemo(() => {
		const groups = groupModels(models, modelConfigs);
		return groups.flatMap(g => g.models);
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

		if (imageMode) {
			if (hasText && !loading) {
				onSendMessage(textContent, {
					isImageGeneration: true,
					imageSettings: imageGenerationSettings
				});
				setMessage("");
				setFiles([]);
				setImageMode(false);
			}
			return;
		}

		if ((hasText || hasFiles) && !loading) {
			if (!models || models.length === 0 || !selectedModel || selectedModel === 'default') {
				alert(t('chat.noModelsAlert'));
				return;
			}
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
				"flex flex-col gap-2 border rounded-2xl w-full max-w-[880px] mx-auto p-3 bg-background relative transition-colors focus-within:border-primary/40",
				harnessMode === 'code' ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-border/80",
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

			{/* Active Code Workspace Indicator */}
			{harnessMode === 'code' && (
				<div className="flex items-center justify-between gap-2 px-1 pt-0.5 text-xs select-none animate-in fade-in duration-200">
					<div className="flex items-center gap-1.5 min-w-0">
						<Terminal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
						<span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
							{t('chat.chatModeCode')}
						</span>
						<span className="text-muted-foreground/50">•</span>
						<span className="text-muted-foreground truncate font-mono text-[11px]">
							{workspaceInfo?.name || workspaceInfo?.root || t('chat.noWorkspaceSelected')}
						</span>
						{workspaceInfo?.git?.branch && (
							<span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono shrink-0">
								🌿 {workspaceInfo.git.branch}
							</span>
						)}
						{workspaceInfo?.agentsDoc && (
							<span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium shrink-0">
								AGENTS.md ✓
							</span>
						)}
						<button
							type="button"
							onClick={() => onHarnessChange?.(agentHarness === 'pi' ? 'native' : 'pi')}
							className={cn(
								"px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 flex items-center gap-1 transition-colors cursor-pointer",
								agentHarness === 'pi'
									? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25"
									: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
							)}
							title={`${t('settings.agentHarnessTitle') || 'Engine do Agente'}: ${agentHarness === 'pi' ? (t('settings.agentHarnessPiTitle') || 'Pi Agent Core') : (t('settings.agentHarnessNativeTitle') || 'Neo Native')} • ${t('common.clickToChange') || 'Clique para alternar'}`}
						>
							{agentHarness === 'pi' ? (
								<>
									<Cpu className="w-3 h-3 text-indigo-500" />
									<span>Pi Agent Core</span>
								</>
							) : (
								<>
									<Blocks className="w-3 h-3 text-amber-500" />
									<span>Neo Native</span>
								</>
							)}
						</button>
					</div>
					{onSelectWorkspace && (
						<button
							type="button"
							onClick={onSelectWorkspace}
							className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium shrink-0 cursor-pointer"
						>
							{workspaceInfo?.root ? t('common.edit') : t('chat.selectWorkspace')}
						</button>
					)}
				</div>
			)}

			{/* Active Canvas Document Chip */}
			{powerUserMode && canvasDoc && (
				<div className="flex items-center gap-1.5 px-4 pt-1 select-none animate-in fade-in duration-200">
					<div 
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium shadow-2xs group"
					>
						<button
							type="button"
							onClick={toggleCanvas}
							className="inline-flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity cursor-pointer"
							title={isCanvasOpen ? (t('canvas.hideCanvas') || "Ocultar Canvas") : (t('canvas.openCanvas') || "Abrir Canvas")}
						>
							<Layout className="w-3.5 h-3.5 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
							<span className="font-semibold">{t('canvas.label') || 'Canvas'}:</span>
							<span className="truncate max-w-[200px] text-foreground font-normal">
								{canvasDoc.title || 'Documento'} (v{canvasDoc.version || 1})
							</span>
						</button>

						{selectedText && (
							<div className="flex items-center gap-1">
								<span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium">
									{t('canvas.textSelected') || 'Trecho selecionado'}
								</span>
								<button
									type="button"
									onClick={() => setSelectedText('')}
									className="text-[10px] text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
									title={t('canvas.clearSelection') || "Limpar seleção"}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}

						<button
							type="button"
							onClick={() => {
								if (canvasDoc.content && canvasDoc.content.trim()) {
									if (!window.confirm(t('canvas.confirmDeleteCanvas') || 'Tem certeza que deseja excluir o documento Canvas desta conversa?')) {
										return;
									}
								}
								clearCanvas();
							}}
							className="p-0.5 ml-0.5 rounded text-emerald-600/70 dark:text-emerald-400/70 hover:text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
							title={t('canvas.deleteCanvasTooltip') || "Excluir Canvas da conversa"}
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			)}

			{/* Active Image Generation Mode Chip */}
			{imageMode && (
				<div className="flex items-center gap-1.5 px-4 pt-1 select-none animate-in fade-in duration-200">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-medium shadow-2xs">
						<Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 animate-pulse" />
						<span className="font-semibold">{t('chat.imageGenerationActive') || 'Modo Gerar Imagem'}</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
							{imageGenerationSettings?.provider === 'openai' ? 'OpenAI · ' : 'xAI · '}{imageGenerationSettings?.model || 'grok-imagine-image'}
						</span>
						<button
							type="button"
							onClick={() => setImageMode(false)}
							className="p-0.5 ml-1 rounded-full text-purple-600/70 dark:text-purple-400/70 hover:text-foreground hover:bg-purple-500/25 transition-colors cursor-pointer"
							title="Desativar modo gerar imagem"
						>
							<X className="w-3.5 h-3.5" />
						</button>
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
							placeholder={
								imageMode
									? (t('chat.imageGenerationPromptPlaceholder') || 'Descreva em detalhes a imagem que deseja gerar...')
									: isDragOver 
										? t('chat.dropFilesHere') 
										: (!models || models.length === 0 
											? t('chat.noModelsInputPlaceholder') 
											: t('chat.askAnything'))
							}
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
							aria-label={loading ? (t("chat.stopGeneration") || "Parar") : (imageMode ? (t("chat.generateImage") || "Gerar") : (t("chat.send") || "Enviar"))}
							type={loading ? "button" : "submit"}
							size="icon"
							className={cn(
								"h-10 w-10 rounded-xl transition-colors",
								imageMode 
									? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20" 
									: "bg-primary hover:bg-primary/90 text-primary-foreground"
							)}
							disabled={!loading && (!message.trim() && files.length === 0)}
							onClick={loading ? (e) => {
								e.preventDefault();
								onStopGeneration?.();
							} : undefined}
						>
							{loading ? (
								<Square className="w-5 h-5" aria-hidden="true" />
							) : imageMode ? (
								<Sparkles className="w-5 h-5" aria-hidden="true" />
							) : (
								<ArrowRight className="w-5 h-5" aria-hidden="true" />
							)}
						</Button>
					</div>
				</div>

				{/* Bottom Controls */}
				<div className="flex items-center justify-between gap-2 px-1 sm:px-2 min-w-0">
					<div className="flex items-center gap-1.5 min-w-0 flex-wrap py-0.5" ref={plusMenuRef}>
						{/* Hidden File Input */}
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							accept={visionSupported ? "*/*" : ".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.java,.cpp,.c,.h,.log,.sql"}
							multiple
							style={{ display: "none" }}
							disabled={loading || files.length >= 5}
						/>

						{/* Unified "+" Action Button with Popover Menu */}
						<div className="relative">
							<Button
								type="button"
								variant={isPlusMenuOpen ? "default" : "ghost"}
								size="sm"
								onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
								className={cn(
									"h-8 w-8 p-0 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 cursor-pointer",
									isPlusMenuOpen
										? "bg-primary text-primary-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80 bg-background/60 border border-border/70"
								)}
								title={t('chat.moreActions') || 'Adicionar anexo ou ferramentas (+)'}
								disabled={loading}
							>
								<Plus className={cn("w-4 h-4 transition-transform duration-200", isPlusMenuOpen && "rotate-45")} />
							</Button>

							{/* Dropdown Menu */}
							{isPlusMenuOpen && (
								<div className="absolute bottom-full left-0 mb-2 w-72 p-1.5 rounded-2xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 space-y-0.5 text-xs">
									{/* Gerar Imagem */}
									{imageGenerationSettings?.enabled !== false && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												setImageMode(true);
												textareaRef.current?.focus();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground flex items-center gap-1.5">
													<span>{t('chat.generateImage') || 'Gerar Imagem'}</span>
													<span className="px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono text-[9px] font-bold">
														{imageGenerationSettings?.provider === 'openai' ? 'OpenAI' : 'xAI'}
													</span>
												</div>
												<div className="text-[10px] text-muted-foreground truncate">
													{imageGenerationSettings?.model || 'grok-imagine-image'}
												</div>
											</div>
										</button>
									)}

									{/* Anexar Arquivo */}
									{files.length < 5 && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												fileInputRef.current?.click();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<ImagePlus className="w-4 h-4 text-emerald-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground">{t('chat.upload') || 'Anexar Arquivo'}</div>
												<div className="text-[10px] text-muted-foreground truncate">{visionSupported ? t('chat.uploadTooltipVision') : t('chat.uploadTooltipNoVision')}</div>
											</div>
										</button>
									)}

									{/* Capturar Tela (Snip) */}
									{files.length < 5 && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												setIsSnipModalOpen(true);
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Camera className="w-4 h-4 text-cyan-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground">{t('chat.snip') || 'Capturar Tela (Snip)'}</div>
												<div className="text-[10px] text-muted-foreground truncate">{t('chat.snipTooltip') || 'Capturar seleção da tela'}</div>
											</div>
										</button>
									)}

									{/* Pesquisa na Web */}
									<button
										type="button"
										onClick={() => {
											handleToggleWebSearch();
										}}
										className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
									>
										<Globe className={cn("w-4 h-4 text-blue-500 shrink-0", webSearchActive && "animate-pulse")} />
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-foreground flex items-center gap-1.5">
												<span>{t('chat.webSearch') || 'Pesquisa na Web'}</span>
												{webSearchActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
											</div>
											<div className="text-[10px] text-muted-foreground truncate">
												{webSearchActive ? 'Ativada (busca em tempo real)' : 'Desativada'}
											</div>
										</div>
										<div className={cn(
											"px-2 py-0.5 rounded-md text-[10px] font-medium border",
											webSearchActive 
												? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold" 
												: "bg-muted text-muted-foreground border-border/60"
										)}>
											{webSearchActive ? 'ON' : 'OFF'}
										</div>
									</button>

									{/* Ferramentas MCP */}
									{powerUserMode && onOpenMcpTools && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												onOpenMcpTools();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Hammer className="w-4 h-4 text-amber-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground flex items-center gap-1.5">
													<span>{t('chat.tools') || 'Ferramentas MCP'}</span>
													{effectiveToolsCount > 0 && (
														<span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold">
															{effectiveToolsCount}
														</span>
													)}
												</div>
												<div className="text-[10px] text-muted-foreground truncate">{t('chat.toolsTooltip') || 'Integrações e funções'}</div>
											</div>
										</button>
									)}

									{/* AI Skills Hub */}
									{onOpenSkillsModal && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												onOpenSkillsModal();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground flex items-center gap-1.5">
													<span>{t('skills.title') || 'Skills de IA'}</span>
													{installedSkills.filter(s => s.enabled !== false).length > 0 && (
														<span className="px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono text-[9px] font-bold">
															{installedSkills.filter(s => s.enabled !== false).length}
														</span>
													)}
												</div>
												<div className="text-[10px] text-muted-foreground truncate">{t('skills.subtitle') || 'Habilidades especializadas e comandos'}</div>
											</div>
										</button>
									)}

									{/* Canvas Workspace */}
									{powerUserMode && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												toggleCanvas();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Layout className="w-4 h-4 text-emerald-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground flex items-center gap-1.5">
													<span>{t('canvas.label') || 'Espaço Canvas'}</span>
													{isCanvasOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
												</div>
												<div className="text-[10px] text-muted-foreground truncate">{isCanvasOpen ? 'Painel aberto' : 'Editor de texto e código lado a lado'}</div>
											</div>
										</button>
									)}

									{/* Knowledge Base */}
									{powerUserMode && activeProject && openKnowledgeBaseModal && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
												openKnowledgeBaseModal();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground">{t('rag.knowledgeBase') || 'Base de Conhecimento'}</div>
												<div className="text-[10px] text-muted-foreground truncate">
													{activeProject.folders?.length > 0
														? `${activeProject.folders.length} ${activeProject.folders.length === 1 ? 'pasta vinculada' : 'pastas vinculadas'}`
														: 'Indexar documentos do projeto'}
												</div>
											</div>
										</button>
									)}

									{/* Slash Commands & Prompts */}
									{powerUserMode && (
										<button
											type="button"
											onClick={() => {
												setIsPlusMenuOpen(false);
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
											className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors text-left"
										>
											<Terminal className="w-4 h-4 text-primary shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-foreground">Comandos Rápidos (/)</div>
												<div className="text-[10px] text-muted-foreground truncate">Prompts e ações rápidas</div>
											</div>
										</button>
									)}
								</div>
							)}
						</div>


						{/* Voice Dictation (Whisper) Button */}
						{voiceInputEnabled && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={toggleRecording}
								className={cn(
									"h-8 px-2.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all duration-200",
									isRecording
										? "bg-red-500/20 text-red-500 animate-pulse border border-red-500/40 shadow-xs"
										: isTranscribing
											? "text-primary animate-pulse"
											: "text-muted-foreground hover:text-foreground hover:bg-muted/80"
								)}
								title={isRecording ? t('chat.voiceRecordingTooltip') : isTranscribing ? t('chat.voiceTranscribingTooltip') : t('chat.voiceTooltip')}
								disabled={loading || isTranscribing}
							>
								{isTranscribing ? (
									<Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
								) : isRecording ? (
									<MicOff className="w-4 h-4 text-red-500 flex-shrink-0" />
								) : (
									<Mic className="w-4 h-4 text-rose-500 flex-shrink-0" />
								)}
								{showButtonLabels && (
									<span className="ml-1.5">{isRecording ? t('chat.recording') : isTranscribing ? t('chat.transcribing') : t('chat.voice')}</span>
								)}
							</Button>
						)}

						{/* Active State Chip: Web Search */}
						{webSearchActive && (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-medium animate-in fade-in-0 shadow-2xs">
								<Globe className="w-3.5 h-3.5" />
								<span className="font-semibold">{t('chat.webSearch')}</span>
								<button
									type="button"
									onClick={handleToggleWebSearch}
									className="ml-0.5 hover:bg-blue-500/20 rounded-full p-0.5 transition-colors cursor-pointer"
									title={t('chat.disableWebSearch') || 'Desativar busca web'}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}

						{/* Active State Chip: Canvas */}
						{isCanvasOpen && (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium animate-in fade-in-0 shadow-2xs">
								<Layout className="w-3.5 h-3.5" />
								<span className="font-semibold">{t('canvas.label') || 'Canvas'}</span>
								<button
									type="button"
									onClick={toggleCanvas}
									className="ml-0.5 hover:bg-emerald-500/20 rounded-full p-0.5 transition-colors cursor-pointer"
									title={t('canvas.hideCanvas') || 'Ocultar Canvas'}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 flex-shrink-0 ml-auto min-w-0">
						{/* Model Selector & Parameters */}
						{(!models || models.length === 0) ? (
							<Link
								to="/settings"
								className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors font-medium shrink-0"
								title={t('chat.noModelsAlert')}
							>
								<Key className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
								<span className="truncate">{t('common.configureApiKey')}</span>
							</Link>
						) : (
							<div className="flex items-center gap-1">
								<SearchableSelect
									value={selectedModel}
									onValueChange={onModelChange}
									options={sortedModels}
									placeholder={t('chat.selectModel')}
									className="w-36 sm:w-48 max-w-[200px] min-w-[110px]"
									disabled={loading}
									getDisplayValue={(value) => getModelDisplayName(value)}
									getOptionLabel={(model) => getModelDisplayName(model)}
									getOptionValue={(model) => model}
									groupBy={(model) => getModelGroup(model, modelConfigs[model])}
									dropdownWidthClass="w-72 sm:w-80"
									favoriteItems={favoriteModels}
									onToggleFavorite={onToggleFavoriteModel}
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
							</div>
						)}
					</div>
				</div>
			</div>
		</form>

		{/* Fullscreen Image Modal */}
		{fullScreenImage && typeof document !== 'undefined' && createPortal(
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
			</div>,
			document.body
		)}

		{/* Lazy-loaded Modals */}
		<React.Suspense fallback={null}>
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
		</React.Suspense>
    </div>
	);
}

export default ChatInput;
