#!/bin/bash
# scripts/sync-upstream.sh
# Syncs hivecfm-main with upstream formbricks changes
#
# Usage: ./scripts/sync-upstream.sh [repo-path]
# Example: ./scripts/sync-upstream.sh ../hivecfm-core
#
# This script safely merges upstream changes into the hivecfm-main branch.
# It will NOT auto-push - review changes before pushing.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== HiveCFM Upstream Sync Script ===${NC}"

# Check if repo path was provided
if [ -n "$1" ]; then
    cd "$1" || { echo -e "${RED}Error: Cannot access directory $1${NC}"; exit 1; }
fi

# Verify we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Check if upstream remote exists
if ! git remote get-url upstream > /dev/null 2>&1; then
    echo -e "${RED}Error: 'upstream' remote not configured${NC}"
    echo "Run: git remote add upstream <upstream-url>"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "hivecfm-main" ]; then
    echo -e "${YELLOW}Warning: Current branch is '${CURRENT_BRANCH}', not 'hivecfm-main'${NC}"
    read -p "Switch to hivecfm-main? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout hivecfm-main
    else
        echo -e "${RED}Aborting. Please checkout hivecfm-main first.${NC}"
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    git status --short
    exit 1
fi

echo -e "\n${GREEN}Fetching upstream changes...${NC}"
git fetch upstream

# Check if there are changes to merge
UPSTREAM_COMMITS=$(git rev-list HEAD..upstream/main --count 2>/dev/null || echo "0")
if [ "$UPSTREAM_COMMITS" -eq "0" ]; then
    echo -e "${GREEN}Already up to date with upstream/main${NC}"
    exit 0
fi

echo -e "${YELLOW}Found ${UPSTREAM_COMMITS} new commits from upstream${NC}"
echo -e "\n${GREEN}Preview of upstream changes:${NC}"
git log --oneline HEAD..upstream/main | head -20

echo -e "\n${GREEN}Merging upstream/main into hivecfm-main...${NC}"

# Attempt merge
if git merge upstream/main --no-edit; then
    echo -e "\n${GREEN}=== Merge successful! ===${NC}"
    echo -e "Review the changes below before pushing:\n"
    git log --oneline -10
    echo -e "\n${YELLOW}To push changes: git push origin hivecfm-main${NC}"
else
    echo -e "\n${RED}=== Merge conflicts detected! ===${NC}"
    echo -e "Resolve conflicts manually, then:"
    echo "  1. git add <resolved-files>"
    echo "  2. git commit"
    echo "  3. git push origin hivecfm-main"
    exit 1
fi
