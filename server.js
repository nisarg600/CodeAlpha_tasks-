require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper to decode HTML entities returned by some translation APIs
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
}

// Translation Handler: Free Tier (MyMemory & LibreTranslate fallback)
async function translateFree(text, sourceLang, targetLang) {
  const fromCode = sourceLang === 'auto' ? 'autodetect' : sourceLang;
  const langPair = `${fromCode}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MyMemory API responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    let translated = data.responseData && data.responseData.translatedText ? data.responseData.translatedText.trim() : '';

    // If primary translation is empty, check alternative matches in MyMemory
    if (!translated && Array.isArray(data.matches)) {
      for (const m of data.matches) {
        if (m.translation && m.translation.trim()) {
          translated = m.translation.trim();
          break;
        }
      }
    }

    if (data.responseStatus === 200 && translated) {
      const decoded = decodeHtmlEntities(translated);
      const detected = data.responseData?.detectedLanguage || (sourceLang !== 'auto' ? sourceLang : null);
      return {
        translatedText: decoded,
        detectedSource: detected,
        provider: 'free (MyMemory)'
      };
    } else if (data.responseStatus === 403 || data.responseStatus === 429) {
      throw new Error('Free tier translation quota reached for today. Please wait or configure an API key.');
    } else {
      throw new Error(data.responseDetails || 'Translation service returned empty result');
    }
  } catch (err) {
    // Attempt fallback to public LibreTranslate instance if MyMemory fails
    try {
      const ltResponse = await fetch('https://translate.terraprint.co/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (ltResponse.ok) {
        const ltData = await ltResponse.json();
        if (ltData.translatedText) {
          return {
            translatedText: ltData.translatedText,
            detectedSource: ltData.detectedLanguage ? ltData.detectedLanguage.language : null,
            provider: 'free (LibreTranslate)'
          };
        }
      }
    } catch {
      // Fallback failed, throw original error
    }
    throw err;
  }
}

// Translation Handler: Google Cloud Translation API (REST v2)
async function translateGoogle(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    throw new Error('Google Cloud Translation API key is not configured in .env (GOOGLE_TRANSLATE_API_KEY).');
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    q: text,
    target: targetLang,
    format: 'text'
  };

  if (sourceLang && sourceLang !== 'auto') {
    payload.source = sourceLang;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || `Google API returned status ${response.status}`;
    if (response.status === 400) {
      throw new Error(`Google Cloud Error: ${errorMsg}. Check language codes or request format.`);
    } else if (response.status === 403) {
      throw new Error(`Google Cloud Error: ${errorMsg}. Verify that Cloud Translation API is enabled and your API key has proper permissions.`);
    }
    throw new Error(`Google Cloud Error: ${errorMsg}`);
  }

  const translation = data.data?.translations?.[0];
  if (!translation) {
    throw new Error('Google Cloud returned no translation data.');
  }

  return {
    translatedText: decodeHtmlEntities(translation.translatedText),
    detectedSource: translation.detectedSourceLanguage || (sourceLang !== 'auto' ? sourceLang : null),
    provider: 'Google Cloud Translation'
  };
}

// Translation Handler: Microsoft Azure Translator API (Cognitive Services)
async function translateAzure(text, sourceLang, targetLang, key, region, endpoint) {
  if (!key) {
    throw new Error('Microsoft Azure Translator key is not configured in .env (AZURE_TRANSLATOR_KEY).');
  }

  const baseUrl = (endpoint || 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '');
  let queryUrl = `${baseUrl}/translate?api-version=3.0&to=${encodeURIComponent(targetLang)}`;
  if (sourceLang && sourceLang !== 'auto') {
    queryUrl += `&from=${encodeURIComponent(sourceLang)}`;
  }

  const headers = {
    'Ocp-Apim-Subscription-Key': key,
    'Content-Type': 'application/json'
  };

  if (region) {
    headers['Ocp-Apim-Subscription-Region'] = region;
  }

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify([{ Text: text }])
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || `Azure API returned status ${response.status}`;
    if (response.status === 401) {
      throw new Error('Azure Translator Error: Invalid API key. Please check AZURE_TRANSLATOR_KEY in .env.');
    } else if (response.status === 403) {
      throw new Error('Azure Translator Error: Quota exceeded or subscription disabled.');
    }
    throw new Error(`Azure Translator Error: ${errorMsg}`);
  }

  const firstResult = data?.[0];
  const translated = firstResult?.translations?.[0]?.text;
  const detected = firstResult?.detectedLanguage?.language;

  if (!translated) {
    throw new Error('Azure Translator returned an empty translation.');
  }

  return {
    translatedText: translated,
    detectedSource: detected || (sourceLang !== 'auto' ? sourceLang : null),
    provider: 'Microsoft Azure Translator'
  };
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Provider Configuration Info (safe, no secret exposure)
app.get('/api/config', (req, res) => {
  const configuredProvider = process.env.TRANSLATION_PROVIDER || 'free';
  const hasGoogleKey = Boolean(process.env.GOOGLE_TRANSLATE_API_KEY && process.env.GOOGLE_TRANSLATE_API_KEY.trim());
  const hasAzureKey = Boolean(process.env.AZURE_TRANSLATOR_KEY && process.env.AZURE_TRANSLATOR_KEY.trim());

  res.json({
    activeProvider: configuredProvider,
    availableProviders: {
      free: true,
      google: hasGoogleKey,
      azure: hasAzureKey
    }
  });
});

// Translation Endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang } = req.body;

    // Basic Input Validations
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the text you want to translate.'
      });
    }

    if (!targetLang || typeof targetLang !== 'string' || !targetLang.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please select a target language.'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text length exceeds maximum allowed limit (5,000 characters).'
      });
    }

    // Determine Provider to use
    let provider = (process.env.TRANSLATION_PROVIDER || 'free').toLowerCase();

    // If client requested a specific provider override if valid credentials exist
    if (req.body.provider) {
      const requested = req.body.provider.toLowerCase();
      if (['free', 'google', 'azure'].includes(requested)) {
        provider = requested;
      }
    }

    let result;
    if (provider === 'google') {
      result = await translateGoogle(
        text.trim(),
        sourceLang,
        targetLang,
        process.env.GOOGLE_TRANSLATE_API_KEY
      );
    } else if (provider === 'azure') {
      result = await translateAzure(
        text.trim(),
        sourceLang,
        targetLang,
        process.env.AZURE_TRANSLATOR_KEY,
        process.env.AZURE_TRANSLATOR_REGION,
        process.env.AZURE_TRANSLATOR_ENDPOINT
      );
    } else {
      // Default: free tier
      result = await translateFree(text.trim(), sourceLang, targetLang);
    }

    return res.json({
      success: true,
      translatedText: result.translatedText,
      detectedSource: result.detectedSource,
      sourceLang,
      targetLang,
      provider: result.provider
    });
  } catch (err) {
    console.error('Translation error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred while translating. Please try again.'
    });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Translator App running at http://localhost:${PORT}`);
  console.log(` Active Translation Provider: ${process.env.TRANSLATION_PROVIDER || 'free'}`);
  console.log(`===============================================`);
});
