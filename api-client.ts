import { APIRequestContext, expect } from '@playwright/test';

export interface ContextSubmission {
  content: string;
  type?: 'text' | 'json' | 'code';
  metadata?: Record<string, any>;
}

export interface Context {
  id: string;
  content: string;
  type: string;
  metadata: Record<string, any>;
  submittedAt: string;
  status: 'submitted' | 'evaluated';
  evaluationId?: string;
}

export interface Evaluation {
  id: string;
  contextId: string;
  status: 'completed' | 'failed' | 'pending';
  results: {
    score: number;
    confidence: number;
    tags: string[];
    feedback: string;
  };
  evaluatedAt: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export class MCPApiClient {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL: string = process.env.API_BASE_URL || 'http://localhost:3000/api') {
    this.request = request;
    this.baseURL = baseURL;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.request.get(`${this.baseURL}/health`);
    return {
      data: await response.json(),
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Submit context for evaluation
   */
  async submitContext(submission: ContextSubmission): Promise<ApiResponse> {
    const response = await this.request.post(`${this.baseURL}/context/submit`, {
      data: submission
    });
    
    const responseData = await response.json();
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Get context by ID
   */
  async getContext(contextId: string): Promise<ApiResponse<Context>> {
    const response = await this.request.get(`${this.baseURL}/context/${contextId}`);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Get all contexts with optional filtering
   */
  async getContexts(params?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${this.baseURL}/contexts${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await this.request.get(url);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Get evaluation by ID
   */
  async getEvaluation(evaluationId: string): Promise<ApiResponse<Evaluation>> {
    const response = await this.request.get(`${this.baseURL}/evaluation/${evaluationId}`);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Get evaluation by context ID
   */
  async getEvaluationByContext(contextId: string): Promise<ApiResponse<Evaluation>> {
    const response = await this.request.get(`${this.baseURL}/context/${contextId}/evaluation`);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Get all evaluations with optional filtering
   */
  async getEvaluations(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${this.baseURL}/evaluations${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await this.request.get(url);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Delete context by ID (for testing cleanup)
   */
  async deleteContext(contextId: string): Promise<ApiResponse> {
    const response = await this.request.delete(`${this.baseURL}/context/${contextId}`);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Reset all data (for testing)
   */
  async resetData(): Promise<ApiResponse> {
    const response = await this.request.post(`${this.baseURL}/reset`);
    const responseData = await response.json();
    
    return {
      data: responseData,
      ...this.getResponseMetadata(response)
    };
  }

  /**
   * Wait for context to be evaluated
   */
  async waitForEvaluation(contextId: string, timeoutMs: number = 10000): Promise<Evaluation | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.getEvaluationByContext(contextId);
        if (response.data && response.data.status === 'completed') {
          return response.data;
        }
      } catch (error) {
        // Evaluation not ready yet, continue waiting
      }
      
      // Wait 500ms before next check
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  }

  /**
   * Helper method to extract response metadata
   */
  private getResponseMetadata(response: any) {
    return {
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers()
    };
  }

  /**
   * Assert successful response
   */
  async assertSuccess(response: ApiResponse, expectedStatus: number = 200): Promise<void> {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toBeDefined();
  }

  /**
   * Assert error response
   */
  async assertError(response: ApiResponse, expectedStatus: number, expectedErrorCode?: string): Promise<void> {
    expect(response.status).toBe(expectedStatus);
    expect(response.data?.error).toBeDefined();
    
    if (expectedErrorCode) {
      expect(response.data?.code).toBe(expectedErrorCode);
    }
  }
}

