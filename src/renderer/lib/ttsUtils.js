/**
 * Utility functions for Text-to-Speech (TTS) sanitization, chunking, and reliable playback in React / Electron
 */

/**
 * Sanitizes markdown, HTML, code blocks and special syntax into clean spoken text.
 */
export function sanitizeTextForSpeech(text = '', language = 'pt') {
  if (!text) return '';
  
  let cleaned = String(text)
    // Code blocks with language
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const codeLines = code.trim().split('\n');
      if (codeLines.length > 8) {
        return language === 'pt' 
          ? ` [Bloco de código ${lang ? 'em ' + lang : ''} com ${codeLines.length} linhas omitido] `
          : ` [Code block ${lang ? 'in ' + lang : ''} with ${codeLines.length} lines omitted] `;
      }
      return ` ${code} `;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '$1')
    // Images ![alt](url) -> alt (MUST be before link replacement)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // HTML tags <tag ...>
    .replace(/<[^>]+>/g, ' ')
    // Common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Headers #, ##, etc.
    .replace(/^#{1,6}\s+/gm, '')
    // Bold / italic / strikethrough
    .replace(/(\*\*|\*|__|_|~~)(.*?)\1/g, '$2')
    // Blockquotes
    .replace(/^>\s+/gm, '')
    // Unordered & ordered list bullets
    .replace(/^[\t ]*[-*+]\s+/gm, '')
    .replace(/^[\t ]*\d+\.\s+/gm, '')
    // Markdown horizontal rules
    .replace(/^---+|^===+/gm, '')
    // Table delimiters and pipes
    .replace(/\|/g, ' ')
    .replace(/[-:]{3,}/g, ' ')
    // Normalize spaces and line breaks
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return cleaned;
}

/**
 * Splits text into safe, natural speech chunks for Web Speech API (max ~180-220 characters).
 * Prevents Chromium TTS buffer overflow and 15-second cut-off bug.
 */
export function splitTextIntoChunks(text = '', maxChunkLength = 200) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkLength) return [trimmed];

  const chunks = [];
  const paragraphs = trimmed.split(/\n+/);

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if (p.length <= maxChunkLength) {
      chunks.push(p);
      continue;
    }

    // Split by sentence terminators (. ! ? ; or newline)
    const sentenceMatches = p.match(/[^.!?;\n]+(?:[.!?;\n]+|$)/g) || [p];

    let currentChunk = '';
    for (const sentence of sentenceMatches) {
      const s = sentence.trim();
      if (!s) continue;

      if (s.length > maxChunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        // Split by clause separators (, :)
        const clauseMatches = s.match(/[^,:]+(?:[,:]+|$)/g) || [s];
        for (const clause of clauseMatches) {
          const c = clause.trim();
          if (!c) continue;

          if (c.length > maxChunkLength) {
            // Split by words
            const words = c.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
              if (!word) continue;
              if ((wordChunk + ' ' + word).trim().length > maxChunkLength) {
                if (wordChunk) chunks.push(wordChunk);
                wordChunk = word;
              } else {
                wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
              }
            }
            if (wordChunk) {
              if ((currentChunk + ' ' + wordChunk).trim().length <= maxChunkLength) {
                currentChunk = currentChunk ? `${currentChunk} ${wordChunk}` : wordChunk;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = wordChunk;
              }
            }
          } else {
            if ((currentChunk + ' ' + c).trim().length <= maxChunkLength) {
              currentChunk = currentChunk ? `${currentChunk} ${c}` : c;
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = c;
            }
          }
        }
      } else {
        if ((currentChunk + ' ' + s).trim().length <= maxChunkLength) {
          currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = s;
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }

  return chunks.filter(c => c && c.trim().length > 0);
}

// Module-level state to hold references and prevent V8 garbage collection
let activeSession = null;
let activeUtterance = null;
let keepAliveInterval = null;

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

function startKeepAlive() {
  stopKeepAlive();
  // In Chromium, long speech syntheses can stall after 15 seconds without pause/resume pulses
  keepAliveInterval = setInterval(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }
  }, 10000);
}

function findBestVoice(voices = [], voiceURI = '', language = 'pt') {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  // 1. Explicit voiceURI match
  if (voiceURI) {
    const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
    if (selectedVoice) return selectedVoice;
  }

  // 2. Primary language tag match (e.g. 'pt-BR' or 'en-US')
  const exactLang = language === 'pt' ? 'pt-br' : 'en-us';
  const exactMatch = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === exactLang);
  if (exactMatch) return exactMatch;

  // 3. Language prefix match (e.g. startsWith 'pt' or 'en')
  const langPrefix = language === 'pt' ? 'pt' : 'en';
  const prefixMatch = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;

  // 4. Fallback to default or first voice
  return voices.find(v => v.default) || voices[0] || null;
}

function playNextChunk(session) {
  if (!session || session.isStopped) return;

  if (session.currentIndex >= session.chunks.length) {
    stopKeepAlive();
    activeUtterance = null;
    session.isSpeaking = false;
    if (session.onEnd) {
      session.onEnd();
    }
    return;
  }

  const chunkText = session.chunks[session.currentIndex];
  const utterance = new SpeechSynthesisUtterance(chunkText);
  utterance.lang = session.lang;
  utterance.rate = session.rate;
  utterance.pitch = session.pitch;

  if (session.voice) {
    utterance.voice = session.voice;
  }

  // Pin utterance in module-level scope so V8 never garbage-collects it during playback
  activeUtterance = utterance;

  utterance.onstart = () => {
    if (!session || session.isStopped) return;
    if (session.currentIndex === 0 && session.onStart) {
      session.isSpeaking = true;
      session.onStart();
    }
  };

  utterance.onend = () => {
    if (!session || session.isStopped) return;
    session.currentIndex++;
    playNextChunk(session);
  };

  utterance.onerror = (event) => {
    if (!session || session.isStopped) return;
    if (event.error === 'interrupted' || event.error === 'canceled') {
      return;
    }
    console.warn(`[TTS] Chunk error at index ${session.currentIndex}:`, event.error);
    // Proceed with next chunk gracefully
    session.currentIndex++;
    playNextChunk(session);
  };

  utterance.onpause = () => {
    if (session && !session.isStopped && session.onPause) {
      session.onPause();
    }
  };

  utterance.onresume = () => {
    if (session && !session.isStopped && session.onResume) {
      session.onResume();
    }
  };

  try {
    window.speechSynthesis.speak(utterance);
    // Ensure speech synthesis is active
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.error('[TTS] Error invoking speechSynthesis.speak:', err);
    if (session.onError) {
      session.onError(err);
    }
  }
}

/**
 * Starts speaking a given text with chunking, queue management, and GC protection.
 */
export function playSpeech({
  text,
  language = 'pt',
  voiceURI = '',
  rate = 1.05,
  pitch = 1.0,
  onStart,
  onEnd,
  onError,
  onPause,
  onResume
}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('[TTS] window.speechSynthesis is not available');
    if (onError) onError(new Error('SpeechSynthesis not supported'));
    return null;
  }

  // Stop any active session
  stopSpeech();

  const cleanText = sanitizeTextForSpeech(text, language);
  if (!cleanText) {
    if (onEnd) onEnd();
    return null;
  }

  const chunks = splitTextIntoChunks(cleanText, 200);
  if (chunks.length === 0) {
    if (onEnd) onEnd();
    return null;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  const selectedVoice = findBestVoice(voices, voiceURI, language);

  const session = {
    id: Date.now() + Math.random(),
    chunks,
    currentIndex: 0,
    lang: language === 'pt' ? 'pt-BR' : 'en-US',
    rate: Number(rate) || 1.05,
    pitch: Number(pitch) || 1.0,
    voice: selectedVoice,
    isSpeaking: false,
    isPaused: false,
    isStopped: false,
    onStart,
    onEnd,
    onError,
    onPause,
    onResume
  };

  activeSession = session;

  // Short timeout to ensure previous cancel has settled in native OS dispatcher
  setTimeout(() => {
    if (activeSession === session && !session.isStopped) {
      startKeepAlive();
      playNextChunk(session);
    }
  }, 35);

  return session;
}

/**
 * Stops all speech synthesis and clears active session
 */
export function stopSpeech() {
  stopKeepAlive();
  if (activeSession) {
    activeSession.isStopped = true;
    activeSession = null;
  }
  activeUtterance = null;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[TTS] Failed to cancel speech synthesis:', e);
    }
  }
}

/**
 * Pauses active speech playback
 */
export function pauseSpeech() {
  if (activeSession) {
    activeSession.isPaused = true;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
    try {
      window.speechSynthesis.pause();
    } catch (e) {
      console.warn('[TTS] Failed to pause speech:', e);
    }
  }
}

/**
 * Resumes active speech playback
 */
export function resumeSpeech() {
  if (activeSession) {
    activeSession.isPaused = false;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.resume();
    } catch (e) {
      console.warn('[TTS] Failed to resume speech:', e);
    }
  }
}
