import { test, expect } from '@playwright/test';
import { MCPApiClient } from '../../utils/api-client';

test.describe('Health Check API', () => {
  let apiClient: MCPApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new MCPApiClient(request);
  });

  test('should return healthy status @smoke @api', async () => {
    const response = await apiClient.healthCheck();
    
    await apiClient.assertSuccess(response, 200);
    
    expect(response.data).toHaveProperty('status', 'healthy');
    expect(response.data).toHaveProperty('timestamp');
    expect(response.data).toHaveProperty('version');
    
    // Validate timestamp format
    const timestamp = new Date(response.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
    
    // Validate version format
    expect(response.data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should return consistent response format @api', async () => {
    const response1 = await apiClient.healthCheck();
    const response2 = await apiClient.healthCheck();
    
    await apiClient.assertSuccess(response1, 200);
    await apiClient.assertSuccess(response2, 200);
    
    // Both responses should have the same structure
    expect(Object.keys(response1.data)).toEqual(Object.keys(response2.data));
    expect(response1.data.status).toBe(response2.data.status);
    expect(response1.data.version).toBe(response2.data.version);
  });

  test('should respond quickly @performance @api', async () => {
    const startTime = Date.now();
    const response = await apiClient.healthCheck();
    const endTime = Date.now();
    
    await apiClient.assertSuccess(response, 200);
    
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});

