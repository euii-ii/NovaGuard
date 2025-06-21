import { ValidationError } from '../types/vulnerability';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'address';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class ValidationMiddleware {
  private rules: Map<string, ValidationRule[]> = new Map();

  // Register validation rules for a specific schema
  registerSchema(schemaName: string, rules: ValidationRule[]): void {
    this.rules.set(schemaName, rules);
  }

  // Validate data against a registered schema
  validate(schemaName: string, data: any): ValidationResult {
    const rules = this.rules.get(schemaName);
    if (!rules) {
      throw new ValidationError(`Schema '${schemaName}' not found`);
    }

    return this.validateWithRules(data, rules);
  }

  // Validate data against specific rules
  validateWithRules(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      const fieldErrors = this.validateField(rule.field, value, rule);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate a single field
  private validateField(fieldName: string, value: any, rule: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(
        rule.message || `${fieldName} is required`,
        'REQUIRED_FIELD',
        400,
        { field: fieldName, rule: 'required' }
      ));
      return errors; // Skip other validations if required field is missing
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type validation
    if (rule.type) {
      const typeError = this.validateType(fieldName, value, rule.type, rule.message);
      if (typeError) {
        errors.push(typeError);
        return errors; // Skip other validations if type is wrong
      }
    }

    // Length validations for strings and arrays
    if (typeof value === 'string' || Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(new ValidationError(
          rule.message || `${fieldName} must be at least ${rule.minLength} characters long`,
          'MIN_LENGTH',
          400,
          { field: fieldName, rule: 'minLength', expected: rule.minLength, actual: value.length }
        ));
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(new ValidationError(
          rule.message || `${fieldName} must be at most ${rule.maxLength} characters long`,
          'MAX_LENGTH',
          400,
          { field: fieldName, rule: 'maxLength', expected: rule.maxLength, actual: value.length }
        ));
      }
    }

    // Numeric range validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(new ValidationError(
          rule.message || `${fieldName} must be at least ${rule.min}`,
          'MIN_VALUE',
          400,
          { field: fieldName, rule: 'min', expected: rule.min, actual: value }
        ));
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push(new ValidationError(
          rule.message || `${fieldName} must be at most ${rule.max}`,
          'MAX_VALUE',
          400,
          { field: fieldName, rule: 'max', expected: rule.max, actual: value }
        ));
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push(new ValidationError(
          rule.message || `${fieldName} format is invalid`,
          'PATTERN_MISMATCH',
          400,
          { field: fieldName, rule: 'pattern', pattern: rule.pattern.source }
        ));
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        const message = typeof customResult === 'string' ? customResult : 
                       rule.message || `${fieldName} failed custom validation`;
        errors.push(new ValidationError(
          message,
          'CUSTOM_VALIDATION',
          400,
          { field: fieldName, rule: 'custom' }
        ));
      }
    }

    return errors;
  }

  // Validate type
  private validateType(fieldName: string, value: any, expectedType: string, customMessage?: string): ValidationError | null {
    let isValid = false;

    switch (expectedType) {
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'object':
        isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
      case 'email':
        isValid = typeof value === 'string' && this.isValidEmail(value);
        break;
      case 'url':
        isValid = typeof value === 'string' && this.isValidUrl(value);
        break;
      case 'address':
        isValid = typeof value === 'string' && this.isValidAddress(value);
        break;
      default:
        isValid = true; // Unknown type, skip validation
    }

    if (!isValid) {
      return new ValidationError(
        customMessage || `${fieldName} must be of type ${expectedType}`,
        'INVALID_TYPE',
        400,
        { field: fieldName, rule: 'type', expected: expectedType, actual: typeof value }
      );
    }

    return null;
  }

  // Helper method to get nested values
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // URL validation
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Ethereum address validation
  private isValidAddress(address: string): boolean {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
  }
}

// Predefined validation schemas
export const ValidationSchemas = {
  SCAN_REQUEST: [
    {
      field: 'contractAddress',
      required: true,
      type: 'address' as const,
      message: 'Please provide a valid Ethereum contract address'
    },
    {
      field: 'networkId',
      required: true,
      type: 'string' as const,
      minLength: 1,
      message: 'Network ID is required'
    },
    {
      field: 'scanType',
      required: true,
      type: 'string' as const,
      custom: (value: string) => ['quick', 'standard', 'deep'].includes(value),
      message: 'Scan type must be one of: quick, standard, deep'
    },
    {
      field: 'includeGasOptimization',
      type: 'boolean' as const
    },
    {
      field: 'includeComplianceCheck',
      type: 'boolean' as const
    }
  ],

  USER_PROFILE: [
    {
      field: 'email',
      required: true,
      type: 'email' as const,
      message: 'Please provide a valid email address'
    },
    {
      field: 'name',
      required: true,
      type: 'string' as const,
      minLength: 2,
      maxLength: 50,
      message: 'Name must be between 2 and 50 characters'
    },
    {
      field: 'apiKey',
      type: 'string' as const,
      minLength: 32,
      maxLength: 64,
      pattern: /^[a-zA-Z0-9]+$/,
      message: 'API key must be alphanumeric and between 32-64 characters'
    }
  ],

  EXPORT_REQUEST: [
    {
      field: 'scanId',
      required: true,
      type: 'string' as const,
      minLength: 1,
      message: 'Scan ID is required'
    },
    {
      field: 'format',
      required: true,
      type: 'string' as const,
      custom: (value: string) => ['json', 'pdf', 'csv', 'html'].includes(value),
      message: 'Export format must be one of: json, pdf, csv, html'
    }
  ]
};

// Singleton instance
export const validator = new ValidationMiddleware();

// Register predefined schemas
Object.entries(ValidationSchemas).forEach(([name, rules]) => {
  validator.registerSchema(name, rules);
});

// Utility functions for common validations
export const ValidationUtils = {
  isEthereumAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  isValidNetwork: (networkId: string): boolean => {
    const validNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'fantom'];
    return validNetworks.includes(networkId.toLowerCase());
  },

  isValidScanType: (scanType: string): boolean => {
    return ['quick', 'standard', 'deep'].includes(scanType);
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },

  validateContractAddress: (address: string): ValidationResult => {
    const errors: ValidationError[] = [];

    if (!address) {
      errors.push(new ValidationError('Contract address is required', 'REQUIRED_FIELD'));
    } else if (!ValidationUtils.isEthereumAddress(address)) {
      errors.push(new ValidationError('Invalid Ethereum address format', 'INVALID_FORMAT'));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
};
