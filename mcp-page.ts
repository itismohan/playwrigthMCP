import { Page, Locator, expect } from '@playwright/test';

export class MCPPage {
  readonly page: Page;
  
  // Form elements
  readonly contentTypeSelect: Locator;
  readonly contentTextarea: Locator;
  readonly metadataTextarea: Locator;
  readonly submitButton: Locator;
  readonly refreshButton: Locator;
  
  // Status and results elements
  readonly submitStatus: Locator;
  readonly resultsList: Locator;
  
  // Header elements
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form elements
    this.contentTypeSelect = page.getByTestId('content-type-select');
    this.contentTextarea = page.getByTestId('content-textarea');
    this.metadataTextarea = page.getByTestId('metadata-textarea');
    this.submitButton = page.getByTestId('submit-button');
    this.refreshButton = page.getByTestId('refresh-button');
    
    // Status and results
    this.submitStatus = page.locator('#submitStatus');
    this.resultsList = page.locator('#resultsList');
    
    // Header elements
    this.pageTitle = page.locator('h1');
    this.pageDescription = page.locator('.header p');
  }

  /**
   * Navigate to the MCP page
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor();
    await this.submitButton.waitFor();
  }

  /**
   * Submit context with the given data
   */
  async submitContext(data: {
    content: string;
    type?: 'text' | 'json' | 'code';
    metadata?: string;
  }) {
    // Fill content type if provided
    if (data.type) {
      await this.contentTypeSelect.selectOption(data.type);
    }
    
    // Fill content
    await this.contentTextarea.fill(data.content);
    
    // Fill metadata if provided
    if (data.metadata) {
      await this.metadataTextarea.fill(data.metadata);
    }
    
    // Submit the form
    await this.submitButton.click();
  }

  /**
   * Clear the form
   */
  async clearForm() {
    await this.contentTextarea.clear();
    await this.metadataTextarea.clear();
    await this.contentTypeSelect.selectOption('text');
  }

  /**
   * Get the current status message
   */
  async getStatusMessage(): Promise<string> {
    await this.submitStatus.waitFor({ state: 'visible' });
    return await this.submitStatus.textContent() || '';
  }

  /**
   * Wait for status message to appear
   */
  async waitForStatus(timeout: number = 5000) {
    await this.submitStatus.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if status is success
   */
  async isStatusSuccess(): Promise<boolean> {
    const statusClass = await this.submitStatus.getAttribute('class');
    return statusClass?.includes('success') || false;
  }

  /**
   * Check if status is error
   */
  async isStatusError(): Promise<boolean> {
    const statusClass = await this.submitStatus.getAttribute('class');
    return statusClass?.includes('error') || false;
  }

  /**
   * Refresh the results list
   */
  async refreshResults() {
    await this.refreshButton.click();
  }

  /**
   * Wait for results to load
   */
  async waitForResults(timeout: number = 10000) {
    // Wait for loading to disappear
    await this.page.waitForFunction(
      () => {
        const resultsList = document.querySelector('#resultsList');
        return resultsList && !resultsList.textContent?.includes('Loading...');
      },
      { timeout }
    );
  }

  /**
   * Get all result items
   */
  async getResultItems() {
    await this.waitForResults();
    return await this.page.locator('[data-testid^="result-item-"]').all();
  }

  /**
   * Get result item by context ID
   */
  async getResultItem(contextId: string) {
    return this.page.locator(`[data-testid="result-item-${contextId}"]`);
  }

  /**
   * Check if a result item exists
   */
  async hasResultItem(contextId: string): Promise<boolean> {
    const item = this.getResultItem(contextId);
    return await item.count() > 0;
  }

  /**
   * Get the number of result items
   */
  async getResultCount(): Promise<number> {
    const items = await this.getResultItems();
    return items.length;
  }

  /**
   * Wait for a specific result item to appear
   */
  async waitForResultItem(contextId: string, timeout: number = 10000) {
    const item = this.getResultItem(contextId);
    await item.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get result item details
   */
  async getResultItemDetails(contextId: string) {
    const item = this.getResultItem(contextId);
    await item.waitFor();
    
    const title = await item.locator('h4').textContent();
    const meta = await item.locator('.meta').textContent();
    const content = await item.locator('.content').textContent();
    
    return {
      title: title?.trim() || '',
      meta: meta?.trim() || '',
      content: content?.trim() || ''
    };
  }

  /**
   * Assert that the page is loaded correctly
   */
  async assertPageLoaded() {
    await expect(this.pageTitle).toHaveText('Model Context Protocol (MCP) Evaluation Platform');
    await expect(this.pageDescription).toContainText('Submit context for evaluation');
    await expect(this.submitButton).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
  }

  /**
   * Assert form validation error
   */
  async assertValidationError(expectedMessage: string) {
    await this.waitForStatus();
    await expect(this.submitStatus).toBeVisible();
    await expect(this.submitStatus).toHaveClass(/error/);
    await expect(this.submitStatus).toContainText(expectedMessage);
  }

  /**
   * Assert successful submission
   */
  async assertSubmissionSuccess(expectedContextId?: string) {
    await this.waitForStatus();
    await expect(this.submitStatus).toBeVisible();
    await expect(this.submitStatus).toHaveClass(/success/);
    await expect(this.submitStatus).toContainText('Context submitted successfully');
    
    if (expectedContextId) {
      await expect(this.submitStatus).toContainText(expectedContextId);
    }
  }

  /**
   * Assert that results are displayed
   */
  async assertResultsDisplayed(expectedCount?: number) {
    await this.waitForResults();
    
    if (expectedCount !== undefined) {
      const items = await this.getResultItems();
      expect(items.length).toBe(expectedCount);
    } else {
      const items = await this.getResultItems();
      expect(items.length).toBeGreaterThan(0);
    }
  }

  /**
   * Assert that no results are displayed
   */
  async assertNoResults() {
    await this.waitForResults();
    await expect(this.resultsList).toContainText('No submissions yet');
  }

  /**
   * Get form validation state
   */
  async getFormValidationState() {
    const contentValue = await this.contentTextarea.inputValue();
    const typeValue = await this.contentTypeSelect.inputValue();
    const metadataValue = await this.metadataTextarea.inputValue();
    
    return {
      content: contentValue,
      type: typeValue,
      metadata: metadataValue,
      isContentEmpty: contentValue.trim() === '',
      isSubmitEnabled: await this.submitButton.isEnabled()
    };
  }

  /**
   * Simulate typing with delay (for testing user interaction)
   */
  async typeSlowly(locator: Locator, text: string, delay: number = 100) {
    await locator.clear();
    for (const char of text) {
      await locator.type(char, { delay });
    }
  }

  /**
   * Take screenshot of the page
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }
}

