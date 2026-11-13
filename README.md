# 🌐 CodeAlpha - Language Translation Web Application

A full-featured, responsive language translation web application built with HTML, CSS, JavaScript, and a secure Node.js backend proxy.

![Application Preview](https://img.shields.io/badge/Status-Complete-success)
![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Key Features

1. **Intuitive Translator UI**:
   - Source text area with real-time character counter (up to 5,000 characters).
   - Source language selector with **✨ Auto-detect language**.
   - Target language selector supporting 50+ world languages.
   - **Quick Swap** button to switch source and target languages instantly.
   - One-click **Clear** and **Paste** buttons.
   - Keyboard shortcut: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) to trigger instant translation.

2. **Usability Extras**:
   - 📋 **Copy to Clipboard**: Instant copy with visual checkmark feedback and toast notification.
   - 🔊 **Listen (Text-to-Speech)**: Integrated Web Speech API reading out translations in their native accent.
   - 🌓 **Dark / Light Mode**: Sleek theme switcher with preference persisted in `localStorage`.

3. **Robust Input Validation & Error Handling**:
   - Checks for empty input text and missing target language.
   - Visual alerts with clear, user-friendly explanations for network issues, quota limits, and API keys.
   - Smooth loading spinner overlay and button lock preventing duplicate requests.

4. **Security & Credential Protection**:
   - Secret API keys are **never** exposed in browser JavaScript.
   - All translation calls pass through the Node.js Express backend proxy (`server.js`), keeping credentials safe in `.env`.

5. **Multi-Provider Architecture**:
   - **Free Instant Tier (Default)**: Uses MyMemory & LibreTranslate. Works immediately out of the box with zero setup, no credit card or account required!
   - **Google Cloud Translation API (REST v2)**: Official GCP Cloud Translation integration.
   - **Microsoft Azure Translator (Cognitive Services)**: Official Microsoft Translator integration.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)

### 2. Installation
Open your terminal in the project directory and install the lightweight dependencies:
```bash
npm install
```

### 3. Launch the Application
Start the proxy server:
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

### 4. Open in Browser
Visit **`http://localhost:3000`** in your browser.

---

## 🔑 Configuring Official API Providers (Optional)

The app works instantly with the free tier. If you wish to connect your Google Cloud or Microsoft Azure credentials:

### Option A: Google Cloud Translation API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. In the navigation menu, go to **APIs & Services** > **Library** and search for **Cloud Translation API**.
4. Click **Enable**.
5. Go to **APIs & Services** > **Credentials**, click **Create Credentials** > **API Key**.
6. Open `.env` in this project folder and set:
   ```env
   TRANSLATION_PROVIDER=google
   GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
   ```
7. Restart the server (`npm start`).

### Option B: Microsoft Azure Translator (Cognitive Services)

1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. Click **Create a resource** and search for **Translator**.
3. Select the free tier (F0 - 2,000,000 characters/month free).
4. Review and create the resource.
5. Once deployed, open the resource and navigate to **Keys and Endpoint**.
6. Copy `KEY 1` and `Location/Region` (e.g. `global` or `eastus`).
7. Open `.env` in this project folder and set:
   ```env
   TRANSLATION_PROVIDER=azure
   AZURE_TRANSLATOR_KEY=your_azure_key_here
   AZURE_TRANSLATOR_REGION=your_azure_region
   ```
8. Restart the server (`npm start`).

---

## 📁 File Structure

```text
codealpha project/
├── index.html          # Semantic HTML5 page structure
├── style.css           # Modern CSS styling (responsive layout, dark mode, animations)
├── script.js           # Frontend interactivity (validation, API calls, TTS, copy)
├── server.js           # Secure Express backend proxy for API calls
├── package.json        # Dependencies & start scripts
├── .env.example        # Template for API credentials
├── .env                # Local environment configuration
├── .gitignore          # Keeps secrets and node_modules out of version control
├── public/             # Static files served by Express server
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md           # Documentation & setup instructions
```

---

## 🧪 Testing the Application

1. **Empty Input Check**: Click "Translate" without typing anything. A helpful warning banner appears.
2. **Standard Translation**: Type `"Hello, welcome to our application!"` in English, select Spanish, and click Translate. Result: `"¡Hola, bienvenido a nuestra aplicación!"`.
3. **Auto-Detect Test**: Select `"Auto-detect language"`, type `"Bonjour tout le monde"`, select English. The app detects French and translates to `"Hello everyone"`.
4. **Copy Feature**: Click "Copy". Button changes to "Copied!" and a confirmation toast appears.
5. **Listen Feature**: Click "Listen". The browser's speech synthesis will pronounce the translated text in the target language.
6. **Mobile View**: Resize your browser window to test the fluid responsive layout.
