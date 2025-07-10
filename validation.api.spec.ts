import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';
import { ValidationHelpers } from '../../utils/validation-helpers';

test.describe('Comprehensive Validation API Tests', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
    await apiClient.resetData();
  });

  test.afterEach(async () => {
    await apiClient.resetData();
  });

  test.describe('Validation Test Cases', () => {
    const testCases = ValidationHelpers.generateValidationTestCases();
    
    for (const testCase of testCases) {
      test(`should handle ${testCase.name} @api @validation @test-cases`, async () => {
        const response = await apiClient.submitContext(testCase.input);
        
        if (testCase.expectedValid) {
          await apiClient.assertSuccess(response, 201);
          expect(response.data).toHaveProperty('contextId');
          expect(response.data).toHaveProperty('status', 'submitted');
        } else {
          await apiClient.assertError(response, 400);
          
          if (testCase.expectedErrors) {
            const errorMessage = response.data.error;
            const hasExpectedError = testCase.expectedErrors.some(expectedError => 
              errorMessage.includes(expectedError)
            );
            expect(hasExpectedError).toBe(true);
          }
        }
      });
    }
  });

  test.describe('Edge Case Content Validation', () => {
    const edgeCases = ValidationHelpers.generateEdgeCaseData();
    
    for (const edgeCase of edgeCases) {
      test(`should handle ${edgeCase.name} @api @validation @edge-cases`, async () => {
        const response = await apiClient.submitContext({
          content: edgeCase.content,
          type: 'text',
          metadata: { description: edgeCase.description }
        });
        
        // All edge cases should be valid (they're within limits and properly formatted)
        await apiClient.assertSuccess(response, 201);
        expect(response.data).toHaveProperty('contextId');
      });
    }
  });

  test.describe('Performance Validation', () => {
    const performanceData = ValidationHelpers.generatePerformanceTestData();
    
    for (const perfTest of performanceData) {
      test(`should handle ${perfTest.name} within time limits @api @validation @performance`, async () => {
        const startTime = Date.now();
        
        const response = await apiClient.submitContext({
          content: perfTest.content,
          type: 'text',
          metadata: { size: perfTest.size }
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within reasonable time (5 seconds)
        expect(duration).toBeLessThan(5000);
        
        // Should succeed for all sizes under limit
        await apiClient.assertSuccess(response, 201);
      });
    }
  });

  test.describe('Metadata Validation', () => {
    const metadataTests = ValidationHelpers.generateTestMetadata();
    
    for (const metadataTest of metadataTests) {
      test(`should handle ${metadataTest.name} @api @validation @metadata`, async () => {
        const response = await apiClient.submitContext({
          content: 'Test content for metadata validation',
          type: 'text',
          metadata: metadataTest.metadata
        });
        
        await apiClient.assertSuccess(response, 201);
        
        // Verify the context can be retrieved with metadata intact
        const contextId = response.data.contextId;
        const getResponse = await apiClient.getContext(contextId);
        await apiClient.assertSuccess(getResponse, 200);
        
        expect(getResponse.data.metadata).toEqual(metadataTest.metadata);
      });
    }
  });

  test.describe('Boundary Value Testing', () => {
    test('should accept content at exact maximum length @api @validation @boundary', async () => {
      const maxLengthContent = 'A'.repeat(10000); // Exactly at limit
      
      const response = await apiClient.submitContext({
        content: maxLengthContent,
        type: 'text'
      });
      
      await apiClient.assertSuccess(response, 201);
    });

    test('should reject content exceeding maximum length by 1 @api @validation @boundary', async () => {
      const oversizedContent = 'A'.repeat(10001); // 1 over limit
      
      const response = await apiClient.submitContext({
        content: oversizedContent,
        type: 'text'
      });
      
      await apiClient.assertError(response, 400, 'CONTENT_TOO_LONG');
    });

    test('should accept minimum valid content @api @validation @boundary', async () => {
      const minContent = 'A'; // Single character
      
      const response = await apiClient.submitContext({
        content: minContent,
        type: 'text'
      });
      
      await apiClient.assertSuccess(response, 201);
    });

    test('should handle content with exactly 1 whitespace character @api @validation @boundary', async () => {
      const response = await apiClient.submitContext({
        content: ' ', // Single space
        type: 'text'
      });
      
      // Should be rejected as whitespace-only
      await apiClient.assertError(response, 400, 'MISSING_CONTENT');
    });
  });

  test.describe('Content Type Validation', () => {
    const validTypes = ['text', 'json', 'code'];
    const invalidTypes = ['xml', 'html', 'markdown', '', null, undefined, 123, true];
    
    for (const validType of validTypes) {
      test(`should accept valid content type: ${validType} @api @validation @content-types`, async () => {
        const response = await apiClient.submitContext({
          content: 'Test content',
          type: validType as any
        });
        
        await apiClient.assertSuccess(response, 201);
      });
    }
    
    for (const invalidType of invalidTypes) {
      test(`should reject invalid content type: ${invalidType} @api @validation @content-types`, async () => {
        const response = await apiClient.submitContext({
          content: 'Test content',
          type: invalidType as any
        });
        
        await apiClient.assertError(response, 400, 'INVALID_TYPE');
      });
    }
  });

  test.describe('JSON Content Validation', () => {
    test('should accept valid JSON content @api @validation @json-content', async () => {
      const validJson = JSON.stringify({
        message: 'Hello, world!',
        data: { key: 'value', number: 42 },
        array: [1, 2, 3]
      }, null, 2);
      
      const response = await apiClient.submitContext({
        content: validJson,
        type: 'json'
      });
      
      await apiClient.assertSuccess(response, 201);
    });

    test('should accept invalid JSON as text content @api @validation @json-content', async () => {
      const invalidJson = '{ "key": value, "missing": quotes }';
      
      // Server doesn't validate JSON syntax for content, only for metadata
      const response = await apiClient.submitContext({
        content: invalidJson,
        type: 'json'
      });
      
      await apiClient.assertSuccess(response, 201);
    });
  });

  test.describe('Concurrent Validation', () => {
    test('should handle concurrent submissions with validation @api @validation @concurrency', async () => {
      const validSubmissions = Array.from({ length: 5 }, (_, i) => ({
        content: `Valid content ${i + 1}`,
        type: 'text' as const,
        metadata: { index: i }
      }));
      
      const invalidSubmissions = Array.from({ length: 3 }, (_, i) => ({
        content: '', // Invalid empty content
        type: 'text' as const,
        metadata: { index: i, invalid: true }
      }));
      
      // Submit all concurrently
      const allSubmissions = [...validSubmissions, ...invalidSubmissions];
      const promises = allSubmissions.map(submission => 
        apiClient.submitContext(submission)
      );
      
      const responses = await Promise.all(promises);
      
      // Check valid submissions succeeded
      for (let i = 0; i < validSubmissions.length; i++) {
        await apiClient.assertSuccess(responses[i], 201);
      }
      
      // Check invalid submissions failed
      for (let i = validSubmissions.length; i < responses.length; i++) {
        await apiClient.assertError(responses[i], 400);
      }
    });
  });

  test.describe('Response Structure Validation', () => {
    test('should return consistent error response structure @api @validation @response-structure', async () => {
      const response = await apiClient.submitContext({
        content: '', // Invalid
        type: 'text'
      });
      
      await apiClient.assertError(response, 400);
      
      // Validate error response structure
      ValidationHelpers.validateApiResponse(response.data, {
        error: 'string',
        code: 'string'
      });
      
      expect(response.data.error).toBeTruthy();
      expect(response.data.code).toBeTruthy();
    });

    test('should return consistent success response structure @api @validation @response-structure', async () => {
      const response = await apiClient.submitContext({
        content: 'Valid content',
        type: 'text'
      });
      
      await apiClient.assertSuccess(response, 201);
      
      // Validate success response structure
      ValidationHelpers.validateApiResponse(response.data, {
        message: 'string',
        contextId: 'string',
        status: 'string'
      });
      
      expect(response.data.contextId).toMatch(/^ctx-\d+$/);
      expect(response.data.status).toBe('submitted');
    });
  });

  test.describe('Security Validation', () => {
    test('should handle potential XSS content safely @api @validation @security', async () => {
      const xssContent = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';
      
      const response = await apiClient.submitContext({
        content: xssContent,
        type: 'text'
      });
      
      await apiClient.assertSuccess(response, 201);
      
      // Verify content is stored as-is (not executed)
      const contextId = response.data.contextId;
      const getResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(getResponse, 200);
      
      expect(getResponse.data.content).toBe(xssContent);
    });

    test('should handle potential SQL injection content safely @api @validation @security', async () => {
      const sqlContent = "'; DROP TABLE contexts; --";
      
      const response = await apiClient.submitContext({
        content: sqlContent,
        type: 'text'
      });
      
      await apiClient.assertSuccess(response, 201);
      
      // Verify system is still functional (table not dropped)
      const listResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(listResponse, 200);
    });

    test('should handle very large metadata safely @api @validation @security', async () => {
      const largeMetadata = {
        data: 'A'.repeat(5000),
        nested: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
        )
      };
      
      const response = await apiClient.submitContext({
        content: 'Content with large metadata',
        type: 'text',
        metadata: largeMetadata
      });
      
      await apiClient.assertSuccess(response, 201);
    });
  });
});

