#!/usr/bin/env node

/**
 * List Providers Example
 * 
 * This script demonstrates how to list and manage configured providers
 * using the OpenClaw provider API.
 * 
 * Usage:
 *   node list-providers.js [--json] [--templates]
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY || 'http://localhost:18789';

async function listProviders() {
  const args = new Set(process.argv.slice(2));
  const showJson = args.has('--json');
  const showTemplates = args.has('--templates');
  const showStatus = args.has('--status');

  try {
    if (showTemplates) {
      await listProviderTemplates(showJson);
    } else if (showStatus) {
      await checkProviderStatus(showJson);
    } else {
      await listConfiguredProviders(showJson);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nMake sure the OpenClaw gateway is running:');
      console.error('  openclaw gateway run');
    }
    process.exit(1);
  }
}

async function listConfiguredProviders(asJson = false) {
  console.log('📋 Fetching configured providers...\n');

  const response = await fetch(`${GATEWAY_URL}/api/v1/providers`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch providers');
  }

  const result = await response.json();
  const providers = result.data || [];

  if (asJson) {
    console.log(JSON.stringify(providers, null, 2));
    return;
  }

  if (providers.length === 0) {
    console.log('No providers configured yet.');
    console.log('\nTo add a provider:');
    console.log('  openclaw providers add openai --api-key YOUR_KEY');
    return;
  }

  console.log(`Found ${providers.length} provider(s):\n`);

  // Header
  console.log('ID                          NAME                STATUS       TEMPLATE    DEFAULT');
  console.log('─'.repeat(85));

  // Rows
  providers.forEach(provider => {
    const statusIcon = getStatusIcon(provider.status);
    const defaultIcon = provider.isDefault ? '★' : ' ';
    
    console.log(
      `${truncate(provider.id, 26).padEnd(28)} ` +
      `${truncate(provider.name, 18).padEnd(20)} ` +
      `${statusIcon} ${provider.status.padEnd(10)} ` +
      `${provider.templateId.padEnd(12)} ` +
      `${defaultIcon}`
    );

    if (provider.lastError) {
      console.log(`  ⚠️  Last error: ${provider.lastError}`);
    }
  });

  console.log('\n' + '─'.repeat(85));
  console.log('Legend: ★ = Default provider');
  console.log('        ✅ = Connected    ⏳ = Testing    ❌ = Error    ⚪ = Configured');
}

async function listProviderTemplates(asJson = false) {
  console.log('📚 Fetching provider templates...\n');

  const response = await fetch(`${GATEWAY_URL}/api/v1/providers/templates`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch templates');
  }

  const result = await response.json();
  const templates = result.data || [];

  if (asJson) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  console.log(`Available provider templates (${templates.length}):\n`);

  // Group by category
  const byCategory = templates.reduce((acc, t) => {
    const cat = t.metadata?.category || 'other';
    acc[cat] = acc[cat] || [];
    acc[cat].push(t);
    return acc;
  }, {});

  Object.entries(byCategory).forEach(([category, items]) => {
    console.log(`\n${category.toUpperCase()}:`);
    console.log('─'.repeat(60));
    
    items.forEach(template => {
      const models = template.models?.length || 0;
      console.log(`  • ${template.metadata?.name}`);
      console.log(`    ID: ${template.id}`);
      console.log(`    Description: ${template.metadata?.description}`);
      console.log(`    Models: ${models} available`);
      console.log(`    Docs: ${template.metadata?.docsUrl}`);
      console.log();
    });
  });
}

async function checkProviderStatus(asJson = false) {
  console.log('🔍 Checking provider status...\n');

  const response = await fetch(`${GATEWAY_URL}/api/v1/providers`);
  const result = await response.json();
  const providers = result.data || [];

  const statusCounts = providers.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  if (asJson) {
    console.log(JSON.stringify({
      total: providers.length,
      byStatus: statusCounts,
      providers: providers.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        lastTested: p.lastTestedAt
      }))
    }, null, 2));
    return;
  }

  console.log('Status Summary:');
  console.log('─'.repeat(40));
  console.log(`Total providers: ${providers.length}`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${getStatusIcon(status)} ${status}: ${count}`);
  });

  // Test each provider
  console.log('\n\nTesting connections...\n');
  
  for (const provider of providers) {
    if (!provider.isEnabled) {
      console.log(`⏸️  ${provider.name} (disabled)`);
      continue;
    }

    process.stdout.write(`🔄 Testing ${provider.name}... `);
    
    try {
      const testResponse = await fetch(
        `${GATEWAY_URL}/api/v1/providers/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: provider.templateId,
            config: provider.config,
            baseUrl: provider.baseUrl
          })
        }
      );

      const testResult = await testResponse.json();
      
      if (testResult.success) {
        console.log(`✅ ${testResult.data?.latency}ms`);
      } else {
        console.log(`❌ ${testResult.error?.message || 'Failed'}`);
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }
  }
}

function getStatusIcon(status) {
  const icons = {
    'connected': '✅',
    'testing': '🔄',
    'error': '❌',
    'configured': '⚪',
    'unconfigured': '⚪',
    'disabled': '⏸️'
  };
  return icons[status] || '❓';
}

function truncate(str, maxLen) {
  if (!str) {
    return '';
  }
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('List Providers Example\n');
  console.log('Usage: node list-providers.js [options]\n');
  console.log('Options:');
  console.log('  --json       Output as JSON');
  console.log('  --templates  List available templates');
  console.log('  --status     Check and test all provider connections');
  console.log('  --help       Show this help\n');
  console.log('Environment:');
  console.log('  OPENCLAW_GATEWAY  Gateway URL (default: http://localhost:18789)');
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  listProviders();
}

module.exports = { listProviders, listProviderTemplates, checkProviderStatus };
