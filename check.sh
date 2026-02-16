#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit on error
set -e

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

# If using fish shell's nvm, try to load it
if [ -s "$HOME/.config/fish/functions/nvm.fish" ]; then
    # For fish users, we'll check if node is available via the system
    export PATH="$HOME/.nvm/versions/node/$(ls -t $HOME/.nvm/versions/node/ 2>/dev/null | head -1)/bin:$PATH"
fi

# Parse command line arguments
FIX_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fix       Automatically fix linting and security issues"
            echo "  -h, --help  Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Track overall status
CHECKS_FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
if [ "$FIX_MODE" = true ]; then
    echo -e "${BLUE}║     MMM-YandexWeather Quality Checks (FIX MODE)       ║${NC}"
else
    echo -e "${BLUE}║         MMM-YandexWeather Quality Checks              ║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FIX_MODE" = true ]; then
    echo -e "${YELLOW}🔧 Fix mode enabled - will attempt to auto-fix issues${NC}"
    echo ""
fi

# Helper function to print section headers
print_section() {
    echo -e "\n${BLUE}▶ $1${NC}"
    echo "────────────────────────────────────────────────────"
}

# Helper function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Helper function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

# Helper function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. Check Node.js and npm versions
print_section "Checking environment"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"
else
    print_error "Node.js not found"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm: $NPM_VERSION"
else
    print_error "npm not found"
    exit 1
fi

# 2. Check if node_modules exists
print_section "Checking dependencies"
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, installing dependencies..."
    npm install
else
    print_success "node_modules found"
fi

# 3. Verify critical dependencies
if [ -f "package.json" ]; then
    print_success "package.json found"

    # Check if axios is installed (critical dependency)
    if npm list axios &> /dev/null; then
        print_success "axios installed"
    else
        print_error "axios not installed"
    fi
else
    print_error "package.json not found"
fi

# 4. Linting
if [ "$FIX_MODE" = true ]; then
    print_section "Running ESLint (with auto-fix)"
    if npm run lint:fix 2>&1; then
        print_success "Linting passed (auto-fixed)"
    else
        print_error "Linting failed (even after auto-fix)"
    fi
else
    print_section "Running ESLint"
    if npm run lint 2>&1; then
        print_success "Linting passed"
    else
        print_error "Linting failed (run with --fix to auto-fix)"
    fi
fi

# 5. Security audit
if [ "$FIX_MODE" = true ]; then
    print_section "Running security audit (with auto-fix)"
    echo "Attempting to fix vulnerabilities..."
    FIX_OUTPUT=$(npm audit fix 2>&1)
    echo "$FIX_OUTPUT"

    # Run audit again to check remaining issues
    AUDIT_OUTPUT=$(npm audit --audit-level=moderate 2>&1)
    AUDIT_EXIT_CODE=$?

    if [ $AUDIT_EXIT_CODE -eq 0 ]; then
        print_success "All vulnerabilities fixed"
    else
        VULN_COUNT=$(echo "$AUDIT_OUTPUT" | grep -oP '\d+(?= vulnerabilities)' | head -1)
        if [ -n "$VULN_COUNT" ] && [ "$VULN_COUNT" -gt 0 ]; then
            print_warning "Still found $VULN_COUNT vulnerabilities (may require manual fix)"
            echo "$AUDIT_OUTPUT" | grep -A 5 "Severity:"
        fi
    fi
else
    print_section "Running security audit"
    AUDIT_OUTPUT=$(npm audit --audit-level=moderate 2>&1)
    AUDIT_EXIT_CODE=$?

    if [ $AUDIT_EXIT_CODE -eq 0 ]; then
        print_success "No security vulnerabilities found"
    else
        VULN_COUNT=$(echo "$AUDIT_OUTPUT" | grep -oP '\d+(?= vulnerabilities)' | head -1)
        if [ -n "$VULN_COUNT" ] && [ "$VULN_COUNT" -gt 0 ]; then
            print_warning "Found $VULN_COUNT vulnerabilities"
            echo "$AUDIT_OUTPUT" | grep -A 5 "Severity:"
            echo ""
            echo -e "${YELLOW}Run './check.sh --fix' to attempt automatic fix${NC}"
        fi
    fi
fi

# 6. Check for outdated dependencies
if [ "$FIX_MODE" = true ]; then
    print_section "Checking for outdated dependencies (with auto-update)"
    OUTDATED_OUTPUT=$(npm outdated 2>&1 || true)
    if [ -z "$OUTDATED_OUTPUT" ]; then
        print_success "All dependencies are up to date"
    else
        print_warning "Updating outdated dependencies..."
        npm update

        # Check again after update
        OUTDATED_OUTPUT=$(npm outdated 2>&1 || true)
        if [ -z "$OUTDATED_OUTPUT" ]; then
            print_success "All dependencies updated"
        else
            print_warning "Some dependencies still outdated (may require major version updates):"
            echo "$OUTDATED_OUTPUT"
        fi
    fi
else
    print_section "Checking for outdated dependencies"
    OUTDATED_OUTPUT=$(npm outdated 2>&1 || true)
    if [ -z "$OUTDATED_OUTPUT" ]; then
        print_success "All dependencies are up to date"
    else
        print_warning "Some dependencies are outdated:"
        echo "$OUTDATED_OUTPUT"
        echo ""
        echo -e "${YELLOW}Run './check.sh --fix' to update dependencies${NC}"
    fi
fi

# 7. Validate JSON files
print_section "Validating JSON files"
JSON_VALID=true

for file in package.json translations/*.json; do
    if [ -f "$file" ]; then
        if python3 -m json.tool "$file" &> /dev/null || node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" &> /dev/null; then
            print_success "$file is valid"
        else
            print_error "$file is invalid"
            JSON_VALID=false
        fi
    fi
done

# 8. Check for required files
print_section "Checking required files"
REQUIRED_FILES=(
    "MMM-YandexWeather.js"
    "node_helper.js"
    "package.json"
    "README.md"
    "LICENSE.md"
    ".gitignore"
    "yandexweather.css"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file missing"
    fi
done

# 9. Check for TODO/FIXME comments
print_section "Checking for TODO/FIXME comments"
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.js" --exclude-dir=node_modules . 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments"
    grep -rn "TODO\|FIXME" --include="*.js" --exclude-dir=node_modules . 2>/dev/null || true
else
    print_success "No TODO/FIXME comments found"
fi

# 10. Check file sizes (warn if JS files are too large)
print_section "Checking file sizes"
for file in *.js; do
    if [ -f "$file" ]; then
        SIZE=$(wc -c < "$file")
        LINES=$(wc -l < "$file")
        if [ "$SIZE" -gt 100000 ]; then
            print_warning "$file is large (${SIZE} bytes, ${LINES} lines)"
        else
            print_success "$file size OK (${SIZE} bytes, ${LINES} lines)"
        fi
    fi
done

# 11. Check for common issues
print_section "Checking for common code issues"

# Check for console.log (should use Log in MagicMirror modules)
CONSOLE_LOG_COUNT=$(grep -r "console\.log" --include="*.js" --exclude="check.sh" --exclude="node_helper.js" --exclude-dir=node_modules . 2>/dev/null | wc -l)
if [ "$CONSOLE_LOG_COUNT" -gt 0 ]; then
    print_warning "Found $CONSOLE_LOG_COUNT console.log statements (consider using Log.log() for frontend)"
else
    print_success "No console.log in frontend code"
fi

# Check for hardcoded API keys
if grep -r "X-Yandex-Weather-Key.*[a-f0-9]\{8\}-" --include="*.js" --exclude-dir=node_modules . &> /dev/null; then
    print_warning "Possible hardcoded API key found"
else
    print_success "No hardcoded API keys detected"
fi

# 12. Rate limit file check
print_section "Checking rate limit configuration"
if [ -f ".api_rate_limit.json" ]; then
    print_success ".api_rate_limit.json exists"
    if grep -q ".api_rate_limit.json" .gitignore; then
        print_success ".api_rate_limit.json is in .gitignore"
    else
        print_error ".api_rate_limit.json not in .gitignore"
    fi
else
    print_warning ".api_rate_limit.json not created yet (will be created on first API call)"
fi

# 13. Check Git status (if in a git repo)
if [ -d ".git" ]; then
    print_section "Checking Git status"

    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        print_success "No uncommitted changes"
    else
        print_warning "You have uncommitted changes"
        git status --short
    fi

    # Check current branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    print_success "Current branch: $BRANCH"
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Summary                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $CHECKS_FAILED check(s) failed${NC}"
    exit 1
fi
