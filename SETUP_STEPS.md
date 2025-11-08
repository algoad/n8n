# Quick Setup Steps for n8n Fork Management

## One-Time Setup

### Step 1: Configure Upstream Remote

```bash
cd packages/n8n-source
./setup-fork.sh
```

This will:
- Add `upstream` remote pointing to `https://github.com/n8n-io/n8n.git`
- Show current status and what's ahead/behind

### Step 2: Commit Your 14 Modified Files

```bash
cd packages/n8n-source

# See what you've changed
git status

# Add and commit your changes
git add .
git commit -m "feat: Playbook integration changes"
```

## Regular Workflow

### When You Want to Sync with Upstream (e.g., those 28 commits)

```bash
cd packages/n8n-source
./sync-upstream.sh
```

This will:
- Fetch latest from upstream
- Show commits you're missing
- Let you choose merge or rebase
- Handle conflicts safely

### After Making Changes to n8n-source

```bash
# 1. Commit changes in n8n-source
cd packages/n8n-source
git add .
git commit -m "feat: your change description"

# 2. Push to playbook repo (if n8n-source is tracked)
cd ../..
git add packages/n8n-source
git commit -m "chore: update n8n-source"
git push
```

## Quick Reference Commands

```bash
# Check status
cd packages/n8n-source && git status

# See your changes vs upstream
cd packages/n8n-source && git diff upstream/master

# See what upstream changed
cd packages/n8n-source && git fetch upstream && git log HEAD..upstream/master --oneline

# Manual sync (if script doesn't work)
cd packages/n8n-source
git fetch upstream
git rebase upstream/master  # or git merge upstream/master
```

## Summary

**One-time:**
1. `cd packages/n8n-source && ./setup-fork.sh`
2. `git add . && git commit -m "your message"`

**Regular:**
- Sync upstream: `./sync-upstream.sh`
- Push changes: `git push` (in n8n-source) then `git add packages/n8n-source && git commit && git push` (in playbook root)

That's it! The scripts handle the complexity.

