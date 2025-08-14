#!/usr/bin/env node

// Simple test to verify the MCP server can be imported and initialized
import { ConfigCatClient } from './build/configcat-client.js';

console.log('Testing ConfigCat MCP Server...');

try {
  const client = new ConfigCatClient();
  console.log('✓ ConfigCat client initialized successfully');
  
  const tools = client.getTools();
  console.log(`✓ Found ${tools.length} tools`);
  
  const prompts = client.getPrompts();
  console.log(`✓ Found ${prompts.length} prompts`);
  
  console.log('\nAvailable tools:');
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  
  console.log('\nAvailable prompts:');
  prompts.forEach(prompt => {
    console.log(`  - ${prompt.name}: ${prompt.description}`);
  });
  
  console.log('\n✓ ConfigCat MCP Server test completed successfully!');
  console.log('\nTo use this server, set CONFIGCAT_USERNAME and CONFIGCAT_PASSWORD environment variables');
  console.log('and configure your MCP client to use this server.');
  
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}