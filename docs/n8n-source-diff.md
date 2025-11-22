# n8n Fork Diff Summary

## Overview

This document tracks the differences between the upstream n8n repository (n8n-io/n8n) and this fork.

**Upstream HEAD:** `ffbcafa2074e410279bf551bbac083874c10d19e`  
**Fork HEAD:** `3c22a04bff918eff28db9e5ca1ea81dba15c54ac`

## Commit History (8 commits ahead)

```
* 3c22a04bff trading and linting
* c9bbd9df72 feat: write orders to supabase db
* 8c62770c67 hide left nav
* eff1ccf7ed feat: executing paper trades in active mode
* 8ee44e0c10 trades
* 367f5ef102 nit
* b42485984d fork management
* 805a2080e8 n8n auth working
```

## Statistics

**Total files changed:** 132 files  
**Insertions:** +4,903 lines  
**Deletions:** -1,218 lines  
**Net change:** +3,685 lines

## New Files (A) — 20 files

### Documentation

- `docs/FORK_MANAGEMENT.md`
- `docs/N8N_SIDEBAR_HIDING_CHANGES.md`
- `docs/ORDER_NODE_GUIDE.md`
- `docs/n8n-source-diff.md` (this file)

### Trading/Alpaca Integration

- `packages/nodes-base/credentials/AlpacaMarketsApi.credentials.ts`
- `packages/nodes-base/nodes/AlpacaMarkets/AlpacaMarkets.node.ts`
- `packages/nodes-base/nodes/AlpacaMarkets/alpaca.svg`
- `packages/nodes-base/nodes/ORDER_METADATA_EXECUTION_LOGIC.md`

### Trading Utilities

- `packages/nodes-base/utils/execution-context.ts`
- `packages/nodes-base/utils/execution-context.spec.ts`
- `packages/nodes-base/utils/mock-trade-response.ts`
- `packages/nodes-base/utils/order-node-base.ts`
- `packages/nodes-base/utils/order-node-executor.ts`
- `packages/nodes-base/utils/order-node-shared-types.ts`
- `packages/nodes-base/utils/order-node-types.ts`
- `packages/nodes-base/utils/trading-api-client.ts`
- `packages/nodes-base/utils/trading-node-helper.ts`
- `packages/nodes-base/utils/trading-node-helper.spec.ts`

### Frontend Components

- `packages/frontend/editor-ui/src/app/components/TradingModeToggle.vue`

### Scripts

- `sync-upstream.sh`
- `update-playbook.sh`

## Modified Files (M) — 112 files

### Core Workflow & Execution

- `packages/cli/src/workflow-runner.ts` ⚠️ (uncommitted)
- `packages/cli/src/workflows/workflow-execution.service.ts` ⚠️ (uncommitted)
- `packages/workflow/src/interfaces.ts`
- `packages/workflow/src/expression.ts`
- `packages/workflow/src/workflow.ts`
- `packages/workflow/src/node-helpers.ts`
- `packages/workflow/src/telemetry-helpers.ts`
- `packages/workflow/src/node-parameters/filter-parameter.ts`

### Error Handling

- `packages/workflow/src/errors/base/base.error.ts`
- `packages/workflow/src/errors/node-api.error.ts`
- `packages/workflow/src/errors/node-operation.error.ts`
- `packages/workflow/src/errors/trigger-close.error.ts`
- `packages/workflow/src/errors/workflow-activation.error.ts`

### Controllers & API

- `packages/cli/src/controllers/auth.controller.ts`
- `packages/cli/src/controllers/node-types.controller.ts`
- `packages/cli/src/controllers/users.controller.ts`

### Frontend - Core UI

- `packages/frontend/editor-ui/src/App.vue`
- `packages/frontend/editor-ui/src/Interface.ts`
- `packages/frontend/editor-ui/src/n8n-theme.scss`

### Frontend - Components

- `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue`
- `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`
- `packages/frontend/editor-ui/src/app/components/MainSidebarUserArea.vue`
- `packages/frontend/editor-ui/src/app/components/NodeExecuteButton.vue`
- `packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts` ⚠️ (uncommitted)
- `packages/frontend/editor-ui/src/app/constants/nodeCreator.ts`
- `packages/frontend/editor-ui/src/app/constants/nodeTypes.ts`
- `packages/frontend/editor-ui/src/features/credentials/components/NodeCredentials.vue`
- `packages/frontend/editor-ui/src/features/shared/nodeCreator/views/viewsData.ts`

### Frontend - Design System

- `packages/frontend/@n8n/design-system/src/components/N8nMenuItem/MenuItem.vue`

### Frontend - i18n

- `packages/frontend/@n8n/i18n/src/locales/en.json`
- `packages/frontend/@n8n/i18n/src/index.test.ts`

### AI/Langchain Nodes (Many files updated)

- Multiple files in `packages/@n8n/nodes-langchain/` including:
  - Agent nodes
  - LLM nodes (Anthropic, OpenAI, Google Gemini, Ollama, Lemonade)
  - Vector stores (MongoDB Atlas, Qdrant, Weaviate)
  - Tools (Code, HttpRequest, Workflow)
  - Memory managers
  - Document loaders
  - Embeddings
  - Text splitters
  - Guardrails
  - MCP client tools

### Core Packages

- `packages/@n8n/utils/src/assert.ts`
- `packages/@n8n/utils/src/event-queue.test.ts`
- `packages/@n8n/utils/src/retry.test.ts`
- `packages/@n8n/db/src/services/auth.roles.service.ts`
- `packages/@n8n/permissions/src/roles/role-maps.ee.ts`
- `packages/@n8n/permissions/src/types.ee.ts`
- `packages/core/src/utils/is-json-compatible.ts`

### Extensions

- `packages/extensions/insights/src/frontend/index.ts`

### Nodes Base

- `packages/nodes-base/package.json` (significant changes)

### Testing

- `packages/testing/playwright/tests/ui/19-execution.spec.ts`
- `packages/testing/playwright/tests/ui/50-logs.spec.ts`

### CI/CD & Config

- `.github/workflows/data-tooling.yml`
- `.github/workflows/units-tests-reusable.yml`
- `renovate.json`
- `vitest.workspace.ts`
- `scripts/third-party-license-format.json`

### CodeMirror

- `packages/@n8n/codemirror-lang-sql/src/sql.ts`

### AI Workflow Builder

- `packages/@n8n/ai-workflow-builder.ee/evaluations/chains/workflow-evaluator.ts`

## Uncommitted Changes (7 files)

⚠️ **Warning:** The following files have uncommitted changes:

1. `packages/cli/src/workflow-runner.ts`
2. `packages/cli/src/workflows/workflow-execution.service.ts`
3. `packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts`
4. `packages/nodes-base/nodes/AlpacaMarkets/AlpacaMarkets.node.ts`
5. `packages/nodes-base/utils/order-node-executor.ts`
6. `packages/nodes-base/utils/trading-api-client.ts`
7. `packages/nodes-base/utils/trading-node-helper.ts`

## Key Features Added

1. **Trading Integration (Alpaca Markets)**
   - New AlpacaMarkets node for trading operations
   - Trading API client utilities
   - Order execution and management utilities
   - Mock trade response utilities for testing

2. **UI Enhancements**
   - Trading mode toggle component
   - Sidebar hiding functionality
   - Workflow execution improvements

3. **Documentation**
   - Fork management guide
   - Order node guide
   - Sidebar hiding changes documentation

4. **Infrastructure**
   - Scripts for syncing with upstream
   - Scripts for updating playbook

## To Generate Full Diff

To see the complete diff between upstream and your fork, run:

```bash
cd packages/n8n-source
git diff upstream/master...master
```

Or for a more readable summary:

```bash
git diff --stat upstream/master...master
```
