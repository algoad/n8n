# ORDER Metadata Execution Logic

## Overview

Nodes with the `ORDER` metadata tag (e.g., Alpaca Markets, Coinbase, Kalshi trading nodes) implement special execution logic based on execution contexts and workflow-level trading mode settings. This ensures safe trading practices and prevents accidental live trades during development and testing.

## Workflow-Level Trading Mode

Each workflow has a **Trading Mode** toggle that controls how ORDER nodes behave when the workflow is executed:

### Mock Mode (Default)

- **Behavior:** All ORDER nodes in the workflow will return mocked responses
- **Trade Execution:** **NO real trades are executed** (neither paper nor live)
- **Purpose:** Safe testing and development without any API calls or financial risk
- **When to use:** During workflow development, testing, or when you want to preview behavior without executing trades

### Paper Mode

- **Behavior:** ORDER nodes will execute real trades on paper trading accounts
- **Trade Execution:** **Real trades ARE executed** on paper trading accounts only
- **Purpose:** Test workflows with real API calls but safely on paper accounts
- **When to use:** When you want to test the full workflow with real API integration but without financial risk

**Note:** The trading mode toggle only appears in workflows that contain at least one ORDER node (trading node).

## Node-Level Execution (Execute Step)

**Important:** When executing a single node using "Execute step" in the workflow editor, the node will **ALWAYS** return mocked data, regardless of the workflow-level trading mode setting. This ensures that individual node testing is always safe and never executes real trades.

## Execution Contexts

n8n provides three distinct execution contexts where a node can be executed:

### 1. Execute Step (Single Node Execution)

**When:** User clicks "Execute step" button while editing a node in the workflow editor.

**Behavior:**

- **Credentials:** Always forced to use paper trading credentials, regardless of what the user has selected
- **Trade Execution:** **NO real trades are executed**. The node returns a mocked response that simulates what would happen if the trade was executed
- **Purpose:** Allows users to test and preview trade execution without any risk or cost

**Key Characteristics:**

- `destinationNode` matches the current node name
- Execution mode is `manual`
- Workflow is inactive

### 2. Manual Inactive (Manual Workflow Execution)

**When:** User manually executes the entire workflow while it is in inactive state.

**Behavior:**

- **Workflow Trading Mode = Mock:** Returns mocked responses (no real trades)
- **Workflow Trading Mode = Paper:** Executes real trades on paper trading account
- **Credentials:** Always forced to use paper trading credentials when executing real trades
- **Purpose:** Allows users to test complete workflows with real API calls, but safely on paper trading accounts

**Key Characteristics:**

- Execution mode is `manual`
- Workflow is inactive (`active: false`)
- No `destinationNode` restriction (full workflow execution)
- Behavior depends on workflow `tradingMode` setting

### 3. Active (Production Execution)

**When:** Workflow is active and executes automatically (via triggers, webhooks, schedules, etc.).

**Behavior:**

- **Workflow Trading Mode = Mock:** Returns mocked responses (no real trades)
- **Workflow Trading Mode = Paper:** Executes real trades on paper trading account (credentials forced to paper)
- **Credentials:** When in paper mode, forced to use paper trading. When workflow trading mode is not set, uses credentials as configured by the user (can be live or paper)
- **Trade Execution:** Depends on workflow `tradingMode` setting

**Key Characteristics:**

- Workflow is active (`active: true`)
- Execution mode can be any value (not necessarily `manual`)
- Behavior depends on workflow `tradingMode` setting

## Implementation Details

### Detection Logic

The execution context is determined by the `getOrderExecutionContext()` function in `utils/execution-context.ts`:

```typescript
export function getOrderExecutionContext(context: IExecuteFunctions): OrderExecutionContext {
	const workflow = context.getWorkflow();
	const node = context.getNode();

	const runExecutionData = (context as any).runExecutionData;
	const destinationNode = runExecutionData?.startData?.destinationNode;
	const isExecuteStep = destinationNode === node.name;
	const isManual = (context as any).mode === 'manual';
	const isWorkflowActive = workflow.active;

	// 1. Execute step: destinationNode matches current node and mode is manual
	if (isExecuteStep && isManual) {
		return 'execute-step';
	}

	// 2. Manual inactive: manual mode and workflow is inactive
	if (isManual && !isWorkflowActive) {
		return 'manual-inactive';
	}

	// 3. Active: workflow is active (regardless of mode)
	if (isWorkflowActive) {
		return 'active';
	}

	// Default to manual-inactive for safety
	return 'manual-inactive';
}
```

### Node Implementation

Nodes with ORDER metadata tag check for the tag and apply the appropriate logic using `OrderNodeExecutor.determineExecutionBehavior()`:

```typescript
import { OrderNodeExecutor } from '../../utils/order-node-executor';

// Check if node has ORDER metadata tag
const nodeType = (this as any).nodeType;
const hasOrderMetadata = OrderNodeExecutor.hasOrderMetadata(nodeType);

if (hasOrderMetadata) {
	const executionContext = getOrderExecutionContext(this);
	const operation = this.getNodeParameter('operation', 0);
	const isTradeOperation = OrderNodeExecutor.isTradeOperation(operation);

	const executionResult = OrderNodeExecutor.determineExecutionBehavior(this, {
		hasOrderMetadata,
		executionContext,
		isTradeOperation,
	});

	if (executionResult.shouldMock) {
		// Return mocked response (no real API call)
		return [[{ json: mockTradeResponse }]];
	} else if (executionResult.forcePaperTrading) {
		// Force paper trading credentials
		credentials = OrderNodeExecutor.forcePaperTradingCredentials(credentials);
		// Execute real trade on paper account
	} else {
		// Use credentials as configured
		// Execute real trade
	}
}
```

The `determineExecutionBehavior()` method automatically:

1. Checks if execution is "execute-step" (always mocks)
2. Checks workflow `tradingMode` setting (mock vs paper)
3. Determines appropriate behavior based on execution context and workflow settings

## Safety Guarantees

### Execute Step Mode (Node-Level)

- ✅ **ALWAYS mocked** - Cannot execute real trades, regardless of workflow settings
- ✅ **Cannot use live credentials** - Paper trading forced
- ✅ **Safe for testing** - No financial risk
- ✅ **Overrides workflow settings** - Always safe, even if workflow is in paper mode

### Workflow-Level Mock Mode

- ✅ **All trades mocked** - No real trades executed, regardless of execution context
- ✅ **No API calls** - Completely safe for testing
- ✅ **Applies to all ORDER nodes** - Consistent behavior across all trading nodes in workflow

### Workflow-Level Paper Mode

#### Manual Inactive Execution

- ✅ **Cannot use live credentials** - Paper trading forced
- ✅ **Real API calls** - Tests actual integration
- ✅ **Safe for testing** - No financial risk (paper account only)

#### Active Execution

- ⚠️ **Paper trading forced** - Even if user configured live credentials, paper is used
- ⚠️ **Real trades executed** - But only on paper account
- ✅ **No financial risk** - Paper account only

## Adding ORDER Metadata to New Nodes

To add ORDER metadata to a new trading node:

1. **Add metadata to node description:**

```typescript
export class YourTradingNode implements INodeType {
	description: INodeTypeDescription & { metadata?: { tags: string[] } } = {
		// ... other properties
		metadata: {
			tags: ['ORDER'],
		},
	};
}
```

2. **Import the utilities:**

```typescript
import { getOrderExecutionContext } from '../../utils/execution-context';
import { mockYourTradingResponse } from '../../utils/mock-trade-response';
```

3. **Implement the logic in execute() method:**

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // Check for ORDER metadata
  const nodeType = (this as any).nodeType;
  const hasOrderMetadata =
    nodeType?.description?.metadata?.tags?.includes('ORDER') ?? false;

  if (hasOrderMetadata) {
    const executionContext = getOrderExecutionContext(this);

    // Apply appropriate logic based on context
    // ... (see implementation details above)
  }

  // ... rest of node logic
}
```

## Mock Response Functions

Mock response functions simulate realistic API responses. See `utils/mock-trade-response.ts` for examples:

- `mockAlpacaPlaceOrderResponse()` - Mocks Alpaca Markets order responses
- Add similar functions for other brokers (Coinbase, Kalshi, etc.)

## Testing

When testing ORDER nodes:

1. **Execute Step:** Verify mocked responses are returned and no API calls are made
2. **Manual Inactive:** Verify paper trading credentials are forced and real API calls use paper endpoints
3. **Active:** Verify credentials are used as configured and real API calls use configured endpoints

## Security Considerations

- The execution context detection relies on internal n8n execution data
- Credential forcing is done at runtime and cannot be bypassed by users
- Mock responses are clearly marked in logs for audit purposes
- All ORDER node executions are logged with context information

## Related Files

- `utils/execution-context.ts` - Execution context detection
- `utils/mock-trade-response.ts` - Mock response generators
- `nodes/AlpacaMarkets/AlpacaMarkets.node.ts` - Example implementation
