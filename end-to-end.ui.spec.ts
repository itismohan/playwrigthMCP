import { test, expect } from '@playwright/test';
import { MCPPage } from '../../utils/page-objects/mcp-page';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('End-to-End MCP Evaluation Flow', () => {
  let mcpPage: MCPPage;

  test.beforeEach(async ({ page }) => {
    mcpPage = new MCPPage(page);
    await mcpPage.goto();
    await mcpPage.waitForLoad();
  });

  test('should complete full evaluation workflow @smoke @ui @e2e @evaluation-workflow', async () => {
    // Step 1: Load the page and verify initial state
    await mcpPage.assertPageLoaded();
    await mcpPage.assertNoResults();
    
    // Step 2: Submit a context for evaluation
    const testData = TestDataGenerator.generateValidTextContext();
    await mcpPage.submitContext({
      content: testData.content,
      type: 'text',
      metadata: JSON.stringify(testData.metadata, null, 2)
    });
    
    // Step 3: Verify successful submission
    await mcpPage.assertSubmissionSuccess();
    
    // Extract context ID from success message
    const statusMessage = await mcpPage.getStatusMessage();
    const contextIdMatch = statusMessage.match(/ID: (ctx-\d+)/);
    expect(contextIdMatch).not.toBeNull();
    const contextId = contextIdMatch![1];
    
    // Step 4: Verify form is cleared after submission
    const formState = await mcpPage.getFormValidationState();
    expect(formState.content).toBe('');
    expect(formState.metadata).toBe('');
    
    // Step 5: Wait for result to appear in the list
    await mcpPage.page.waitForTimeout(2000); // Allow time for auto-refresh
    await mcpPage.waitForResults();
    await mcpPage.waitForResultItem(contextId);
    
    // Step 6: Verify result details
    const details = await mcpPage.getResultItemDetails(contextId);
    expect(details.title).toBe(contextId);
    expect(details.meta).toContain('Type: text');
    expect(details.meta).toContain('Status: submitted');
    expect(details.content).toContain(testData.content.substring(0, 50));
    
    // Step 7: Wait for evaluation to complete
    await mcpPage.page.waitForTimeout(2000); // Mock server evaluation delay
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    
    // Step 8: Verify status changed to evaluated
    const updatedDetails = await mcpPage.getResultItemDetails(contextId);
    expect(updatedDetails.meta).toContain('Status: evaluated');
    
    // Step 9: Verify results list shows the completed evaluation
    await mcpPage.assertResultsDisplayed(1);
  });

  test('should handle multiple context types in complete workflow @ui @e2e @multiple-types', async () => {
    const contexts = [
      {
        data: TestDataGenerator.generateValidTextContext(),
        type: 'text' as const,
        description: 'Text context'
      },
      {
        data: TestDataGenerator.generateValidJsonContext(),
        type: 'json' as const,
        description: 'JSON context'
      },
      {
        data: TestDataGenerator.generateValidCodeContext(),
        type: 'code' as const,
        description: 'Code context'
      }
    ];
    
    const submittedContextIds: string[] = [];
    
    // Submit all contexts
    for (const context of contexts) {
      await mcpPage.submitContext({
        content: context.data.content,
        type: context.type,
        metadata: JSON.stringify(context.data.metadata, null, 2)
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Extract and store context ID
      const statusMessage = await mcpPage.getStatusMessage();
      const contextIdMatch = statusMessage.match(/ID: (ctx-\d+)/);
      expect(contextIdMatch).not.toBeNull();
      submittedContextIds.push(contextIdMatch![1]);
      
      // Wait between submissions
      await mcpPage.page.waitForTimeout(500);
    }
    
    // Wait for all results to appear
    await mcpPage.page.waitForTimeout(3000);
    await mcpPage.waitForResults();
    
    // Verify all contexts are displayed
    await mcpPage.assertResultsDisplayed(3);
    
    // Verify each context appears with correct type
    for (let i = 0; i < submittedContextIds.length; i++) {
      const contextId = submittedContextIds[i];
      const expectedType = contexts[i].type;
      
      await mcpPage.waitForResultItem(contextId);
      const details = await mcpPage.getResultItemDetails(contextId);
      expect(details.meta).toContain(`Type: ${expectedType}`);
    }
    
    // Wait for evaluations to complete
    await mcpPage.page.waitForTimeout(3000);
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    
    // Verify all contexts are evaluated
    for (const contextId of submittedContextIds) {
      const details = await mcpPage.getResultItemDetails(contextId);
      expect(details.meta).toContain('Status: evaluated');
    }
  });

  test('should handle validation errors and recovery @ui @e2e @validation-recovery', async () => {
    // Step 1: Try to submit empty content (should fail)
    await mcpPage.submitContext({
      content: '',
      type: 'text'
    });
    
    await mcpPage.assertValidationError('Content is required');
    
    // Step 2: Try to submit invalid JSON metadata (should fail)
    await mcpPage.submitContext({
      content: 'Valid content',
      type: 'text',
      metadata: '{ invalid json }'
    });
    
    await mcpPage.assertValidationError('Invalid JSON in metadata field');
    
    // Step 3: Submit valid content (should succeed)
    const validData = TestDataGenerator.generateValidTextContext();
    await mcpPage.submitContext({
      content: validData.content,
      type: 'text',
      metadata: JSON.stringify(validData.metadata, null, 2)
    });
    
    await mcpPage.assertSubmissionSuccess();
    
    // Step 4: Verify result appears
    await mcpPage.page.waitForTimeout(2000);
    await mcpPage.waitForResults();
    await mcpPage.assertResultsDisplayed(1);
  });

  test('should maintain state during page interactions @ui @e2e @state-management', async () => {
    // Submit initial context
    const context1 = TestDataGenerator.generateValidTextContext();
    await mcpPage.submitContext({
      content: context1.content,
      type: 'text'
    });
    await mcpPage.assertSubmissionSuccess();
    
    // Wait for result to appear
    await mcpPage.page.waitForTimeout(2000);
    await mcpPage.waitForResults();
    await mcpPage.assertResultsDisplayed(1);
    
    // Submit second context
    const context2 = TestDataGenerator.generateValidJsonContext();
    await mcpPage.submitContext({
      content: context2.content,
      type: 'json'
    });
    await mcpPage.assertSubmissionSuccess();
    
    // Refresh results manually
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    
    // Should now show both results
    await mcpPage.assertResultsDisplayed(2);
    
    // Submit third context
    const context3 = TestDataGenerator.generateValidCodeContext();
    await mcpPage.submitContext({
      content: context3.content,
      type: 'code'
    });
    await mcpPage.assertSubmissionSuccess();
    
    // Wait for auto-refresh
    await mcpPage.page.waitForTimeout(3000);
    await mcpPage.waitForResults();
    
    // Should show all three results
    await mcpPage.assertResultsDisplayed(3);
  });

  test('should handle network interruptions gracefully @ui @e2e @network-resilience', async ({ page }) => {
    // Submit context while online
    const testData = TestDataGenerator.generateValidTextContext();
    await mcpPage.submitContext({
      content: testData.content,
      type: 'text'
    });
    await mcpPage.assertSubmissionSuccess();
    
    // Wait for result to appear
    await mcpPage.page.waitForTimeout(2000);
    await mcpPage.waitForResults();
    await mcpPage.assertResultsDisplayed(1);
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to submit another context (should fail)
    await mcpPage.submitContext({
      content: 'Content while offline',
      type: 'text'
    });
    await mcpPage.assertValidationError('Network error');
    
    // Try to refresh results (should show error or maintain state)
    await mcpPage.refreshButton.click();
    await mcpPage.page.waitForTimeout(2000);
    
    // Go back online
    await page.context().setOffline(false);
    
    // Submit new context (should work again)
    const onlineData = TestDataGenerator.generateValidTextContext();
    await mcpPage.submitContext({
      content: onlineData.content,
      type: 'text'
    });
    await mcpPage.assertSubmissionSuccess();
    
    // Refresh and verify both contexts are shown
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    await mcpPage.assertResultsDisplayed(2);
  });

  test('should demonstrate complete evaluation lifecycle @ui @e2e @evaluation-lifecycle', async () => {
    const testData = TestDataGenerator.generateValidTextContext();
    
    // Phase 1: Submission
    await mcpPage.submitContext({
      content: testData.content,
      type: 'text',
      metadata: JSON.stringify(testData.metadata, null, 2)
    });
    
    await mcpPage.assertSubmissionSuccess();
    const statusMessage = await mcpPage.getStatusMessage();
    const contextId = statusMessage.match(/ID: (ctx-\d+)/)![1];
    
    // Phase 2: Initial result display (submitted status)
    await mcpPage.page.waitForTimeout(2000);
    await mcpPage.waitForResults();
    await mcpPage.waitForResultItem(contextId);
    
    let details = await mcpPage.getResultItemDetails(contextId);
    expect(details.meta).toContain('Status: submitted');
    expect(details.title).toBe(contextId);
    expect(details.content).toContain(testData.content.substring(0, 50));
    
    // Phase 3: Evaluation completion (evaluated status)
    await mcpPage.page.waitForTimeout(2000); // Wait for mock evaluation
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    
    details = await mcpPage.getResultItemDetails(contextId);
    expect(details.meta).toContain('Status: evaluated');
    
    // Phase 4: Verify evaluation persistence
    await mcpPage.refreshResults();
    await mcpPage.waitForResults();
    
    details = await mcpPage.getResultItemDetails(contextId);
    expect(details.meta).toContain('Status: evaluated');
    expect(details.title).toBe(contextId);
  });

  test('should handle concurrent user interactions @ui @e2e @concurrent-interactions', async () => {
    // Simulate rapid user interactions
    const contexts = TestDataGenerator.generateMultipleContexts(3);
    
    // Submit contexts rapidly
    for (let i = 0; i < contexts.length; i++) {
      await mcpPage.submitContext({
        content: contexts[i].content,
        type: contexts[i].type
      });
      
      // Don't wait for success message, submit next immediately
      if (i < contexts.length - 1) {
        await mcpPage.page.waitForTimeout(100);
      }
    }
    
    // Wait for all submissions to complete
    await mcpPage.page.waitForTimeout(3000);
    
    // Refresh multiple times rapidly
    for (let i = 0; i < 3; i++) {
      await mcpPage.refreshButton.click();
      await mcpPage.page.waitForTimeout(200);
    }
    
    // Final verification
    await mcpPage.waitForResults();
    await mcpPage.assertResultsDisplayed(3);
  });

  test('should maintain accessibility throughout workflow @ui @e2e @accessibility', async ({ page }) => {
    // Test keyboard navigation throughout the workflow
    await page.keyboard.press('Tab'); // Focus content type
    await expect(mcpPage.contentTypeSelect).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus content textarea
    await expect(mcpPage.contentTextarea).toBeFocused();
    
    // Type content using keyboard
    await page.keyboard.type('Accessibility test content');
    
    await page.keyboard.press('Tab'); // Focus metadata textarea
    await expect(mcpPage.metadataTextarea).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus submit button
    await expect(mcpPage.submitButton).toBeFocused();
    
    // Submit using Enter key
    await page.keyboard.press('Enter');
    
    await mcpPage.assertSubmissionSuccess();
    
    // Verify results are accessible
    await mcpPage.page.waitForTimeout(2000);
    await mcpPage.waitForResults();
    
    const resultItems = await mcpPage.getResultItems();
    expect(resultItems.length).toBeGreaterThan(0);
    
    // Verify refresh button is accessible
    await mcpPage.refreshButton.focus();
    await expect(mcpPage.refreshButton).toBeFocused();
  });
});

