f# X Reply Auto Generator - Chrome Extension

A Chrome extension that automatically generates AI-powered replies to tweets on X (formerly Twitter). Simply click the "✨ Auto Reply" button next to any tweet, and the extension will generate a contextual reply using AI and fill it in the reply field.

## Features

- 🤖 **AI-Powered Replies**: Uses advanced AI models to generate contextual, unique replies
- ✨ **One-Click Generation**: Just click the button next to any tweet
- 🔄 **Auto-Fill**: Automatically fills the reply field with generated text
- 🎨 **Beautiful UI**: Modern, gradient-styled button that matches Twitter's design
- ⚙️ **Multiple AI Providers**: Support for Groq, Hugging Face, OpenAI, and custom APIs
- 🚀 **Fast & Contextual**: Uses advanced prompts for better context understanding
- 🆓 **Free Options**: Works with free Groq and Hugging Face models
- 🎯 **Unique Replies**: Higher temperature settings ensure varied, non-repetitive responses

## Installation

### Step 1: Download/Clone the Extension

Download or clone this repository to your computer.

### Step 2: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the folder containing this extension
5. The extension should now appear in your extensions list

### Step 3: Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "X Reply Auto Generator"
3. Click the pin icon to keep it visible

## Usage

1. **Navigate to X/Twitter**: Go to [twitter.com](https://twitter.com) or [x.com](https://x.com)
2. **Find Tweet**: Browse your timeline or any tweet
3. **Click Auto Reply**: Look for the "✨ Auto Reply" button next to tweets
4. **Wait for Generation**: The button will show "Generating..." while the AI creates a reply
5. **Review & Send**: The reply will be automatically filled in. Review it and click the Reply button to send!

## Configuration

### Access Settings

1. Click the extension icon in Chrome's toolbar
2. Configure your preferred AI provider

### Available AI Providers

#### 🚀 Groq (Recommended - Best Quality)
- **Free tier available** with generous limits
- **Very fast** responses (sub-second)
- **High quality** contextual replies
- **Models**: Llama 3.1 8B/70B, Mixtral, Gemma
- **Get API Key**: [console.groq.com](https://console.groq.com) (free signup)

#### 🤗 Hugging Face (Free, No Key Required)
- **Completely free** - no API key needed for public models
- **Multiple models** available
- **Models**: Mistral 7B, Llama 2, DialoGPT
- **Optional API Key**: For better rate limits at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

#### 🔵 OpenAI Compatible
- Use any OpenAI-compatible API
- Requires API key and endpoint
- Supports GPT-3.5, GPT-4, etc.

#### ⚙️ Custom API
- Use your own API endpoint
- Flexible configuration
- Supports any API format

### Recommended Setup

**For Best Results:**
1. Sign up for a free Groq account at [console.groq.com](https://console.groq.com)
2. Get your API key from the dashboard
3. Select "Groq" as provider in extension settings
4. Choose "Llama 3.1 8B Instant" model
5. Paste your API key and save

**For Free Use (No Signup):**
1. Select "Hugging Face" as provider
2. Choose "Mistral 7B Instruct" model
3. No API key needed (optional for better limits)

## How It Works

1. **Tweet Detection**: The extension monitors the page for tweets using Twitter's DOM structure
2. **Button Injection**: Adds an "Auto Reply" button next to each tweet's action buttons
3. **Text Extraction**: Extracts the tweet text when you click the button
4. **AI Generation**: Sends the tweet to the configured AI API endpoint
5. **Reply Injection**: Automatically opens the reply dialog and fills in the generated text
6. **You Send**: You just need to click the Reply button to send!

## Technical Details

### Files Structure

```
xreply/
├── manifest.json      # Extension configuration
├── content.js         # Main script that runs on Twitter/X pages
├── popup.html         # Settings popup UI
├── popup.js           # Settings popup logic
├── styles.css         # Button styling
├── icon16.png         # Extension icon (16x16)
├── icon48.png         # Extension icon (48x48)
├── icon128.png        # Extension icon (128x128)
└── README.md          # This file
```

### API Integration

The extension supports multiple AI providers with improved prompts for better contextual understanding:

**Groq API** (Recommended):
- Free tier with 14,400 requests/day
- Sub-second response times
- High-quality models (Llama 3.1, Mixtral)
- Better context understanding

**Hugging Face**:
- Free public models (no key required)
- Optional API key for better rate limits
- Multiple model options

**Key Improvements:**
- ✅ **Better Prompts**: Contextual prompts that understand tweet content
- ✅ **Higher Temperature**: More variety in responses (0.9 vs 0.7)
- ✅ **Context Extraction**: Extracts author, thread context, and tweet type
- ✅ **Response Cleaning**: Removes duplicates and improves quality
- ✅ **Smart Fallbacks**: Context-aware fallback replies

## Troubleshooting

### Button Not Appearing

- Refresh the Twitter/X page
- Make sure you're on twitter.com or x.com
- Check browser console for errors (F12 > Console)

### "Error" Message

- **Groq**: Make sure you've entered a valid API key
- **Hugging Face**: Model might be loading (first use takes 10-30 seconds)
- Check your internet connection
- Try a different provider or model in settings
- Check if the API endpoint is correct
- For Groq: Verify your API key at [console.groq.com](https://console.groq.com)

### Reply Not Filling

- Make sure the reply dialog opened
- Try clicking the Auto Reply button again
- Check browser console for errors

### Model Loading Delays

Hugging Face free models may take 10-30 seconds to load on first use. The extension will automatically retry if it gets a "503 Service Unavailable" response.

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or store any personal data
- **Local Storage**: Settings are stored locally in Chrome
- **API Calls**: Tweet text is sent directly to the AI API endpoint you configure
- **No Tracking**: No analytics or tracking code included

## Limitations

- Works only on Twitter/X website (not mobile app)
- Requires internet connection for AI generation
- Free models may have rate limits (Groq: 14,400/day, HuggingFace: variable)
- Generated replies may need manual editing for best results
- Groq requires free API key signup (takes 2 minutes)

## License

This project is open source and available for personal and commercial use.

## Support

If you encounter any issues:
1. Check the Troubleshooting section above
2. Open browser console (F12) and check for errors
3. Make sure all files are in the correct location
4. Try reloading the extension

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements!

---

**Enjoy auto-generating replies on X/Twitter! 🚀**

