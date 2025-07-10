import * as fs from 'fs';
import * as path from 'path';
import { ContextSubmission } from './api-client';

export interface TestContext {
  id: string;
  content: string;
  type: 'text' | 'json' | 'code';
  metadata: Record<string, any>;
}

export interface InvalidTestContext extends TestContext {
  expectedError: string;
  generateOversized?: boolean;
}

export interface EdgeCaseContext extends TestContext {
  // Additional properties for edge cases
}

export interface PerformanceTestContext {
  id: string;
  size: number;
  type: 'text' | 'json' | 'code';
  metadata: Record<string, any>;
}

export interface TestFixtures {
  validContexts: TestContext[];
  invalidContexts: InvalidTestContext[];
  edgeCases: EdgeCaseContext[];
  performanceTests: PerformanceTestContext[];
}

export class FixtureLoader {
  private static fixtures: TestFixtures | null = null;
  private static fixturesPath = path.join(__dirname, '../tests/fixtures/test-contexts.json');

  /**
   * Load test fixtures from JSON file
   */
  static loadFixtures(): TestFixtures {
    if (this.fixtures) {
      return this.fixtures;
    }

    try {
      const fixturesData = fs.readFileSync(this.fixturesPath, 'utf-8');
      this.fixtures = JSON.parse(fixturesData);
      return this.fixtures!;
    } catch (error) {
      throw new Error(`Failed to load test fixtures: ${error}`);
    }
  }

  /**
   * Get all valid test contexts
   */
  static getValidContexts(): TestContext[] {
    const fixtures = this.loadFixtures();
    return fixtures.validContexts;
  }

  /**
   * Get valid context by ID
   */
  static getValidContext(id: string): TestContext | null {
    const contexts = this.getValidContexts();
    return contexts.find(context => context.id === id) || null;
  }

  /**
   * Get all invalid test contexts
   */
  static getInvalidContexts(): InvalidTestContext[] {
    const fixtures = this.loadFixtures();
    return fixtures.invalidContexts.map(context => {
      if (context.generateOversized) {
        // Generate oversized content
        return {
          ...context,
          content: 'A'.repeat(10001) // Exceeds 10000 character limit
        };
      }
      return context;
    });
  }

  /**
   * Get invalid context by ID
   */
  static getInvalidContext(id: string): InvalidTestContext | null {
    const contexts = this.getInvalidContexts();
    return contexts.find(context => context.id === id) || null;
  }

  /**
   * Get all edge case contexts
   */
  static getEdgeCases(): EdgeCaseContext[] {
    const fixtures = this.loadFixtures();
    return fixtures.edgeCases;
  }

  /**
   * Get edge case by ID
   */
  static getEdgeCase(id: string): EdgeCaseContext | null {
    const edgeCases = this.getEdgeCases();
    return edgeCases.find(context => context.id === id) || null;
  }

  /**
   * Get performance test contexts
   */
  static getPerformanceTests(): PerformanceTestContext[] {
    const fixtures = this.loadFixtures();
    return fixtures.performanceTests.map(test => ({
      ...test,
      content: 'A'.repeat(test.size) // Generate content of specified size
    }));
  }

  /**
   * Get performance test by ID
   */
  static getPerformanceTest(id: string): PerformanceTestContext | null {
    const tests = this.getPerformanceTests();
    return tests.find(test => test.id === id) || null;
  }

  /**
   * Convert test context to API submission format
   */
  static toSubmission(context: TestContext): ContextSubmission {
    return {
      content: context.content,
      type: context.type,
      metadata: context.metadata
    };
  }

  /**
   * Get contexts by category
   */
  static getContextsByCategory(category: string): TestContext[] {
    const allContexts = [
      ...this.getValidContexts(),
      ...this.getEdgeCases()
    ];
    
    return allContexts.filter(context => 
      context.metadata.category === category
    );
  }

  /**
   * Get contexts by tag
   */
  static getContextsByTag(tag: string): TestContext[] {
    const allContexts = [
      ...this.getValidContexts(),
      ...this.getEdgeCases()
    ];
    
    return allContexts.filter(context => 
      context.metadata.tags && context.metadata.tags.includes(tag)
    );
  }

  /**
   * Get contexts by type
   */
  static getContextsByType(type: 'text' | 'json' | 'code'): TestContext[] {
    const allContexts = [
      ...this.getValidContexts(),
      ...this.getEdgeCases()
    ];
    
    return allContexts.filter(context => context.type === type);
  }

  /**
   * Generate random context from fixtures
   */
  static getRandomValidContext(): TestContext {
    const contexts = this.getValidContexts();
    const randomIndex = Math.floor(Math.random() * contexts.length);
    return contexts[randomIndex];
  }

  /**
   * Generate random edge case
   */
  static getRandomEdgeCase(): EdgeCaseContext {
    const edgeCases = this.getEdgeCases();
    const randomIndex = Math.floor(Math.random() * edgeCases.length);
    return edgeCases[randomIndex];
  }

  /**
   * Get test data for specific test scenario
   */
  static getTestScenario(scenario: string): TestContext[] {
    switch (scenario) {
      case 'smoke':
        return [
          this.getValidContext('text-simple')!,
          this.getValidContext('json-simple')!
        ].filter(Boolean);
      
      case 'regression':
        return this.getValidContexts();
      
      case 'security':
        return this.getContextsByTag('security-test');
      
      case 'performance':
        return this.getPerformanceTests();
      
      case 'edge-cases':
        return this.getEdgeCases();
      
      default:
        return this.getValidContexts();
    }
  }

  /**
   * Validate fixture data integrity
   */
  static validateFixtures(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const fixtures = this.loadFixtures();
      
      // Check required sections exist
      if (!fixtures.validContexts) {
        errors.push('Missing validContexts section');
      }
      if (!fixtures.invalidContexts) {
        errors.push('Missing invalidContexts section');
      }
      if (!fixtures.edgeCases) {
        errors.push('Missing edgeCases section');
      }
      if (!fixtures.performanceTests) {
        errors.push('Missing performanceTests section');
      }
      
      // Validate valid contexts
      fixtures.validContexts?.forEach((context, index) => {
        if (!context.id) {
          errors.push(`Valid context ${index} missing id`);
        }
        if (!context.content) {
          errors.push(`Valid context ${index} missing content`);
        }
        if (!['text', 'json', 'code'].includes(context.type)) {
          errors.push(`Valid context ${index} has invalid type: ${context.type}`);
        }
      });
      
      // Validate invalid contexts
      fixtures.invalidContexts?.forEach((context, index) => {
        if (!context.expectedError) {
          errors.push(`Invalid context ${index} missing expectedError`);
        }
      });
      
      // Check for duplicate IDs
      const allIds = [
        ...fixtures.validContexts?.map(c => c.id) || [],
        ...fixtures.invalidContexts?.map(c => c.id) || [],
        ...fixtures.edgeCases?.map(c => c.id) || [],
        ...fixtures.performanceTests?.map(c => c.id) || []
      ];
      
      const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        errors.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
      }
      
    } catch (error) {
      errors.push(`Failed to validate fixtures: ${error}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get fixture statistics
   */
  static getFixtureStats(): {
    validContexts: number;
    invalidContexts: number;
    edgeCases: number;
    performanceTests: number;
    totalContexts: number;
    typeDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
  } {
    const fixtures = this.loadFixtures();
    const allContexts = [
      ...fixtures.validContexts,
      ...fixtures.edgeCases
    ];
    
    const typeDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};
    
    allContexts.forEach(context => {
      typeDistribution[context.type] = (typeDistribution[context.type] || 0) + 1;
      const category = context.metadata.category || 'unknown';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });
    
    return {
      validContexts: fixtures.validContexts.length,
      invalidContexts: fixtures.invalidContexts.length,
      edgeCases: fixtures.edgeCases.length,
      performanceTests: fixtures.performanceTests.length,
      totalContexts: allContexts.length,
      typeDistribution,
      categoryDistribution
    };
  }
}

