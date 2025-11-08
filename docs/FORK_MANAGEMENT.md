# n8n Fork Management Guide

Complete guide for managing the n8n fork in the Playbook monorepo.

## Overview

The `packages/n8n-source` directory contains a fork of the [n8n repository](https://github.com/n8n-io/n8n.git) with Playbook-specific modifications. This guide covers daily workflow and syncing with upstream.

**Current Setup:**

- **Location**: `packages/n8n-source/`
- **Upstream**: `https://github.com/n8n-io/n8n.git` (original n8n repo)
- **Your Changes**: Modified files for Playbook integration (auth callback, role blocking, UI changes)

---

## Daily Workflow: Making Changes to n8n

**Every time you modify n8n-source, follow these steps:**

### Step 1: Commit in n8n-source

```bash
cd packages/n8n-source

# Review your changes
git status
git diff

# Stage and commit
git add .
git commit -m "feat: your change description"

# Example commit messages:
# "feat: add playbook callback endpoint"
# "fix: remove logout button from sidebar"
# "feat: block role changes in B2C mode"
```

### Step 2: Update Playbook Repo

```bash
# From playbook root
cd ../..

# Stage n8n-source directory
git add packages/n8n-source

# Commit with descriptive message
git commit -m "chore: update n8n-source with [brief description]"

# Push to remote
git push
```

### Helper Script (Optional)

After committing in n8n-source, you can use:

```bash
cd packages/n8n-source
./update-playbook.sh
```

This automates step 2 - it stages, commits, and shows you what changed.

---

## Syncing with Upstream

When n8n releases updates (e.g., you're 28 commits behind):

```bash
cd packages/n8n-source
./sync-upstream.sh
```

**What it does:**

- Fetches latest from upstream
- Shows commits you're missing
- Lets you choose: **merge**, **rebase**, or **skip**
- Handles uncommitted changes safely (stashes if needed)

**Recommendation:** Choose `rebase` for cleaner history.

**After syncing:**

```bash
# Update playbook repo
cd ../..
git add packages/n8n-source
git commit -m "chore: sync n8n-source with upstream"
git push
```

---

## Quick Reference Commands

### Check Status

```bash
cd packages/n8n-source && git status
```

### See Your Changes vs Upstream

```bash
cd packages/n8n-source && git diff upstream/master
```

### See What Upstream Changed

```bash
cd packages/n8n-source && git fetch upstream && git log HEAD..upstream/master --oneline
```

### Manual Sync (Alternative to Script)

```bash
cd packages/n8n-source
git fetch upstream
git rebase upstream/master  # or: git merge upstream/master
```

### See Modified Files

```bash
cd packages/n8n-source
git diff upstream/master --name-only  # List files
git diff upstream/master              # Full diff
```

---

## Complete Example

```bash
# You modify: packages/n8n-source/packages/cli/src/controllers/auth.controller.ts

# Step 1: Commit in n8n-source
cd packages/n8n-source
git add packages/cli/src/controllers/auth.controller.ts
git commit -m "feat: improve playbook callback error handling"

# Step 2: Update playbook repo
cd ../..
git add packages/n8n-source
git commit -m "chore: update n8n-source with improved callback handling"
git push
```

---

## Troubleshooting

### "I forgot to commit in n8n-source first"

```bash
cd packages/n8n-source
git add .
git commit -m "feat: your changes"
cd ../..
git add packages/n8n-source
git commit --amend  # Update the playbook commit
```

### "I have merge conflicts after syncing"

```bash
cd packages/n8n-source
git status  # See conflicted files
# Resolve conflicts manually, then:
git add <resolved-files>
git rebase --continue  # or git commit if merging
```

### "I want to see what changed"

```bash
cd packages/n8n-source
git log --oneline -5  # Recent commits
git diff HEAD~1       # See last commit changes
```

### "I want to undo a change"

```bash
cd packages/n8n-source
git log --oneline      # Find the commit
git revert <commit-hash>  # Or git reset if not pushed
cd ../..
git add packages/n8n-source
git commit -m "chore: revert n8n-source change"
```

### "Upstream has changes but I want to push"

Always sync first:

```bash
cd packages/n8n-source
git fetch upstream
git rebase upstream/master
# Resolve conflicts, then push
cd ../..
git add packages/n8n-source
git commit -m "chore: sync n8n-source"
git push
```

---

## Modified Files

Keep track of files you've modified:

1. `packages/cli/src/controllers/auth.controller.ts` - Playbook callback endpoint
2. `packages/cli/src/controllers/users.controller.ts` - Role change blocking
3. `packages/frontend/editor-ui/src/app/components/MainSidebarUserArea.vue` - Removed logout button
4. (Add other modified files as you identify them)

---

## Best Practices

1. **Always commit in n8n-source first** - Preserves your change history
2. **Then commit in playbook repo** - Tracks the n8n-source state
3. **Use descriptive commit messages** - Helps track what changed
4. **Test after changes** - Make sure your Playbook app still works
5. **Sync regularly** - Check upstream weekly or before major releases
6. **Resolve conflicts carefully** - Preserve Playbook-specific logic

---

## Scripts Reference

- `sync-upstream.sh` - Sync with upstream updates
- `update-playbook.sh` - Helper to update playbook repo after n8n changes

---

## Summary

**Regular Workflow:**

- **Make changes**: commit in n8n-source → commit in playbook root → push
- **Sync upstream**: `./sync-upstream.sh` → commit in playbook root → push

The scripts handle all the complexity for you!
