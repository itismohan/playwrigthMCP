const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.MOCK_SERVER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for demo purposes
let contexts = [];
let evaluations = [];
let nextId = 1;

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Submit context for evaluation
app.post('/api/context/submit', (req, res) => {
  const { content, type, metadata } = req.body;
  
  // Validation
  if (!content) {
    return res.status(400).json({
      error: 'Content is required',
      code: 'MISSING_CONTENT'
    });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({
      error: 'Content exceeds maximum length of 10000 characters',
      code: 'CONTENT_TOO_LONG'
    });
  }
  
  if (type && !['text', 'json', 'code'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid content type. Must be one of: text, json, code',
      code: 'INVALID_TYPE'
    });
  }
  
  // Create context entry
  const context = {
    id: `ctx-${nextId++}`,
    content,
    type: type || 'text',
    metadata: metadata || {},
    submittedAt: new Date().toISOString(),
    status: 'submitted'
  };
  
  contexts.push(context);
  
  // Simulate async evaluation process
  setTimeout(() => {
    const evaluation = {
      id: `eval-${nextId++}`,
      contextId: context.id,
      status: 'completed',
      results: {
        score: Math.random() * 100,
        confidence: Math.random(),
        tags: ['automated', 'test'],
        feedback: 'This is a mock evaluation result for testing purposes.'
      },
      evaluatedAt: new Date().toISOString()
    };
    
    evaluations.push(evaluation);
    context.status = 'evaluated';
    context.evaluationId = evaluation.id;
  }, 1000);
  
  res.status(201).json({
    message: 'Context submitted successfully',
    contextId: context.id,
    status: 'submitted'
  });
});

// Get context by ID
app.get('/api/context/:id', (req, res) => {
  const context = contexts.find(c => c.id === req.params.id);
  
  if (!context) {
    return res.status(404).json({
      error: 'Context not found',
      code: 'CONTEXT_NOT_FOUND'
    });
  }
  
  res.json(context);
});

// Get all contexts
app.get('/api/contexts', (req, res) => {
  const { status, type, limit = 50, offset = 0 } = req.query;
  
  let filteredContexts = contexts;
  
  if (status) {
    filteredContexts = filteredContexts.filter(c => c.status === status);
  }
  
  if (type) {
    filteredContexts = filteredContexts.filter(c => c.type === type);
  }
  
  const paginatedContexts = filteredContexts.slice(
    parseInt(offset), 
    parseInt(offset) + parseInt(limit)
  );
  
  res.json({
    contexts: paginatedContexts,
    total: filteredContexts.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// Get evaluation by ID
app.get('/api/evaluation/:id', (req, res) => {
  const evaluation = evaluations.find(e => e.id === req.params.id);
  
  if (!evaluation) {
    return res.status(404).json({
      error: 'Evaluation not found',
      code: 'EVALUATION_NOT_FOUND'
    });
  }
  
  res.json(evaluation);
});

// Get evaluation by context ID
app.get('/api/context/:contextId/evaluation', (req, res) => {
  const evaluation = evaluations.find(e => e.contextId === req.params.contextId);
  
  if (!evaluation) {
    return res.status(404).json({
      error: 'Evaluation not found for this context',
      code: 'EVALUATION_NOT_FOUND'
    });
  }
  
  res.json(evaluation);
});

// Get all evaluations
app.get('/api/evaluations', (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  let filteredEvaluations = evaluations;
  
  if (status) {
    filteredEvaluations = filteredEvaluations.filter(e => e.status === status);
  }
  
  const paginatedEvaluations = filteredEvaluations.slice(
    parseInt(offset), 
    parseInt(offset) + parseInt(limit)
  );
  
  res.json({
    evaluations: paginatedEvaluations,
    total: filteredEvaluations.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// Delete context (for testing cleanup)
app.delete('/api/context/:id', (req, res) => {
  const index = contexts.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      error: 'Context not found',
      code: 'CONTEXT_NOT_FOUND'
    });
  }
  
  const context = contexts[index];
  contexts.splice(index, 1);
  
  // Also remove associated evaluation
  const evalIndex = evaluations.findIndex(e => e.contextId === context.id);
  if (evalIndex !== -1) {
    evaluations.splice(evalIndex, 1);
  }
  
  res.json({
    message: 'Context deleted successfully',
    contextId: context.id
  });
});

// Reset all data (for testing)
app.post('/api/reset', (req, res) => {
  contexts = [];
  evaluations = [];
  nextId = 1;
  
  res.json({
    message: 'All data reset successfully'
  });
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock MCP Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api/health`);
});

