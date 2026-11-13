/**
 * CodeAlpha Language Translator - Client Application
 */

// Supported Languages Catalog (ISO 639-1)
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'no', name: 'Norwegian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fa', name: 'Persian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Tagalog (Filipino)' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' }
];

// DOM Elements
const sourceLangSelect = document.getElementById('sourceLanguage');
const targetLangSelect = document.getElementById('targetLanguage');
const swapLanguagesBtn = document.getElementById('swapLanguagesBtn');
const sourceText = document.getElementById('sourceText');
const resultText = document.getElementById('resultText');
const charCounter = document.getElementById('charCounter');
const clearSourceBtn = document.getElementById('clearSourceBtn');
const pasteTextBtn = document.getElementById('pasteTextBtn');
const translateBtn = document.getElementById('translateBtn');
const translateBtnText = document.getElementById('translateBtnText');
const btnSpinner = translateBtn.querySelector('.btn-spinner');
const btnIcon = translateBtn.querySelector('.btn-icon');
const loadingOverlay = document.getElementById('loadingOverlay');
const copyBtn = document.getElementById('copyBtn');
const copyIconNormal = document.getElementById('copyIconNormal');
const copyIconDone = document.getElementById('copyIconDone');
const copyBtnText = document.getElementById('copyBtnText');
const listenBtn = document.getElementById('listenBtn');
const listenBtnText = document.getElementById('listenBtnText');
const speechIconNormal = document.getElementById('speechIconNormal');
const speechIconPlaying = document.getElementById('speechIconPlaying');
const detectedLangBadge = document.getElementById('detectedLangBadge');
const metaInfoText = document.getElementById('metaInfoText');
const providerNameText = document.getElementById('providerNameText');
const errorAlert = document.getElementById('errorAlert');
const errorAlertTitle = document.getElementById('errorAlertTitle');
const errorAlertMessage = document.getElementById('errorAlertMessage');
const closeAlertBtn = document.getElementById('closeAlertBtn');
const toastNotification = document.getElementById('toastNotification');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIconSun = document.getElementById('themeIconSun');
const themeIconMoon = document.getElementById('themeIconMoon');

// State Variables
let currentSpeechUtterance = null;
let toastTimeout = null;
let lastDetectedLanguage = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  populateLanguageDropdowns();
  initTheme();
  setupEventListeners();
  fetchServerConfig();
});

// Populate Language Dropdowns
function populateLanguageDropdowns() {
  // Sort languages alphabetically for convenience
  const sorted = [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(lang => {
    // Add to Source select
    const srcOption = document.createElement('option');
    srcOption.value = lang.code;
    srcOption.textContent = lang.name;
    sourceLangSelect.appendChild(srcOption);

    // Add to Target select
    const tgtOption = document.createElement('option');
    tgtOption.value = lang.code;
    tgtOption.textContent = lang.name;
    targetLangSelect.appendChild(tgtOption);
  });

  // Set default selections
  sourceLangSelect.value = 'auto'; // Auto-detect
  targetLangSelect.value = 'es';   // Spanish as sensible default
}

// Fetch Backend Configuration (Active Provider)
async function fetchServerConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      const provider = data.activeProvider;
      if (provider === 'google') {
        providerNameText.textContent = 'Google Cloud Translation';
      } else if (provider === 'azure') {
        providerNameText.textContent = 'Microsoft Azure Translator';
      } else {
        providerNameText.textContent = 'Free Engine (MyMemory)';
      }
    } else {
      providerNameText.textContent = 'Free Engine (Fallback)';
    }
  } catch {
    providerNameText.textContent = 'Stand-alone Mode';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Translate on button click
  translateBtn.addEventListener('click', handleTranslate);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter
  sourceText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTranslate();
    }
  });

  // Character counter & clear button visibility
  sourceText.addEventListener('input', () => {
    const len = sourceText.value.length;
    charCounter.textContent = `${len.toLocaleString()} / 5,000`;

    if (len > 0) {
      clearSourceBtn.classList.remove('hidden');
    } else {
      clearSourceBtn.classList.add('hidden');
    }

    if (len > 5000) {
      charCounter.style.color = 'var(--error-color)';
    } else {
      charCounter.style.color = 'var(--text-muted)';
    }
  });

  // Clear source button
  clearSourceBtn.addEventListener('click', () => {
    sourceText.value = '';
    sourceText.dispatchEvent(new Event('input'));
    sourceText.focus();
    resetResultArea();
  });

  // Paste text button
  pasteTextBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sourceText.value = text;
        sourceText.dispatchEvent(new Event('input'));
        showToast('Text pasted from clipboard');
      }
    } catch {
      showToast('Please press Ctrl+V to paste');
    }
  });

  // Swap languages button
  swapLanguagesBtn.addEventListener('click', handleSwapLanguages);

  // Copy result button
  copyBtn.addEventListener('click', handleCopy);

  // Listen (Text-to-Speech) button
  listenBtn.addEventListener('click', handleListen);

  // Close error alert
  closeAlertBtn.addEventListener('click', () => {
    errorAlert.classList.add('hidden');
  });

  // Theme toggle
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// Basic Input Checks & Translation Request
async function handleTranslate() {
  hideError();

  const text = sourceText.value.trim();
  const sourceLang = sourceLangSelect.value;
  const targetLang = targetLangSelect.value;

  // Basic Input Check 1: Empty text
  if (!text) {
    showError(
      'Missing Input Text',
      'Please enter or paste the text you want to translate in the source box.'
    );
    sourceText.focus();
    return;
  }

  // Basic Input Check 2: Target language not selected
  if (!targetLang) {
    showError(
      'Target Language Missing',
      'Please choose a target language from the dropdown menu.'
    );
    targetLangSelect.focus();
    return;
  }

  // Check 3: Same source and target
  if (sourceLang === targetLang && sourceLang !== 'auto') {
    showError(
      'Identical Languages Selected',
      'Source and target languages are the same. Please choose a different target language or use Auto-detect.'
    );
    return;
  }

  // Start Loading State
  setLoadingState(true);

  try {
    let result;
    
    // Check if we are running with backend proxy
    const isLocalServer = window.location.protocol.startsWith('http');
    
    if (isLocalServer) {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Translation request failed (HTTP ${response.status})`);
      }
      result = data;
    } else {
      // Stand-alone / Direct browser fallback (e.g. if opened via file://)
      result = await directClientFallback(text, sourceLang, targetLang);
    }

    // Display Result
    displayTranslation(result.translatedText, result.detectedSource, result.provider);

  } catch (err) {
    console.error('Translation error:', err);
    showError('Translation Failed', parseErrorMessage(err));
  } finally {
    setLoadingState(false);
  }
}

// Display Translation Output
function displayTranslation(translatedText, detectedSource, provider) {
  resultText.textContent = translatedText;
  resultText.classList.remove('placeholder-mode');

  // Enable copy and listen buttons
  copyBtn.disabled = false;
  listenBtn.disabled = false;

  // Show detected language badge if auto-detect was used
  if (detectedSource && sourceLangSelect.value === 'auto') {
    lastDetectedLanguage = detectedSource;
    const langObj = LANGUAGES.find(l => l.code.toLowerCase() === detectedSource.toLowerCase());
    const langName = langObj ? langObj.name : detectedSource.toUpperCase();
    detectedLangBadge.textContent = `Detected: ${langName}`;
    detectedLangBadge.classList.remove('hidden');
  } else {
    detectedLangBadge.classList.add('hidden');
  }

  // Meta info
  const words = translatedText.trim().split(/\s+/).filter(Boolean).length;
  const chars = translatedText.length;
  metaInfoText.textContent = `${words} words, ${chars} chars${provider ? ` • via ${provider}` : ''}`;
}

// Reset Result Area
function resetResultArea() {
  resultText.textContent = 'Translation will appear here...';
  resultText.classList.add('placeholder-mode');
  copyBtn.disabled = true;
  listenBtn.disabled = true;
  detectedLangBadge.classList.add('hidden');
  metaInfoText.textContent = 'Ready to translate';
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    resetSpeechUI();
  }
}

// Loading Indicator & Disable Button
function setLoadingState(isLoading) {
  if (isLoading) {
    translateBtn.disabled = true;
    translateBtnText.textContent = 'Translating...';
    btnSpinner.classList.remove('hidden');
    btnIcon.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
  } else {
    translateBtn.disabled = false;
    translateBtnText.textContent = 'Translate';
    btnSpinner.classList.add('hidden');
    btnIcon.classList.remove('hidden');
    loadingOverlay.classList.add('hidden');
  }
}

// Swap Languages Logic
function handleSwapLanguages() {
  const currentSource = sourceLangSelect.value;
  const currentTarget = targetLangSelect.value;

  if (currentSource === 'auto') {
    // If source was auto, swap target into source and detected into target (or default)
    if (lastDetectedLanguage && lastDetectedLanguage !== currentTarget) {
      sourceLangSelect.value = currentTarget;
      targetLangSelect.value = lastDetectedLanguage;
    } else {
      sourceLangSelect.value = currentTarget;
      targetLangSelect.value = 'en';
    }
  } else {
    sourceLangSelect.value = currentTarget;
    targetLangSelect.value = currentSource;
  }

  // Also swap text if both exist
  const currentSrcText = sourceText.value;
  const currentResult = resultText.classList.contains('placeholder-mode') ? '' : resultText.textContent;

  if (currentResult) {
    sourceText.value = currentResult;
    sourceText.dispatchEvent(new Event('input'));
    resultText.textContent = currentSrcText;
    resultText.classList.remove('placeholder-mode');
  }

  showToast('Languages swapped');
}

// Usability Feature: Copy to Clipboard
async function handleCopy() {
  if (copyBtn.disabled || resultText.classList.contains('placeholder-mode')) return;

  const textToCopy = resultText.textContent;
  try {
    await navigator.clipboard.writeText(textToCopy);

    // Visual feedback on button
    copyIconNormal.classList.add('hidden');
    copyIconDone.classList.remove('hidden');
    copyBtnText.textContent = 'Copied!';

    showToast('Translation copied to clipboard!');

    setTimeout(() => {
      copyIconNormal.classList.remove('hidden');
      copyIconDone.classList.add('hidden');
      copyBtnText.textContent = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('Failed to copy to clipboard');
  }
}

// Usability Feature: Listen (Text-to-Speech)
function handleListen() {
  if (listenBtn.disabled || resultText.classList.contains('placeholder-mode')) return;

  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech is not supported by your browser');
    return;
  }

  // If already speaking, cancel it
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    resetSpeechUI();
    return;
  }

  const textToSpeak = resultText.textContent.trim();
  if (!textToSpeak) return;

  currentSpeechUtterance = new SpeechSynthesisUtterance(textToSpeak);
  currentSpeechUtterance.lang = targetLangSelect.value || 'en';
  currentSpeechUtterance.rate = 0.95;

  // Speech Event Listeners
  currentSpeechUtterance.onstart = () => {
    speechIconNormal.classList.add('hidden');
    speechIconPlaying.classList.remove('hidden');
    listenBtnText.textContent = 'Stop';
  };

  currentSpeechUtterance.onend = () => {
    resetSpeechUI();
  };

  currentSpeechUtterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    resetSpeechUI();
  };

  window.speechSynthesis.speak(currentSpeechUtterance);
}

function resetSpeechUI() {
  speechIconNormal.classList.remove('hidden');
  speechIconPlaying.classList.add('hidden');
  listenBtnText.textContent = 'Listen';
}

// Error Handling & Parsing
function showError(title, message) {
  errorAlertTitle.textContent = title;
  errorAlertMessage.textContent = message;
  errorAlert.classList.remove('hidden');
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  errorAlert.classList.add('hidden');
}

function parseErrorMessage(err) {
  const msg = err.message || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Unable to connect to the translation server. Please ensure the backend server is running (npm start).';
  }
  if (msg.includes('quota') || msg.includes('429')) {
    return 'Daily translation quota limit reached. Please try again later or configure your Google/Azure API key in .env.';
  }
  if (msg.includes('key') || msg.includes('401') || msg.includes('403')) {
    return 'API credential authentication failed. Please verify your API key and permissions in .env.';
  }
  return msg || 'An unknown error occurred. Please try again.';
}

// Toast Feedback Notification
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastNotification.textContent = message;
  toastNotification.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 2500);
}

// Dark / Light Theme Toggle
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeIconSun.classList.add('hidden');
    themeIconMoon.classList.remove('hidden');
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  if (isDark) {
    localStorage.setItem('theme', 'dark');
    themeIconSun.classList.add('hidden');
    themeIconMoon.classList.remove('hidden');
    showToast('Dark theme enabled');
  } else {
    localStorage.setItem('theme', 'light');
    themeIconSun.classList.remove('hidden');
    themeIconMoon.classList.add('hidden');
    showToast('Light theme enabled');
  }
}

// Standalone Client Fallback (If run without node server, e.g. raw index.html)
async function directClientFallback(text, sourceLang, targetLang) {
  const fromCode = sourceLang === 'auto' ? 'autodetect' : sourceLang;
  const langPair = `${fromCode}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

  const response = await fetch(url);
  const data = await response.json();

  let translated = data.responseData && data.responseData.translatedText ? data.responseData.translatedText.trim() : '';

  if (!translated && Array.isArray(data.matches)) {
    for (const m of data.matches) {
      if (m.translation && m.translation.trim()) {
        translated = m.translation.trim();
        break;
      }
    }
  }

  if (data.responseStatus === 200 && translated) {
    const txtArea = document.createElement('textarea');
    txtArea.innerHTML = translated;
    return {
      translatedText: txtArea.value,
      detectedSource: data.responseData?.detectedLanguage || null,
      provider: 'Free MyMemory (Direct Browser Mode)'
    };
  } else {
    throw new Error(data.responseDetails || 'Direct translation service unavailable');
  }
}
