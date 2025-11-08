#!/bin/bash
# Setup script for managing n8n fork with upstream tracking

set -e

echo "🔧 Setting up n8n fork with upstream tracking..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
  echo "❌ Error: Must run this script from packages/n8n-source directory"
  exit 1
fi

# Check current remotes
echo ""
echo "📡 Current git remotes:"
git remote -v

# Add upstream remote if it doesn't exist
if ! git remote | grep -q "^upstream$"; then
  echo ""
  echo "➕ Adding upstream remote..."
  git remote add upstream https://github.com/n8n-io/n8n.git
  echo "✅ Added upstream remote"
else
  echo ""
  echo "ℹ️  Upstream remote already exists"
fi

# Fetch from upstream
echo ""
echo "📥 Fetching latest from upstream..."
git fetch upstream

# Show current branch (use whatever branch you're on)
current_branch=$(git branch --show-current)
echo ""
echo "📍 Current branch: $current_branch"

# Show status
echo ""
echo "📊 Current status:"
git status --short

# Show commits ahead/behind
echo ""
echo "📈 Comparison with upstream/master:"
if git rev-parse --verify upstream/master > /dev/null 2>&1; then
  ahead=$(git rev-list --count upstream/master..HEAD 2>/dev/null || echo "0")
  behind=$(git rev-list --count HEAD..upstream/master 2>/dev/null || echo "0")
  echo "   Your branch is ahead by: $ahead commits"
  echo "   Your branch is behind by: $behind commits"
  
  if [ "$behind" -gt 0 ]; then
    echo ""
    echo "⚠️  Upstream has $behind new commits. Consider syncing:"
    echo "   git rebase upstream/master"
  fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review your changes: git status"
echo "2. Commit your changes: git add . && git commit -m 'your message'"
echo "3. Sync with upstream: ./sync-upstream.sh"
echo "4. Push your changes: git push origin $current_branch"

