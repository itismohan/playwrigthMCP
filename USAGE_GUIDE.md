# Playwright-MCP Testing Assistant - Usage Guide

## 🎯 Quick Start

1. Open the application in your browser
2. Type your testing request in natural language
3. Watch as the AI interprets and executes your tests
4. View detailed results with screenshots and logs

## 📝 Natural Language Examples

### UI Testing Examples

#### Basic Navigation and Screenshots
```
"Take a screenshot of google.com homepage"
"Navigate to https://example.com and capture the page"
"Go to github.com and take a screenshot"
```

#### Form Testing
```
"Test the login form on example.com"
"Fill out the contact form on mywebsite.com"
"Click the submit button on the registration page"
"Type 'test@example.com' in the email field"
```

#### Element Verification
```
"Verify that the login button exists on the page"
"Check if the success message appears after form submission"
"Ensure the page loads successfully"
"Validate that all images are loaded properly"
```

#### Interactive Testing
```
"Click the menu button and take a screenshot"
"Navigate through the checkout process"
"Test the search functionality with keyword 'playwright'"
```

### API Testing Examples

#### Basic API Calls
```
"Check if the API endpoint /users returns valid JSON"
"Test the GET request to https://api.example.com/health"
"Verify that /api/status endpoint returns 200 status code"
```

#### Specific API Testing
```
"Test the POST request to /api/login with credentials"
"Check if the /api/products endpoint returns product data"
"Verify the response time of /api/search is under 2 seconds"
```

#### API Validation
```
"Ensure the /users endpoint returns an array of users"
"Validate that the API response contains required fields"
"Check if the authentication endpoint accepts valid tokens"
```

### Mixed Testing Examples

#### End-to-End Workflows
```
"Test the complete user registration workflow"
"Verify the entire e-commerce checkout process"
"Test login functionality and then check user dashboard"
```

#### Integration Testing
```
"Register a new user and verify API response"
"Submit contact form and check database entry"
"Test payment flow from UI to API confirmation"
```

## 🎨 Understanding the Interface

### Chat Interface Elements

1. **Header**: Shows the assistant name and description
2. **Message Area**: Displays conversation history
3. **Input Field**: Where you type your testing requests
4. **Send Button**: Submits your request
5. **Quick Actions**: Pre-defined test examples

### Message Types

- **User Messages**: Your testing requests (blue background)
- **Assistant Messages**: AI responses and confirmations (white background)
- **System Messages**: Status updates and errors (colored backgrounds)

### Status Indicators

- 🟡 **Pending**: Test is queued for execution
- 🔵 **Running**: Test is currently executing
- 🟢 **Completed**: Test finished successfully
- 🔴 **Failed**: Test encountered an error

## 📊 Test Results Breakdown

### Result Card Components

1. **Header**: Test status, execution time, and overall result
2. **Test Steps**: Expandable list of individual actions
3. **Screenshots**: Visual captures at each step
4. **Logs**: Detailed execution information
5. **Summary**: Final test outcome and duration

### Reading Test Steps

Each test step shows:
- **Action**: What was performed (e.g., "navigate to URL", "click button")
- **Status**: Success or failure indicator
- **Logs**: Detailed information about the action
- **Screenshot**: Visual proof of the action (when applicable)

### Screenshot Analysis

Screenshots help you:
- Verify the correct page was loaded
- See the state before and after actions
- Identify visual issues or layout problems
- Confirm successful interactions

## 🔧 Advanced Usage Tips

### Writing Effective Test Prompts

#### Be Specific
❌ "Test the website"
✅ "Test the login form on https://example.com"

#### Include URLs
❌ "Check the API"
✅ "Check if the API endpoint https://api.example.com/users returns valid JSON"

#### Specify Actions
❌ "Test the form"
✅ "Fill out the contact form with test data and submit it"

### Combining Multiple Actions

You can request complex workflows:
```
"Navigate to example.com, click the login button, fill in test credentials, submit the form, and verify successful login"
```

### Error Handling

When tests fail, the system provides:
- Detailed error messages
- Screenshots of the failure point
- Logs showing what went wrong
- Suggestions for fixing issues

## 🎯 Best Practices

### For UI Testing

1. **Always include the target URL** for better accuracy
2. **Be specific about elements** you want to interact with
3. **Request screenshots** to verify visual state
4. **Test one workflow at a time** for clearer results

### For API Testing

1. **Provide complete endpoint URLs** when possible
2. **Specify expected response format** (JSON, XML, etc.)
3. **Include HTTP method** if not GET (POST, PUT, DELETE)
4. **Mention authentication** if required

### For Mixed Testing

1. **Break down complex workflows** into clear steps
2. **Specify both UI and API expectations**
3. **Include validation points** throughout the process
4. **Test error scenarios** as well as happy paths

## 🚨 Common Issues and Solutions

### Test Timeouts
**Issue**: Test takes too long to complete
**Solution**: Break down into smaller, specific actions

### Element Not Found
**Issue**: UI test can't find the specified element
**Solution**: Be more specific about element description or use alternative selectors

### API Connection Errors
**Issue**: Cannot connect to API endpoint
**Solution**: Verify the URL is correct and accessible

### Screenshot Issues
**Issue**: Screenshots appear blank or incorrect
**Solution**: Ensure the page has fully loaded before taking screenshots

## 📈 Interpreting Results

### Successful Tests
- Green checkmarks indicate success
- Screenshots show expected state
- Logs confirm actions were completed
- Summary shows "Passed" status

### Failed Tests
- Red X marks indicate failures
- Error messages explain what went wrong
- Screenshots show failure state
- Logs provide debugging information

### Partial Success
- Some steps may succeed while others fail
- Review individual step results
- Use logs to understand failure points
- Retry with modified prompts if needed

## 🔄 Iterative Testing

1. **Start Simple**: Begin with basic tests
2. **Add Complexity**: Gradually increase test complexity
3. **Learn from Failures**: Use error messages to improve prompts
4. **Refine Prompts**: Adjust language based on results
5. **Build Workflows**: Combine successful tests into larger workflows

## 💡 Pro Tips

- Use the quick action buttons for common test patterns
- Save successful prompts for reuse
- Take screenshots at key points for visual verification
- Test both positive and negative scenarios
- Use specific, descriptive language for better AI interpretation

## 🤝 Getting Help

If you encounter issues:
1. Check the error logs in test results
2. Try simplifying your test prompt
3. Verify URLs and endpoints are accessible
4. Review the examples in this guide
5. Use the quick action buttons as templates

