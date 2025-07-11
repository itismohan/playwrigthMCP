from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
import json
from datetime import datetime

class WebSocketHandler:
    """Handle WebSocket connections for real-time communication"""
    
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            print(f"Client connected: {request.sid}")
            emit('connected', {'message': 'Connected to Playwright-MCP server'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            print(f"Client disconnected: {request.sid}")
        
        @self.socketio.on('join_test_room')
        def handle_join_test_room(data):
            """Join a room for test execution updates"""
            test_id = data.get('test_id')
            if test_id:
                join_room(f"test_{test_id}")
                emit('joined_room', {'test_id': test_id})
        
        @self.socketio.on('leave_test_room')
        def handle_leave_test_room(data):
            """Leave a test execution room"""
            test_id = data.get('test_id')
            if test_id:
                leave_room(f"test_{test_id}")
                emit('left_room', {'test_id': test_id})
        
        @self.socketio.on('chat_message')
        def handle_chat_message(data):
            """Handle chat messages via WebSocket"""
            message = data.get('message', '')
            timestamp = datetime.utcnow().isoformat()
            
            # Echo the message back (in a real implementation, this would process through MCP)
            emit('chat_response', {
                'type': 'assistant',
                'content': f"Received: {message}",
                'timestamp': timestamp
            })
    
    def send_test_update(self, test_id: str, update: dict):
        """Send test execution update to clients in the test room"""
        self.socketio.emit('test_update', update, room=f"test_{test_id}")
    
    def send_test_complete(self, test_id: str, results: dict):
        """Send test completion notification"""
        self.socketio.emit('test_complete', results, room=f"test_{test_id}")
    
    def send_test_error(self, test_id: str, error: str):
        """Send test error notification"""
        self.socketio.emit('test_error', {
            'test_id': test_id,
            'error': error,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f"test_{test_id}")

