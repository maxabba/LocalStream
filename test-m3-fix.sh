#!/bin/bash

# LocalStream M3 Fix - Test Automation Script
# Usage: ./test-m3-fix.sh [standard|unsigned]

set -e

echo "=================================================="
echo "  LocalStream M3 Fix - Test Script"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUILD_TYPE="${1:-standard}"

# Paths
DIST_DIR="$(pwd)/dist"
DOWNLOADS="$HOME/Downloads"
APPLICATIONS="/Applications"

# Functions
cleanup_old_versions() {
    echo -e "${YELLOW}[1/5] Cleaning old versions...${NC}"

    # Kill running instance
    pkill -9 LocalStream 2>/dev/null || true
    sleep 1

    # Remove from Applications
    if [ -d "$APPLICATIONS/LocalStream.app" ]; then
        echo "  Removing $APPLICATIONS/LocalStream.app"
        rm -rf "$APPLICATIONS/LocalStream.app"
    fi

    echo -e "${GREEN}  ✓ Cleanup complete${NC}"
    echo ""
}

install_standard() {
    echo -e "${YELLOW}[2/5] Installing STANDARD build (hardenedRuntime: false)...${NC}"

    ZIP_FILE="$DIST_DIR/LocalStream-1.0.19-arm64-mac.zip"

    if [ ! -f "$ZIP_FILE" ]; then
        echo -e "${RED}  ✗ Build file not found: $ZIP_FILE${NC}"
        echo "  Run: npm run build:mac-arm"
        exit 1
    fi

    # Extract to temp
    TMP_DIR=$(mktemp -d)
    echo "  Extracting to $TMP_DIR..."
    unzip -q "$ZIP_FILE" -d "$TMP_DIR"

    # Copy to Applications
    echo "  Installing to $APPLICATIONS..."
    cp -r "$TMP_DIR/LocalStream.app" "$APPLICATIONS/"

    # Cleanup temp
    rm -rf "$TMP_DIR"

    echo -e "${GREEN}  ✓ Installation complete${NC}"
    echo ""
}

install_unsigned() {
    echo -e "${YELLOW}[2/5] Installing UNSIGNED build...${NC}"

    UNSIGNED_APP="$DOWNLOADS/LocalStream-Unsigned.app"

    if [ ! -d "$UNSIGNED_APP" ]; then
        echo -e "${RED}  ✗ Unsigned build not found: $UNSIGNED_APP${NC}"
        echo "  Build it first with identity: null in package.json"
        exit 1
    fi

    echo "  Copying unsigned build to $APPLICATIONS..."
    cp -r "$UNSIGNED_APP" "$APPLICATIONS/LocalStream.app"

    echo -e "${GREEN}  ✓ Installation complete${NC}"
    echo ""
}

remove_quarantine() {
    echo -e "${YELLOW}[3/5] Removing quarantine attributes...${NC}"

    APP_PATH="$APPLICATIONS/LocalStream.app"

    echo "  Executing: sudo xattr -cr $APP_PATH"
    sudo xattr -cr "$APP_PATH"

    # Verify
    XATTRS=$(xattr "$APP_PATH" 2>/dev/null || echo "")
    if [ -z "$XATTRS" ]; then
        echo -e "${GREEN}  ✓ Quarantine removed successfully${NC}"
    else
        echo -e "${YELLOW}  ⚠ Some attributes remain: $XATTRS${NC}"
    fi

    echo ""
}

verify_signing() {
    echo -e "${YELLOW}[4/5] Verifying code signing...${NC}"

    APP_PATH="$APPLICATIONS/LocalStream.app"

    # Check signature
    SIGNATURE=$(codesign -dvv "$APP_PATH" 2>&1 | grep "Signature=" | cut -d'=' -f2)

    if [ "$SIGNATURE" == "adhoc" ]; then
        echo -e "  Signature: ${YELLOW}adhoc (unsigned)${NC}"
    else
        IDENTITY=$(codesign -dvv "$APP_PATH" 2>&1 | grep "Authority=" | head -1 | cut -d'=' -f2)
        echo -e "  Signature: ${GREEN}$IDENTITY${NC}"
    fi

    # Check hardened runtime
    FLAGS=$(codesign -dvv "$APP_PATH" 2>&1 | grep "CodeDirectory" | grep -o "flags=.*" || echo "")
    if echo "$FLAGS" | grep -q "runtime"; then
        echo -e "  Hardened Runtime: ${RED}ENABLED${NC} (may cause issues)"
    else
        echo -e "  Hardened Runtime: ${GREEN}DISABLED${NC}"
    fi

    echo ""
}

launch_app() {
    echo -e "${YELLOW}[5/5] Launching LocalStream...${NC}"

    APP_PATH="$APPLICATIONS/LocalStream.app"

    # Start logging in background
    echo "  Starting log stream (Ctrl+C to stop)..."
    echo "  ---------------------------------------"

    # Launch app
    open "$APP_PATH"

    # Wait a moment for app to start
    sleep 2

    # Stream logs
    log stream --predicate 'process == "LocalStream"' --level info --style compact &
    LOG_PID=$!

    # Wait for user input
    echo ""
    echo -e "${GREEN}App launched! Press Ctrl+C when done testing.${NC}"
    echo ""

    # Wait for Ctrl+C
    trap "kill $LOG_PID 2>/dev/null; exit 0" INT
    wait $LOG_PID
}

check_crash() {
    echo ""
    echo -e "${YELLOW}Checking for crashes...${NC}"

    CRASH_DIR="$HOME/Library/Logs/DiagnosticReports"
    LATEST_CRASH=$(ls -t "$CRASH_DIR"/LocalStream*.crash 2>/dev/null | head -1)

    if [ -n "$LATEST_CRASH" ]; then
        CRASH_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_CRASH")
        echo -e "${RED}  ✗ Crash detected at $CRASH_TIME${NC}"
        echo "  File: $LATEST_CRASH"
        echo ""
        echo "  First 30 lines:"
        head -30 "$LATEST_CRASH"
        exit 1
    else
        echo -e "${GREEN}  ✓ No crashes detected${NC}"
    fi
}

# Main execution
main() {
    echo "Build type: $BUILD_TYPE"
    echo ""

    cleanup_old_versions

    if [ "$BUILD_TYPE" == "unsigned" ]; then
        install_unsigned
    else
        install_standard
    fi

    remove_quarantine
    verify_signing
    launch_app
    check_crash
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script must be run on macOS${NC}"
    exit 1
fi

# Check if running on Apple Silicon
ARCH=$(uname -m)
if [ "$ARCH" != "arm64" ]; then
    echo -e "${YELLOW}Warning: You're not on Apple Silicon (M1/M2/M3)${NC}"
    echo "This test is designed for M3 Macs."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

main

echo ""
echo "=================================================="
echo -e "${GREEN}  Test Complete!${NC}"
echo "=================================================="
