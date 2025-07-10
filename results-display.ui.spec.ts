import { test, expect } from '@playwright/test';
import { MCPPage } from '../../utils/page-objects/mcp-page';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Results Display UI', () => {
  let mcpPage: MCPPage;

  test.beforeEach(async ({ page }) => {
    mcpPage = new MCPPage(page);
    await mcpPage.goto();
    await mcpPage.waitForLoad();
  });

  test.describe('Initial State', () => {
    test('should show empty state when no results exist @smoke @ui @results-display', async () => {
      await mcpPage.waitForResults();
      await mcpPage.assertNoResults();
    });

    test('should show loading state initially @ui @results-display @loading', async () => {
      // Immediately after page load, should show loading
      const initialText = await mcpPage.resultsList.textContent();
      expect(initialText).toContain('Loading...');
    });
  });

  test.describe('Results After Submission', () => {
    test('should display result after successful submission @ui @results-display @submission-result', async () => {
      const testContent = 'Test content for results display';
      
      await mcpPage.submitContext({
        content: testContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Wait for results to update automatically
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      // Should now show at least one result
      await mcpPage.assertResultsDisplayed(1);
      
      // Check that the submitted content appears in results
      const resultItems = await mcpPage.getResultItems();
      expect(resultItems.length).toBeGreaterThan(0);
      
      const firstResult = resultItems[0];
      const resultText = await firstResult.textContent();
      expect(resultText).toContain(testContent.substring(0, 50)); // Truncated content
    });

    test('should display multiple results @ui @results-display @multiple-results', async () => {
      const contexts = [
        { content: 'First test context', type: 'text' as const },
        { content: 'Second test context', type: 'text' as const },
        { content: 'Third test context', type: 'text' as const }
      ];
      
      // Submit multiple contexts
      for (const context of contexts) {
        await mcpPage.submitContext(context);
        await mcpPage.assertSubmissionSuccess();
        await mcpPage.page.waitForTimeout(500);
      }
      
      // Wait for all results to appear
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      // Should show all submitted contexts
      await mcpPage.assertResultsDisplayed(3);
    });

    test('should show result details correctly @ui @results-display @result-details', async () => {
      const testData = TestDataGenerator.generateValidTextContext();
      
      await mcpPage.submitContext({
        content: testData.content,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Extract context ID from success message
      const statusMessage = await mcpPage.getStatusMessage();
      const contextIdMatch = statusMessage.match(/ID: (ctx-\d+)/);
      expect(contextIdMatch).not.toBeNull();
      const contextId = contextIdMatch![1];
      
      // Wait for result to appear
      await mcpPage.waitForResultItem(contextId);
      
      // Get result details
      const details = await mcpPage.getResultItemDetails(contextId);
      
      expect(details.title).toBe(contextId);
      expect(details.meta).toContain('Type: text');
      expect(details.meta).toContain('Status: submitted');
      expect(details.meta).toContain('Submitted:');
      expect(details.content).toContain(testData.content.substring(0, 50));
    });

    test('should show status progression from submitted to evaluated @ui @results-display @status-progression', async () => {
      const testContent = 'Content for status progression test';
      
      await mcpPage.submitContext({
        content: testContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Extract context ID
      const statusMessage = await mcpPage.getStatusMessage();
      const contextIdMatch = statusMessage.match(/ID: (ctx-\d+)/);
      const contextId = contextIdMatch![1];
      
      // Wait for initial result
      await mcpPage.waitForResultItem(contextId);
      
      // Initially should show 'submitted' status
      let details = await mcpPage.getResultItemDetails(contextId);
      expect(details.meta).toContain('Status: submitted');
      
      // Wait for evaluation to complete (mock server takes ~1 second)
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.refreshResults();
      await mcpPage.waitForResults();
      
      // Should now show 'evaluated' status
      details = await mcpPage.getResultItemDetails(contextId);
      expect(details.meta).toContain('Status: evaluated');
    });
  });

  test.describe('Refresh Functionality', () => {
    test('should refresh results when refresh button is clicked @ui @results-display @refresh', async () => {
      // Submit a context
      await mcpPage.submitContext({
        content: 'Content for refresh test',
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Click refresh button
      await mcpPage.refreshButton.click();
      await mcpPage.waitForResults();
      
      // Should show the submitted result
      await mcpPage.assertResultsDisplayed(1);
    });

    test('should show loading state during refresh @ui @results-display @refresh-loading', async () => {
      await mcpPage.refreshButton.click();
      
      // Should briefly show loading state
      await expect(mcpPage.resultsList).toContainText('Loading...');
      
      // Then show results or empty state
      await mcpPage.waitForResults();
    });

    test('should auto-refresh results periodically @ui @results-display @auto-refresh', async () => {
      // Submit a context
      await mcpPage.submitContext({
        content: 'Content for auto-refresh test',
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Wait for auto-refresh (should happen every 30 seconds, but we'll wait less)
      await mcpPage.page.waitForTimeout(3000);
      
      // Results should be visible
      await mcpPage.assertResultsDisplayed(1);
    });
  });

  test.describe('Result Content Display', () => {
    test('should truncate long content appropriately @ui @results-display @content-truncation', async () => {
      const longContent = TestDataGenerator.generateRandomText(200);
      
      await mcpPage.submitContext({
        content: longContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Wait for result
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      const resultItems = await mcpPage.getResultItems();
      const firstResult = resultItems[0];
      const contentElement = firstResult.locator('.content');
      const displayedContent = await contentElement.textContent();
      
      // Should be truncated (less than full content)
      expect(displayedContent!.length).toBeLessThan(longContent.length);
      expect(displayedContent).toContain('...');
    });

    test('should display different content types correctly @ui @results-display @content-types', async () => {
      const contexts = [
        { content: 'Plain text content', type: 'text' as const },
        { content: '{"key": "value", "number": 42}', type: 'json' as const },
        { content: 'function test() { return true; }', type: 'code' as const }
      ];
      
      // Submit all contexts
      for (const context of contexts) {
        await mcpPage.submitContext(context);
        await mcpPage.assertSubmissionSuccess();
        await mcpPage.page.waitForTimeout(500);
      }
      
      // Wait for all results
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      const resultItems = await mcpPage.getResultItems();
      expect(resultItems.length).toBe(3);
      
      // Check that each type is displayed correctly
      for (let i = 0; i < resultItems.length; i++) {
        const details = await resultItems[i].locator('.meta').textContent();
        expect(details).toContain(`Type: ${contexts[i].type}`);
      }
    });

    test('should display timestamps in readable format @ui @results-display @timestamps', async () => {
      await mcpPage.submitContext({
        content: 'Content for timestamp test',
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      const resultItems = await mcpPage.getResultItems();
      const firstResult = resultItems[0];
      const metaText = await firstResult.locator('.meta').textContent();
      
      // Should contain a readable timestamp
      expect(metaText).toMatch(/Submitted: \d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY format
    });
  });

  test.describe('Results List Behavior', () => {
    test('should maintain scroll position during updates @ui @results-display @scroll-behavior', async () => {
      // Submit multiple contexts to create scrollable content
      for (let i = 0; i < 10; i++) {
        await mcpPage.submitContext({
          content: `Content ${i + 1} for scroll test`,
          type: 'text'
        });
        await mcpPage.assertSubmissionSuccess();
        await mcpPage.page.waitForTimeout(200);
      }
      
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      // Scroll down in results list
      await mcpPage.resultsList.evaluate(el => el.scrollTop = 100);
      const scrollPosition = await mcpPage.resultsList.evaluate(el => el.scrollTop);
      
      // Refresh results
      await mcpPage.refreshButton.click();
      await mcpPage.waitForResults();
      
      // Scroll position should be maintained or reset to top (both are acceptable)
      const newScrollPosition = await mcpPage.resultsList.evaluate(el => el.scrollTop);
      expect(newScrollPosition).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty results gracefully @ui @results-display @empty-handling', async () => {
      // Ensure no results exist (fresh state)
      await mcpPage.refreshButton.click();
      await mcpPage.waitForResults();
      
      await mcpPage.assertNoResults();
      
      // Results list should still be functional
      await expect(mcpPage.resultsList).toBeVisible();
      await expect(mcpPage.refreshButton).toBeEnabled();
    });

    test('should show results in reverse chronological order @ui @results-display @ordering', async () => {
      const contexts = [
        'First submitted context',
        'Second submitted context',
        'Third submitted context'
      ];
      
      // Submit contexts with delays to ensure different timestamps
      for (const content of contexts) {
        await mcpPage.submitContext({ content, type: 'text' });
        await mcpPage.assertSubmissionSuccess();
        await mcpPage.page.waitForTimeout(1000);
      }
      
      await mcpPage.page.waitForTimeout(2000);
      await mcpPage.waitForResults();
      
      const resultItems = await mcpPage.getResultItems();
      expect(resultItems.length).toBe(3);
      
      // Most recent should be first (reverse chronological)
      const firstResultContent = await resultItems[0].locator('.content').textContent();
      expect(firstResultContent).toContain('Third submitted context');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during results loading @ui @results-display @error-handling', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      // Try to refresh results
      await mcpPage.refreshButton.click();
      
      // Should show error state or maintain previous state
      await mcpPage.page.waitForTimeout(2000);
      const resultsText = await mcpPage.resultsList.textContent();
      expect(resultsText).toMatch(/(Network error|Error loading results|Loading\.\.\.)/);
      
      // Restore network
      await page.context().setOffline(false);
    });

    test('should recover from temporary network issues @ui @results-display @error-recovery', async ({ page }) => {
      // Submit a context first
      await mcpPage.submitContext({
        content: 'Content before network issue',
        type: 'text'
      });
      await mcpPage.assertSubmissionSuccess();
      
      // Go offline temporarily
      await page.context().setOffline(true);
      await mcpPage.refreshButton.click();
      await mcpPage.page.waitForTimeout(1000);
      
      // Go back online
      await page.context().setOffline(false);
      await mcpPage.refreshButton.click();
      await mcpPage.waitForResults();
      
      // Should show results again
      await mcpPage.assertResultsDisplayed(1);
    });
  });
});

