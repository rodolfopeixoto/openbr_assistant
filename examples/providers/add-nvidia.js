#!/usr/bin/env node

/**
 * Add NVIDIA Provider Example
 * 
 * This script demonstrates how to add an NVIDIA provider configuration
 * programmatically using the OpenClaw provider API.
 * 
 * Usage:
 *   export NVIDIA_API_KEY="nvapi-..."
 *   node add-nvidia.js
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY || 'http://localhost:18789';

async function addNvidiaProvider() {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    console.error('Error: NVIDIA_API_KEY environment variable is required');
    console.error('\nGet your API key from: https://build.nvidia.com/');
    console.error('Then run: export NVIDIA_API_KEY="nvapi-..."');
    process.exit(1);
  }

  console.log('🔧 Adding NVIDIA provider...\n');

  try {
    // Step 1: Test connection first
    console.log('Step 1: Testing NVIDIA API connection...');
    const testResponse = await fetch(`${GATEWAY_URL}/api/v1/providers/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'nvidia',
        config: { apiKey }
      })
    });

    const testResult = await testResponse.json();
    
    if (!testResult.success) {
      console.error('❌ Connection test failed:');
      console.error(`   Error: ${testResult.error?.message || 'Unknown error'}`);
      console.error(`   Code: ${testResult.error?.code || 'N/A'}`);
      process.exit(1);
    }

    console.log(`✅ Connection successful (${testResult.data?.latency}ms)\n`);

    // Step 2: Create the provider
    console.log('Step 2: Creating provider configuration...');
    const createResponse = await fetch(`${GATEWAY_URL}/api/v1/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'nvidia',
        name: 'NVIDIA API Catalog',
        description: 'Production-grade models via NVIDIA API',
        config: { apiKey },
        isDefault: false
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('❌ Failed to create provider:');
      console.error(`   ${error.error?.message || 'Unknown error'}`);
      process.exit(1);
    }

    const provider = await createResponse.json();
    
    console.log('✅ Provider created successfully!\n');
    console.log('Provider Details:');
    console.log(`  ID: ${provider.data.id}`);
    console.log(`  Name: ${provider.data.name}`);
    console.log(`  Status: ${provider.data.status}`);
    console.log(`  Created: ${new Date(provider.data.createdAt).toLocaleString()}`);
    console.log();
    
    // Step 3: Show available models
    console.log('Step 3: Fetching available models...');
    const templatesResponse = await fetch(
      `${GATEWAY_URL}/api/v1/providers/templates/nvidia`
    );
    
    if (templatesResponse.ok) {
      const template = await templatesResponse.json();
      console.log('\nAvailable Models:');
      template.data?.models?.forEach(model => {
        console.log(`  • ${model.id}`);
        console.log(`    ${model.description}`);
        console.log(`    Context: ${model.contextWindow.toLocaleString()} tokens`);
        console.log();
      });
    }

    console.log('🎉 NVIDIA provider is ready to use!');
    console.log();
    console.log('Example usage in openclaw.config.json:');
    console.log(JSON.stringify({
      agents: {
        defaults: {
          model: {
            primary: 'nvidia/z-ai/glm5'
          }
        }
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nMake sure the OpenClaw gateway is running:');
      console.error('  openclaw gateway run');
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  addNvidiaProvider();
}

module.exports = { addNvidiaProvider };
