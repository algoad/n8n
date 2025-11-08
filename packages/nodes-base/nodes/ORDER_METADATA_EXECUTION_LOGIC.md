# ORDER Metadata Execution Logic

## Overview

Nodes with the `ORDER` metadata tag (e.g., Alpaca Markets, Coinbase, Kalshi trading nodes) implement special execution logic based on three different execution contexts. This ensures safe trading practices and prevents accidental live trades during development and testing.

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

- **Credentials:** Always forced to use paper trading credentials, regardless of what the user has selected
- **Trade Execution:** **Real trades ARE executed**, but only on the paper trading account
- **Purpose:** Allows users to test complete workflows with real API calls, but safely on paper trading accounts

**Key Characteristics:**

- Execution mode is `manual`
- Workflow is inactive (`active: false`)
- No `destinationNode` restriction (full workflow execution)

### 3. Active (Production Execution)

**When:** Workflow is active and executes automatically (via triggers, webhooks, schedules, etc.).

**Behavior:**

- **Credentials:** Uses the credentials as configured by the user (can be live or paper)
- **Trade Execution:** **Real trades ARE executed** using the configured credentials
- **Purpose:** Production trading execution with full control over live vs paper trading

**Key Characteristics:**

- Workflow is active (`active: true`)
- Execution mode can be any value (not necessarily `manual`)

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

Nodes with ORDER metadata tag check for the tag and apply the appropriate logic:

```typescript
// Check if node has ORDER metadata tag
const nodeType = (this as any).nodeType;
const hasOrderMetadata = nodeType?.description?.metadata?.tags?.includes('ORDER') ?? false;

if (hasOrderMetadata) {
	const executionContext = getOrderExecutionContext(this);

	if (executionContext === 'execute-step') {
		// Force paper trading credentials
		// Mock the response (no real API call)
	} else if (executionContext === 'manual-inactive') {
		// Force paper trading credentials
		// Execute real trade on paper account
	} else if (executionContext === 'active') {
		// Use credentials as configured
		// Execute real trade
	}
}
```

## Safety Guarantees

### Execute Step Mode

- ✅ **Cannot execute real trades** - Mocked responses only
- ✅ **Cannot use live credentials** - Paper trading forced
- ✅ **Safe for testing** - No financial risk

### Manual Inactive Mode

- ✅ **Cannot use live credentials** - Paper trading forced
- ✅ **Real API calls** - Tests actual integration
- ✅ **Safe for testing** - No financial risk

### Active Mode

- ⚠️ **Can use live credentials** - User has full control
- ⚠️ **Real trades executed** - Production behavior
- ⚠️ **Financial risk** - Only use when workflow is ready

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
