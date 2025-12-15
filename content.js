// X Reply Auto Generator - Content Script

// Configuration
const CONFIG = {
    buttonText: '✨ Auto Reply',
    buttonClass: 'x-auto-reply-btn',
    loadingText: 'Generating...',
    errorText: 'Error',
    apiProvider: 'huggingface', // 'groq', 'huggingface', 'openai', 'custom' - Default to HuggingFace (no key needed)
    defaultGroqModel: 'llama-3.1-8b-instant',
    defaultHuggingFaceModel: 'gpt2' // Using GPT-2 as default - more reliable for text generation
};

// State
let isGenerating = false;

// Initialize
function init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
}

// Start observing for new tweets
function startObserver() {
    // Add buttons to existing tweets
    addButtonsToTweets();

    // Watch for new tweets (infinite scroll)
    const observer = new MutationObserver(() => {
        addButtonsToTweets();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Find all tweet containers and add buttons
function addButtonsToTweets() {
    // Twitter/X uses various selectors - we'll try multiple
    const tweetSelectors = [
        'article[data-testid="tweet"]',
        'div[data-testid="tweet"]',
        'article[role="article"]'
    ];

    let tweets = [];
    for (const selector of tweetSelectors) {
        tweets = document.querySelectorAll(selector);
        if (tweets.length > 0) break;
    }

    tweets.forEach(tweet => {
        // Skip if button already exists
        if (tweet.querySelector(`.${CONFIG.buttonClass}`)) {
            return;
        }

        // Find the action bar (reply, retweet, like buttons)
        const actionBar = tweet.querySelector('[role="group"]') ||
            tweet.querySelector('div[role="group"]') ||
            tweet.querySelector('div[data-testid="reply"]')?.closest('div');

        if (actionBar) {
            addButtonToTweet(tweet, actionBar);
        }
    });
}

// Add button to a specific tweet
function addButtonToTweet(tweet, actionBar) {
    const button = document.createElement('button');
    button.className = CONFIG.buttonClass;
    button.textContent = CONFIG.buttonText;
    button.type = 'button';

    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (isGenerating) return;

        await handleAutoReply(tweet, button);
    });

    // Insert button before the action bar or as first child
    if (actionBar.parentNode) {
        actionBar.parentNode.insertBefore(button, actionBar);
    } else {
        actionBar.appendChild(button);
    }
}

// Handle auto reply generation
async function handleAutoReply(tweet, button) {
    try {
        isGenerating = true;
        button.textContent = CONFIG.loadingText;
        button.disabled = true;

        // Extract tweet context (text, author, thread)
        const tweetContext = extractTweetContext(tweet);
        if (!tweetContext.text) {
            throw new Error('Could not extract tweet text');
        }

        // Get API settings from storage
        const result = await chrome.storage.sync.get([
            'apiProvider',
            'apiKey',
            'apiEndpoint',
            'groqModel',
            'huggingFaceModel'
        ]);

        const apiProvider = result.apiProvider || CONFIG.apiProvider;
        const apiKey = result.apiKey || '';
        const apiEndpoint = result.apiEndpoint || '';
        const groqModel = result.groqModel || CONFIG.defaultGroqModel;
        const huggingFaceModel = result.huggingFaceModel || CONFIG.defaultHuggingFaceModel;

        // Generate reply using AI
        console.log('Starting reply generation...', {
            provider: apiProvider,
            hasApiKey: !!apiKey,
            model: apiProvider === 'groq' ? groqModel : huggingFaceModel,
            tweetText: tweetContext.text.substring(0, 50) + '...'
        });

        const reply = await generateReply(tweetContext, {
            provider: apiProvider,
            apiKey,
            apiEndpoint,
            groqModel,
            huggingFaceModel
        });

        console.log('Generated reply:', reply);

        // Inject reply into reply field
        await injectReply(reply, tweet);

        // Reset button
        button.textContent = CONFIG.buttonText;
        button.disabled = false;
        isGenerating = false;

    } catch (error) {
        console.error('Auto reply error:', error);
        button.textContent = CONFIG.errorText;
        button.disabled = false;
        isGenerating = false;

        // Reset after 2 seconds
        setTimeout(() => {
            button.textContent = CONFIG.buttonText;
        }, 2000);
    }
}

// Extract tweet context (text, author, thread context)
function extractTweetContext(tweet) {
    const context = {
        text: '',
        author: '',
        threadContext: []
    };

    // Extract tweet text
    const textSelectors = [
        'div[data-testid="tweetText"]',
        'div[lang]',
        '[data-testid="tweetText"]',
        'div[dir="auto"]'
    ];

    for (const selector of textSelectors) {
        const textElement = tweet.querySelector(selector);
        if (textElement) {
            context.text = textElement.innerText || textElement.textContent;
            break;
        }
    }

    // Fallback for text
    if (!context.text) {
        const allText = tweet.innerText || tweet.textContent;
        context.text = allText.split('\n')[0];
    }

    // Extract author name
    const authorSelectors = [
        'span[data-testid="User-Name"]',
        'div[data-testid="User-Name"]',
        'a[role="link"][tabindex="-1"] span'
    ];

    for (const selector of authorSelectors) {
        const authorElement = tweet.querySelector(selector);
        if (authorElement) {
            context.author = authorElement.innerText || authorElement.textContent;
            break;
        }
    }

    // Try to extract thread context (replied-to tweet if this is a reply)
    const replyToSelectors = [
        'div[data-testid="reply"] ~ div span',
        '[data-testid="reply"]'
    ];

    // Look for "Replying to @username" text
    const replyText = tweet.innerText || tweet.textContent;
    const replyMatch = replyText.match(/Replying to @(\w+)/);
    if (replyMatch) {
        context.isReply = true;
        context.replyTo = replyMatch[1];
    }

    return context;
}

// Generate reply using AI API with improved prompts
async function generateReply(tweetContext, apiConfig) {
    const { provider, apiKey, apiEndpoint, groqModel, huggingFaceModel } = apiConfig;

    // Build a contextual prompt
    const prompt = buildContextualPrompt(tweetContext);

    console.log('Generating reply with provider:', provider, 'Model:', provider === 'groq' ? groqModel : huggingFaceModel);

    try {
        let reply = '';

        switch (provider) {
            case 'groq':
                if (!apiKey) {
                    console.warn('Groq selected but no API key. Falling back to HuggingFace.');
                    reply = await generateWithHuggingFace(prompt, '', huggingFaceModel);
                } else {
                    reply = await generateWithGroq(prompt, apiKey, groqModel);
                }
                break;
            case 'huggingface':
                reply = await generateWithHuggingFace(prompt, apiKey, huggingFaceModel);
                break;
            case 'openai':
                if (!apiKey || !apiEndpoint) {
                    throw new Error('OpenAI requires API key and endpoint');
                }
                reply = await generateWithOpenAI(prompt, apiKey, apiEndpoint);
                break;
            case 'custom':
                if (!apiEndpoint) {
                    throw new Error('Custom API requires endpoint');
                }
                reply = await generateWithCustomAPI(prompt, apiKey, apiEndpoint);
                break;
            default:
                // Default: Try HuggingFace first (no key needed), then Groq if key available
                try {
                    console.log('No provider set, trying HuggingFace (no key needed)');
                    reply = await generateWithHuggingFace(prompt, apiKey, huggingFaceModel);
                } catch (e) {
                    console.log('HuggingFace failed, trying Groq:', e);
                    if (apiKey) {
                        reply = await generateWithGroq(prompt, apiKey, groqModel);
                    } else {
                        throw new Error('No API key available for Groq. Please configure HuggingFace or add a Groq API key.');
                    }
                }
        }

        console.log('Raw reply received:', reply);

        // Clean and validate reply
        reply = cleanReply(reply, tweetContext.text);

        console.log('Cleaned reply:', reply);

        if (!reply || reply.length < 5) {
            console.warn('Reply too short or empty, using fallback');
            reply = generateContextualFallback(tweetContext);
        }

        return reply;

    } catch (error) {
        console.error('API call failed:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            provider: provider,
            hasApiKey: !!apiKey
        });
        return generateContextualFallback(tweetContext);
    }
}

// Build a contextual prompt for better replies
function buildContextualPrompt(tweetContext) {
    // Simpler prompt for GPT-2, more detailed for advanced models
    const isSimpleModel = true; // We'll detect this based on model later if needed

    let prompt = '';

    if (isSimpleModel) {
        // Simpler prompt for GPT-2 and basic models
        prompt = `Tweet: "${tweetContext.text}"

Reply to this tweet with a thoughtful, relevant response:`;
    } else {
        // Detailed prompt for advanced models
        prompt = `You are a helpful assistant that generates thoughtful, contextual Twitter replies. 

Tweet to reply to: "${tweetContext.text}"`;

        if (tweetContext.author) {
            prompt += `\nAuthor: ${tweetContext.author}`;
        }

        if (tweetContext.isReply && tweetContext.replyTo) {
            prompt += `\nThis is a reply in a conversation thread.`;
        }

        prompt += `\n\nGenerate a unique, contextual, and engaging reply. The reply should:
- Be relevant to the tweet's content
- Be conversational and natural
- Be concise (under 280 characters)
- Show understanding of the tweet's context
- Be unique and not generic
- Match the tone of the original tweet

Reply:`;
    }

    return prompt;
}

// Generate with Groq API (FREE, FAST, BEST QUALITY)
async function generateWithGroq(prompt, apiKey, model = 'llama-3.1-8b-instant') {
    // Groq is free but requires API key - get one at https://console.groq.com
    if (!apiKey) {
        throw new Error('Groq API key required. Get a free key at https://console.groq.com');
    }

    console.log('Calling Groq API with model:', model);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that generates thoughtful, contextual Twitter replies. Keep replies concise, relevant, and unique.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.9, // Higher temperature for more variety
            max_tokens: 150,
            top_p: 0.95
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error response:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim() || '';
    console.log('Groq API response:', reply);
    return reply;
}

// Generate with Hugging Face (FREE, NO KEY NEEDED)
async function generateWithHuggingFace(prompt, apiKey, model = 'gpt2') {
    const endpoint = `https://api-inference.huggingface.co/models/${model}`;

    console.log('Calling HuggingFace API with model:', model);

    const headers = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Format prompt based on model type
    let formattedPrompt = prompt;

    // For instruction-tuned models, use proper format
    if (model.includes('Instruct') || model.includes('chat') || model.includes('Mistral')) {
        // Mistral and instruction models use different formats
        formattedPrompt = `[INST] ${prompt} [/INST]`;
    } else if (model.includes('gpt2') || model.includes('gpt')) {
        // GPT-2 style: simpler prompt
        formattedPrompt = prompt;
    } else {
        // Default: use as-is
        formattedPrompt = prompt;
    }

    console.log('Formatted prompt:', formattedPrompt.substring(0, 200) + '...');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            inputs: formattedPrompt,
            parameters: {
                max_new_tokens: 120, // Reduced for faster response
                temperature: 0.9, // Higher for more variety
                top_p: 0.95,
                do_sample: true,
                return_full_text: false,
                repetition_penalty: 1.2 // Reduce repetition
            }
        })
    });

    if (!response.ok) {
        if (response.status === 503) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '20');
            console.log(`Model loading, waiting ${retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return generateWithHuggingFace(prompt, apiKey, model);
        }
        const errorText = await response.text();
        console.error('HuggingFace API error response:', errorText);
        throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('HuggingFace API raw response:', JSON.stringify(data).substring(0, 500));

    let generatedText = '';

    // Handle different response formats
    if (Array.isArray(data)) {
        if (data[0]?.generated_text) {
            generatedText = data[0].generated_text;
        } else if (data[0]?.summary_text) {
            generatedText = data[0].summary_text;
        } else if (typeof data[0] === 'string') {
            generatedText = data[0];
        }
    } else if (data.generated_text) {
        generatedText = data.generated_text;
    } else if (data.summary_text) {
        generatedText = data.summary_text;
    } else if (typeof data === 'string') {
        generatedText = data;
    } else if (data[0]) {
        // Try first element if it's an object
        generatedText = JSON.stringify(data[0]);
    }

    if (!generatedText) {
        console.error('Could not extract text from HuggingFace response:', data);
        throw new Error('No generated text in HuggingFace response');
    }

    // Clean up instruction format if present
    generatedText = generatedText
        .replace(/<s>\[INST\].*?\[\/INST\]/s, '')
        .replace(/\[INST\].*?\[\/INST\]/s, '')
        .replace(/<\|.*?\|>/g, '')
        .trim();

    console.log('HuggingFace extracted text:', generatedText);
    return generatedText.trim();
}

// Generate with OpenAI-compatible API
async function generateWithOpenAI(prompt, apiKey, apiEndpoint) {
    if (!apiKey || !apiEndpoint) {
        throw new Error('OpenAI API key and endpoint required');
    }

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that generates thoughtful, contextual Twitter replies. Keep replies concise, relevant, and unique.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.9,
            max_tokens: 150
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
}

// Generate with custom API endpoint
async function generateWithCustomAPI(prompt, apiKey, apiEndpoint) {
    if (!apiEndpoint) {
        throw new Error('Custom API endpoint required');
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            prompt: prompt,
            temperature: 0.9,
            max_tokens: 150
        })
    });

    if (!response.ok) {
        throw new Error(`Custom API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || data.reply || data.content || '';
}

// Clean and extract reply from generated text
function cleanReply(generatedText, originalTweet) {
    if (!generatedText) return '';

    // Remove the prompt if it was included
    generatedText = generatedText
        .replace(/Tweet to reply to:.*?Reply:/s, '')
        .replace(/Reply:\s*/i, '')
        .replace(/You are a helpful assistant.*?Reply:/s, '')
        .trim();

    // Remove instruction format markers
    generatedText = generatedText
        .replace(/<s>\[INST\].*?\[\/INST\]/s, '')
        .replace(/\[INST\].*?\[\/INST\]/s, '')
        .replace(/<\|.*?\|>/g, '')
        .trim();

    // Remove quotes if the entire reply is quoted
    if ((generatedText.startsWith('"') && generatedText.endsWith('"')) ||
        (generatedText.startsWith("'") && generatedText.endsWith("'"))) {
        generatedText = generatedText.slice(1, -1).trim();
    }

    // Remove common prefixes that models might add
    const prefixesToRemove = [
        /^Here's a reply:/i,
        /^A reply:/i,
        /^Reply:/i,
        /^My reply:/i,
        /^Suggested reply:/i
    ];

    prefixesToRemove.forEach(prefix => {
        generatedText = generatedText.replace(prefix, '').trim();
    });

    // Remove any mention of the original tweet text (but be careful not to remove too much)
    const tweetWords = originalTweet.split(' ').filter(w => w.length > 4).slice(0, 3);
    tweetWords.forEach(word => {
        // Only remove if it's a standalone word, not part of another word
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        generatedText = generatedText.replace(regex, '');
    });

    // Clean up extra whitespace
    generatedText = generatedText.replace(/\s+/g, ' ').trim();

    // Limit to 280 characters (Twitter limit)
    if (generatedText.length > 280) {
        generatedText = generatedText.substring(0, 277) + '...';
    }

    return generatedText.trim();
}

// Generate contextual fallback reply
function generateContextualFallback(tweetContext) {
    const tweetText = tweetContext.text.toLowerCase();

    // Context-aware fallbacks
    if (tweetText.includes('?')) {
        return "That's a great question! I'd love to hear more about your thoughts on this.";
    }

    if (tweetText.includes('!') || tweetText.match(/amazing|awesome|great|love/)) {
        return "Absolutely! This resonates with me.";
    }

    if (tweetText.match(/sad|disappointed|frustrated|worried/)) {
        return "I understand how you feel. Thanks for sharing your perspective.";
    }

    if (tweetText.match(/learn|learned|discovered|found out/)) {
        return "Thanks for sharing this insight! Always learning something new.";
    }

    // Generic but varied fallbacks
    const fallbacks = [
        "Interesting perspective!",
        "Thanks for sharing this.",
        "I see what you mean.",
        "That's a thoughtful point.",
        "Appreciate you bringing this up.",
        "This is worth considering.",
        "Thanks for the insight!"
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}


// Inject reply into reply field - works with Draft.js (Twitter's editor)
async function injectReply(replyText, tweet) {
    // Click the reply button to open reply dialog
    const replyButton = tweet.querySelector('[data-testid="reply"]') ||
        tweet.querySelector('button[aria-label*="Reply"]') ||
        tweet.querySelector('div[role="button"][aria-label*="Reply"]');

    if (replyButton) {
        replyButton.click();

        // Wait for reply dialog to fully open and Draft.js to initialize
        let textArea = null;
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 150));

            // Find the Draft.js editor (Twitter uses Draft.js)
            const replySelectors = [
                'div[data-testid="tweetTextarea_0"]',
                'div[role="textbox"][data-testid="tweetTextarea_0"]',
                'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
                'div.public-DraftEditor-content',
                'div[contenteditable="true"][aria-label*="Tweet text"]',
                'div[contenteditable="true"][aria-label*="Post text"]'
            ];

            for (const selector of replySelectors) {
                textArea = document.querySelector(selector);
                if (textArea && textArea.isContentEditable) {
                    // Check if it's the Draft.js editor
                    if (textArea.classList.contains('public-DraftEditor-content') ||
                        textArea.closest('[data-testid="tweetTextarea_0"]')) {
                        break;
                    }
                }
            }

            if (textArea && textArea.isContentEditable) {
                // Wait a bit more for Draft.js to be ready
                await new Promise(resolve => setTimeout(resolve, 200));
                break;
            }
        }

        if (textArea && textArea.isContentEditable) {
            // Focus the text area first
            textArea.focus();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Method 1: Use clipboard paste (Draft.js handles paste events well)
            try {
                // Copy to clipboard
                await navigator.clipboard.writeText(replyText);

                // Focus and wait
                textArea.focus();
                await new Promise(resolve => setTimeout(resolve, 50));

                // Paste - Draft.js will handle this properly
                const pasteSuccess = document.execCommand('paste', false, null);

                if (pasteSuccess) {
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Verify
                    const currentText = textArea.innerText || textArea.textContent || '';
                    if (currentText.includes(replyText.substring(0, Math.min(20, replyText.length)))) {
                        console.log('Text pasted successfully via clipboard');
                        setCursorToEnd(textArea);
                        return;
                    }
                }
            } catch (clipboardError) {
                console.log('Clipboard method failed:', clipboardError);
            }

            // Method 2: Simulate typing character by character (Draft.js friendly)
            // This is slower but works reliably with Draft.js
            console.log('Using character-by-character typing for Draft.js compatibility');

            textArea.focus();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Type each character with proper keyboard events
            for (let i = 0; i < replyText.length; i++) {
                const char = replyText[i];

                // Focus before each character (in case it loses focus)
                if (i % 20 === 0) {
                    textArea.focus();
                }

                // Create proper keyboard events that Draft.js recognizes
                const keydownEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: char,
                    code: char === ' ' ? 'Space' : `Key${char.toUpperCase()}`,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    which: char.charCodeAt(0)
                });

                const keypressEvent = new KeyboardEvent('keypress', {
                    bubbles: true,
                    cancelable: true,
                    key: char,
                    code: char === ' ' ? 'Space' : `Key${char.toUpperCase()}`,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    which: char.charCodeAt(0)
                });

                // Dispatch events
                textArea.dispatchEvent(keydownEvent);
                textArea.dispatchEvent(keypressEvent);

                // Insert the character using insertText (Draft.js handles this)
                document.execCommand('insertText', false, char);

                // Dispatch keyup
                const keyupEvent = new KeyboardEvent('keyup', {
                    bubbles: true,
                    cancelable: true,
                    key: char,
                    code: char === ' ' ? 'Space' : `Key${char.toUpperCase()}`,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0)
                });
                textArea.dispatchEvent(keyupEvent);

                // Small delay every 5 characters to avoid overwhelming Draft.js
                if (i % 5 === 0 && i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            // Final input event
            await new Promise(resolve => setTimeout(resolve, 100));
            const finalInputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: replyText
            });
            textArea.dispatchEvent(finalInputEvent);

            // Set cursor to end
            setCursorToEnd(textArea);

        } else {
            console.error('Could not find editable text area');
        }
    }
}

// Helper function to set cursor to end of text (Draft.js compatible)
function setCursorToEnd(textArea) {
    setTimeout(() => {
        try {
            textArea.focus();

            // Wait a bit for Draft.js to update
            setTimeout(() => {
                try {
                    const range = document.createRange();
                    const selection = window.getSelection();

                    // Find the last text node in Draft.js structure
                    let lastNode = textArea;
                    let lastTextNode = null;

                    // Draft.js uses nested divs, find the deepest text node
                    const walker = document.createTreeWalker(
                        textArea,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    let node;
                    while (node = walker.nextNode()) {
                        lastTextNode = node;
                    }

                    if (lastTextNode) {
                        range.setStart(lastTextNode, lastTextNode.textContent.length);
                        range.collapse(true);
                    } else {
                        // Fallback: select all and collapse to end
                        range.selectNodeContents(textArea);
                        range.collapse(false);
                    }

                    selection.removeAllRanges();
                    selection.addRange(range);
                    textArea.focus();
                } catch (e) {
                    console.log('Could not set cursor position:', e);
                }
            }, 50);
        } catch (e) {
            console.log('Could not focus text area:', e);
        }
    }, 150);
}

// Start the extension
init();

