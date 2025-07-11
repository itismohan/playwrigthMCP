import asyncio
import base64
import json
import time
import threading
from typing import Dict, Any, List
from datetime import datetime
from playwright.async_api import async_playwright, Browser, Page
import requests

class TestExecutor:
    """Executes UI and API tests using Playwright"""
    
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
                'execution_time': 0
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
                }
            }
    
    async def _execute_ui_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute UI test using Playwright"""
        steps = []
        
        async with async_playwright() as p:
            # Launch browser
            browser_type = test_request.get('options', {}).get('browser', 'chromium')
            headless = test_request.get('options', {}).get('headless', True)
            
            if browser_type == 'firefox':
                browser = await p.firefox.launch(headless=headless)
            elif browser_type == 'webkit':
                browser = await p.webkit.launch(headless=headless)
            else:
                browser = await p.chromium.launch(headless=headless)
            
            page = await browser.new_page()
            
            try:
                # Parse actions from prompt or use default actions
                actions = self._parse_actions_from_prompt(test_request['prompt'])
                
                for action in actions:
                    step_result = await self._execute_action(page, action)
                    steps.append(step_result)
                    
                    if not step_result['status'] == 'success':
                        break
                
                # Take final screenshot
                screenshot = await page.screenshot()
                screenshot_b64 = base64.b64encode(screenshot).decode()
                
                steps.append({
                    'action': 'final_screenshot',
                    'status': 'success',
                    'screenshot': screenshot_b64,
                    'logs': ['Final screenshot captured']
                })
                
            finally:
                await browser.close()
        
        success = all(step['status'] == 'success' for step in steps)
        
        return {
            'status': 'completed' if success else 'failed',
            'results': {
                'success': success,
                'steps': steps
            }
        }
    
    async def _execute_api_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute API test"""
        steps = []
        
        try:
            # Parse API details from prompt
            api_details = self._parse_api_from_prompt(test_request['prompt'])
            
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
            except:
                step_result['logs'].append(f"Text Response: {response.text[:500]}...")
            
            steps.append(step_result)
            
        except Exception as e:
            steps.append({
                'action': 'api_request',
                'status': 'failed',
                'logs': [f"Error: {str(e)}"]
            })
        
        success = all(step['status'] == 'success' for step in steps)
        
        return {
            'status': 'completed' if success else 'failed',
            'results': {
                'success': success,
                'steps': steps
            }
        }
    
    async def _execute_mixed_test(self, test_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute mixed UI and API test"""
        # For now, execute as UI test with API validation
        return await self._execute_ui_test(test_request)
    
    async def _execute_action(self, page: Page, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single action on the page"""
        action_type = action['type']
        logs = []
        
        try:
            if action_type == 'navigate':
                url = action['url']
                await page.goto(url, wait_until='networkidle')
                logs.append(f"Navigated to {url}")
                
                # Take screenshot after navigation
                screenshot = await page.screenshot()
                screenshot_b64 = base64.b64encode(screenshot).decode()
                
                return {
                    'action': f"navigate to {url}",
                    'status': 'success',
                    'screenshot': screenshot_b64,
                    'logs': logs
                }
            
            elif action_type == 'click':
                target = action.get('target', 'button')
                
                # Try different selectors for the target
                selectors = self._get_selectors_for_target(target)
                
                clicked = False
                for selector in selectors:
                    try:
                        await page.click(selector, timeout=5000)
                        logs.append(f"Clicked {target} using selector: {selector}")
                        clicked = True
                        break
                    except:
                        continue
                
                if not clicked:
                    logs.append(f"Could not find {target} to click")
                    return {
                        'action': f"click {target}",
                        'status': 'failed',
                        'logs': logs
                    }
                
                # Wait for potential navigation or changes
                await page.wait_for_timeout(1000)
                
                # Take screenshot after click
                screenshot = await page.screenshot()
                screenshot_b64 = base64.b64encode(screenshot).decode()
                
                return {
                    'action': f"click {target}",
                    'status': 'success',
                    'screenshot': screenshot_b64,
                    'logs': logs
                }
            
            elif action_type == 'type':
                text = action.get('text', 'test input')
                
                # Find input field
                input_selectors = ['input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'textarea']
                
                typed = False
                for selector in input_selectors:
                    try:
                        await page.fill(selector, text)
                        logs.append(f"Typed '{text}' into {selector}")
                        typed = True
                        break
                    except:
                        continue
                
                if not typed:
                    logs.append(f"Could not find input field to type into")
                    return {
                        'action': f"type '{text}'",
                        'status': 'failed',
                        'logs': logs
                    }
                
                return {
                    'action': f"type '{text}'",
                    'status': 'success',
                    'logs': logs
                }
            
            elif action_type == 'verify':
                condition = action.get('condition', 'page_loaded')
                
                if condition == 'page_loaded':
                    title = await page.title()
                    logs.append(f"Page loaded with title: {title}")
                elif condition == 'element_present':
                    # Check for common success indicators
                    success_selectors = ['.success', '.alert-success', '[data-testid="success"]']
                    found = False
                    for selector in success_selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=2000)
                            logs.append(f"Found success element: {selector}")
                            found = True
                            break
                        except:
                            continue
                    
                    if not found:
                        logs.append("No success elements found")
                
                return {
                    'action': f"verify {condition}",
                    'status': 'success',
                    'logs': logs
                }
            
            elif action_type == 'screenshot':
                screenshot = await page.screenshot()
                screenshot_b64 = base64.b64encode(screenshot).decode()
                logs.append("Screenshot captured")
                
                return {
                    'action': 'screenshot',
                    'status': 'success',
                    'screenshot': screenshot_b64,
                    'logs': logs
                }
            
            else:
                return {
                    'action': f"unknown action: {action_type}",
                    'status': 'failed',
                    'logs': [f"Unknown action type: {action_type}"]
                }
                
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
            # Look for domain names
            domain_pattern = r'(?:on|at|from)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
            domains = re.findall(domain_pattern, prompt)
            if domains:
                urls = [f"https://{domains[0]}"]
        
        # Navigate action
        if urls:
            actions.append({
                'type': 'navigate',
                'url': urls[0]
            })
        
        # Click actions
        if any(word in prompt_lower for word in ['click', 'press', 'tap']):
            if 'login' in prompt_lower:
                actions.append({'type': 'click', 'target': 'login'})
            elif 'submit' in prompt_lower:
                actions.append({'type': 'click', 'target': 'submit'})
            elif 'button' in prompt_lower:
                actions.append({'type': 'click', 'target': 'button'})
        
        # Type actions
        if any(word in prompt_lower for word in ['type', 'enter', 'fill']):
            actions.append({'type': 'type', 'text': 'test@example.com'})
        
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
    
    def _get_selectors_for_target(self, target: str) -> List[str]:
        """Get CSS selectors for a target element"""
        selectors = []
        
        if target == 'login':
            selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Login")',
                'button:has-text("Sign In")',
                '.login-button',
                '#login-button'
            ]
        elif target == 'submit':
            selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                '.submit-button'
            ]
        elif target == 'button':
            selectors = [
                'button',
                'input[type="button"]',
                'input[type="submit"]',
                '.btn'
            ]
        else:
            selectors = [f'button:has-text("{target}")', f'.{target}', f'#{target}']
        
        return selectors
    
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

