import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import {
	getTradingExecutionContext,
	determineTestModeWithCredentials,
	type TradingExecutionContext,
} from './execution-context';
import { sendOrderToAPI } from './trading-api-client';

import { TradingEnvironment } from './order-node-types';

/**
 * Track an order after successful placement
 * @param context - The IExecuteFunctions context
 * @param orderData - The order data including broker response
 * @param orderType - The type of order
 * @param credentials - The credentials object (for environment check)
 * @param apiBaseUrl - Optional API base URL
 * @param tradingEnvironment - The trading environment used for execution
 * @returns Promise resolving to tracking result
 */
export async function trackOrder(
	context: IExecuteFunctions,
	orderData: IDataObject,
	orderType: 'stock' | 'crypto' | 'predictionMarket' | 'sportsBetting',
	credentials?: IDataObject,
	apiBaseUrl?: string,
	tradingEnvironment?: TradingEnvironment,
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

	// Check if we're in mock mode - skip database write if so
	if (tradingEnvironment === TradingEnvironment.mock) {
		// Explicitly mock mode
		context.logger?.info('Skipping database write for mock mode trade');
		return {};
	}

	// Prepare order tracking data
	const trackingData: IDataObject = {
		...orderData,
		environment,
		executionMode: isTestMode ? 'test' : 'production',
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
