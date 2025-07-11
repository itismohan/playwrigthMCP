from flask import Blueprint, request, jsonify
from flask_socketio import emit
import uuid
import json
from datetime import datetime
from src.services.mcp_server import MCPServer
from src.services.enhanced_test_executor import EnhancedTestExecutor
chat_bp = Blueprint('chat', __name__)
mcp_server = MCPServer()
test_executor = EnhancedTestExecutor()

@chat_bp.route('/chat/message', methods=['POST'])
def handle_chat_message():
    """Handle incoming chat messages and process test requests"""
    try:
        data = request.get_json()
        user_message = data.get('content', '')
        
        # Create message ID
        message_id = str(uuid.uuid4())
        
        # Process the message through MCP server
        response = mcp_server.process_message(user_message)
        
        # If it's a test request, execute it
        if response.get('is_test_request'):
            test_id = str(uuid.uuid4())
            test_request = {
                'test_id': test_id,
                'prompt': user_message,
                'test_type': response.get('test_type', 'ui'),
                'target_url': response.get('target_url'),
                'options': response.get('options', {})
            }
            
            # Start test execution asynchronously
            test_executor.execute_test_async(test_request)
            
            return jsonify({
                'id': message_id,
                'type': 'assistant',
                'content': f"I'll help you test that. Starting test execution...",
                'timestamp': datetime.utcnow().isoformat(),
                'metadata': {
                    'test_id': test_id,
                    'status': 'pending'
                }
            })
        else:
            return jsonify({
                'id': message_id,
                'type': 'assistant',
                'content': response.get('content', 'I understand. How can I help you with testing?'),
                'timestamp': datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': 'error'
        }), 500

@chat_bp.route('/test/execute', methods=['POST'])
def execute_test():
    """Execute a test based on natural language prompt"""
    try:
        data = request.get_json()
        test_id = str(uuid.uuid4())
        
        test_request = {
            'test_id': test_id,
            'prompt': data.get('prompt'),
            'test_type': data.get('test_type', 'ui'),
            'target_url': data.get('target_url'),
            'options': data.get('options', {})
        }
        
        # Execute test synchronously for direct API calls
        import asyncio
        result = asyncio.run(test_executor.execute_test(test_request))
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'test_id': test_id,
            'status': 'failed'
        }), 500

@chat_bp.route('/test/status/<test_id>', methods=['GET'])
def get_test_status(test_id):
    """Get test execution status"""
    try:
        status = test_executor.get_test_status(test_id)
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/test/results/<test_id>', methods=['GET'])
def get_test_results(test_id):
    """Get test results and logs"""
    try:
        results = test_executor.get_test_results(test_id)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

