import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import {
	getTradingExecutionContext,
	determineTestModeWithCredentials,
	type TradingExecutionContext,
	getOrderExecutionContext,
} from './execution-context';
import { OrderExecutionContext } from './order-node-types';
import { sendOrderToAPI } from './trading-api-client';

/**
 * Track an order after successful placement
 * @param context - The IExecuteFunctions context
 * @param orderData - The order data including broker response
 * @param orderType - The type of order
 * @param credentials - The credentials object (for environment check)
 * @param apiBaseUrl - Optional API base URL
 * @param orderExecutionContext - Optional execution context (if already determined)
 * @param shouldMock - Whether the trade was mocked (skip database write if true)
 * @returns Promise resolving to tracking result
 */
export async function trackOrder(
	context: IExecuteFunctions,
	orderData: IDataObject,
	orderType: 'stock' | 'crypto' | 'predictionMarket' | 'sportsBetting',
	credentials?: IDataObject,
	apiBaseUrl?: string,
	orderExecutionContext?: OrderExecutionContext,
	shouldMock?: boolean,
): Promise<IDataObject> {
	// Get execution context
	const execContext = getTradingExecutionContext(context);

	// Determine test mode with credentials
	const workflow = context.getWorkflow();
	const isTestMode = determineTestModeWithCredentials(
		credentials,
		execContext.executionMode,
		workflow.active,
	);

	// Determine environment from credentials
	const environment = credentials?.environment === 'paper' ? 'paper' : 'live';

	// Get OrderExecutionContext if not provided
	let executionContext: OrderExecutionContext | undefined = orderExecutionContext;
	if (!executionContext) {
		try {
			executionContext = getOrderExecutionContext(context);
		} catch (error) {
			// If we can't determine it, leave it undefined
			context.logger?.warn('Could not determine OrderExecutionContext for tracking');
		}
	}

	// Check if we're in mock mode - skip database write if so
	// If shouldMock is explicitly passed, use that (most reliable)
	// Otherwise, fall back to checking execution context and workflow settings
	let isMockMode: boolean;
	if (shouldMock === true) {
		// Explicitly true - definitely mock mode
		isMockMode = true;
	} else if (shouldMock === false) {
		// Explicitly false - but still check execution context as safety
		const isExecuteStep = executionContext === OrderExecutionContext.executeStep;
		if (isExecuteStep) {
			// Execute step always mocks, even if shouldMock says false (safety override)
			isMockMode = true;
		} else {
			isMockMode = false;
		}
	} else {
		// shouldMock is undefined - use fallback detection
		const isExecuteStep = executionContext === OrderExecutionContext.executeStep;
		// Type assertion: workflow object has settings at runtime even though IWorkflowMetadata doesn't include it
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const workflowSettings = (workflow as any).settings ?? {};
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const tradingMode = (workflowSettings.tradingMode as 'mock' | 'paper') ?? 'mock';
		isMockMode = isExecuteStep || tradingMode === 'mock';
	}

	if (isMockMode) {
		// Don't write to database in mock mode
		context.logger?.info('Skipping database write for mock mode trade');
		return {};
	}

	// Prepare order tracking data
	const trackingData: IDataObject = {
		...orderData,
		environment,
		executionMode: isTestMode ? 'test' : 'production',
		// Convert enum to string for API serialization
		executionContext: executionContext ? String(executionContext) : undefined,
	};

	// Send to API
	return await sendOrderToAPI(context, trackingData, orderType, apiBaseUrl);
}

/**
 * Get execution context for trading nodes
 * @param context - The IExecuteFunctions context
 * @returns Trading execution context
 */
export function getExecutionContext(context: IExecuteFunctions): TradingExecutionContext {
	return getTradingExecutionContext(context);
}

/**
 * Determine if execution is in test mode
 * @param context - The IExecuteFunctions context
 * @param credentials - Optional credentials object
 * @returns true if execution is in test mode
 */
export function determineTestMode(context: IExecuteFunctions, credentials?: IDataObject): boolean {
	const workflow = context.getWorkflow();
	const workflowDataProxy = context.getWorkflowDataProxy(0);
	const executionModeRaw = (workflowDataProxy.$execution as IDataObject)?.mode as
		| string
		| undefined;
	const executionMode = executionModeRaw === 'test' ? 'test' : 'production';

	return determineTestModeWithCredentials(credentials, executionMode, workflow.active);
}
