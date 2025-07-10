import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Evaluation API', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
    await apiClient.resetData();
  });

  test.afterEach(async () => {
    await apiClient.resetData();
  });

  test.describe('Get Evaluation by Context ID', () => {
    test('should retrieve evaluation for evaluated context @smoke @api @evaluation', async () => {
      // Submit context and wait for evaluation
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      // Wait for evaluation to complete
      const evaluation = await apiClient.waitForEvaluation(contextId, 5000);
      expect(evaluation).not.toBeNull();
      
      // Retrieve evaluation via API
      const response = await apiClient.getEvaluationByContext(contextId);
      await apiClient.assertSuccess(response, 200);
      
      // Validate evaluation structure
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('contextId', contextId);
      expect(response.data).toHaveProperty('status', 'completed');
      expect(response.data).toHaveProperty('results');
      expect(response.data).toHaveProperty('evaluatedAt');
      
      // Validate results structure
      const results = response.data.results;
      expect(results).toHaveProperty('score');
      expect(results).toHaveProperty('confidence');
      expect(results).toHaveProperty('tags');
      expect(results).toHaveProperty('feedback');
      
      // Validate data types
      expect(typeof results.score).toBe('number');
      expect(typeof results.confidence).toBe('number');
      expect(Array.isArray(results.tags)).toBe(true);
      expect(typeof results.feedback).toBe('string');
      
      // Validate ranges
      expect(results.score).toBeGreaterThanOrEqual(0);
      expect(results.score).toBeLessThanOrEqual(100);
      expect(results.confidence).toBeGreaterThanOrEqual(0);
      expect(results.confidence).toBeLessThanOrEqual(1);
    });

    test('should return 404 for non-existent context evaluation @api @evaluation @error-handling', async () => {
      const response = await apiClient.getEvaluationByContext('ctx-nonexistent');
      
      await apiClient.assertError(response, 404, 'EVALUATION_NOT_FOUND');
      expect(response.data.error).toBe('Evaluation not found for this context');
    });

    test('should return 404 for context without evaluation @api @evaluation @error-handling', async () => {
      // Submit context but don't wait for evaluation
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      // Immediately try to get evaluation (should not exist yet)
      const response = await apiClient.getEvaluationByContext(contextId);
      
      await apiClient.assertError(response, 404, 'EVALUATION_NOT_FOUND');
    });
  });

  test.describe('Get Evaluation by ID', () => {
    test('should retrieve evaluation by evaluation ID @api @evaluation', async () => {
      // Submit context and wait for evaluation
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      const evaluation = await apiClient.waitForEvaluation(contextId, 5000);
      expect(evaluation).not.toBeNull();
      
      // Get evaluation by its ID
      const response = await apiClient.getEvaluation(evaluation!.id);
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data).toEqual(evaluation);
    });

    test('should return 404 for non-existent evaluation ID @api @evaluation @error-handling', async () => {
      const response = await apiClient.getEvaluation('eval-nonexistent');
      
      await apiClient.assertError(response, 404, 'EVALUATION_NOT_FOUND');
      expect(response.data.error).toBe('Evaluation not found');
    });
  });

  test.describe('Get All Evaluations', () => {
    test('should return empty list when no evaluations exist @api @evaluation', async () => {
      const response = await apiClient.getEvaluations();
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data).toHaveProperty('evaluations');
      expect(response.data).toHaveProperty('total', 0);
      expect(response.data.evaluations).toEqual([]);
    });

    test('should return all evaluations when they exist @api @evaluation', async () => {
      // Submit multiple contexts and wait for evaluations
      const contexts = TestDataGenerator.generateMultipleContexts(3);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      // Wait for all evaluations to complete
      const evaluationPromises = submitResponses.map(response => 
        apiClient.waitForEvaluation(response.data.contextId, 5000)
      );
      const evaluations = await Promise.all(evaluationPromises);
      
      // Ensure all evaluations completed
      for (const evaluation of evaluations) {
        expect(evaluation).not.toBeNull();
      }
      
      // Get all evaluations
      const response = await apiClient.getEvaluations();
      await apiClient.assertSuccess(response, 200);
      
      expect(response.data.evaluations).toHaveLength(3);
      expect(response.data.total).toBe(3);
      
      // Validate structure of each evaluation
      for (const evaluation of response.data.evaluations) {
        expect(evaluation).toHaveProperty('id');
        expect(evaluation).toHaveProperty('contextId');
        expect(evaluation).toHaveProperty('status');
        expect(evaluation).toHaveProperty('results');
        expect(evaluation).toHaveProperty('evaluatedAt');
      }
    });

    test('should support pagination for evaluations @api @evaluation @pagination', async () => {
      // Submit 5 contexts and wait for evaluations
      const contexts = TestDataGenerator.generateMultipleContexts(5);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      // Wait for all evaluations
      const evaluationPromises = submitResponses.map(response => 
        apiClient.waitForEvaluation(response.data.contextId, 5000)
      );
      await Promise.all(evaluationPromises);
      
      // Get first page
      const page1Response = await apiClient.getEvaluations({ limit: 2, offset: 0 });
      await apiClient.assertSuccess(page1Response, 200);
      
      expect(page1Response.data.evaluations).toHaveLength(2);
      expect(page1Response.data.total).toBe(5);
      expect(page1Response.data.limit).toBe(2);
      expect(page1Response.data.offset).toBe(0);
      
      // Get second page
      const page2Response = await apiClient.getEvaluations({ limit: 2, offset: 2 });
      await apiClient.assertSuccess(page2Response, 200);
      
      expect(page2Response.data.evaluations).toHaveLength(2);
      expect(page2Response.data.total).toBe(5);
      expect(page2Response.data.offset).toBe(2);
    });

    test('should filter evaluations by status @api @evaluation @filtering', async () => {
      // Submit contexts and wait for evaluations
      const contexts = TestDataGenerator.generateMultipleContexts(2);
      const submitPromises = contexts.map(context => apiClient.submitContext(context));
      const submitResponses = await Promise.all(submitPromises);
      
      // Wait for evaluations to complete
      const evaluationPromises = submitResponses.map(response => 
        apiClient.waitForEvaluation(response.data.contextId, 5000)
      );
      await Promise.all(evaluationPromises);
      
      // Filter by completed status
      const completedResponse = await apiClient.getEvaluations({ status: 'completed' });
      await apiClient.assertSuccess(completedResponse, 200);
      
      expect(completedResponse.data.evaluations.length).toBeGreaterThan(0);
      for (const evaluation of completedResponse.data.evaluations) {
        expect(evaluation.status).toBe('completed');
      }
    });
  });

  test.describe('Evaluation Content Validation', () => {
    test('should generate different evaluations for different content types @api @evaluation @content-types', async () => {
      const textContext = TestDataGenerator.generateValidTextContext();
      const jsonContext = TestDataGenerator.generateValidJsonContext();
      const codeContext = TestDataGenerator.generateValidCodeContext();
      
      // Submit all contexts
      const textSubmit = await apiClient.submitContext(textContext);
      const jsonSubmit = await apiClient.submitContext(jsonContext);
      const codeSubmit = await apiClient.submitContext(codeContext);
      
      // Wait for evaluations
      const textEval = await apiClient.waitForEvaluation(textSubmit.data.contextId, 5000);
      const jsonEval = await apiClient.waitForEvaluation(jsonSubmit.data.contextId, 5000);
      const codeEval = await apiClient.waitForEvaluation(codeSubmit.data.contextId, 5000);
      
      expect(textEval).not.toBeNull();
      expect(jsonEval).not.toBeNull();
      expect(codeEval).not.toBeNull();
      
      // All should have valid evaluation structure
      for (const evaluation of [textEval, jsonEval, codeEval]) {
        expect(evaluation!.status).toBe('completed');
        expect(evaluation!.results.score).toBeGreaterThanOrEqual(0);
        expect(evaluation!.results.score).toBeLessThanOrEqual(100);
        expect(evaluation!.results.confidence).toBeGreaterThanOrEqual(0);
        expect(evaluation!.results.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(evaluation!.results.tags)).toBe(true);
        expect(typeof evaluation!.results.feedback).toBe('string');
      }
    });

    test('should include automated tag in all evaluations @api @evaluation @tags', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      const evaluation = await apiClient.waitForEvaluation(contextId, 5000);
      expect(evaluation).not.toBeNull();
      
      expect(evaluation!.results.tags).toContain('automated');
    });

    test('should have consistent evaluation timing @api @evaluation @performance', async () => {
      const context = TestDataGenerator.generateValidTextContext();
      const submitTime = Date.now();
      
      const submitResponse = await apiClient.submitContext(context);
      const contextId = submitResponse.data.contextId;
      
      const evaluation = await apiClient.waitForEvaluation(contextId, 5000);
      const evaluationTime = Date.now();
      
      expect(evaluation).not.toBeNull();
      
      // Evaluation should complete within reasonable time (5 seconds)
      const evaluationDuration = evaluationTime - submitTime;
      expect(evaluationDuration).toBeLessThan(5000);
      
      // Evaluation timestamp should be after submission
      const evaluatedAt = new Date(evaluation!.evaluatedAt).getTime();
      expect(evaluatedAt).toBeGreaterThan(submitTime);
    });
  });
});

