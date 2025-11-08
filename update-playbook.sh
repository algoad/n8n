#!/bin/bash
# Helper script to update playbook repo after making n8n changes

set -e

# Check if we're in n8n-source directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
  echo "❌ Error: Must run this script from packages/n8n-source directory"
  exit 1
fi

# Check if there are uncommitted changes in n8n-source
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes in n8n-source"
  echo "   Please commit them first:"
  echo "   git add . && git commit -m 'your message'"
  exit 1
fi

# Get the last commit message from n8n-source
last_commit=$(git log -1 --pretty=%B)
echo "📝 Last n8n-source commit: $last_commit"

# Navigate to playbook root
playbook_root="$(dirname "$(dirname "$(pwd)")")"
cd "$playbook_root"

echo ""
echo "📦 Updating playbook repo..."

# Stage n8n-source directory
git add packages/n8n-source

# Check if there are changes to commit
if git diff --staged --quiet packages/n8n-source; then
  echo "ℹ️  No changes to commit in playbook repo"
  exit 0
fi

# Show what will be committed
echo ""
echo "📋 Changes to be committed:"
git diff --staged --stat packages/n8n-source

# Create commit message
commit_msg="chore: update n8n-source"
if [ -n "$last_commit" ]; then
  # Use first line of n8n commit as description
  short_msg=$(echo "$last_commit" | head -1 | cut -c1-50)
  commit_msg="chore: update n8n-source - $short_msg"
fi

echo ""
read -p "Commit message: [$commit_msg] " custom_msg
if [ -n "$custom_msg" ]; then
  commit_msg="$custom_msg"
fi

# Commit
git commit -m "$commit_msg"

echo ""
echo "✅ Playbook repo updated!"
echo ""
echo "Next step: git push"

