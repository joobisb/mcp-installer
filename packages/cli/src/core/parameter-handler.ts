import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { MCPServer, ServerParameter } from '@mcp-installer/shared';
import chalk from 'chalk';

export interface ParameterValues {
  [key: string]: string;
}

export class ParameterHandler {
  /**
   * Check if a server has any parameters that need user input
   */
  hasParameters(server: MCPServer): boolean {
    return !!server.parameters && Object.keys(server.parameters).length > 0;
  }

  /**
   * Get all required parameters for a server
   */
  getRequiredParameters(server: MCPServer): Record<string, ServerParameter> {
    if (!server.parameters) return {};

    return Object.fromEntries(
      Object.entries(server.parameters).filter(([_, param]) => param.required === true)
    );
  }

  /**
   * Get all optional parameters for a server
   */
  getOptionalParameters(server: MCPServer): Record<string, ServerParameter> {
    if (!server.parameters) return {};

    return Object.fromEntries(
      Object.entries(server.parameters).filter(([_, param]) => param.required !== true)
    );
  }

  /**
   * Prompt user for parameter values
   */
  async promptForParameters(server: MCPServer): Promise<ParameterValues> {
    if (!this.hasParameters(server)) {
      return {};
    }

    const values: ParameterValues = {};
    const requiredParams = this.getRequiredParameters(server);
    const optionalParams = this.getOptionalParameters(server);

    console.log(chalk.cyan(`\n📋 ${server.name} requires some configuration:`));

    // Prompt for required parameters first
    if (Object.keys(requiredParams).length > 0) {
      console.log(chalk.yellow('\n🔹 Required parameters:'));

      for (const [paramName, param] of Object.entries(requiredParams)) {
        const value = await this.promptForSingleParameter(paramName, param, true);
        values[paramName] = value;
      }
    }

    // Prompt for optional parameters
    if (Object.keys(optionalParams).length > 0) {
      console.log(chalk.gray('\n🔸 Optional parameters (press Enter to skip):'));

      for (const [paramName, param] of Object.entries(optionalParams)) {
        const value = await this.promptForSingleParameter(paramName, param, false);
        values[paramName] = value || param.default || '';
      }
    }

    return values;
  }

  /**
   * Prompt for a single parameter value
   */
  private async promptForSingleParameter(
    paramName: string,
    param: ServerParameter,
    required: boolean
  ): Promise<string> {
    const promptConfig: any = {
      type: this.getInquirerType(param.type),
      name: 'value',
      message: `${param.description}:`,
      validate: (input: string) => this.validateParameter(input, param, required),
    };

    if (param.placeholder) {
      promptConfig.message += chalk.gray(` (e.g., ${param.placeholder})`);
    }

    if (param.type === 'boolean') {
      promptConfig.default = param.default === 'true';
    } else if (!required && param.default) {
      promptConfig.default = param.default;
    }

    const response = await inquirer.prompt([promptConfig]);
    return String(response.value);
  }

  /**
   * Get the appropriate inquirer input type for a parameter type
   */
  private getInquirerType(paramType: string): string {
    switch (paramType) {
      case 'api_key':
        return 'password';
      case 'boolean':
        return 'confirm';
      case 'number':
        return 'number';
      default:
        return 'input';
    }
  }

  /**
   * Validate a parameter value
   */
  private validateParameter(
    value: string,
    param: ServerParameter,
    required: boolean
  ): boolean | string {
    // Check if required parameter is empty
    if (required && (!value || value.trim() === '')) {
      return `This parameter is required`;
    }

    // Skip validation for empty optional parameters
    if (!required && (!value || value.trim() === '')) {
      return true;
    }

    // Type-specific validation
    switch (param.type) {
      case 'directory_path':
      case 'file_path':
        return this.validatePath(value);

      case 'url':
        return this.validateUrl(value);

      case 'number':
        return this.validateNumber(value);

      case 'api_key':
        return this.validateApiKey(value);
    }

    // Pattern validation
    if (param.validation?.pattern) {
      const regex = new RegExp(param.validation.pattern);
      if (!regex.test(value)) {
        return `Value must match pattern: ${param.validation.pattern}`;
      }
    }

    // Length validation
    if (param.validation?.minLength && value.length < param.validation.minLength) {
      return `Value must be at least ${param.validation.minLength} characters`;
    }

    if (param.validation?.maxLength && value.length > param.validation.maxLength) {
      return `Value must be no more than ${param.validation.maxLength} characters`;
    }

    return true;
  }

  /**
   * Validate file/directory paths
   */
  private validatePath(value: string): boolean | string {
    if (!value || value.trim() === '') return true;

    try {
      if (!existsSync(value)) {
        return `Path does not exist: ${value}`;
      }

      // Additional type-specific checks could be added here
      // For now, we just check existence
      return true;
    } catch (error) {
      return `Invalid path: ${value}`;
    }
  }

  /**
   * Validate URLs
   */
  private validateUrl(value: string): boolean | string {
    try {
      new URL(value);
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  }

  /**
   * Validate numbers
   */
  private validateNumber(value: string): boolean | string {
    if (isNaN(Number(value))) {
      return 'Please enter a valid number';
    }
    return true;
  }

  /**
   * Validate API keys
   */
  private validateApiKey(value: string): boolean | string {
    if (!value || value.trim() === '') {
      return 'API key cannot be empty';
    }

    // Basic API key validation - could be enhanced based on specific requirements
    if (value.length < 10) {
      return 'API key seems too short';
    }

    return true;
  }

  /**
   * Substitute parameter placeholders in installation config
   */
  substituteParameters(
    server: MCPServer,
    values: ParameterValues
  ): { args: string[]; env?: Record<string, string> } {
    const substitutedArgs = server.installation.args
      .map((arg) => this.substitutePlaceholders(arg, values))
      .filter((arg) => arg !== ''); // Remove empty args from optional parameters

    let substitutedEnv: Record<string, string> | undefined;
    if (server.installation.env) {
      substitutedEnv = {};
      for (const [key, value] of Object.entries(server.installation.env)) {
        substitutedEnv[key] = this.substitutePlaceholders(value, values);
      }
    }

    return {
      args: substitutedArgs,
      env: substitutedEnv,
    };
  }

  /**
   * Replace {{parameter_name}} placeholders with actual values
   */
  private substitutePlaceholders(template: string, values: ParameterValues): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
      return values[paramName] || '';
    });
  }

  /**
   * Preview what the final command will look like
   */
  previewCommand(server: MCPServer, values: ParameterValues): string {
    const { args, env } = this.substituteParameters(server, values);

    let preview = `${server.installation.command} ${args.join(' ')}`;

    if (env && Object.keys(env).length > 0) {
      const envVars = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      preview = `${envVars} ${preview}`;
    }

    return preview;
  }
}
