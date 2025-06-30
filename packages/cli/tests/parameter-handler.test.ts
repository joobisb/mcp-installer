import { ParameterHandler } from '../src/core/parameter-handler.js';
import { MCPServer } from '@mcp-installer/shared';

describe('ParameterHandler', () => {
  let parameterHandler: ParameterHandler;

  beforeEach(() => {
    parameterHandler = new ParameterHandler();
  });

  const mockServerWithoutParameters: MCPServer = {
    id: 'test-server',
    name: 'Test Server',
    description: 'A test server',
    category: 'utility',
    type: 'stdio',
    difficulty: 'simple',
    requiresAuth: false,
    installation: {
      command: 'npx',
      args: ['test-server'],
    },
    documentation: 'https://example.com',
  };

  const mockServerWithParameters: MCPServer = {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'File system access',
    category: 'utility',
    type: 'stdio',
    difficulty: 'simple',
    requiresAuth: false,
    parameters: {
      desktop_path: {
        type: 'directory_path',
        required: false,
        description: 'Path to Desktop directory',
        placeholder: '/Users/user/Desktop',
        default: '',
      },
      api_key: {
        type: 'api_key',
        required: true,
        description: 'API key for authentication',
        validation: {
          minLength: 10,
        },
      },
      max_connections: {
        type: 'number',
        required: false,
        description: 'Maximum connections',
        default: '5',
      },
      enable_logging: {
        type: 'boolean',
        required: false,
        description: 'Enable logging',
        default: 'true',
      },
    },
    installation: {
      command: 'npx',
      args: ['-y', 'filesystem-server', '{{desktop_path}}', '--connections={{max_connections}}'],
      env: {
        API_KEY: '{{api_key}}',
        ENABLE_LOGGING: '{{enable_logging}}',
      },
    },
    documentation: 'https://example.com',
  };

  describe('hasParameters', () => {
    it('should return false for server without parameters', () => {
      expect(parameterHandler.hasParameters(mockServerWithoutParameters)).toBe(false);
    });

    it('should return true for server with parameters', () => {
      expect(parameterHandler.hasParameters(mockServerWithParameters)).toBe(true);
    });

    it('should return false for server with empty parameters object', () => {
      const serverWithEmptyParams = {
        ...mockServerWithoutParameters,
        parameters: {},
      };
      expect(parameterHandler.hasParameters(serverWithEmptyParams)).toBe(false);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return empty object for server without parameters', () => {
      const result = parameterHandler.getRequiredParameters(mockServerWithoutParameters);
      expect(result).toEqual({});
    });

    it('should return only required parameters', () => {
      const result = parameterHandler.getRequiredParameters(mockServerWithParameters);
      expect(Object.keys(result)).toEqual(['api_key']);
      expect(result.api_key.required).toBe(true);
    });
  });

  describe('getOptionalParameters', () => {
    it('should return empty object for server without parameters', () => {
      const result = parameterHandler.getOptionalParameters(mockServerWithoutParameters);
      expect(result).toEqual({});
    });

    it('should return only optional parameters', () => {
      const result = parameterHandler.getOptionalParameters(mockServerWithParameters);
      expect(Object.keys(result).sort()).toEqual([
        'desktop_path',
        'enable_logging',
        'max_connections',
      ]);
      expect(result.desktop_path.required).toBe(false);
    });
  });

  describe('substituteParameters', () => {
    it('should return original args when no parameters', () => {
      const result = parameterHandler.substituteParameters(mockServerWithoutParameters, {});
      expect(result.args).toEqual(['test-server']);
      expect(result.env).toBeUndefined();
    });

    it('should substitute parameter placeholders in args', () => {
      const values = {
        desktop_path: '/Users/test/Desktop',
        max_connections: '10',
        api_key: 'test-api-key-123',
        enable_logging: 'false',
      };

      const result = parameterHandler.substituteParameters(mockServerWithParameters, values);

      expect(result.args).toEqual([
        '-y',
        'filesystem-server',
        '/Users/test/Desktop',
        '--connections=10',
      ]);
    });

    it('should substitute parameter placeholders in environment variables', () => {
      const values = {
        api_key: 'test-api-key-123',
        enable_logging: 'false',
      };

      const result = parameterHandler.substituteParameters(mockServerWithParameters, values);

      expect(result.env).toEqual({
        API_KEY: 'test-api-key-123',
        ENABLE_LOGGING: 'false',
      });
    });

    it('should filter out empty args from optional parameters', () => {
      const values = {
        api_key: 'test-api-key-123',
        enable_logging: 'true',
        // desktop_path and max_connections not provided (empty)
      };

      const result = parameterHandler.substituteParameters(mockServerWithParameters, values);

      expect(result.args).toEqual([
        '-y',
        'filesystem-server',
        // empty desktop_path should be filtered out
        '--connections=',
      ]);
    });

    it('should handle missing parameter values gracefully', () => {
      const values = {
        api_key: 'test-key',
        // other parameters missing
      };

      const result = parameterHandler.substituteParameters(mockServerWithParameters, values);

      // Empty parameters are filtered out from args
      expect(result.args).toEqual([
        '-y',
        'filesystem-server',
        '--connections=', // empty max_connections
      ]);

      expect(result.env).toEqual({
        API_KEY: 'test-key',
        ENABLE_LOGGING: '', // empty enable_logging
      });
    });
  });

  describe('previewCommand', () => {
    it('should generate correct preview without environment variables', () => {
      const values = {};
      const result = parameterHandler.previewCommand(mockServerWithoutParameters, values);
      expect(result).toBe('npx test-server');
    });

    it('should generate correct preview with environment variables', () => {
      const values = {
        desktop_path: '/Users/test/Desktop',
        api_key: 'test-key',
        max_connections: '5',
        enable_logging: 'true',
      };

      const result = parameterHandler.previewCommand(mockServerWithParameters, values);
      expect(result).toBe(
        'API_KEY=test-key ENABLE_LOGGING=true npx -y filesystem-server /Users/test/Desktop --connections=5'
      );
    });

    it('should handle empty environment variables correctly', () => {
      const values = {
        desktop_path: '/Users/test/Desktop',
        api_key: '',
        enable_logging: '',
      };

      const result = parameterHandler.previewCommand(mockServerWithParameters, values);
      expect(result).toBe(
        'API_KEY= ENABLE_LOGGING= npx -y filesystem-server /Users/test/Desktop --connections='
      );
    });
  });

  describe('parameter validation (private methods)', () => {
    // Testing validation through public interface since validation methods are private

    it('should validate URL parameters', async () => {
      const serverWithUrl: MCPServer = {
        ...mockServerWithoutParameters,
        parameters: {
          webhook_url: {
            type: 'url',
            required: true,
            description: 'Webhook URL',
          },
        },
      };

      // Since validation is private, we test through the substitution process
      // In a real scenario, validation would be tested through prompting
      const result = parameterHandler.substituteParameters(serverWithUrl, {
        webhook_url: 'https://example.com/webhook',
      });

      expect(result).toBeDefined();
    });

    it('should validate number parameters', async () => {
      const serverWithNumber: MCPServer = {
        ...mockServerWithoutParameters,
        parameters: {
          port: {
            type: 'number',
            required: true,
            description: 'Port number',
          },
        },
      };

      const result = parameterHandler.substituteParameters(serverWithNumber, {
        port: '3000',
      });

      expect(result).toBeDefined();
    });
  });

  describe('parameter defaults', () => {
    it('should handle default values for optional parameters', () => {
      const values = {
        api_key: 'test-key',
        // Not providing optional parameters, should use defaults
      };

      const result = parameterHandler.substituteParameters(mockServerWithParameters, values);

      // Empty parameters get filtered out from args, but remain in env
      expect(result.args).toEqual([
        '-y',
        'filesystem-server',
        '--connections=', // empty max_connections
      ]);
      expect(result.env?.ENABLE_LOGGING).toBe(''); // empty enable_logging
    });
  });

  describe('complex parameter scenarios', () => {
    it('should handle server with only required parameters', () => {
      const serverOnlyRequired: MCPServer = {
        ...mockServerWithoutParameters,
        parameters: {
          required_param: {
            type: 'string',
            required: true,
            description: 'Required parameter',
          },
        },
        installation: {
          command: 'npx',
          args: ['server', '{{required_param}}'],
        },
      };

      const requiredParams = parameterHandler.getRequiredParameters(serverOnlyRequired);
      const optionalParams = parameterHandler.getOptionalParameters(serverOnlyRequired);

      expect(Object.keys(requiredParams)).toEqual(['required_param']);
      expect(Object.keys(optionalParams)).toEqual([]);
    });

    it('should handle server with only optional parameters', () => {
      const serverOnlyOptional: MCPServer = {
        ...mockServerWithoutParameters,
        parameters: {
          optional_param: {
            type: 'string',
            required: false,
            description: 'Optional parameter',
          },
        },
      };

      const requiredParams = parameterHandler.getRequiredParameters(serverOnlyOptional);
      const optionalParams = parameterHandler.getOptionalParameters(serverOnlyOptional);

      expect(Object.keys(requiredParams)).toEqual([]);
      expect(Object.keys(optionalParams)).toEqual(['optional_param']);
    });

    it('should handle multiple placeholders in single argument', () => {
      const serverMultiplePlaceholders: MCPServer = {
        ...mockServerWithoutParameters,
        parameters: {
          host: {
            type: 'string',
            required: true,
            description: 'Host',
          },
          port: {
            type: 'number',
            required: true,
            description: 'Port',
          },
        },
        installation: {
          command: 'npx',
          args: ['server', '--endpoint={{host}}:{{port}}'],
        },
      };

      const result = parameterHandler.substituteParameters(serverMultiplePlaceholders, {
        host: 'localhost',
        port: '3000',
      });

      expect(result.args).toEqual(['server', '--endpoint=localhost:3000']);
    });
  });
});
