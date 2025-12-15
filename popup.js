// Popup script for settings

document.addEventListener('DOMContentLoaded', async () => {
  const apiProviderSelect = document.getElementById('apiProvider');
  const groqModelSelect = document.getElementById('groqModel');
  const huggingFaceModelSelect = document.getElementById('huggingFaceModel');
  const openaiEndpointInput = document.getElementById('openaiEndpoint');
  const customEndpointInput = document.getElementById('customEndpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Provider sections
  const groqSection = document.getElementById('groqSection');
  const huggingfaceSection = document.getElementById('huggingfaceSection');
  const openaiSection = document.getElementById('openaiSection');
  const customSection = document.getElementById('customSection');

  // Help texts
  const groqHelp = document.getElementById('groqHelp');
  const huggingfaceHelp = document.getElementById('huggingfaceHelp');
  const openaiHelp = document.getElementById('openaiHelp');
  const customHelp = document.getElementById('customHelp');

  // Load saved settings
  const result = await chrome.storage.sync.get([
    'apiProvider',
    'apiKey',
    'apiEndpoint',
    'groqModel',
    'huggingFaceModel'
  ]);

  // Set provider
  const provider = result.apiProvider || 'groq';
  apiProviderSelect.value = provider;
  updateProviderUI(provider);

  // Set model selections
  if (result.groqModel) {
    groqModelSelect.value = result.groqModel;
  }
  if (result.huggingFaceModel) {
    huggingFaceModelSelect.value = result.huggingFaceModel;
  } else {
    // Default to GPT-2 if not set
    huggingFaceModelSelect.value = 'gpt2';
  }

  // Set API key
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }

  // Set endpoints
  if (result.apiEndpoint) {
    if (provider === 'openai') {
      openaiEndpointInput.value = result.apiEndpoint;
    } else if (provider === 'custom') {
      customEndpointInput.value = result.apiEndpoint;
    }
  }

  // Handle provider change
  apiProviderSelect.addEventListener('change', (e) => {
    updateProviderUI(e.target.value);
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

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}
