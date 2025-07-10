import { expect } from '@playwright/test';

export interface ValidationRule {
  name: string;
  validator: (value: any) => boolean;
  errorMessage: string;
}

export interface ContextValidationRules {
  content: ValidationRule[];
  type: ValidationRule[];
  metadata: ValidationRule[];
}

export class ValidationHelpers {
  /**
   * Common validation rules for context content
   */
  static getContentValidationRules(): ValidationRule[] {
    return [
      {
        name: 'required',
        validator: (value: string) => value !== null && value !== undefined && value.trim().length > 0,
        errorMessage: 'Content is required'
      },
      {
        name: 'maxLength',
        validator: (value: string) => value.length <= 10000,
        errorMessage: 'Content exceeds maximum length of 10000 characters'
      },
      {
        name: 'minLength',
        validator: (value: string) => value.trim().length >= 1,
        errorMessage: 'Content must have at least 1 character'
      },
      {
        name: 'noOnlyWhitespace',
        validator: (value: string) => value.trim().length > 0,
        errorMessage: 'Content cannot be only whitespace'
      }
    ];
  }

  /**
   * Common validation rules for content type
   */
  static getTypeValidationRules(): ValidationRule[] {
    return [
      {
        name: 'validType',
        validator: (value: string) => ['text', 'json', 'code'].includes(value),
        errorMessage: 'Invalid content type. Must be one of: text, json, code'
      }
    ];
  }

  /**
   * Common validation rules for metadata
   */
  static getMetadataValidationRules(): ValidationRule[] {
    return [
      {
        name: 'validJson',
        validator: (value: string) => {
          if (!value || value.trim() === '') return true; // Optional field
          try {
            JSON.parse(value);
            return true;
          } catch {
            return false;
          }
        },
        errorMessage: 'Metadata must be valid JSON'
      },
      {
        name: 'objectType',
        validator: (value: string) => {
          if (!value || value.trim() === '') return true;
          try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
          } catch {
            return false;
          }
        },
        errorMessage: 'Metadata must be a JSON object'
      }
    ];
  }

  /**
   * Get all validation rules for context submission
   */
  static getAllValidationRules(): ContextValidationRules {
    return {
      content: this.getContentValidationRules(),
      type: this.getTypeValidationRules(),
      metadata: this.getMetadataValidationRules()
    };
  }

  /**
   * Validate a single field against its rules
   */
  static validateField(value: any, rules: ValidationRule[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const rule of rules) {
      if (!rule.validator(value)) {
        errors.push(rule.errorMessage);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete context submission
   */
  static validateContextSubmission(submission: {
    content: string;
    type?: string;
    metadata?: string;
  }): { isValid: boolean; errors: Record<string, string[]> } {
    const rules = this.getAllValidationRules();
    const errors: Record<string, string[]> = {};
    
    // Validate content
    const contentValidation = this.validateField(submission.content, rules.content);
    if (!contentValidation.isValid) {
      errors.content = contentValidation.errors;
    }
    
    // Validate type (if provided)
    if (submission.type) {
      const typeValidation = this.validateField(submission.type, rules.type);
      if (!typeValidation.isValid) {
        errors.type = typeValidation.errors;
      }
    }
    
    // Validate metadata (if provided)
    if (submission.metadata) {
      const metadataValidation = this.validateField(submission.metadata, rules.metadata);
      if (!metadataValidation.isValid) {
        errors.metadata = metadataValidation.errors;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Generate test cases for validation testing
   */
  static generateValidationTestCases(): Array<{
    name: string;
    input: { content: string; type?: string; metadata?: string };
    expectedValid: boolean;
    expectedErrors?: string[];
  }> {
    return [
      // Valid cases
      {
        name: 'Valid text content',
        input: { content: 'Valid text content', type: 'text' },
        expectedValid: true
      },
      {
        name: 'Valid JSON content',
        input: { content: '{"key": "value"}', type: 'json' },
        expectedValid: true
      },
      {
        name: 'Valid code content',
        input: { content: 'function test() { return true; }', type: 'code' },
        expectedValid: true
      },
      {
        name: 'Valid content with metadata',
        input: { 
          content: 'Content with metadata', 
          type: 'text',
          metadata: '{"source": "test"}'
        },
        expectedValid: true
      },
      {
        name: 'Valid content without type (defaults to text)',
        input: { content: 'Content without type' },
        expectedValid: true
      },
      {
        name: 'Valid content without metadata',
        input: { content: 'Content without metadata', type: 'text' },
        expectedValid: true
      },
      
      // Invalid cases - Content
      {
        name: 'Empty content',
        input: { content: '', type: 'text' },
        expectedValid: false,
        expectedErrors: ['Content is required']
      },
      {
        name: 'Whitespace only content',
        input: { content: '   \n\t   ', type: 'text' },
        expectedValid: false,
        expectedErrors: ['Content cannot be only whitespace']
      },
      {
        name: 'Oversized content',
        input: { content: 'A'.repeat(10001), type: 'text' },
        expectedValid: false,
        expectedErrors: ['Content exceeds maximum length of 10000 characters']
      },
      
      // Invalid cases - Type
      {
        name: 'Invalid content type',
        input: { content: 'Valid content', type: 'invalid' },
        expectedValid: false,
        expectedErrors: ['Invalid content type. Must be one of: text, json, code']
      },
      
      // Invalid cases - Metadata
      {
        name: 'Invalid JSON metadata',
        input: { 
          content: 'Valid content', 
          type: 'text',
          metadata: '{ invalid json }'
        },
        expectedValid: false,
        expectedErrors: ['Metadata must be valid JSON']
      },
      {
        name: 'Array metadata (should be object)',
        input: { 
          content: 'Valid content', 
          type: 'text',
          metadata: '[1, 2, 3]'
        },
        expectedValid: false,
        expectedErrors: ['Metadata must be a JSON object']
      },
      {
        name: 'String metadata (should be object)',
        input: { 
          content: 'Valid content', 
          type: 'text',
          metadata: '"string value"'
        },
        expectedValid: false,
        expectedErrors: ['Metadata must be a JSON object']
      }
    ];
  }

  /**
   * Assert validation result matches expected outcome
   */
  static assertValidationResult(
    result: { isValid: boolean; errors: Record<string, string[]> },
    expectedValid: boolean,
    expectedErrors?: string[]
  ) {
    expect(result.isValid).toBe(expectedValid);
    
    if (!expectedValid && expectedErrors) {
      const allErrors = Object.values(result.errors).flat();
      for (const expectedError of expectedErrors) {
        expect(allErrors.some(error => error.includes(expectedError))).toBe(true);
      }
    }
  }

  /**
   * Generate edge case test data
   */
  static generateEdgeCaseData(): Array<{
    name: string;
    content: string;
    description: string;
  }> {
    return [
      {
        name: 'Unicode content',
        content: 'Unicode test: 你好世界 🌍 العالم мир',
        description: 'Content with various Unicode characters'
      },
      {
        name: 'Special characters',
        content: '!@#$%^&*()_+-=[]{}|;:,.<>?`~',
        description: 'Content with special ASCII characters'
      },
      {
        name: 'HTML-like content',
        content: '<div>HTML-like content with <script>alert("test")</script> tags</div>',
        description: 'Content that looks like HTML/JavaScript'
      },
      {
        name: 'SQL-like content',
        content: "SELECT * FROM users WHERE id = 1; DROP TABLE users; --",
        description: 'Content that looks like SQL injection'
      },
      {
        name: 'Very long single line',
        content: 'A'.repeat(5000),
        description: 'Very long content without line breaks'
      },
      {
        name: 'Many line breaks',
        content: 'Line 1\n'.repeat(1000),
        description: 'Content with many line breaks'
      },
      {
        name: 'Mixed whitespace',
        content: 'Text\twith\r\nvarious\u00A0whitespace\u2000characters',
        description: 'Content with various types of whitespace'
      },
      {
        name: 'JSON-like but invalid',
        content: '{"key": value, "missing": quotes}',
        description: 'Content that looks like JSON but is invalid'
      },
      {
        name: 'Code-like content',
        content: `
function complexFunction(param1, param2) {
  const result = param1.map(item => {
    return item.process().then(data => {
      return data.transform();
    });
  });
  return Promise.all(result);
}
        `.trim(),
        description: 'Complex code-like content'
      },
      {
        name: 'Binary-like content',
        content: '01001000 01100101 01101100 01101100 01101111',
        description: 'Content that looks like binary data'
      }
    ];
  }

  /**
   * Generate performance test data
   */
  static generatePerformanceTestData(): Array<{
    name: string;
    content: string;
    size: number;
  }> {
    const sizes = [100, 500, 1000, 5000, 9999]; // Just under the 10000 limit
    
    return sizes.map(size => ({
      name: `${size} character content`,
      content: 'A'.repeat(size),
      size
    }));
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedStructure: Record<string, string>) {
    for (const [key, expectedType] of Object.entries(expectedStructure)) {
      expect(response).toHaveProperty(key);
      
      if (expectedType === 'string') {
        expect(typeof response[key]).toBe('string');
      } else if (expectedType === 'number') {
        expect(typeof response[key]).toBe('number');
      } else if (expectedType === 'boolean') {
        expect(typeof response[key]).toBe('boolean');
      } else if (expectedType === 'object') {
        expect(typeof response[key]).toBe('object');
        expect(response[key]).not.toBeNull();
      } else if (expectedType === 'array') {
        expect(Array.isArray(response[key])).toBe(true);
      }
    }
  }

  /**
   * Generate test metadata objects
   */
  static generateTestMetadata(): Array<{
    name: string;
    metadata: Record<string, any>;
    description: string;
  }> {
    return [
      {
        name: 'Simple metadata',
        metadata: { source: 'test', version: '1.0' },
        description: 'Basic key-value metadata'
      },
      {
        name: 'Nested metadata',
        metadata: {
          source: 'test',
          config: {
            settings: {
              enabled: true,
              level: 5
            }
          }
        },
        description: 'Deeply nested metadata object'
      },
      {
        name: 'Array in metadata',
        metadata: {
          tags: ['test', 'automation', 'validation'],
          scores: [1, 2, 3, 4, 5]
        },
        description: 'Metadata containing arrays'
      },
      {
        name: 'Mixed types metadata',
        metadata: {
          string: 'value',
          number: 42,
          boolean: true,
          null_value: null,
          array: [1, 'two', true],
          object: { nested: 'value' }
        },
        description: 'Metadata with various data types'
      },
      {
        name: 'Large metadata',
        metadata: {
          description: 'A'.repeat(1000),
          data: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`])
          )
        },
        description: 'Large metadata object'
      }
    ];
  }
}

