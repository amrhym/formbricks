#!/bin/bash
# scripts/apply-patches.sh
# Applies all HiveCFM patches to the forked codebase
#
# Usage: ./scripts/apply-patches.sh
#
# This script applies patches from the patches/ directory.
# Safe to run multiple times (idempotent).

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
PATCHES_DIR="$REPO_ROOT/patches"

echo -e "${BLUE}=== HiveCFM Patch Application Script ===${NC}"
echo -e "Repository: $REPO_ROOT"
echo -e "Patches directory: $PATCHES_DIR"

# Check if patches directory exists
if [ ! -d "$PATCHES_DIR" ]; then
    echo -e "${YELLOW}No patches directory found. Nothing to apply.${NC}"
    exit 0
fi

# Count patches
PATCH_COUNT=$(find "$PATCHES_DIR" -name "*.patch" -type f | wc -l | tr -d ' ')
if [ "$PATCH_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No patch files found in $PATCHES_DIR${NC}"
    exit 0
fi

echo -e "\n${BLUE}Found $PATCH_COUNT patch file(s)${NC}"

# Track results
APPLIED=0
SKIPPED=0
FAILED=0

cd "$REPO_ROOT"

# Apply each patch
for PATCH_FILE in "$PATCHES_DIR"/*.patch; do
    PATCH_NAME=$(basename "$PATCH_FILE")
    echo -e "\n${BLUE}Processing: $PATCH_NAME${NC}"

    # Check if patch is already applied (reverse check)
    if git apply --reverse --check "$PATCH_FILE" 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Already applied, skipping${NC}"
        ((SKIPPED++))
        continue
    fi

    # Try to apply the patch
    if git apply --check "$PATCH_FILE" 2>/dev/null; then
        if git apply "$PATCH_FILE"; then
            echo -e "${GREEN}  ✓ Applied successfully${NC}"
            ((APPLIED++))
        else
            echo -e "${RED}  ✗ Failed to apply${NC}"
            ((FAILED++))
        fi
    else
        # Patch may be partially applied or conflicting
        echo -e "${YELLOW}  ⚠ Patch may conflict or be partially applied${NC}"
        echo -e "  Attempting with --3way merge..."

        if git apply --3way "$PATCH_FILE" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Applied with 3-way merge${NC}"
            ((APPLIED++))
        else
            echo -e "${RED}  ✗ Cannot apply patch (manual intervention required)${NC}"
            ((FAILED++))
        fi
    fi
done

# Summary
echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "  ${GREEN}Applied:${NC} $APPLIED"
echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "  ${RED}Failed:${NC}  $FAILED"

if [ $FAILED -gt 0 ]; then
    echo -e "\n${RED}Some patches failed to apply.${NC}"
    echo -e "Check the patches manually and resolve conflicts."
    exit 1
fi

echo -e "\n${GREEN}✓ All patches processed successfully!${NC}"

# List modified files
echo -e "\n${BLUE}Modified files:${NC}"
git status --short

exit 0
