import re
import json
from typing import Dict, Any, List
from urllib.parse import urlparse

class MCPServer:
    """Model Context Protocol-like server for interpreting natural language test prompts"""
    
    def __init__(self):
        self.test_patterns = {
            'ui_test': [
                r'test.*login',
                r'check.*form',
                r'verify.*button',
                r'click.*element',
                r'navigate.*to',
                r'screenshot',
                r'test.*ui',
                r'check.*page',
                r'verify.*element'
            ],
            'api_test': [
                r'test.*api',
                r'check.*endpoint',
                r'verify.*response',
                r'test.*request',
                r'api.*call',
                r'http.*request',
                r'rest.*api',
                r'json.*response'
            ],
            'mixed_test': [
                r'test.*workflow',
                r'end.*to.*end',
                r'integration.*test',
                r'full.*test'
            ]
        }
        
        self.action_patterns = {
            'navigate': [r'go to', r'navigate to', r'visit', r'open'],
            'click': [r'click', r'press', r'tap'],
            'type': [r'type', r'enter', r'input', r'fill'],
            'verify': [r'verify', r'check', r'validate', r'ensure'],
            'screenshot': [r'screenshot', r'capture', r'image'],
            'wait': [r'wait', r'pause', r'delay']
        }
    
    def process_message(self, message: str) -> Dict[str, Any]:
        """Process a natural language message and determine if it's a test request"""
        message_lower = message.lower()
        
        # Check if this is a test request
        is_test_request = self._is_test_request(message_lower)
        
        if not is_test_request:
            return {
                'is_test_request': False,
                'content': self._generate_conversational_response(message)
            }
        
        # Parse test details
        test_type = self._determine_test_type(message_lower)
        target_url = self._extract_url(message)
        actions = self._parse_actions(message_lower)
        
        return {
            'is_test_request': True,
            'test_type': test_type,
            'target_url': target_url,
            'actions': actions,
            'options': {
                'browser': 'chromium',
                'headless': True,
                'timeout': 30000
            }
        }
    
    def _is_test_request(self, message: str) -> bool:
        """Determine if the message is requesting a test"""
        test_keywords = [
            'test', 'check', 'verify', 'validate', 'ensure',
            'screenshot', 'click', 'navigate', 'api', 'endpoint'
        ]
        
        return any(keyword in message for keyword in test_keywords)
    
    def _determine_test_type(self, message: str) -> str:
        """Determine the type of test based on the message"""
        for test_type, patterns in self.test_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message):
                    return test_type.replace('_test', '')
        
        # Default to UI test if unclear
        return 'ui'
    
    def _extract_url(self, message: str) -> str:
        """Extract URL from the message"""
        # Look for URLs in the message
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, message)
        
        if urls:
            return urls[0]
        
        # Look for domain names
        domain_pattern = r'(?:on|at|from)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
        domains = re.findall(domain_pattern, message)
        
        if domains:
            return f"https://{domains[0]}"
        
        return None
    
    def _parse_actions(self, message: str) -> List[Dict[str, Any]]:
        """Parse actions from the natural language message"""
        actions = []
        
        # Navigate action
        if any(pattern in message for pattern in self.action_patterns['navigate']):
            url = self._extract_url(message)
            if url:
                actions.append({
                    'type': 'navigate',
                    'url': url
                })
        
        # Click action
        if any(pattern in message for pattern in self.action_patterns['click']):
            # Try to extract what to click
            click_targets = self._extract_click_targets(message)
            for target in click_targets:
                actions.append({
                    'type': 'click',
                    'target': target
                })
        
        # Type action
        if any(pattern in message for pattern in self.action_patterns['type']):
            actions.append({
                'type': 'type',
                'text': self._extract_text_to_type(message)
            })
        
        # Verify action
        if any(pattern in message for pattern in self.action_patterns['verify']):
            actions.append({
                'type': 'verify',
                'condition': self._extract_verification_condition(message)
            })
        
        # Screenshot action
        if any(pattern in message for pattern in self.action_patterns['screenshot']):
            actions.append({
                'type': 'screenshot'
            })
        
        return actions
    
    def _extract_click_targets(self, message: str) -> List[str]:
        """Extract what elements to click from the message"""
        targets = []
        
        # Common UI elements
        ui_elements = [
            'button', 'link', 'menu', 'tab', 'checkbox', 'radio',
            'submit', 'login', 'signup', 'search', 'close', 'cancel'
        ]
        
        for element in ui_elements:
            if element in message:
                targets.append(element)
        
        return targets if targets else ['button']  # Default to button
    
    def _extract_text_to_type(self, message: str) -> str:
        """Extract text to type from the message"""
        # Look for quoted text
        quoted_text = re.findall(r'"([^"]*)"', message)
        if quoted_text:
            return quoted_text[0]
        
        # Look for common form data
        if 'username' in message or 'email' in message:
            return 'test@example.com'
        if 'password' in message:
            return 'testpassword123'
        
        return 'test input'
    
    def _extract_verification_condition(self, message: str) -> str:
        """Extract what to verify from the message"""
        if 'success' in message:
            return 'success_message'
        if 'error' in message:
            return 'error_message'
        if 'redirect' in message:
            return 'page_redirect'
        if 'element' in message:
            return 'element_present'
        
        return 'page_loaded'
    
    def _generate_conversational_response(self, message: str) -> str:
        """Generate a conversational response for non-test messages"""
        greetings = ['hello', 'hi', 'hey']
        if any(greeting in message.lower() for greeting in greetings):
            return "Hello! I'm here to help you with UI and API testing. You can ask me to test websites, check forms, verify APIs, or take screenshots. What would you like to test?"
        
        help_keywords = ['help', 'what can you do', 'how']
        if any(keyword in message.lower() for keyword in help_keywords):
            return """I can help you with various types of testing:

🔍 **UI Testing**: Test login forms, buttons, navigation, take screenshots
🌐 **API Testing**: Check endpoints, verify responses, validate JSON
🔄 **Mixed Testing**: End-to-end workflows combining UI and API tests

Just describe what you want to test in natural language! For example:
- "Test the login form on example.com"
- "Check if the API endpoint /users returns valid JSON"
- "Take a screenshot of the homepage"
"""
        
        return "I understand. I'm here to help you with testing. What would you like me to test for you?"

