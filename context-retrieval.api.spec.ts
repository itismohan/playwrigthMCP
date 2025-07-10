import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Context Retrieval API', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
    await apiClient.resetData();
  });

  test.afterEach(async () => {
    await apiClient.resetData();
  });

  test.describe('Get Context by ID', () => {
    test('should retrieve existing context @smoke @api @context-retrieval', async () => {
      // First, submit a context
      const submissionData = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(submissionData);
      await apiClient.assertSuccess(submitResponse, 201);
      
      const contextId = submitResponse.data.contextId;
      
      // Then retrieve it
      const getResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(getResponse, 200);
      
      // Validate the retrieved context
      expect(getResponse.data).toHaveProperty('id', contextId);
      expect(getResponse.data).toHaveProperty('content', submissionData.content);
      expect(getResponse.data).toHaveProperty('type', submissionData.type);
      expect(getResponse.data).toHaveProperty('status');
      expect(getResponse.data).toHaveProperty('submittedAt');
      
      // Validate timestamp format
      const timestamp = new Date(getResponse.data.submittedAt);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('should return 404 for non-existent context @api @context-retrieval @error-handling', async () => {
      const response = await apiClient.getContext('ctx-nonexistent');
      
      await apiClient.assertError(response, 404, 'CONTEXT_NOT_FOUND');
      expect(response.data.error).toBe('Context not found');
    });

    test('should handle invalid context ID format @api @context-retrieval @validation', async () => {
      const response = await apiClient.getContext('invalid-id-format');
      
      await apiClient.assertError(response, 404, 'CONTEXT_NOT_FOUND');
    });

    test('should preserve metadata in retrieved context @api @context-retrieval', async () => {
      const submissionData = TestDataGenerator.generateValidJsonContext();
      const submitResponse = await apiClient.submitContext(submissionData);
      const contextId = submitResponse.data.contextId;
      
      const getResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(getResponse, 200);
      
      expect(getResponse.data.metadata).toEqual(submissionData.metadata);
    });
  });

  test.describe('Get All Contexts', () => {
    test('should return empty list when no contexts exist @api @context-retrieval', async () => {
      const response = await apiClient.getContexts();
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data).toHaveProperty('contexts');
      expect(response.data).toHaveProperty('total', 0);
      expect(response.data.contexts).toEqual([]);
    });

    test('should return all contexts when they exist @api @context-retrieval', async () => {
      // Submit multiple contexts
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      await Promise.all(submitPromises);
      
      // Retrieve all contexts
      const response = await apiClient.getContexts();
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data.contexts).toHaveLength(3);
      expect(response.data.total).toBe(3);
      
      // Validate structure of each context
      for (const context of response.data.contexts) {
        expect(context).toHaveProperty('id');
        expect(context).toHaveProperty('content');
        expect(context).toHaveProperty('type');
        expect(context).toHaveProperty('status');
        expect(context).toHaveProperty('submittedAt');
      }
    });

    test('should support pagination @api @context-retrieval @pagination', async () => {
      // Submit 5 contexts
      const contexts = TestDataGenerator.generateMultipleContexts(5);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      await Promise.all(submitPromises);
      
      // Get first page (limit 2)
      const page1Response = await apiClient.getContexts({ limit: 2, offset: 0 });
      await apiClient.assertSuccess(page1Response, 200);
      
      expect(page1Response.data.contexts).toHaveLength(2);
      expect(page1Response.data.total).toBe(5);
      expect(page1Response.data.limit).toBe(2);
      expect(page1Response.data.offset).toBe(0);
      
      // Get second page
      const page2Response = await apiClient.getContexts({ limit: 2, offset: 2 });
      await apiClient.assertSuccess(page2Response, 200);
      
      expect(page2Response.data.contexts).toHaveLength(2);
      expect(page2Response.data.total).toBe(5);
      expect(page2Response.data.offset).toBe(2);
      
      // Ensure different contexts on different pages
      const page1Ids = page1Response.data.contexts.map((c: any) => c.id);
      const page2Ids = page2Response.data.contexts.map((c: any) => c.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    test('should filter by status @api @context-retrieval @filtering', async () => {
      // Submit contexts and wait for some to be evaluated
      const context1 = TestDataGenerator.generateValidTextContext();
      const context2 = TestDataGenerator.generateValidTextContext();
      
      const submit1 = await apiClient.submitContext(context1);
      const submit2 = await apiClient.submitContext(context2);
      
      // Wait a bit for evaluation to potentially complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Filter by submitted status
      const submittedResponse = await apiClient.getContexts({ status: 'submitted' });
      await apiClient.assertSuccess(submittedResponse, 200);
      
      // All returned contexts should have 'submitted' status
      for (const context of submittedResponse.data.contexts) {
        expect(context.status).toBe('submitted');
      }
      
      // Filter by evaluated status
      const evaluatedResponse = await apiClient.getContexts({ status: 'evaluated' });
      await apiClient.assertSuccess(evaluatedResponse, 200);
      
      // All returned contexts should have 'evaluated' status
      for (const context of evaluatedResponse.data.contexts) {
        expect(context.status).toBe('evaluated');
      }
    });

    test('should filter by type @api @context-retrieval @filtering', async () => {
      // Submit contexts of different types
      const textContext = TestDataGenerator.generateValidTextContext();
      const jsonContext = TestDataGenerator.generateValidJsonContext();
      const codeContext = TestDataGenerator.generateValidCodeContext();
      
      await apiClient.submitContext(textContext);
      await apiClient.submitContext(jsonContext);
      await apiClient.submitContext(codeContext);
      
      // Filter by text type
      const textResponse = await apiClient.getContexts({ type: 'text' });
      await apiClient.assertSuccess(textResponse, 200);
      
      expect(textResponse.data.contexts.length).toBeGreaterThan(0);
      for (const context of textResponse.data.contexts) {
        expect(context.type).toBe('text');
      }
      
      // Filter by json type
      const jsonResponse = await apiClient.getContexts({ type: 'json' });
      await apiClient.assertSuccess(jsonResponse, 200);
      
      expect(jsonResponse.data.contexts.length).toBeGreaterThan(0);
      for (const context of jsonResponse.data.contexts) {
        expect(context.type).toBe('json');
      }
    });

    test('should handle large limit values @api @context-retrieval @edge-case', async () => {
      // Submit a few contexts
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      await Promise.all(contexts.map(context => apiClient.submitContext(context)));
      
      // Request with very large limit
      const response = await apiClient.getContexts({ limit: 1000 });
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data.contexts).toHaveLength(3);
      expect(response.data.total).toBe(3);
    });

    test('should handle invalid filter parameters gracefully @api @context-retrieval @validation', async () => {
      const response = await apiClient.getContexts({ 
        status: 'invalid-status' as any,
        type: 'invalid-type' as any
      });
      
      await apiClient.assertSuccess(response, 200);
      // Should return empty results for invalid filters
      expect(response.data.contexts).toEqual([]);
    });
  });

  test.describe('Context Status Updates', () => {
    test('should show status progression from submitted to evaluated @api @context-retrieval @status', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      // Initially should be 'submitted'
      const initialResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(initialResponse, 200);
      expect(initialResponse.data.status).toBe('submitted');
      
      // Wait for evaluation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Should now be 'evaluated'
      const finalResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(finalResponse, 200);
      expect(finalResponse.data.status).toBe('evaluated');
      expect(finalResponse.data).toHaveProperty('evaluationId');
    });
  });
});

