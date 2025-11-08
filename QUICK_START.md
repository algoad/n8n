# Quick Start: Managing Your n8n Fork

## One-Time Setup (5 minutes)

### Step 1: Run Setup Script

```bash
cd packages/n8n-source
./setup-fork.sh
```

**What it does:**
- Adds `upstream` remote (original n8n repo)
- Shows current branch and status
- Shows how many commits you're behind/ahead

### Step 2: Commit Your Changes

```bash
# Still in packages/n8n-source
git status                    # See your 14 modified files
git add .                     # Stage all changes
git commit -m "feat: Playbook integration changes"
```

## Regular Workflow

### Sync with Upstream (when n8n releases updates)

```bash
cd packages/n8n-source
./sync-upstream.sh
```

**What it does:**
- Fetches latest from upstream
- Shows commits you're missing
- Lets you choose: merge, rebase, or skip
- Handles uncommitted changes safely

### Push Changes to Playbook Repo

```bash
# After committing changes in n8n-source
cd packages/n8n-source
git add .
git commit -m "feat: your change"

# Then update playbook repo
cd ../..
git add packages/n8n-source
git commit -m "chore: update n8n-source"
git push
```

## Quick Commands

```bash
# Check what you've changed
cd packages/n8n-source && git status

# See your changes vs upstream
cd packages/n8n-source && git diff upstream/master

# See what upstream changed
cd packages/n8n-source && git fetch upstream && git log HEAD..upstream/master --oneline

# Manual sync (alternative to script)
cd packages/n8n-source
git fetch upstream
git rebase upstream/master  # or: git merge upstream/master
```

## That's It!

- **Setup once:** `./setup-fork.sh` + commit your changes
- **Sync when needed:** `./sync-upstream.sh`
- **Push changes:** commit in n8n-source, then commit in playbook root

The scripts handle all the complexity for you.
