# Managing the n8n Fork

This document explains how to manage your n8n fork while keeping it synced with upstream updates from the [n8n-io/n8n](https://github.com/n8n-io/n8n.git) repository.

## Current Setup

- **Upstream**: Original n8n repository (`https://github.com/n8n-io/n8n.git`)
- **Your Changes**: 14 modified files for Playbook integration
- **Goal**: Keep your customizations while staying updated with n8n releases

## Recommended Workflow

### 1. Configure Git Remotes

Set up two remotes:
- `upstream`: Original n8n repository (for pulling updates)
- `origin`: Your fork/repository (for pushing your changes)

```bash
cd packages/n8n-source

# Add upstream remote (if not already added)
git remote add upstream https://github.com/n8n-io/n8n.git

# Verify remotes
git remote -v
```

### 2. Create a Custom Branch for Your Changes

Keep your changes on a separate branch (e.g., `playbook-integration`):

```bash
# Create and switch to your custom branch
git checkout -b playbook-integration

# Commit your 14 modified files
git add .
git commit -m "feat: Playbook integration changes"
```

### 3. Syncing with Upstream

When n8n releases updates (you mentioned 28 commits ahead):

```bash
# Fetch latest from upstream
git fetch upstream

# Check what branch you're on
git branch

# Switch to your custom branch
git checkout playbook-integration

# Merge upstream changes (recommended: rebase for cleaner history)
git rebase upstream/master
# OR if conflicts are too complex:
git merge upstream/master

# Resolve any conflicts in your modified files
# Test thoroughly after merging
```

### 4. Pushing Your Changes to Playbook Repo

**Option A: Git Submodule (Recommended for Monorepo)**

If `packages/n8n-source` is tracked as a submodule in your playbook repo:

```bash
# From playbook root
cd packages/n8n-source
git checkout playbook-integration
git push origin playbook-integration  # Push to your fork

# From playbook root, commit the submodule reference
cd ../..
git add packages/n8n-source
git commit -m "chore: update n8n-source to latest with playbook changes"
git push
```

**Option B: Direct Inclusion (Current Setup)**

If `packages/n8n-source` is directly included in your playbook repo:

```bash
# From playbook root
git add packages/n8n-source
git commit -m "chore: update n8n-source with playbook integration changes"
git push
```

## Best Practices

### 1. Keep Changes Minimal and Documented

- Document why each file was modified
- Keep changes focused on Playbook-specific needs
- Avoid modifying core n8n functionality unnecessarily

### 2. Use Feature Branches

```bash
# Create feature branch for specific changes
git checkout -b feature/playbook-auth-callback
# Make changes
git commit -m "feat: add playbook callback endpoint"
# Merge back to playbook-integration when ready
git checkout playbook-integration
git merge feature/playbook-auth-callback
```

### 3. Regular Sync Schedule

- **Weekly**: Check for upstream updates
- **Before Major Releases**: Test compatibility
- **After Merging**: Always test thoroughly

### 4. Conflict Resolution Strategy

When upstream changes conflict with your modifications:

1. **Identify the conflict**: `git status` shows conflicted files
2. **Review upstream changes**: Understand what changed
3. **Preserve your logic**: Keep Playbook-specific code
4. **Test thoroughly**: Ensure integration still works
5. **Document**: Note why conflicts occurred

## Quick Reference Commands

```bash
# Check current status
cd packages/n8n-source
git status

# See your modifications
git diff

# Fetch upstream updates
git fetch upstream

# See commits ahead/behind
git log HEAD..upstream/master  # Commits you're missing
git log upstream/master..HEAD  # Your commits

# Sync with upstream (rebase)
git rebase upstream/master

# Sync with upstream (merge)
git merge upstream/master

# Push your changes
git push origin playbook-integration
```

## Modified Files Tracking

Keep a list of files you've modified for easy reference:

1. `packages/cli/src/controllers/auth.controller.ts` - Playbook callback endpoint
2. `packages/cli/src/controllers/users.controller.ts` - Role change blocking
3. `packages/frontend/editor-ui/src/app/components/MainSidebarUserArea.vue` - Removed logout button
4. (Add your other 11 modified files here)

## Troubleshooting

### "Your branch is behind 'upstream/master' by X commits"

```bash
git fetch upstream
git rebase upstream/master
```

### "Merge conflicts"

```bash
# See conflicted files
git status

# Resolve conflicts manually, then:
git add <resolved-files>
git rebase --continue
```

### "Want to push but upstream has changes"

Always sync first:
```bash
git fetch upstream
git rebase upstream/master
# Resolve conflicts, then push
git push origin playbook-integration
```

## Integration with Playbook Repo

Since `packages/n8n-source` is part of your monorepo, you have two options:

1. **Keep as separate git repo** (current): Manage n8n-source independently
2. **Convert to submodule**: More isolation, cleaner history

For now, keeping it as a separate repo is fine. Just ensure:
- Your changes are committed in `packages/n8n-source`
- The playbook repo tracks the n8n-source directory state
- Team members know to run `git submodule update` if converted later

