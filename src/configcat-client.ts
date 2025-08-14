import fetch from 'node-fetch';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface ConfigCatConfig {
  productId: string;
  configId: string;
  name: string;
  description?: string;
  order: number;
  evaluationVersion: string;
}

export interface FeatureFlag {
  settingId: number;
  key: string;
  name: string;
  hint?: string;
  settingType: 'boolean' | 'string' | 'int' | 'double';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  environmentId: string;
  name: string;
  description?: string;
  color: string;
  order: number;
}

export class ConfigCatClient {
  private readonly baseUrl = 'https://api.configcat.com';
  private readonly username: string;
  private readonly password: string;

  constructor() {
    this.username = process.env.CONFIGCAT_USERNAME || '';
    this.password = process.env.CONFIGCAT_PASSWORD || '';
    
    if (!this.username || !this.password) {
      console.warn('ConfigCat credentials not found. Set CONFIGCAT_USERNAME and CONFIGCAT_PASSWORD environment variables.');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.username || !this.password) {
      throw new McpError(ErrorCode.InvalidRequest, 'ConfigCat credentials not configured');
    }
    
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ConfigCat-MCP/1.0.0'
    };
  }

  private async makeRequest<T>(endpoint: string, options: any = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...options.headers };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new McpError(
        ErrorCode.InternalError,
        `ConfigCat API error: ${response.status} - ${errorText}`
      );
    }

    return response.json() as T;
  }

  async getProducts(): Promise<any[]> {
    return this.makeRequest('/v1/products');
  }

  async getConfigs(productId: string): Promise<ConfigCatConfig[]> {
    return this.makeRequest(`/v1/products/${productId}/configs`);
  }

  async getConfig(configId: string): Promise<ConfigCatConfig> {
    return this.makeRequest(`/v1/configs/${configId}`);
  }

  async getEnvironments(productId: string): Promise<Environment[]> {
    return this.makeRequest(`/v1/products/${productId}/environments`);
  }

  async getFeatureFlags(configId: string): Promise<FeatureFlag[]> {
    return this.makeRequest(`/v1/configs/${configId}/settings`);
  }

  async getFeatureFlag(settingId: number): Promise<FeatureFlag> {
    return this.makeRequest(`/v1/settings/${settingId}`);
  }

  async createFeatureFlag(configId: string, data: {
    key: string;
    name: string;
    hint?: string;
    settingType: 'boolean' | 'string' | 'int' | 'double';
  }): Promise<FeatureFlag> {
    return this.makeRequest(`/v1/configs/${configId}/settings`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFeatureFlag(settingId: number, data: {
    name?: string;
    hint?: string;
  }): Promise<FeatureFlag> {
    return this.makeRequest(`/v1/settings/${settingId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteFeatureFlag(settingId: number): Promise<void> {
    await this.makeRequest(`/v1/settings/${settingId}`, {
      method: 'DELETE'
    });
  }

  async getResources() {
    try {
      const products = await this.getProducts();
      const resources = [];

      for (const product of products) {
        resources.push({
          uri: `configcat://products/${product.productId}`,
          name: `Product: ${product.name}`,
          description: product.description || `ConfigCat product ${product.name}`,
          mimeType: 'application/json'
        });

        try {
          const configs = await this.getConfigs(product.productId);
          for (const config of configs) {
            resources.push({
              uri: `configcat://configs/${config.configId}`,
              name: `Config: ${config.name}`,
              description: config.description || `ConfigCat config ${config.name}`,
              mimeType: 'application/json'
            });
          }
        } catch (error) {
          console.warn(`Could not fetch configs for product ${product.productId}:`, error);
        }
      }

      return resources;
    } catch (error) {
      console.warn('Could not fetch resources:', error);
      return [];
    }
  }

  async readResource(uri: string) {
    const [, , type, id] = uri.split('/');

    try {
      switch (type) {
        case 'products': {
          const products = await this.getProducts();
          const product = products.find(p => p.productId === id);
          if (!product) {
            throw new McpError(ErrorCode.InvalidRequest, `Product ${id} not found`);
          }
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(product, null, 2)
            }]
          };
        }
        case 'configs': {
          const config = await this.getConfig(id);
          const featureFlags = await this.getFeatureFlags(id);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ config, featureFlags }, null, 2)
            }]
          };
        }
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource type: ${type}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Failed to read resource: ${error}`);
    }
  }

  getTools() {
    return [
      {
        name: 'list_products',
        description: 'List all ConfigCat products',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_configs',
        description: 'List all configs for a product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID' }
          },
          required: ['productId']
        }
      },
      {
        name: 'get_config',
        description: 'Get details of a specific config',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'Config ID' }
          },
          required: ['configId']
        }
      },
      {
        name: 'list_environments',
        description: 'List all environments for a product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID' }
          },
          required: ['productId']
        }
      },
      {
        name: 'list_feature_flags',
        description: 'List all feature flags for a config',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'Config ID' }
          },
          required: ['configId']
        }
      },
      {
        name: 'get_feature_flag',
        description: 'Get details of a specific feature flag',
        inputSchema: {
          type: 'object',
          properties: {
            settingId: { type: 'number', description: 'Setting ID' }
          },
          required: ['settingId']
        }
      },
      {
        name: 'create_feature_flag',
        description: 'Create a new feature flag',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'Config ID' },
            key: { type: 'string', description: 'Feature flag key' },
            name: { type: 'string', description: 'Feature flag name' },
            hint: { type: 'string', description: 'Feature flag hint/description' },
            settingType: { 
              type: 'string', 
              enum: ['boolean', 'string', 'int', 'double'],
              description: 'Feature flag type'
            }
          },
          required: ['configId', 'key', 'name', 'settingType']
        }
      },
      {
        name: 'update_feature_flag',
        description: 'Update an existing feature flag',
        inputSchema: {
          type: 'object',
          properties: {
            settingId: { type: 'number', description: 'Setting ID' },
            name: { type: 'string', description: 'Feature flag name' },
            hint: { type: 'string', description: 'Feature flag hint/description' }
          },
          required: ['settingId']
        }
      },
      {
        name: 'delete_feature_flag',
        description: 'Delete a feature flag',
        inputSchema: {
          type: 'object',
          properties: {
            settingId: { type: 'number', description: 'Setting ID' }
          },
          required: ['settingId']
        }
      }
    ];
  }

  async callTool(name: string, args: any) {
    try {
      switch (name) {
        case 'list_products':
          const products = await this.getProducts();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(products, null, 2)
            }]
          };

        case 'list_configs':
          const configs = await this.getConfigs(args.productId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(configs, null, 2)
            }]
          };

        case 'get_config':
          const config = await this.getConfig(args.configId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(config, null, 2)
            }]
          };

        case 'list_environments':
          const environments = await this.getEnvironments(args.productId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(environments, null, 2)
            }]
          };

        case 'list_feature_flags':
          const featureFlags = await this.getFeatureFlags(args.configId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(featureFlags, null, 2)
            }]
          };

        case 'get_feature_flag':
          const featureFlag = await this.getFeatureFlag(args.settingId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(featureFlag, null, 2)
            }]
          };

        case 'create_feature_flag':
          const newFlag = await this.createFeatureFlag(args.configId, {
            key: args.key,
            name: args.name,
            hint: args.hint,
            settingType: args.settingType
          });
          return {
            content: [{
              type: 'text',
              text: `Feature flag created successfully:\n${JSON.stringify(newFlag, null, 2)}`
            }]
          };

        case 'update_feature_flag':
          const updatedFlag = await this.updateFeatureFlag(args.settingId, {
            name: args.name,
            hint: args.hint
          });
          return {
            content: [{
              type: 'text',
              text: `Feature flag updated successfully:\n${JSON.stringify(updatedFlag, null, 2)}`
            }]
          };

        case 'delete_feature_flag':
          await this.deleteFeatureFlag(args.settingId);
          return {
            content: [{
              type: 'text',
              text: `Feature flag ${args.settingId} deleted successfully`
            }]
          };

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  }

  getPrompts() {
    return [
      {
        name: 'create_feature_flag_wizard',
        description: 'Interactive wizard to create a new feature flag',
        arguments: [
          {
            name: 'productId',
            description: 'Product ID where the feature flag will be created',
            required: true
          },
          {
            name: 'configId',
            description: 'Config ID where the feature flag will be created',
            required: true
          }
        ]
      },
      {
        name: 'feature_flag_best_practices',
        description: 'Get best practices for feature flag management',
        arguments: []
      },
      {
        name: 'troubleshoot_feature_flag',
        description: 'Help troubleshoot feature flag issues',
        arguments: [
          {
            name: 'issue_description',
            description: 'Description of the issue you are experiencing',
            required: true
          }
        ]
      }
    ];
  }

  async getPrompt(name: string, args: any) {
    switch (name) {
      case 'create_feature_flag_wizard':
        const { productId, configId } = args;
        return {
          description: 'Interactive wizard to create a new feature flag',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text',
                text: `I want to create a new feature flag in product ${productId}, config ${configId}. Please guide me through the process step by step.

Consider the following:
1. What should be the feature flag key? (use kebab-case, be descriptive)
2. What should be the display name?
3. What type should it be? (boolean, string, int, double)
4. Should I add a description/hint?
5. What are the initial values for different environments?

Please help me create this feature flag following best practices.`
              }
            }
          ]
        };

      case 'feature_flag_best_practices':
        return {
          description: 'Get best practices for feature flag management',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text',
                text: `Please provide comprehensive best practices for feature flag management including:

1. Naming conventions for feature flags
2. When and how to use different flag types (boolean, string, int, double)
3. Strategies for rolling out features safely
4. How to organize flags across different environments
5. Lifecycle management - when to remove flags
6. Testing strategies with feature flags
7. Monitoring and observability
8. Team collaboration practices

Focus on practical, actionable advice for ConfigCat users.`
              }
            }
          ]
        };

      case 'troubleshoot_feature_flag':
        return {
          description: 'Help troubleshoot feature flag issues',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text',
                text: `I'm experiencing an issue with feature flags: ${args.issue_description}

Please help me troubleshoot this issue. Consider common problems like:
1. Flag not updating in real-time
2. Wrong values being returned
3. Performance issues
4. SDK configuration problems
5. Environment-specific issues
6. Caching problems
7. Network connectivity issues

Provide step-by-step troubleshooting guidance and suggest specific things to check.`
              }
            }
          ]
        };

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
    }
  }
}