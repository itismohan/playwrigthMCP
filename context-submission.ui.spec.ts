import { test, expect } from '@playwright/test';
import { MCPPage } from '../../utils/page-objects/mcp-page';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Context Submission UI', () => {
  let mcpPage: MCPPage;

  test.beforeEach(async ({ page }) => {
    mcpPage = new MCPPage(page);
    await mcpPage.goto();
    await mcpPage.waitForLoad();
  });

  test.describe('Valid Submissions', () => {
    test('should submit valid text context @smoke @ui @context-submission', async () => {
      const testData = TestDataGenerator.generateValidTextContext();
      
      await mcpPage.submitContext({
        content: testData.content,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
      
      // Form should be cleared after successful submission
      const formState = await mcpPage.getFormValidationState();
      expect(formState.content).toBe('');
    });

    test('should submit valid JSON context @ui @context-submission', async () => {
      const testData = TestDataGenerator.generateValidJsonContext();
      
      await mcpPage.submitContext({
        content: testData.content,
        type: 'json'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should submit valid code context @ui @context-submission', async () => {
      const testData = TestDataGenerator.generateValidCodeContext();
      
      await mcpPage.submitContext({
        content: testData.content,
        type: 'code'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should submit context with metadata @ui @context-submission @metadata', async () => {
      const testData = TestDataGenerator.generateValidTextContext();
      const metadata = JSON.stringify(testData.metadata, null, 2);
      
      await mcpPage.submitContext({
        content: testData.content,
        type: 'text',
        metadata: metadata
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should submit context without metadata @ui @context-submission', async () => {
      await mcpPage.submitContext({
        content: 'Simple text without metadata',
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should handle large valid content @ui @context-submission @large-content', async () => {
      const largeContent = TestDataGenerator.generateRandomText(5000);
      
      await mcpPage.submitContext({
        content: largeContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should submit multiple contexts sequentially @ui @context-submission @multiple', async () => {
      const contexts = [
        { content: 'First context', type: 'text' as const },
        { content: '{"message": "Second context"}', type: 'json' as const },
        { content: 'function test() { return "third"; }', type: 'code' as const }
      ];
      
      for (const context of contexts) {
        await mcpPage.submitContext(context);
        await mcpPage.assertSubmissionSuccess();
        
        // Wait a bit between submissions
        await mcpPage.page.waitForTimeout(500);
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty content @ui @context-submission @validation', async () => {
      await mcpPage.submitContext({
        content: '',
        type: 'text'
      });
      
      await mcpPage.assertValidationError('Content is required');
    });

    test('should show error for whitespace-only content @ui @context-submission @validation', async () => {
      await mcpPage.submitContext({
        content: '   \n\t   ',
        type: 'text'
      });
      
      await mcpPage.assertValidationError('Content is required');
    });

    test('should show error for oversized content @ui @context-submission @validation', async () => {
      const oversizedContent = TestDataGenerator.generateRandomText(10001);
      
      await mcpPage.submitContext({
        content: oversizedContent,
        type: 'text'
      });
      
      await mcpPage.assertValidationError('exceeds maximum length');
    });

    test('should show error for invalid JSON metadata @ui @context-submission @validation', async () => {
      await mcpPage.submitContext({
        content: 'Valid content',
        type: 'text',
        metadata: '{ invalid json }'
      });
      
      await mcpPage.assertValidationError('Invalid JSON in metadata field');
    });

    test('should handle network errors gracefully @ui @context-submission @error-handling', async ({ page }) => {
      // Simulate network failure by going offline
      await page.context().setOffline(true);
      
      await mcpPage.submitContext({
        content: 'Test content',
        type: 'text'
      });
      
      await mcpPage.assertValidationError('Network error');
      
      // Restore network
      await page.context().setOffline(false);
    });
  });

  test.describe('Form Interaction', () => {
    test('should change content type selection @ui @context-submission @form-interaction', async () => {
      // Start with default (text)
      let formState = await mcpPage.getFormValidationState();
      expect(formState.type).toBe('text');
      
      // Change to JSON
      await mcpPage.contentTypeSelect.selectOption('json');
      formState = await mcpPage.getFormValidationState();
      expect(formState.type).toBe('json');
      
      // Change to code
      await mcpPage.contentTypeSelect.selectOption('code');
      formState = await mcpPage.getFormValidationState();
      expect(formState.type).toBe('code');
    });

    test('should clear form manually @ui @context-submission @form-interaction', async () => {
      // Fill form
      await mcpPage.contentTextarea.fill('Test content');
      await mcpPage.metadataTextarea.fill('{"test": true}');
      await mcpPage.contentTypeSelect.selectOption('json');
      
      // Clear form
      await mcpPage.clearForm();
      
      // Verify form is cleared
      const formState = await mcpPage.getFormValidationState();
      expect(formState.content).toBe('');
      expect(formState.metadata).toBe('');
      expect(formState.type).toBe('text');
    });

    test('should handle typing in content textarea @ui @context-submission @form-interaction', async () => {
      const testContent = 'This is a test content for typing';
      
      await mcpPage.typeSlowly(mcpPage.contentTextarea, testContent, 50);
      
      const formState = await mcpPage.getFormValidationState();
      expect(formState.content).toBe(testContent);
    });

    test('should handle copy and paste @ui @context-submission @form-interaction', async ({ page }) => {
      const testContent = 'Content to copy and paste';
      
      // Simulate copying text to clipboard
      await page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, testContent);
      
      // Focus on textarea and paste
      await mcpPage.contentTextarea.focus();
      await page.keyboard.press('Control+v');
      
      const formState = await mcpPage.getFormValidationState();
      expect(formState.content).toBe(testContent);
    });

    test('should handle keyboard navigation @ui @context-submission @form-interaction @accessibility', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab'); // Should focus on content type select
      await expect(mcpPage.contentTypeSelect).toBeFocused();
      
      await page.keyboard.press('Tab'); // Should focus on content textarea
      await expect(mcpPage.contentTextarea).toBeFocused();
      
      await page.keyboard.press('Tab'); // Should focus on metadata textarea
      await expect(mcpPage.metadataTextarea).toBeFocused();
      
      await page.keyboard.press('Tab'); // Should focus on submit button
      await expect(mcpPage.submitButton).toBeFocused();
    });

    test('should submit form using Enter key @ui @context-submission @form-interaction', async ({ page }) => {
      await mcpPage.contentTextarea.fill('Test content for Enter key submission');
      
      // Press Enter while focused on submit button
      await mcpPage.submitButton.focus();
      await page.keyboard.press('Enter');
      
      await mcpPage.assertSubmissionSuccess();
    });
  });

  test.describe('Real-time Feedback', () => {
    test('should show loading state during submission @ui @context-submission @loading-state', async () => {
      await mcpPage.contentTextarea.fill('Test content');
      
      // Click submit and immediately check for loading state
      await mcpPage.submitButton.click();
      
      // Should show "Submitting context..." message
      await expect(mcpPage.submitStatus).toBeVisible();
      await expect(mcpPage.submitStatus).toContainText('Submitting context...');
      
      // Wait for completion
      await mcpPage.assertSubmissionSuccess();
    });

    test('should update status message appropriately @ui @context-submission @status-updates', async () => {
      await mcpPage.contentTextarea.fill('Test content');
      await mcpPage.submitButton.click();
      
      // Should show info status first
      await mcpPage.waitForStatus();
      expect(await mcpPage.submitStatus.getAttribute('class')).toContain('info');
      
      // Then should show success status
      await mcpPage.assertSubmissionSuccess();
      expect(await mcpPage.submitStatus.getAttribute('class')).toContain('success');
    });

    test('should auto-hide success message after delay @ui @context-submission @auto-hide', async () => {
      await mcpPage.contentTextarea.fill('Test content');
      await mcpPage.submitButton.click();
      
      await mcpPage.assertSubmissionSuccess();
      
      // Wait for auto-hide (should happen after 5 seconds)
      await mcpPage.page.waitForTimeout(6000);
      
      // Status should be hidden
      await expect(mcpPage.submitStatus).toBeHidden();
    });
  });

  test.describe('Special Characters and Edge Cases', () => {
    test('should handle special characters in content @ui @context-submission @special-chars', async () => {
      const specialContent = '🚀 Special chars: <>&"\'`\n\r\t';
      
      await mcpPage.submitContext({
        content: specialContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should handle Unicode content @ui @context-submission @unicode', async () => {
      const unicodeContent = 'Unicode test: 你好世界 🌍 العالم мир';
      
      await mcpPage.submitContext({
        content: unicodeContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should handle multiline content @ui @context-submission @multiline', async () => {
      const multilineContent = `Line 1
Line 2
Line 3 with special chars: !@#$%^&*()
Line 4`;
      
      await mcpPage.submitContext({
        content: multilineContent,
        type: 'text'
      });
      
      await mcpPage.assertSubmissionSuccess();
    });

    test('should handle complex JSON metadata @ui @context-submission @complex-metadata', async () => {
      const complexMetadata = {
        nested: {
          deep: {
            object: 'value'
          }
        },
        array: [1, 2, 3],
        boolean: true,
        null_value: null,
        special_chars: '!@#$%^&*()'
      };
      
      await mcpPage.submitContext({
        content: 'Content with complex metadata',
        type: 'text',
        metadata: JSON.stringify(complexMetadata, null, 2)
      });
      
      await mcpPage.assertSubmissionSuccess();
    });
  });
});

