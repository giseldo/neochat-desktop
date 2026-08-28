/**
 * Utility functions for Text-to-Speech (TTS) sanitization and playback in React
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
    // Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
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

export function playSpeech({
  text,
  language = 'pt',
  voiceURI = '',
  rate = 1.0,
  pitch = 1.0,
  onStart,
  onEnd,
  onError,
  onPause,
  onResume
}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('[TTS] window.speechSynthesis is not available');
    return null;
  }

  // Cancel any ongoing speech before starting new one
  window.speechSynthesis.cancel();

  const cleanText = sanitizeTextForSpeech(text, language);
  if (!cleanText) {
    if (onEnd) onEnd();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = language === 'pt' ? 'pt-BR' : 'en-US';
  utterance.rate = Number(rate) || 1.0;
  utterance.pitch = Number(pitch) || 1.0;

  const voices = window.speechSynthesis.getVoices() || [];
  if (voiceURI) {
    const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  } else {
    // Default fallback to language-matching voice
    const langPrefix = language === 'pt' ? 'pt' : 'en';
    const langVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
    if (langVoice) {
      utterance.voice = langVoice;
    }
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  if (onError) utterance.onerror = onError;
  if (onPause) utterance.onpause = onPause;
  if (onResume) utterance.onresume = onResume;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function pauseSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}
