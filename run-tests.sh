#!/bin/bash

# Playwright MCP MVP Test Runner Script
# Usage: ./scripts/run-tests.sh [options]

set -e

# Default values
TEST_TYPE="all"
BROWSER="chromium"
HEADLESS="true"
TAGS=""
PARALLEL="true"
REPORT="true"
MOCK_SERVER_PORT="3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Playwright MCP MVP Test Runner

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --type TYPE         Test type: all, api, ui, smoke, regression, performance (default: all)
    -b, --browser BROWSER   Browser: chromium, firefox, webkit, all (default: chromium)
    -h, --headless BOOL     Run in headless mode: true, false (default: true)
    -g, --grep PATTERN      Run tests matching pattern (e.g., "@smoke")
    -p, --parallel BOOL     Run tests in parallel: true, false (default: true)
    -r, --report BOOL       Generate HTML report: true, false (default: true)
    -m, --mock-port PORT    Mock server port (default: 3001)
    --help                  Show this help message

EXAMPLES:
    $0                                          # Run all tests
    $0 -t smoke -b chromium                     # Run smoke tests in Chromium
    $0 -t api -g "@validation"                  # Run API validation tests
    $0 -t ui -b all -h false                    # Run UI tests in all browsers, headed mode
    $0 -t performance -p false                  # Run performance tests sequentially
    $0 -g "@smoke or @regression"               # Run smoke and regression tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -g|--grep)
            TAGS="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        -r|--report)
            REPORT="$2"
            shift 2
            ;;
        -m|--mock-port)
            MOCK_SERVER_PORT="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate test type
case $TEST_TYPE in
    all|api|ui|smoke|regression|performance)
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        print_error "Valid types: all, api, ui, smoke, regression, performance"
        exit 1
        ;;
esac

# Validate browser
case $BROWSER in
    chromium|firefox|webkit|all)
        ;;
    *)
        print_error "Invalid browser: $BROWSER"
        print_error "Valid browsers: chromium, firefox, webkit, all"
        exit 1
        ;;
esac

print_status "Starting Playwright MCP MVP Test Suite"
print_status "Test Type: $TEST_TYPE"
print_status "Browser: $BROWSER"
print_status "Headless: $HEADLESS"
print_status "Parallel: $PARALLEL"
print_status "Mock Server Port: $MOCK_SERVER_PORT"

if [[ -n "$TAGS" ]]; then
    print_status "Tags/Pattern: $TAGS"
fi

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [[ ! -d "node_modules" ]]; then
    print_status "Installing dependencies..."
    npm ci
fi

# Install Playwright browsers if needed
if [[ ! -d "node_modules/@playwright" ]]; then
    print_status "Installing Playwright browsers..."
    npx playwright install
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start mock server
start_mock_server() {
    print_status "Starting mock server on port $MOCK_SERVER_PORT..."
    
    if check_port $MOCK_SERVER_PORT; then
        print_warning "Port $MOCK_SERVER_PORT is already in use. Assuming mock server is running."
    else
        MOCK_SERVER_PORT=$MOCK_SERVER_PORT node mock-server/server.js &
        MOCK_SERVER_PID=$!
        
        # Wait for server to start
        local retries=0
        local max_retries=30
        
        while ! curl -f http://localhost:$MOCK_SERVER_PORT/api/health >/dev/null 2>&1; do
            if [[ $retries -ge $max_retries ]]; then
                print_error "Mock server failed to start after $max_retries attempts"
                kill $MOCK_SERVER_PID 2>/dev/null || true
                exit 1
            fi
            
            print_status "Waiting for mock server to start... (attempt $((retries + 1))/$max_retries)"
            sleep 1
            ((retries++))
        done
        
        print_success "Mock server started successfully"
    fi
}

# Function to stop mock server
stop_mock_server() {
    if [[ -n "$MOCK_SERVER_PID" ]]; then
        print_status "Stopping mock server..."
        kill $MOCK_SERVER_PID 2>/dev/null || true
        wait $MOCK_SERVER_PID 2>/dev/null || true
        print_success "Mock server stopped"
    fi
}

# Function to build test command
build_test_command() {
    local cmd="npx playwright test"
    
    # Add project selection based on test type and browser
    case $TEST_TYPE in
        api)
            cmd="$cmd --project=api-tests"
            ;;
        ui)
            if [[ "$BROWSER" == "all" ]]; then
                cmd="$cmd --project=chromium-ui --project=firefox-ui --project=webkit-ui"
            else
                cmd="$cmd --project=${BROWSER}-ui"
            fi
            ;;
        smoke)
            cmd="$cmd --grep=\"@smoke\""
            ;;
        regression)
            cmd="$cmd --grep=\"@regression\""
            ;;
        performance)
            cmd="$cmd --grep=\"@performance\""
            ;;
        all)
            if [[ "$BROWSER" == "all" ]]; then
                cmd="$cmd --project=api-tests --project=chromium-ui --project=firefox-ui --project=webkit-ui"
            else
                cmd="$cmd --project=api-tests --project=${BROWSER}-ui"
            fi
            ;;
    esac
    
    # Add custom grep pattern if provided
    if [[ -n "$TAGS" ]]; then
        cmd="$cmd --grep=\"$TAGS\""
    fi
    
    # Add parallel/sequential execution
    if [[ "$PARALLEL" == "false" ]]; then
        cmd="$cmd --workers=1"
    fi
    
    # Add reporter options
    if [[ "$REPORT" == "true" ]]; then
        cmd="$cmd --reporter=html,json"
    else
        cmd="$cmd --reporter=list"
    fi
    
    echo "$cmd"
}

# Function to run tests
run_tests() {
    local test_cmd=$(build_test_command)
    
    print_status "Running tests with command: $test_cmd"
    
    # Set environment variables
    export CI=true
    export BASE_URL="http://localhost:$MOCK_SERVER_PORT"
    export API_BASE_URL="http://localhost:$MOCK_SERVER_PORT/api"
    export HEADLESS="$HEADLESS"
    
    # Run the tests
    if eval "$test_cmd"; then
        print_success "All tests completed successfully!"
        return 0
    else
        print_error "Some tests failed!"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    if [[ "$REPORT" == "true" ]]; then
        print_status "Generating consolidated reports..."
        
        if [[ -f "utils/report-generator.js" ]]; then
            node utils/report-generator.js
            print_success "Reports generated in consolidated-report/ directory"
        else
            print_warning "Report generator not found, skipping consolidated report"
        fi
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    stop_mock_server
}

# Set up trap for cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    # Start mock server for UI and integration tests
    if [[ "$TEST_TYPE" != "api" ]] || [[ "$TEST_TYPE" == "all" ]]; then
        start_mock_server
    fi
    
    # Run tests
    if run_tests; then
        TEST_EXIT_CODE=0
    else
        TEST_EXIT_CODE=1
    fi
    
    # Generate reports
    generate_reports
    
    # Print summary
    if [[ $TEST_EXIT_CODE -eq 0 ]]; then
        print_success "Test execution completed successfully!"
        print_status "Check the playwright-report/ directory for detailed results"
        if [[ "$REPORT" == "true" ]]; then
            print_status "Check the consolidated-report/ directory for consolidated reports"
        fi
    else
        print_error "Test execution completed with failures!"
        print_status "Check the test-results/ directory for failure details"
    fi
    
    exit $TEST_EXIT_CODE
}

# Run main function
main

