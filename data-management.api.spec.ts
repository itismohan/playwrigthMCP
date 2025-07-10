import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Data Management API', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
    await apiClient.resetData();
  });

  test.describe('Delete Context', () => {
    test('should delete existing context @api @data-management @delete', async () => {
      // Submit a context
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      // Verify context exists
      const getResponse = await apiClient.getContext(contextId);
      await apiClient.assertSuccess(getResponse, 200);
      
      // Delete the context
      const deleteResponse = await apiClient.deleteContext(contextId);
      await apiClient.assertSuccess(deleteResponse, 200);
      
      expect(deleteResponse.data).toHaveProperty('message', 'Context deleted successfully');
      expect(deleteResponse.data).toHaveProperty('contextId', contextId);
      
      // Verify context no longer exists
      const getAfterDeleteResponse = await apiClient.getContext(contextId);
      await apiClient.assertError(getAfterDeleteResponse, 404, 'CONTEXT_NOT_FOUND');
    });

    test('should delete context and associated evaluation @api @data-management @delete', async () => {
      // Submit context and wait for evaluation
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      // Wait for evaluation to complete
      const evaluation = await apiClient.waitForEvaluation(contextId, 5000);
      expect(evaluation).not.toBeNull();
      
      // Verify evaluation exists
      const evalResponse = await apiClient.getEvaluationByContext(contextId);
      await apiClient.assertSuccess(evalResponse, 200);
      
      // Delete the context
      const deleteResponse = await apiClient.deleteContext(contextId);
      await apiClient.assertSuccess(deleteResponse, 200);
      
      // Verify both context and evaluation are gone
      const getContextResponse = await apiClient.getContext(contextId);
      await apiClient.assertError(getContextResponse, 404, 'CONTEXT_NOT_FOUND');
      
      const getEvalResponse = await apiClient.getEvaluationByContext(contextId);
      await apiClient.assertError(getEvalResponse, 404, 'EVALUATION_NOT_FOUND');
    });

    test('should return 404 when deleting non-existent context @api @data-management @delete @error-handling', async () => {
      const response = await apiClient.deleteContext('ctx-nonexistent');
      
      await apiClient.assertError(response, 404, 'CONTEXT_NOT_FOUND');
      expect(response.data.error).toBe('Context not found');
    });

    test('should handle deletion of multiple contexts @api @data-management @delete', async () => {
      // Submit multiple contexts
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      const contextIds = submitResponses.map(response => response.data.contextId);
      
      // Verify all contexts exist
      const getPromises = contextIds.map(id => apiClient.getContext(id));
      const getResponses = await Promise.all(getPromises);
      
      for (const response of getResponses) {
        await apiClient.assertSuccess(response, 200);
      }
      
      // Delete all contexts
      const deletePromises = contextIds.map(id => apiClient.deleteContext(id));
      const deleteResponses = await Promise.all(deletePromises);
      
      for (const response of deleteResponses) {
        await apiClient.assertSuccess(response, 200);
      }
      
      // Verify all contexts are gone
      const getAfterDeletePromises = contextIds.map(id => apiClient.getContext(id));
      const getAfterDeleteResponses = await Promise.all(getAfterDeletePromises);
      
      for (const response of getAfterDeleteResponses) {
        await apiClient.assertError(response, 404, 'CONTEXT_NOT_FOUND');
      }
    });

    test('should update context list after deletion @api @data-management @delete', async () => {
      // Submit contexts
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      // Verify initial count
      const initialListResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(initialListResponse, 200);
      expect(initialListResponse.data.total).toBe(3);
      
      // Delete one context
      const contextIdToDelete = submitResponses[0].data.contextId;
      const deleteResponse = await apiClient.deleteContext(contextIdToDelete);
      await apiClient.assertSuccess(deleteResponse, 200);
      
      // Verify updated count
      const updatedListResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(updatedListResponse, 200);
      expect(updatedListResponse.data.total).toBe(2);
      
      // Verify deleted context is not in the list
      const remainingIds = updatedListResponse.data.contexts.map((c: any) => c.id);
      expect(remainingIds).not.toContain(contextIdToDelete);
    });
  });

  test.describe('Reset Data', () => {
    test('should reset all data successfully @api @data-management @reset', async () => {
      // Submit multiple contexts
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      await Promise.all(submitPromises);
      
      // Verify contexts exist
      const beforeResetResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(beforeResetResponse, 200);
      expect(beforeResetResponse.data.total).toBe(3);
      
      // Reset all data
      const resetResponse = await apiClient.resetData();
      await apiClient.assertSuccess(resetResponse, 200);
      
      expect(resetResponse.data).toHaveProperty('message', 'All data reset successfully');
      
      // Verify all data is gone
      const afterResetResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(afterResetResponse, 200);
      expect(afterResetResponse.data.total).toBe(0);
      expect(afterResetResponse.data.contexts).toEqual([]);
    });

    test('should reset contexts and evaluations @api @data-management @reset', async () => {
      // Submit contexts and wait for evaluations
      const contexts = TestDataGenerator.generateMultipleContexts(2);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      // Wait for evaluations
      const evaluationPromises = submitResponses.map(response => 
        apiClient.waitForEvaluation(response.data.contextId, 5000)
      );
      await Promise.all(evaluationPromises);
      
      // Verify evaluations exist
      const beforeResetEvalResponse = await apiClient.getEvaluations();
      await apiClient.assertSuccess(beforeResetEvalResponse, 200);
      expect(beforeResetEvalResponse.data.total).toBe(2);
      
      // Reset all data
      const resetResponse = await apiClient.resetData();
      await apiClient.assertSuccess(resetResponse, 200);
      
      // Verify all evaluations are gone
      const afterResetEvalResponse = await apiClient.getEvaluations();
      await apiClient.assertSuccess(afterResetEvalResponse, 200);
      expect(afterResetEvalResponse.data.total).toBe(0);
      expect(afterResetEvalResponse.data.evaluations).toEqual([]);
    });

    test('should reset ID counter @api @data-management @reset', async () => {
      // Submit a context
      const context1 = TestDataGenerator.generateValidTextContext();
      const submit1Response = await apiClient.submitContext(context1);
      const firstId = submit1Response.data.contextId;
      
      // Reset data
      await apiClient.resetData();
      
      // Submit another context
      const context2 = TestDataGenerator.generateValidTextContext();
      const submit2Response = await apiClient.submitContext(context2);
      const secondId = submit2Response.data.contextId;
      
      // ID should start from 1 again
      expect(secondId).toBe('ctx-1');
      expect(firstId).not.toBe(secondId);
    });

    test('should handle reset when no data exists @api @data-management @reset', async () => {
      // Reset when already empty
      const resetResponse = await apiClient.resetData();
      await apiClient.assertSuccess(resetResponse, 200);
      
      expect(resetResponse.data).toHaveProperty('message', 'All data reset successfully');
      
      // Verify still empty
      const contextsResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(contextsResponse, 200);
      expect(contextsResponse.data.total).toBe(0);
    });

    test('should allow normal operations after reset @api @data-management @reset', async () => {
      // Submit and reset
      const context1 = TestDataGenerator.generateValidTextContext();
      await apiClient.submitContext(context1);
      await apiClient.resetData();
      
      // Submit new context after reset
      const context2 = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context2);
      await apiClient.assertSuccess(submitResponse, 201);
      
      // Verify new context can be retrieved
      const getResponse = await apiClient.getContext(submitResponse.data.contextId);
      await apiClient.assertSuccess(getResponse, 200);
      expect(getResponse.data.content).toBe(context2.content);
    });
  });

  test.describe('Data Consistency', () => {
    test('should maintain data consistency during concurrent operations @api @data-management @concurrency', async () => {
      // Submit multiple contexts concurrently
      const contexts = TestDataGenerator.generateMultipleContexts(5);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      const contextIds = submitResponses.map(response => response.data.contextId);
      
      // Perform concurrent operations: get, delete, and list
      const operations = [
        ...contextIds.slice(0, 2).map(id => apiClient.getContext(id)),
        ...contextIds.slice(2, 4).map(id => apiClient.deleteContext(id)),
        apiClient.getContexts()
      ];
      
      const results = await Promise.allSettled(operations);
      
      // Check that operations completed (some may fail due to deletions, which is expected)
      expect(results.length).toBe(5);
      
      // Verify final state is consistent
      const finalListResponse = await apiClient.getContexts();
      await apiClient.assertSuccess(finalListResponse, 200);
      
      // Should have 3 contexts remaining (5 submitted - 2 deleted)
      expect(finalListResponse.data.total).toBe(3);
    });
  });
});

