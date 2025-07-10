import { ContextSubmission } from './api-client';

export class TestDataGenerator {
  /**
   * Generate valid text context
   */
  static generateValidTextContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    return {
      content: 'This is a sample text context for MCP evaluation testing. It contains meaningful content that can be evaluated.',
      type: 'text',
      metadata: {
        source: 'test-generator',
        category: 'sample',
        timestamp: new Date().toISOString()
      },
      ...overrides
    };
  }

  /**
   * Generate valid JSON context
   */
  static generateValidJsonContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    const jsonContent = {
      message: 'Hello, world!',
      data: {
        key: 'value',
        number: 42,
        array: [1, 2, 3],
        nested: {
          property: 'test'
        }
      },
      timestamp: new Date().toISOString()
    };

    return {
      content: JSON.stringify(jsonContent, null, 2),
      type: 'json',
      metadata: {
        source: 'test-generator',
        format: 'json',
        schema_version: '1.0'
      },
      ...overrides
    };
  }

  /**
   * Generate valid code context
   */
  static generateValidCodeContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    const codeContent = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Example usage
console.log(fibonacci(10));
    `.trim();

    return {
      content: codeContent,
      type: 'code',
      metadata: {
        source: 'test-generator',
        language: 'javascript',
        complexity: 'simple'
      },
      ...overrides
    };
  }

  /**
   * Generate empty content (invalid)
   */
  static generateEmptyContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    return {
      content: '',
      type: 'text',
      metadata: {
        source: 'test-generator',
        purpose: 'validation-test'
      },
      ...overrides
    };
  }

  /**
   * Generate oversized content (invalid)
   */
  static generateOversizedContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    const longContent = 'A'.repeat(10001); // Exceeds 10000 character limit
    
    return {
      content: longContent,
      type: 'text',
      metadata: {
        source: 'test-generator',
        purpose: 'validation-test',
        length: longContent.length
      },
      ...overrides
    };
  }

  /**
   * Generate context with invalid type
   */
  static generateInvalidTypeContext(overrides?: Partial<ContextSubmission>): ContextSubmission {
    return {
      content: 'This context has an invalid type',
      type: 'invalid-type' as any,
      metadata: {
        source: 'test-generator',
        purpose: 'validation-test'
      },
      ...overrides
    };
  }

  /**
   * Generate context with malformed JSON metadata
   */
  static generateMalformedMetadataContext(): any {
    return {
      content: 'This context has malformed metadata',
      type: 'text',
      metadata: 'this-should-be-an-object-not-a-string'
    };
  }

  /**
   * Generate random text content of specified length
   */
  static generateRandomText(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate context with random content
   */
  static generateRandomContext(length: number = 100): ContextSubmission {
    return {
      content: this.generateRandomText(length),
      type: 'text',
      metadata: {
        source: 'test-generator',
        random: true,
        length: length,
        generated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Generate multiple contexts for bulk testing
   */
  static generateMultipleContexts(count: number): ContextSubmission[] {
    const contexts: ContextSubmission[] = [];
    
    for (let i = 0; i < count; i++) {
      const types: ('text' | 'json' | 'code')[] = ['text', 'json', 'code'];
      const type = types[i % types.length];
      
      switch (type) {
        case 'text':
          contexts.push(this.generateValidTextContext({
            content: `Sample text context #${i + 1}: ${this.generateRandomText(50)}`,
            metadata: { index: i, batch: 'bulk-test' }
          }));
          break;
        case 'json':
          contexts.push(this.generateValidJsonContext({
            content: JSON.stringify({ index: i, message: `JSON context #${i + 1}` }),
            metadata: { index: i, batch: 'bulk-test' }
          }));
          break;
        case 'code':
          contexts.push(this.generateValidCodeContext({
            content: `// Code context #${i + 1}\nfunction test${i}() { return ${i}; }`,
            metadata: { index: i, batch: 'bulk-test' }
          }));
          break;
      }
    }
    
    return contexts;
  }

  /**
   * Generate test scenarios for edge cases
   */
  static generateEdgeCaseScenarios(): { name: string; context: ContextSubmission | any }[] {
    return [
      {
        name: 'Empty content',
        context: this.generateEmptyContext()
      },
      {
        name: 'Oversized content',
        context: this.generateOversizedContext()
      },
      {
        name: 'Invalid content type',
        context: this.generateInvalidTypeContext()
      },
      {
        name: 'Missing content field',
        context: {
          type: 'text',
          metadata: { source: 'test-generator' }
        }
      },
      {
        name: 'Null content',
        context: {
          content: null,
          type: 'text',
          metadata: { source: 'test-generator' }
        }
      },
      {
        name: 'Whitespace only content',
        context: {
          content: '   \n\t   ',
          type: 'text',
          metadata: { source: 'test-generator' }
        }
      },
      {
        name: 'Special characters in content',
        context: {
          content: '🚀 Special chars: <>&"\'`\n\r\t\0',
          type: 'text',
          metadata: { source: 'test-generator' }
        }
      },
      {
        name: 'Very long metadata',
        context: {
          content: 'Test content',
          type: 'text',
          metadata: {
            source: 'test-generator',
            very_long_field: 'x'.repeat(1000),
            nested: {
              deep: {
                very: {
                  nested: {
                    object: 'value'
                  }
                }
              }
            }
          }
        }
      }
    ];
  }
}

