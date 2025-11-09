# ORDER Node Development Guide

This guide explains how to create new ORDER nodes (trading nodes) using the reusable ORDER node infrastructure.

## Overview

The ORDER node infrastructure provides:

- **Automatic execution context detection** (execute-step, manual-inactive, active)
- **Automatic paper trading enforcement** for safe testing
- **Automatic mocking** in execute-step mode to prevent real trades
- **Reusable utilities** and enums for consistent behavior

## Architecture

### Core Files

1. **`order-node-types.ts`** - Enums and type definitions
   - `OrderExecutionContext` - Execution context types
   - `OrderOperation` - Trade operation types
   - `TradingEnvironment` - Paper vs Live trading
   - Interfaces for ORDER node configuration

2. **`order-node-executor.ts`** - Core execution logic
   - `OrderNodeExecutor` - Static utility class with:
     - `hasOrderMetadata()` - Check if node has ORDER tag
     - `isTradeOperation()` - Check if operation executes trades
     - `determineExecutionBehavior()` - Main logic for execution behavior
     - `forcePaperTradingCredentials()` - Force paper trading
     - `isPaperTrading()` - Check if using paper trading

3. **`execution-context.ts`** - Context detection
   - `getOrderExecutionContext()` - Detects execution context

## Creating a New ORDER Node

### Step 1: Add ORDER Metadata

Add the ORDER metadata tag to your node description:

```typescript
export class MyTradingNode implements INodeType {
	description: INodeTypeDescription & { metadata?: { tags: string[] } } = {
		// ... other properties
		metadata: {
			tags: ['ORDER'],
		},
		// ...
	};
}
```

### Step 2: Import Required Utilities

```typescript
import {
	OrderOperation,
	TradingEnvironment,
	OrderExecutionContext,
} from '../../utils/order-node-types';
import { OrderNodeExecutor } from '../../utils/order-node-executor';
```

### Step 3: Use ORDER Node Logic in Execute Method

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			// Get node type to check for ORDER metadata
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const nodeType = (this as any).nodeType as INodeType | undefined;
			const hasOrderMetadata = OrderNodeExecutor.hasOrderMetadata(
				nodeType as { description?: { metadata?: { tags?: string[] } } } | null | undefined,
			);
			const isTradeOperation = OrderNodeExecutor.isTradeOperation(operation);

			// Determine execution behavior
			const config = {
				hasOrderMetadata,
				executionContext: null as OrderExecutionContext | null,
				operation,
				isTradeOperation,
			};

			// Get execution context if this is an ORDER node
			if (hasOrderMetadata) {
				try {
					const { getOrderExecutionContext } = await import('../../utils/execution-context');
					config.executionContext = getOrderExecutionContext(this);
				} catch (error) {
					config.executionContext = OrderExecutionContext.executeStep;
				}
			}

			const executionResult = OrderNodeExecutor.determineExecutionBehavior(this, config);

			// Get credentials
			let credentials = await this.getCredentials('myTradingApi', i);

			// Force paper trading if needed
			if (executionResult.forcePaperTrading && !OrderNodeExecutor.isPaperTrading(credentials)) {
				credentials = OrderNodeExecutor.forcePaperTradingCredentials(credentials);
			}

			// Determine base URL based on environment
			const environment = (credentials.environment as TradingEnvironment) || TradingEnvironment.paper;
			const baseUrl = environment === TradingEnvironment.paper
				? 'https://paper-api.example.com'
				: 'https://api.example.com';

			let responseData: IDataObject = {};

			// Handle trade operations
			if (operation === OrderOperation.placeOrder) {
				// Build order request
				const orderBody = { /* ... */ };

				// Check if we should mock
				if (executionResult.shouldMock && isTradeOperation) {
					responseData = this.getMockTradeResponse(orderBody);
				} else if (executionResult.executeRealTrade) {
					// Execute real trade
					responseData = await this.executeTrade(orderBody, credentials, baseUrl);
				}
			}

			// Return response
			returnData.push({
				json: responseData,
				pairedItem: { item: i },
			});
		} catch (error) {
			// Handle errors
		}
	}

	return [returnData];
}
```

### Step 4: Implement Mock Response Generator

Create a mock response function for your broker:

```typescript
export function mockMyBrokerPlaceOrderResponse(body: IDataObject): IDataObject {
	return {
		id: `mock-order-${Date.now()}`,
		symbol: body.symbol,
		status: 'pending',
		// ... other mock fields
	};
}
```

## Execution Contexts

### Execute-Step (`OrderExecutionContext.executeStep`)

- **When**: Single node execution during editing (clicking "Execute Step")
- **Behavior**:
  - Always mocks trade responses
  - Forces paper trading credentials
  - Never executes real trades

### Manual-Inactive (`OrderExecutionContext.manualInactive`)

- **When**: Manual workflow execution when workflow is inactive
- **Behavior**:
  - Executes real trades
  - Forces paper trading credentials
  - User cannot switch to live mode

### Active (`OrderExecutionContext.active`)

- **When**: Workflow execution when workflow is active
- **Behavior**:
  - Executes real trades
  - Uses configured credentials (live or paper)
  - Allows live trading

## Using Enums

### OrderOperation Enum

```typescript
import { OrderOperation } from '../../utils/order-node-types';

// In node properties
{
	name: 'Place Order',
	value: OrderOperation.placeOrder,
}

// In execute method
if (operation === OrderOperation.placeOrder) {
	// Handle place order
}
```

### TradingEnvironment Enum

```typescript
import { TradingEnvironment } from '../../utils/order-node-types';

const environment = credentials.environment as TradingEnvironment;
if (environment === TradingEnvironment.paper) {
	// Use paper trading URL
}
```

## Best Practices

1. **Always use enums** instead of hardcoded strings
2. **Always check `hasOrderMetadata`** before applying ORDER logic
3. **Always use `OrderNodeExecutor.determineExecutionBehavior()`** to get execution behavior
4. **Always respect `executionResult.shouldMock`** for trade operations
5. **Always force paper trading** when `executionResult.forcePaperTrading` is true
6. **Log execution context** for debugging ORDER nodes

## Example: Complete ORDER Node

See `AlpacaMarkets.node.ts` for a complete example of an ORDER node implementation.

## Adding New ORDER Operations

To add a new operation type:

1. Add to `OrderOperation` enum in `order-node-types.ts`:

```typescript
export const enum OrderOperation {
	placeOrder = 'placeOrder',
	cancelOrder = 'cancelOrder',
	modifyOrder = 'modifyOrder',
	newOperation = 'newOperation', // Add here
}
```

2. Update `isTradeOperation()` in `order-node-executor.ts` if needed (it checks against all enum values automatically)

3. Use the new enum value in your node properties and execute method
