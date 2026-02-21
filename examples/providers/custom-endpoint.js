#!/usr/bin/env node

/**
 * Custom Endpoint Example
 * 
 * This script demonstrates how to add a custom OpenAI-compatible endpoint
 * for self-hosted models (Ollama, vLLM, etc.) or private enterprise endpoints.
 * 
 * Usage:
 *   # For Ollama
 *   node custom-endpoint.js ollama --url http://localhost:11434
 * 
 *   # For custom endpoint with API key
 *   node custom-endpoint.js custom --url https://llm.company.com/api --key YOUR_KEY
 * 
 *   # For testing a local LM Studio server
 *   node custom-endpoint.js lmstudio --url http://localhost:1234
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY || 'http://localhost:18789';

// Predefined configurations for common custom endpoints
const ENDPOINT_PRESETS = {
  ollama: {
    name: 'Ollama Local',
    baseUrl: 'http://localhost:11434/v1',
    description: 'Self-hosted models via Ollama',
    testModel: 'llama2',
    authType: 'none'
  },
  lmstudio: {
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    description: 'LM Studio local server',
    testModel: 'local-model',
    authType: 'none'
  },
  vllm: {
    name: 'vLLM Server',
    baseUrl: 'http://localhost:8000/v1',
    description: 'Self-hosted vLLM inference server',
    testModel: 'meta-llama/Llama-2-7b',
    authType: 'api-key'
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    description: 'Custom OpenAI-compatible endpoint',
    testModel: 'default',
    authType: 'optional'
  }
};

async function addCustomEndpoint() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }

  const preset = ENDPOINT_PRESETS[args.preset] || ENDPOINT_PRESETS.custom;
  const baseUrl = args.url || preset.baseUrl;
  const apiKey = args.key || '';

  if (!baseUrl) {
    console.error('❌ Error: Base URL is required');
    console.error('Use --url to specify the endpoint URL\n');
    showHelp();
    process.exit(1);
  }

  console.log(`🔧 Adding ${preset.name}...\n`);
  console.log(`Endpoint: ${baseUrl}`);
  console.log(`Auth: ${apiKey ? 'API Key provided' : 'No authentication'}\n`);

  try {
    // Step 1: Verify endpoint is reachable
    console.log('Step 1: Testing endpoint connectivity...');
    await verifyEndpoint(baseUrl, apiKey);
    console.log('✅ Endpoint is reachable\n');

    // Step 2: Test models endpoint
    console.log('Step 2: Fetching available models...');
    const models = await fetchModels(baseUrl, apiKey);
    console.log(`✅ Found ${models.length} model(s)\n`);
    
    models.slice(0, 5).forEach(model => {
      console.log(`  • ${model.id}`);
    });
    if (models.length > 5) {
      console.log(`  ... and ${models.length - 5} more`);
    }
    console.log();

    // Step 3: Test chat completion
    if (models.length > 0) {
      console.log('Step 3: Testing chat completion...');
      await testChatCompletion(baseUrl, apiKey, models[0].id);
      console.log('✅ Chat completion working\n');
    }

    // Step 4: Create provider configuration
    console.log('Step 4: Creating provider configuration...');
    
    const providerName = args.name || preset.name;
    const config = {
      apiKey: apiKey || undefined
    };

    const response = await fetch(`${GATEWAY_URL}/api/v1/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'openai', // Use OpenAI template for custom endpoints
        name: providerName,
        description: args.description || preset.description,
        config,
        baseUrl,
        isDefault: args.default || false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to create provider:');
      console.error(`   ${error.error?.message || 'Unknown error'}`);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Custom endpoint configured successfully!\n');
    console.log('Provider Details:');
    console.log(`  ID: ${result.data.id}`);
    console.log(`  Name: ${result.data.name}`);
    console.log(`  Base URL: ${baseUrl}`);
    console.log(`  Status: ${result.data.status}`);
    console.log();

    console.log('🎉 Your custom endpoint is ready to use!\n');
    console.log('Example usage:');
    console.log(JSON.stringify({
      agents: {
        defaults: {
          model: {
            primary: `${result.data.id}/${models[0]?.id || 'default'}`
          }
        }
      }
    }, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nThe endpoint is not reachable. Make sure:');
      console.error(`  1. The server is running at ${baseUrl}`);
      console.error('  2. There are no firewall rules blocking the connection');
      console.error('  3. The URL and port are correct\n');
      
      if (args.preset === 'ollama') {
        console.error('To start Ollama:');
        console.error('  ollama serve');
      } else if (args.preset === 'lmstudio') {
        console.error('To start LM Studio server:');
        console.error('  1. Open LM Studio');
        console.error('  2. Go to Developer tab');
        console.error('  3. Start server');
      }
    }
    
    process.exit(1);
  }
}

async function verifyEndpoint(baseUrl, apiKey) {
  const healthUrl = new URL('/v1/models', baseUrl).toString();
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(healthUrl, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Endpoint returned ${response.status}: ${errorText}`);
  }
}

async function fetchModels(baseUrl, apiKey) {
  const modelsUrl = new URL('/v1/models', baseUrl).toString();
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(modelsUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function testChatCompletion(baseUrl, apiKey, modelId) {
  const chatUrl = new URL('/v1/chat/completions', baseUrl).toString();
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(chatUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat completion failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    preset: args[0] || 'custom',
    url: null,
    key: null,
    name: null,
    description: null,
    default: false,
    help: false
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
      case '-u':
        result.url = args[++i];
        break;
      case '--key':
      case '-k':
        result.key = args[++i];
        break;
      case '--name':
      case '-n':
        result.name = args[++i];
        break;
      case '--description':
      case '-d':
        result.description = args[++i];
        break;
      case '--default':
        result.default = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp() {
  console.log('Custom Endpoint Example\n');
  console.log('Usage: node custom-endpoint.js [preset] [options]\n');
  console.log('Presets:');
  console.log('  ollama    Ollama local server (default: http://localhost:11434)');
  console.log('  lmstudio  LM Studio server (default: http://localhost:1234)');
  console.log('  vllm      vLLM inference server (default: http://localhost:8000)');
  console.log('  custom    Custom OpenAI-compatible endpoint (required)\n');
  console.log('Options:');
  console.log('  -u, --url          Base URL for the endpoint');
  console.log('  -k, --key          API key (if required)');
  console.log('  -n, --name         Provider name');
  console.log('  -d, --description  Provider description');
  console.log('      --default      Set as default provider');
  console.log('  -h, --help         Show this help\n');
  console.log('Examples:\n');
  console.log('  # Add local Ollama instance');
  console.log('  node custom-endpoint.js ollama\n');
  console.log('  # Add custom endpoint with auth');
  console.log("  node custom-endpoint.js custom \\");
  console.log("    --url https://llm.company.com/api \\");
  console.log("    --key sk-abc123 \\");
  console.log('    --name "Company LLM"\n');
  console.log('  # Add LM Studio with custom name');
  console.log("  node custom-endpoint.js lmstudio \\");
  console.log('    --name "Local Development" \\');
  console.log('    --default\n');
  console.log('Environment:');
  console.log('  OPENCLAW_GATEWAY  Gateway URL (default: http://localhost:18789)');
}

// Run if executed directly
if (require.main === module) {
  addCustomEndpoint();
}

module.exports = { addCustomEndpoint };
