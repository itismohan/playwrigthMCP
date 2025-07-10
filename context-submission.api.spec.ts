import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Context Submission API', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
    // Reset data before each test to ensure clean state
    await apiClient.resetData();
  });

  test.afterEach(async () => {
    // Clean up after each test
    await apiClient.resetData();
  });

  test.describe('Valid Submissions', () => {
    test('should submit valid text context @smoke @api @context-submission', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      
      expect(response.data).toHaveProperty('message', 'Context submitted successfully');
      expect(response.data).toHaveProperty('contextId');
      expect(response.data).toHaveProperty('status', 'submitted');
      expect(response.data.contextId).toMatch(/^ctx-\d+$/);
    });

    test('should submit valid JSON context @api @context-submission', async () => {
      const context = TestDataGenerator.generateValidJsonContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      
      expect(response.data).toHaveProperty('contextId');
      expect(response.data).toHaveProperty('status', 'submitted');
    });

    test('should submit valid code context @api @context-submission', async () => {
      const context = TestDataGenerator.generateValidCodeContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      
      expect(response.data).toHaveProperty('contextId');
      expect(response.data).toHaveProperty('status', 'submitted');
    });

    test('should handle context without metadata @api @context-submission', async () => {
      const context = {
        content: 'Simple context without metadata',
        type: 'text' as const
      };
      
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      expect(response.data).toHaveProperty('contextId');
    });

    test('should handle context without type (defaults to text) @api @context-submission', async () => {
      const context = {
        content: 'Context without explicit type'
      };
      
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      expect(response.data).toHaveProperty('contextId');
    });

    test('should handle large valid content @api @context-submission', async () => {
      const largeContent = TestDataGenerator.generateRandomText(9999); // Just under limit
      const context = {
        content: largeContent,
        type: 'text' as const,
        metadata: { size: 'large' }
      };
      
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      expect(response.data).toHaveProperty('contextId');
    });
  });

  test.describe('Invalid Submissions', () => {
    test('should reject empty content @api @context-submission @validation', async () => {
      const context = TestDataGenerator.generateEmptyContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertError(response, 400, 'MISSING_CONTENT');
      expect(response.data.error).toBe('Content is required');
    });

    test('should reject oversized content @api @context-submission @validation', async () => {
      const context = TestDataGenerator.generateOversizedContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertError(response, 400, 'CONTENT_TOO_LONG');
      expect(response.data.error).toContain('exceeds maximum length');
    });

    test('should reject invalid content type @api @context-submission @validation', async () => {
      const context = TestDataGenerator.generateInvalidTypeContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertError(response, 400, 'INVALID_TYPE');
      expect(response.data.error).toContain('Invalid content type');
    });

    test('should reject missing content field @api @context-submission @validation', async () => {
      const invalidContext = {
        type: 'text',
        metadata: { test: true }
      };
      
      const response = await apiClient.submitContext(invalidContext as any);
      
      await apiClient.assertError(response, 400, 'MISSING_CONTENT');
    });

    test('should reject null content @api @context-submission @validation', async () => {
      const invalidContext = {
        content: null,
        type: 'text'
      };
      
      const response = await apiClient.submitContext(invalidContext as any);
      
      await apiClient.assertError(response, 400, 'MISSING_CONTENT');
    });

    test('should handle whitespace-only content as empty @api @context-submission @validation', async () => {
      const context = {
        content: '   \n\t   ',
        type: 'text' as const
      };
      
      const response = await apiClient.submitContext(context);
      
      // This might be treated as empty content depending on server implementation
      // Adjust expectation based on actual server behavior
      await apiClient.assertError(response, 400, 'MISSING_CONTENT');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle special characters in content @api @context-submission @edge-case', async () => {
      const context = {
        content: '🚀 Special chars: <>&"\'`\n\r\t',
        type: 'text' as const,
        metadata: { special: true }
      };
      
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      expect(response.data).toHaveProperty('contextId');
    });

    test('should handle complex metadata @api @context-submission @edge-case', async () => {
      const context = {
        content: 'Test with complex metadata',
        type: 'text' as const,
        metadata: {
          nested: {
            deep: {
              object: 'value'
            }
          },
          array: [1, 2, 3],
          boolean: true,
          number: 42,
          null_value: null
        }
      };
      
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      expect(response.data).toHaveProperty('contextId');
    });

    test('should handle concurrent submissions @api @context-submission @concurrency', async () => {
      const contexts = TestDataGenerator.generateMultipleContexts(5);
      
      // Submit all contexts concurrently
      const promises = contexts.map(context => apiClient.submitContext(context));
      const responses = await Promise.all(promises);
      
      // All should succeed
      for (const response of responses) {
        await apiClient.assertSuccess(response, 201);
        expect(response.data).toHaveProperty('contextId');
      }
      
      // All context IDs should be unique
      const contextIds = responses.map(r => r.data.contextId);
      const uniqueIds = new Set(contextIds);
      expect(uniqueIds.size).toBe(contextIds.length);
    });
  });

  test.describe('Response Validation', () => {
    test('should return consistent response format @api @context-submission @response-format', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      
      // Validate response structure
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('contextId');
      expect(response.data).toHaveProperty('status');
      
      expect(typeof response.data.message).toBe('string');
      expect(typeof response.data.contextId).toBe('string');
      expect(typeof response.data.status).toBe('string');
    });

    test('should include proper HTTP headers @api @context-submission @headers', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const response = await apiClient.submitContext(context);
      
      await apiClient.assertSuccess(response, 201);
      
      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      
      // Check content type
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});

