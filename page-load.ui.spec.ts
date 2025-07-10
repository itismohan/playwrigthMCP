import { test, expect } from '@playwright/test';
import { MCPPage } from '../../utils/page-objects/mcp-page';

test.describe('MCP Page Load', () => {
  let mcpPage: MCPPage;

  test.beforeEach(async ({ page }) => {
    mcpPage = new MCPPage(page);
  });

  test('should load the main page successfully @smoke @ui @page-load', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    await mcpPage.assertPageLoaded();
  });

  test('should display correct page title and description @ui @page-load', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    await expect(mcpPage.pageTitle).toHaveText('Model Context Protocol (MCP) Evaluation Platform');
    await expect(mcpPage.pageDescription).toContainText('Submit context for evaluation and view results in real-time');
  });

  test('should display all required form elements @ui @page-load @form-elements', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    // Check form elements are visible
    await expect(mcpPage.contentTypeSelect).toBeVisible();
    await expect(mcpPage.contentTextarea).toBeVisible();
    await expect(mcpPage.metadataTextarea).toBeVisible();
    await expect(mcpPage.submitButton).toBeVisible();
    
    // Check form labels
    await expect(mcpPage.page.locator('label[for="contentType"]')).toHaveText('Content Type:');
    await expect(mcpPage.page.locator('label[for="content"]')).toHaveText('Content:');
    await expect(mcpPage.page.locator('label[for="metadata"]')).toHaveText('Metadata (JSON, optional):');
    
    // Check submit button text
    await expect(mcpPage.submitButton).toHaveText('Submit for Evaluation');
  });

  test('should display results section @ui @page-load @results-section', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    await expect(mcpPage.refreshButton).toBeVisible();
    await expect(mcpPage.refreshButton).toHaveText('Refresh');
    await expect(mcpPage.resultsList).toBeVisible();
  });

  test('should have correct default form values @ui @page-load @form-defaults', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    const formState = await mcpPage.getFormValidationState();
    
    expect(formState.content).toBe('');
    expect(formState.type).toBe('text');
    expect(formState.metadata).toBe('');
    expect(formState.isSubmitEnabled).toBe(true);
  });

  test('should display content type options @ui @page-load @content-types', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    // Check that all content type options are available
    const options = await mcpPage.contentTypeSelect.locator('option').all();
    const optionTexts = await Promise.all(options.map(option => option.textContent()));
    
    expect(optionTexts).toContain('Text');
    expect(optionTexts).toContain('JSON');
    expect(optionTexts).toContain('Code');
  });

  test('should have proper form placeholders @ui @page-load @placeholders', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    await expect(mcpPage.contentTextarea).toHaveAttribute('placeholder', 'Enter your content here...');
    await expect(mcpPage.metadataTextarea).toHaveAttribute('placeholder', '{"source": "user", "tags": ["example"]}');
  });

  test('should load initial results (empty state) @ui @page-load @initial-state', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    await mcpPage.waitForResults();
    
    // Should show "No submissions yet" or "Loading..." initially
    const resultsText = await mcpPage.resultsList.textContent();
    expect(resultsText).toMatch(/(No submissions yet|Loading\.\.\.)/);
  });

  test('should be responsive on mobile viewport @ui @page-load @responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    // Check that elements are still visible and accessible
    await expect(mcpPage.pageTitle).toBeVisible();
    await expect(mcpPage.submitButton).toBeVisible();
    await expect(mcpPage.refreshButton).toBeVisible();
    
    // Check that form elements are properly sized
    const contentTextarea = mcpPage.contentTextarea;
    const boundingBox = await contentTextarea.boundingBox();
    expect(boundingBox?.width).toBeLessThan(375); // Should fit within viewport
  });

  test('should handle page refresh correctly @ui @page-load @refresh', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    // Fill some form data
    await mcpPage.contentTextarea.fill('Test content');
    await mcpPage.contentTypeSelect.selectOption('json');
    
    // Refresh the page
    await mcpPage.page.reload();
    await mcpPage.waitForLoad();
    
    // Form should be reset to defaults
    const formState = await mcpPage.getFormValidationState();
    expect(formState.content).toBe('');
    expect(formState.type).toBe('text');
  });

  test('should load page within acceptable time @ui @page-load @performance', async () => {
    const startTime = Date.now();
    
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('should have proper accessibility attributes @ui @page-load @accessibility', async () => {
    await mcpPage.goto();
    await mcpPage.waitForLoad();
    
    // Check form labels are properly associated
    await expect(mcpPage.contentTypeSelect).toHaveAttribute('name', 'type');
    await expect(mcpPage.contentTextarea).toHaveAttribute('name', 'content');
    await expect(mcpPage.metadataTextarea).toHaveAttribute('name', 'metadata');
    
    // Check required attribute
    await expect(mcpPage.contentTextarea).toHaveAttribute('required');
    
    // Check test IDs for automation
    await expect(mcpPage.contentTypeSelect).toHaveAttribute('data-testid', 'content-type-select');
    await expect(mcpPage.contentTextarea).toHaveAttribute('data-testid', 'content-textarea');
    await expect(mcpPage.submitButton).toHaveAttribute('data-testid', 'submit-button');
  });
});

