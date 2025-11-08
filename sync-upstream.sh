#!/bin/bash
# Script to sync n8n fork with upstream updates

set -e

echo "🔄 Syncing with upstream n8n repository..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
  echo "❌ Error: Must run this script from packages/n8n-source directory"
  exit 1
fi

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
  echo "❌ Error: Upstream remote not found. Run setup-fork.sh first"
  exit 1
fi

# Get current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   Stashing changes..."
  git stash push -m "Stashed before upstream sync $(date +%Y-%m-%d)"
fi

# Fetch latest from upstream
echo ""
echo "📥 Fetching latest from upstream..."
git fetch upstream

# Show what's new
echo ""
echo "📊 Upstream status:"
ahead=$(git rev-list --count upstream/master..HEAD 2>/dev/null || echo "0")
behind=$(git rev-list --count HEAD..upstream/master 2>/dev/null || echo "0")
echo "   Your branch is ahead by: $ahead commits"
echo "   Your branch is behind by: $behind commits"

if [ "$behind" -eq 0 ]; then
  echo ""
  echo "✅ Already up to date with upstream!"
  exit 0
fi

# Show recent upstream commits
echo ""
echo "📝 Recent upstream commits you're missing:"
git log --oneline HEAD..upstream/master | head -10

# Ask for confirmation
echo ""
read -p "Do you want to merge/rebase upstream changes? (m/rebase/skip): " choice

case $choice in
  m|merge|M|Merge)
    echo ""
    echo "🔀 Merging upstream/master..."
    git merge upstream/master --no-edit
    echo "✅ Merge complete"
    ;;
  rebase|Rebase|r|R)
    echo ""
    echo "🔀 Rebasing onto upstream/master..."
    git rebase upstream/master
    echo "✅ Rebase complete"
    ;;
  *)
    echo "⏭️  Skipping sync"
    exit 0
    ;;
esac

# Restore stashed changes if any
if git stash list | grep -q "Stashed before upstream sync"; then
  echo ""
  echo "📦 Restoring stashed changes..."
  git stash pop || echo "⚠️  Some conflicts in stashed changes - resolve manually"
fi

# Show final status
echo ""
echo "📊 Final status:"
git status --short

echo ""
echo "✅ Sync complete!"
echo ""
echo "Next steps:"
echo "1. Review conflicts (if any): git status"
echo "2. Test your changes: pnpm build && pnpm test"
echo "3. Commit resolved conflicts if needed"
echo "4. Push your updated branch: git push origin $current_branch"
echo "5. Update playbook repo: cd ../.. && git add packages/n8n-source && git commit -m 'chore: update n8n-source' && git push"

