document.addEventListener('DOMContentLoaded', async () => {
  const apiProviderSelect = document.getElementById('apiProvider');
  const groqModelSelect = document.getElementById('groqModel');
  const huggingFaceModelSelect = document.getElementById('huggingFaceModel');
  const openaiEndpointInput = document.getElementById('openaiEndpoint');
  const customEndpointInput = document.getElementById('customEndpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const replyToneSelect = document.getElementById('replyTone');

  // Load saved settings
  const result = await chrome.storage.sync.get([
    'apiProvider',
    'apiKey',
    'apiEndpoint',
    'groqModel',
    'huggingFaceModel',
    'replyTone'
  ]);

  // Set provider
  const provider = result.apiProvider || 'groq';
  apiProviderSelect.value = provider;
  updateProviderUI(provider);

  // Set API key
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }

  // Load Groq models if Groq is selected and API key is available
  if (provider === 'groq' && result.apiKey) {
    await loadGroqModels(result.apiKey, result.groqModel);
  } else if (provider === 'groq') {
    // If Groq is selected but no API key, show default models
    loadDefaultGroqModels(result.groqModel);
  }

  // Set model selections
  if (result.huggingFaceModel) {
    huggingFaceModelSelect.value = result.huggingFaceModel;
  } else {
    // Default to GPT-2 if not set
    huggingFaceModelSelect.value = 'gpt2';
  }

  // Set endpoints
  if (result.apiEndpoint) {
    if (provider === 'openai') {
      openaiEndpointInput.value = result.apiEndpoint;
    } else if (provider === 'custom') {
      customEndpointInput.value = result.apiEndpoint;
    }
  }

  // Set reply tone
  if (result.replyTone) {
    replyToneSelect.value = result.replyTone;
  }

  // Handle provider change
  apiProviderSelect.addEventListener('change', async (e) => {
    const newProvider = e.target.value;
    updateProviderUI(newProvider);

    // Load Groq models if Groq is selected
    if (newProvider === 'groq') {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        await loadGroqModels(apiKey);
      } else {
        loadDefaultGroqModels();
      }
    }
  });

  // Handle API key input change for Groq (with debounce)
  let apiKeyDebounceTimer;
  apiKeyInput.addEventListener('input', async (e) => {
    if (apiProviderSelect.value === 'groq') {
      clearTimeout(apiKeyDebounceTimer);
      const apiKey = e.target.value.trim();

      if (apiKey.length >= 20) { // Only fetch if key looks valid (at least 20 chars)
        apiKeyDebounceTimer = setTimeout(async () => {
          await loadGroqModels(apiKey);
        }, 500); // Wait 500ms after user stops typing
      } else if (apiKey.length === 0) {
        // If key is cleared, show default models
        loadDefaultGroqModels();
      }
    }
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const provider = apiProviderSelect.value;
    let apiEndpoint = '';
    let apiKey = apiKeyInput.value.trim();

    // Validate and get endpoint based on provider
    switch (provider) {
      case 'groq':
        // Groq doesn't need endpoint, it's hardcoded
        if (!apiKey) {
          showStatus('Groq API key is required. Get a free key at console.groq.com', 'error');
          return;
        }
        break;
      case 'huggingface':
        // HuggingFace endpoint is built from model name
        break;
      case 'openai':
        apiEndpoint = openaiEndpointInput.value.trim();
        if (!apiEndpoint) {
          showStatus('OpenAI endpoint is required', 'error');
          return;
        }
        if (!apiKey) {
          showStatus('OpenAI API key is required', 'error');
          return;
        }
        break;
      case 'custom':
        apiEndpoint = customEndpointInput.value.trim();
        if (!apiEndpoint) {
          showStatus('Custom API endpoint is required', 'error');
          return;
        }
        break;
    }

    try {
      const settings = {
        apiProvider: provider,
        apiKey: apiKey
      };

      if (apiEndpoint) {
        settings.apiEndpoint = apiEndpoint;
      }

      if (provider === 'groq') {
        settings.groqModel = groqModelSelect.value;
      }

      if (provider === 'huggingface') {
        settings.huggingFaceModel = huggingFaceModelSelect.value;
      }

      // Save reply tone
      settings.replyTone = replyToneSelect.value;

      await chrome.storage.sync.set(settings);

      showStatus('Settings saved successfully!', 'success');

      // Clear status after 2 seconds
      setTimeout(() => {
        statusDiv.className = 'status';
      }, 2000);
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });
});

function updateProviderUI(provider) {
  // Hide all sections
  document.getElementById('groqSection').classList.remove('active');
  document.getElementById('huggingfaceSection').classList.remove('active');
  document.getElementById('openaiSection').classList.remove('active');
  document.getElementById('customSection').classList.remove('active');

  // Hide all help texts
  document.getElementById('groqHelp').style.display = 'none';
  document.getElementById('huggingfaceHelp').style.display = 'none';
  document.getElementById('openaiHelp').style.display = 'none';
  document.getElementById('customHelp').style.display = 'none';

  // Show relevant section and help
  switch (provider) {
    case 'groq':
      document.getElementById('groqSection').classList.add('active');
      document.getElementById('groqHelp').style.display = 'inline';
      break;
    case 'huggingface':
      document.getElementById('huggingfaceSection').classList.add('active');
      document.getElementById('huggingfaceHelp').style.display = 'inline';
      break;
    case 'openai':
      document.getElementById('openaiSection').classList.add('active');
      document.getElementById('openaiHelp').style.display = 'inline';
      break;
    case 'custom':
      document.getElementById('customSection').classList.add('active');
      document.getElementById('customHelp').style.display = 'inline';
      break;
  }
}

// Fetch Groq models dynamically from API
async function loadGroqModels(apiKey, selectedModel = null) {
  const groqModelSelect = document.getElementById('groqModel');

  // Show loading state
  groqModelSelect.innerHTML = '<option value="">Loading models...</option>';
  groqModelSelect.disabled = true;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // Clear existing options
    groqModelSelect.innerHTML = '';

    // Filter out models that don't support chat completions
    const nonChatModels = [
      'whisper',           // Speech-to-text models
      'tts',               // Text-to-speech models
      'playai-tts',        // TTS models
      'guard',             // Guard models (content moderation, not chat)
      'prompt-guard',      // Prompt guard models
      'safeguard'          // Safety models
    ];

    // Filter and sort models - prioritize production models
    const productionModels = [];
    const previewModels = [];
    const systemModels = [];

    models.forEach(model => {
      const modelId = model.id.toLowerCase();

      // Skip deprecated models
      if (modelId.includes('deprecated')) {
        return;
      }

      // Skip models that don't support chat completions
      const isNonChatModel = nonChatModels.some(nonChat => modelId.includes(nonChat));
      if (isNonChatModel) {
        return;
      }

      // Categorize models
      if (modelId.includes('compound')) {
        systemModels.push(model);
      } else if (modelId.includes('preview') || modelId.includes('maverick') ||
        modelId.includes('scout') || modelId.includes('kimi') ||
        modelId.includes('qwen')) {
        previewModels.push(model);
      } else {
        productionModels.push(model);
      }
    });

    // Add production models first
    if (productionModels.length > 0) {
      productionModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = formatModelName(model.id);
        groqModelSelect.appendChild(option);
      });
    }

    // Add a separator if we have both production and preview
    if (productionModels.length > 0 && (previewModels.length > 0 || systemModels.length > 0)) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '────────── Preview Models ──────────';
      groqModelSelect.appendChild(separator);
    }

    // Add preview models
    previewModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = formatModelName(model.id) + ' (Preview)';
      groqModelSelect.appendChild(option);
    });

    // Add system models
    if (systemModels.length > 0) {
      if (previewModels.length > 0 || productionModels.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '────────── Systems ──────────';
        groqModelSelect.appendChild(separator);
      }
      systemModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = formatModelName(model.id) + ' (System)';
        groqModelSelect.appendChild(option);
      });
    }

    // Set selected model if provided and valid
    if (selectedModel && groqModelSelect.querySelector(`option[value="${selectedModel}"]`)) {
      groqModelSelect.value = selectedModel;
    } else {
      // If selected model is invalid (e.g., whisper, tts), reset to default
      const defaultModel = productionModels.length > 0 ? productionModels[0].id :
        (previewModels.length > 0 ? previewModels[0].id :
          (systemModels.length > 0 ? systemModels[0].id : null));

      if (defaultModel) {
        groqModelSelect.value = defaultModel;

        // If we had an invalid saved model, update it to the default
        if (selectedModel) {
          chrome.storage.sync.set({ groqModel: defaultModel });
        }
      }
    }

    groqModelSelect.disabled = false;

  } catch (error) {
    console.error('Error loading Groq models:', error);
    // Fallback to default models on error
    loadDefaultGroqModels(selectedModel);
    showStatus('Could not load models from API. Using default models.', 'error');
    setTimeout(() => {
      const statusDiv = document.getElementById('status');
      statusDiv.className = 'status';
    }, 3000);
  }
}

// Load default Groq models (fallback)
function loadDefaultGroqModels(selectedModel = null) {
  const groqModelSelect = document.getElementById('groqModel');

  const defaultModels = [
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Recommended)' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick 17B (Preview)' },
    { value: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (Preview)' },
    { value: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
    { value: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
    { value: 'groq/compound', label: 'Groq Compound (System)' }
  ];

  groqModelSelect.innerHTML = '';
  defaultModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    groqModelSelect.appendChild(option);
  });

  if (selectedModel && groqModelSelect.querySelector(`option[value="${selectedModel}"]`)) {
    groqModelSelect.value = selectedModel;
  } else {
    groqModelSelect.value = defaultModels[0].value;
  }

  groqModelSelect.disabled = false;
}

// Format model ID to readable name
function formatModelName(modelId) {
  // Remove common prefixes
  let name = modelId
    .replace(/^meta-llama\//, '')
    .replace(/^openai\//, '')
    .replace(/^groq\//, '')
    .replace(/^moonshotai\//, '')
    .replace(/^qwen\//, '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');

  // Capitalize words
  name = name.split(' ').map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  // Handle special cases
  name = name
    .replace(/Llama (\d)/g, 'Llama $1')
    .replace(/8b/g, '8B')
    .replace(/70b/g, '70B')
    .replace(/120b/g, '120B')
    .replace(/20b/g, '20B')
    .replace(/17b/g, '17B')
    .replace(/32b/g, '32B')
    .replace(/Instruct/g, 'Instruct')
    .replace(/Versatile/g, 'Versatile')
    .replace(/Instant/g, 'Instant')
    .replace(/Oss/g, 'OSS')
    .replace(/Gpt/g, 'GPT')
    .replace(/Compound/g, 'Compound');

  return name;
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}
