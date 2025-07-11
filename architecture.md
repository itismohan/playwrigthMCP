# Playwright-MCP MVP Architecture

## Overview
This MVP integrates a ChatGPT-style frontend with a Playwright-powered backend that executes UI and API tests based on natural language prompts through an MCP-like interface.

## Architecture Components

### Frontend (React)
- **Chat Interface**: ChatGPT-style conversation UI
- **Message Display**: Shows user prompts and system responses
- **Test Results Viewer**: Displays test execution results, logs, and status
- **Real-time Updates**: WebSocket connection for live test execution feedback

### Backend (Flask + Playwright)
- **MCP Server**: Model Context Protocol-like interface for test execution
- **Natural Language Parser**: Interprets user prompts into test actions
- **Playwright Engine**: Executes UI and API tests
- **WebSocket Handler**: Real-time communication with frontend
- **Test Result Manager**: Formats and returns test results

## API Endpoints

### REST Endpoints
- `POST /api/chat/message` - Send chat message and get response
- `POST /api/test/execute` - Execute test based on natural language prompt
- `GET /api/test/status/{test_id}` - Get test execution status
- `GET /api/test/results/{test_id}` - Get test results and logs

### WebSocket Endpoints
- `/ws/test-execution` - Real-time test execution updates
- `/ws/chat` - Real-time chat communication

## Data Structures

### Chat Message
```json
{
  "id": "string",
  "type": "user|assistant|system",
  "content": "string",
  "timestamp": "ISO8601",
  "metadata": {
    "test_id": "string",
    "status": "pending|running|completed|failed"
  }
}
```

### Test Execution Request
```json
{
  "prompt": "string",
  "test_type": "ui|api|mixed",
  "target_url": "string",
  "options": {
    "browser": "chromium|firefox|webkit",
    "headless": true,
    "timeout": 30000
  }
}
```

### Test Result
```json
{
  "test_id": "string",
  "status": "completed|failed|timeout",
  "execution_time": "number",
  "results": {
    "success": "boolean",
    "steps": [
      {
        "action": "string",
        "status": "success|failed",
        "screenshot": "base64_string",
        "logs": ["string"]
      }
    ]
  },
  "error": "string"
}
```

## MCP-like Interface Design

### Natural Language Processing
The system will interpret prompts like:
- "Test login functionality on example.com"
- "Check if the API endpoint /users returns valid JSON"
- "Verify that the contact form submits successfully"
- "Take a screenshot of the homepage and check for broken images"

### Test Action Mapping
- **UI Tests**: Navigate, click, type, verify elements, take screenshots
- **API Tests**: HTTP requests, response validation, status code checks
- **Mixed Tests**: Combine UI and API testing in workflows

## Technology Stack

### Backend
- Flask (Web framework)
- Playwright (Browser automation)
- Flask-SocketIO (WebSocket support)
- SQLite (Test history storage)

### Frontend
- React (UI framework)
- Tailwind CSS (Styling)
- Socket.IO Client (Real-time communication)
- Lucide Icons (UI icons)

## Implementation Phases
1. ✅ Project setup and architecture planning
2. Backend development with Playwright-MCP server
3. Frontend chat interface development
4. Integration and testing
5. Deployment and delivery

