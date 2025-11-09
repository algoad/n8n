import type { IExecuteFunctions, IDataObject, IHttpRequestMethods } from 'n8n-workflow';

import type { TradingExecutionContext } from './execution-context';

export interface OrderTrackingData {
	type: 'stock' | 'crypto' | 'prediction-market' | 'sports-betting';
	orderData: IDataObject;
	context: TradingExecutionContext;
}

/**
 * Send order data to the NestJS API for tracking
 * @param context - The IExecuteFunctions context
 * @param orderData - The order data to track
 * @param orderType - The type of order
 * @param apiBaseUrl - Base URL of the NestJS API (defaults to env var or localhost)
 * @returns Promise resolving to the API response
 */
export async function sendOrderToAPI(
	context: IExecuteFunctions,
	orderData: IDataObject,
	orderType: 'stock' | 'crypto' | 'prediction-market' | 'sports-betting',
	apiBaseUrl?: string,
): Promise<IDataObject> {
	const { getTradingExecutionContext } = await import('./execution-context');
	const execContext = getTradingExecutionContext(context);

	// Get API base URL from environment or use default
	// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
	// API runs on port 3005 (see apps/api/src/main.ts)
	const baseUrl = apiBaseUrl ?? process.env.PLAYBOOK_API_BASE_URL ?? 'http://127.0.0.1:3005';

	// Determine the endpoint based on order type
	const endpointMap = {
		stock: '/api/trading-orders/stock',
		crypto: '/api/trading-orders/crypto',
		'prediction-market': '/api/trading-orders/prediction-market',
		'sports-betting': '/api/trading-orders/sports-betting',
	};

	const endpoint = endpointMap[orderType];
	const url = `${baseUrl}${endpoint}`;

	// Prepare the request body with order data and context
	const body: IDataObject = {
		...orderData,
		workflowId: execContext.workflowId,
		executionId: execContext.executionId,
		executionMode: execContext.executionMode,
		// Include executionContext if it was passed in orderData
		executionContext: orderData.executionContext,
	};

	// Get user ID from context
	const userId = execContext.userId;

	// Prepare headers with authentication
	const apiKey = process.env.PLAYBOOK_API_KEY;
	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	if (apiKey) {
		headers['X-API-Key'] = apiKey;
		// Include userId in header if available
		if (userId) {
			headers['X-User-Id'] = userId;
		} else {
			// For active workflows, userId might not be in execution context
			// The API will look up the workflow owner from workflowId
			// Just send the API key - the guard and controller will handle workflowId lookup
			context.logger?.warn(
				'User ID not available in execution context. API will attempt to resolve from workflowId. Order tracking may fail if workflow owner cannot be determined.',
			);
		}
	} else {
		// No API key - require userId
		if (!userId) {
			throw new Error(
				'User ID not available in execution context and no API key configured. Cannot track order.',
			);
		}
		// Include userId in body for JWT fallback
		body.userId = userId;
	}

	// Make HTTP request to the API
	const options = {
		method: 'POST' as IHttpRequestMethods,
		url,
		headers,
		body,
		json: true,
	};

	try {
		const response = await context.helpers.httpRequest(options);
		return response as IDataObject;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		// Log error but don't fail the node execution
		// Order tracking is non-critical
		context.logger?.warn(`Failed to track order in API: ${errorMessage}`);
		// Return empty object so node execution can continue
		return {};
	}
}
