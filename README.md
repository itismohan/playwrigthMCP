# Playwright-MCP Testing Assistant

A full-stack MVP that integrates a ChatGPT-style chat interface with a backend Playwright-MCP server execution engine for natural language UI and API testing.

## 🚀 Features

### Natural Language Testing
- **UI Testing**: Test login forms, buttons, navigation, take screenshots
- **API Testing**: Check endpoints, verify responses, validate JSON
- **Mixed Testing**: End-to-end workflows combining UI and API tests

### ChatGPT-Style Interface
- Real-time chat interface for test requests
- Visual test result display with screenshots
- Status indicators and progress tracking
- Professional, responsive design

### MCP-Like Server
- Natural language prompt interpretation
- Playwright-powered test execution
- Real-time WebSocket communication
- Comprehensive error handling and logging

### 🆕 Enhanced Features
- **Playwright Script Generation**: See the actual Playwright code generated for each test
- **Syntax Highlighting**: Professional code display with color-coded syntax
- **Copy & Download**: Copy scripts to clipboard or download as .spec.js files
- **Improved Screenshots**: Full-page captures with better error handling
- **Enhanced UI**: Modern components with better user experience

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Flask Backend  │    │   Playwright    │
│                 │    │                 │    │                 │
│ • Chat Interface│◄──►│ • MCP Server    │◄──►│ • Browser Auto  │
│ • Test Results  │    │ • Test Executor │    │ • Screenshots   │
│ • WebSocket     │    │ • API Routes    │    │ • API Testing   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
playwright-mcp-mvp/
├── backend/                 # Flask backend application
│   ├── src/
│   │   ├── routes/         # API routes
│   │   │   ├── chat.py     # Chat and test execution endpoints
│   │   │   └── user.py     # User management (template)
│   │   ├── services/       # Core services
│   │   │   ├── mcp_server.py      # Natural language processing
│   │   │   ├── test_executor.py   # Playwright test execution
│   │   │   └── websocket_handler.py # Real-time communication
│   │   ├── models/         # Database models
│   │   ├── static/         # Frontend build files
│   │   └── main.py         # Flask application entry point
│   ├── venv/               # Python virtual environment
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatInterface.jsx    # Main chat interface
│   │   │   ├── TestResultViewer.jsx # Test results display
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── App.jsx         # Main App component
│   │   └── main.jsx        # React entry point
│   ├── dist/               # Built frontend files
│   └── package.json        # Node.js dependencies
└── architecture.md         # Detailed architecture documentation
```

## 🛠️ Technology Stack

### Backend
- **Flask**: Web framework
- **Playwright**: Browser automation and testing
- **Flask-SocketIO**: WebSocket support for real-time communication
- **Flask-CORS**: Cross-origin resource sharing
- **SQLite**: Database for test history

### Frontend
- **React**: UI framework
- **Tailwind CSS**: Styling framework
- **shadcn/ui**: UI component library
- **Lucide Icons**: Icon library
- **Socket.IO Client**: Real-time communication

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- pnpm (package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd playwright-mcp-mvp
   ```

2. **Backend Setup**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   playwright install  # Install browser binaries
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   pnpm install
   pnpm run build
   ```

4. **Copy Frontend to Backend**
   ```bash
   cp -r frontend/dist/* backend/src/static/
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   source venv/bin/activate
   python src/main.py
   ```

2. **Access the Application**
   Open your browser and navigate to `http://localhost:5000`

## 📖 Usage Examples

### UI Testing
```
"Test the login form on example.com"
"Take a screenshot of google.com homepage"
"Click the submit button on contact form"
"Verify that the page loads successfully"
```

### API Testing
```
"Check if the API endpoint /users returns valid JSON"
"Test the POST request to /api/login"
"Verify that /health endpoint returns 200 status"
```

### Mixed Testing
```
"Test the complete user registration workflow"
"Verify end-to-end checkout process"
```

## 🔧 API Endpoints

### REST API
- `POST /api/chat/message` - Send chat message and get response
- `POST /api/test/execute` - Execute test based on natural language prompt
- `GET /api/test/status/{test_id}` - Get test execution status
- `GET /api/test/results/{test_id}` - Get test results and logs
- `GET /health` - Health check endpoint

### WebSocket Events
- `connect` - Client connection established
- `join_test_room` - Join room for test execution updates
- `test_update` - Real-time test execution updates
- `test_complete` - Test completion notification

## 🧪 Test Results Format

```json
{
  "test_id": "uuid",
  "status": "completed|failed|timeout",
  "execution_time": 1.23,
  "results": {
    "success": true,
    "steps": [
      {
        "action": "navigate to https://example.com",
        "status": "success",
        "screenshot": "base64_encoded_image",
        "logs": ["Navigated to https://example.com"]
      }
    ]
  }
}
```

## 🎯 Key Features Demonstrated

### Natural Language Processing
- Interprets user intents from natural language
- Identifies test types (UI, API, mixed)
- Extracts URLs, actions, and parameters
- Maps to executable test steps

### Playwright Integration
- Multi-browser support (Chromium, Firefox, WebKit)
- Screenshot capture
- Element interaction (click, type, verify)
- Network request interception
- Error handling and reporting

### Real-time Communication
- WebSocket-based live updates
- Test execution progress tracking
- Immediate error reporting
- Status indicators in UI

### Professional UI/UX
- ChatGPT-style conversation interface
- Expandable test result cards
- Screenshot display
- Status badges and progress indicators
- Responsive design for mobile and desktop

## 🔒 Security Considerations

- CORS enabled for development (configure for production)
- Input validation for test prompts
- Sandboxed test execution environment
- No sensitive data exposure in logs

## 🚀 Deployment

The application is designed for easy deployment:

1. **Backend**: Flask application with all dependencies in requirements.txt
2. **Frontend**: Built static files served by Flask
3. **Database**: SQLite for simplicity (can be upgraded to PostgreSQL)
4. **Browsers**: Playwright handles browser installation and management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Playwright** for powerful browser automation
- **Flask** for the robust web framework
- **React** and **Tailwind CSS** for the modern frontend
- **shadcn/ui** for beautiful UI components

