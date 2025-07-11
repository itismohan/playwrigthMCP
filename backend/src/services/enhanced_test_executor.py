import asyncio
import base64
import json
import time
import threading
from typing import Dict, Any, List
from datetime import datetime
from playwright.async_api import async_playwright, Browser, Page
import requests

class EnhancedTestExecutor:
    """Enhanced test executor with Playwright script generation and better screenshot handling"""
    
    def __init__(self):
        self.test_results = {}
        self.test_status = {}
        self.running_tests = {}
    
    def execute_test_async(self, test_request: Dict[str, Any]):
        """Execute test asynchronously"""
        test_id = test_request['test_id']
        self.test_status[test_id] = 'running'
        
        # Run test in a separate thread
        thread = threading.Thread(
            target=self._run_async_test,
            args=(test_request,)
        )
        thread.start()
        self.running_tests[test_id] = thread
    
    def execute_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute test synchronously"""
        return asyncio.run(self._execute_test_async(test_request))
    
    def _run_async_test(self, test_request: Dict[str, Any]):
        """Run test in async context"""
        try:
            result = asyncio.run(self._execute_test_async(test_request))
            test_id = test_request['test_id']
            self.test_results[test_id] = result
            self.test_status[test_id] = result['status']
        except Exception as e:
            test_id = test_request['test_id']
            self.test_results[test_id] = {
                'test_id': test_id,
                'status': 'failed',
                'error': str(e),
                'execution_time': 0,
                'generated_script': self._generate_error_script(test_request, str(e))
            }
            self.test_status[test_id] = 'failed'
    
    async def _execute_test_async(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the actual test"""
        test_id = test_request['test_id']
        test_type = test_request.get('test_type', 'ui')
        start_time = time.time()
        
        try:
            if test_type == 'api':
                result = await self._execute_api_test(test_request)
            elif test_type == 'ui':
                result = await self._execute_ui_test(test_request)
            elif test_type == 'mixed':
                result = await self._execute_mixed_test(test_request)
            else:
                result = await self._execute_ui_test(test_request)  # Default to UI
            
            execution_time = time.time() - start_time
            result['execution_time'] = execution_time
            result['test_id'] = test_id
            
            return result
            
        except Exception as e:
            return {
                'test_id': test_id,
                'status': 'failed',
                'error': str(e),
                'execution_time': time.time() - start_time,
                'results': {
                    'success': False,
                    'steps': []
                },
                'generated_script': self._generate_error_script(test_request, str(e))
            }
    
    async def _execute_ui_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute UI test using Playwright with enhanced screenshot handling"""
        steps = []
        script_lines = []
        
        # Generate script header
        script_lines.extend([
            "import { test, expect } from '@playwright/test';",
            "",
            "test('Generated UI Test', async ({ page }) => {"
        ])
        
        async with async_playwright() as p:
            # Launch browser with better settings
            browser_type = test_request.get('options', {}).get('browser', 'chromium')
            headless = test_request.get('options', {}).get('headless', True)
            
            if browser_type == 'firefox':
                browser = await p.firefox.launch(headless=headless)
            elif browser_type == 'webkit':
                browser = await p.webkit.launch(headless=headless)
            else:
                browser = await p.chromium.launch(headless=headless)
            
            # Create context with better settings for screenshots
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            page = await context.new_page()
            
            try:
                # Parse actions from prompt
                actions = self._parse_actions_from_prompt(test_request['prompt'])
                
                for action in actions:
                    step_result = await self._execute_action(page, action, script_lines)
                    steps.append(step_result)
                    
                    if not step_result['status'] == 'success':
                        break
                
                # Take final screenshot
                try:
                    screenshot = await page.screenshot(full_page=True)
                    screenshot_b64 = base64.b64encode(screenshot).decode()
                    
                    steps.append({
                        'action': 'final_screenshot',
                        'status': 'success',
                        'screenshot': screenshot_b64,
                        'logs': ['Final screenshot captured']
                    })
                    
                    script_lines.append("  // Take final screenshot")
                    script_lines.append("  await page.screenshot({ path: 'final-screenshot.png', fullPage: true });")
                    
                except Exception as e:
                    steps.append({
                        'action': 'final_screenshot',
                        'status': 'failed',
                        'logs': [f'Failed to capture final screenshot: {str(e)}']
                    })
                
            finally:
                await context.close()
                await browser.close()
        
        # Close script
        script_lines.append("});")
        
        success = all(step['status'] == 'success' for step in steps)
        
        return {
            'status': 'completed' if success else 'failed',
            'results': {
                'success': success,
                'steps': steps
            },
            'generated_script': '\n'.join(script_lines)
        }
    
    async def _execute_api_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute API test with script generation"""
        steps = []
        script_lines = []
        
        # Generate script header for API test
        script_lines.extend([
            "import { test, expect } from '@playwright/test';",
            "",
            "test('Generated API Test', async ({ request }) => {"
        ])
        
        try:
            # Parse API details from prompt
            api_details = self._parse_api_from_prompt(test_request['prompt'])
            
            # Add script line for API request
            script_lines.append(f"  // Make {api_details['method']} request to {api_details['url']}")
            script_lines.append(f"  const response = await request.{api_details['method'].lower()}('{api_details['url']}');")
            script_lines.append("  expect(response.status()).toBeLessThan(400);")
            
            # Make API request
            response = requests.request(
                method=api_details['method'],
                url=api_details['url'],
                headers=api_details.get('headers', {}),
                json=api_details.get('data'),
                timeout=30
            )
            
            # Validate response
            step_result = {
                'action': f"{api_details['method']} {api_details['url']}",
                'status': 'success' if response.status_code < 400 else 'failed',
                'logs': [
                    f"Status Code: {response.status_code}",
                    f"Response Time: {response.elapsed.total_seconds():.2f}s",
                    f"Content Type: {response.headers.get('content-type', 'unknown')}"
                ]
            }
            
            # Try to parse JSON response
            try:
                json_data = response.json()
                step_result['logs'].append(f"JSON Response: {json.dumps(json_data, indent=2)[:500]}...")
                script_lines.append("  const jsonData = await response.json();")
                script_lines.append("  expect(jsonData).toBeDefined();")
            except:
                step_result['logs'].append(f"Text Response: {response.text[:500]}...")
                script_lines.append("  const textData = await response.text();")
                script_lines.append("  expect(textData).toBeDefined();")
            
            steps.append(step_result)
            
        except Exception as e:
            steps.append({
                'action': 'api_request',
                'status': 'failed',
                'logs': [f"Error: {str(e)}"]
            })
            script_lines.append(f"  // Error occurred: {str(e)}")
        
        # Close script
        script_lines.append("});")
        
        success = all(step['status'] == 'success' for step in steps)
        
        return {
            'status': 'completed' if success else 'failed',
            'results': {
                'success': success,
                'steps': steps
            },
            'generated_script': '\n'.join(script_lines)
        }
    
    async def _execute_mixed_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute mixed UI and API test"""
        return await self._execute_ui_test(test_request)
    
    async def _execute_action(self, page: Page, action: Dict[str, Any], script_lines: List[str]) -> Dict[str, Any]:
        """Execute a single action on the page with script generation"""
        action_type = action['type']
        logs = []
        
        try:
            if action_type == 'navigate':
                url = action['url']
                script_lines.append(f"  // Navigate to {url}")
                script_lines.append(f"  await page.goto('{url}');")
                script_lines.append("  await page.waitForLoadState('networkidle');")
                
                await page.goto(url, wait_until='networkidle', timeout=30000)
                logs.append(f"Navigated to {url}")
                
                # Wait a bit more for dynamic content
                await page.wait_for_timeout(2000)
                
                # Take screenshot after navigation
                try:
                    screenshot = await page.screenshot(full_page=True)
                    screenshot_b64 = base64.b64encode(screenshot).decode()
                    logs.append("Screenshot captured successfully")
                except Exception as e:
                    screenshot_b64 = None
                    logs.append(f"Screenshot failed: {str(e)}")
                
                return {
                    'action': f"navigate to {url}",
                    'status': 'success',
                    'screenshot': screenshot_b64,
                    'logs': logs
                }
            
            elif action_type == 'screenshot':
                script_lines.append("  // Take screenshot")
                script_lines.append("  await page.screenshot({ path: 'screenshot.png', fullPage: true });")
                
                try:
                    screenshot = await page.screenshot(full_page=True)
                    screenshot_b64 = base64.b64encode(screenshot).decode()
                    logs.append("Screenshot captured")
                except Exception as e:
                    screenshot_b64 = None
                    logs.append(f"Screenshot failed: {str(e)}")
                
                return {
                    'action': 'screenshot',
                    'status': 'success' if screenshot_b64 else 'failed',
                    'screenshot': screenshot_b64,
                    'logs': logs
                }
            
            # Add other action types as needed...
            
        except Exception as e:
            return {
                'action': f"{action_type}",
                'status': 'failed',
                'logs': [f"Error executing {action_type}: {str(e)}"]
            }
    
    def _parse_actions_from_prompt(self, prompt: str) -> List[Dict[str, Any]]:
        """Parse actions from natural language prompt"""
        actions = []
        prompt_lower = prompt.lower()
        
        # Extract URL if present
        import re
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, prompt)
        
        if not urls:
            # Look for domain names with better regex
            domain_pattern = r'(?:on|at|from|of)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
            domains = re.findall(domain_pattern, prompt)
            if domains:
                urls = [f"https://{domains[0]}"]
        
        # Navigate action
        if urls:
            actions.append({
                'type': 'navigate',
                'url': urls[0]
            })
        
        # Screenshot action
        if 'screenshot' in prompt_lower:
            actions.append({'type': 'screenshot'})
        
        # Default action if no specific actions found
        if not actions and urls:
            actions.append({'type': 'screenshot'})
        
        return actions
    
    def _parse_api_from_prompt(self, prompt: str) -> Dict[str, Any]:
        """Parse API details from prompt"""
        import re
        
        # Extract URL
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, prompt)
        
        if not urls:
            # Look for endpoint patterns
            endpoint_pattern = r'/[a-zA-Z0-9/_-]+'
            endpoints = re.findall(endpoint_pattern, prompt)
            if endpoints:
                urls = [f"https://api.example.com{endpoints[0]}"]
        
        # Determine HTTP method
        method = 'GET'
        if 'post' in prompt.lower():
            method = 'POST'
        elif 'put' in prompt.lower():
            method = 'PUT'
        elif 'delete' in prompt.lower():
            method = 'DELETE'
        
        return {
            'method': method,
            'url': urls[0] if urls else 'https://api.example.com/test',
            'headers': {'Content-Type': 'application/json'},
            'data': None
        }
    
    def _generate_error_script(self, test_request: Dict[str, Any], error: str) -> str:
        """Generate a script for failed tests"""
        test_type = test_request.get('test_type', 'ui')
        
        if test_type == 'api':
            return f"""import {{ test, expect }} from '@playwright/test';

test('Failed API Test', async ({{ request }}) => {{
  // This test failed with error: {error}
  // Original prompt: {test_request.get('prompt', 'Unknown')}
  
  // TODO: Fix the error and retry
}});"""
        else:
            return f"""import {{ test, expect }} from '@playwright/test';

test('Failed UI Test', async ({{ page }}) => {{
  // This test failed with error: {error}
  // Original prompt: {test_request.get('prompt', 'Unknown')}
  
  // TODO: Fix the error and retry
}});"""
    
    def get_test_status(self, test_id: str) -> Dict[str, Any]:
        """Get test status"""
        return {
            'test_id': test_id,
            'status': self.test_status.get(test_id, 'not_found')
        }
    
    def get_test_results(self, test_id: str) -> Dict[str, Any]:
        """Get test results"""
        return self.test_results.get(test_id, {
            'test_id': test_id,
            'status': 'not_found',
            'error': 'Test results not found'
        })

