All changed files (38 total)
New files (A) — 15 files:

docs/FORK_MANAGEMENT.md
docs/N8N_SIDEBAR_HIDING_CHANGES.md
packages/frontend/editor-ui/src/app/components/TradingModeToggle.vue
packages/nodes-base/credentials/AlpacaMarketsApi.credentials.ts
packages/nodes-base/nodes/AlpacaMarkets/AlpacaMarkets.node.ts
packages/nodes-base/nodes/AlpacaMarkets/alpaca.svg
packages/nodes-base/nodes/ORDER_METADATA_EXECUTION_LOGIC.md
packages/nodes-base/utils/ORDER_NODE_GUIDE.md
packages/nodes-base/utils/execution-context.spec.ts
packages/nodes-base/utils/execution-context.ts
packages/nodes-base/utils/mock-trade-response.ts
packages/nodes-base/utils/order-node-base.ts
packages/nodes-base/utils/order-node-executor.ts
packages/nodes-base/utils/order-node-types.ts
packages/nodes-base/utils/trading-api-client.ts
packages/nodes-base/utils/trading-node-helper.ts
sync-upstream.sh

update-playbook.sh
Modified files (M) — 20 files:
packages/cli/src/controllers/auth.controller.ts
packages/cli/src/controllers/node-types.controller.ts
packages/cli/src/controllers/users.controller.ts
packages/cli/src/workflow-runner.ts ⚠️ (uncommitted)
packages/cli/src/workflows/workflow-execution.service.ts ⚠️ (uncommitted)
packages/frontend/@n8n/i18n/src/locales/en.json
packages/frontend/editor-ui/src/App.vue
packages/frontend/editor-ui/src/Interface.ts
packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue
packages/frontend/editor-ui/src/app/components/MainSidebar.vue
packages/frontend/editor-ui/src/app/components/MainSidebarUserArea.vue
packages/frontend/editor-ui/src/app/components/NodeExecuteButton.vue
packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts ⚠️ (uncommitted)
packages/frontend/editor-ui/src/app/constants/nodeCreator.ts
packages/frontend/editor-ui/src/app/constants/nodeTypes.ts
packages/frontend/editor-ui/src/features/credentials/components/NodeCredentials.vue
packages/frontend/editor-ui/src/features/shared/nodeCreator/views/viewsData.ts
packages/frontend/editor-ui/src/n8n-theme.scss
packages/nodes-base/package.json
packages/workflow/src/interfaces.ts

Uncommitted changes (7 files):
packages/cli/src/workflow-runner.ts
packages/cli/src/workflows/workflow-execution.service.ts
packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts
packages/nodes-base/nodes/AlpacaMarkets/AlpacaMarkets.node.ts
packages/nodes-base/utils/order-node-executor.ts
packages/nodes-base/utils/trading-api-client.ts
packages/nodes-base/utils/trading-node-helper.ts
