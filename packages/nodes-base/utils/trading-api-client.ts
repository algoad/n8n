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
	const baseUrl = apiBaseUrl || process.env.TRADING_API_BASE_URL || 'http://localhost:3001';

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
	};

	// Get user ID from context
	const userId = execContext.userId;

	if (!userId) {
		throw new Error('User ID not available in execution context. Cannot track order.');
	}

	// Prepare headers with authentication
	// Option 1: Service-to-service API key (recommended for production)
	const apiKey = process.env.TRADING_API_KEY;
	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	if (apiKey) {
		headers['X-API-Key'] = apiKey;
		headers['X-User-Id'] = userId;
	} else {
		// Option 2: If no API key, try to use JWT token from n8n context
		// This would require n8n to pass the Supabase JWT token
		// For now, we'll include user ID in the body and let the API handle it
		// Note: The API endpoint will need to be updated to accept user ID in body
		// or use a different authentication method
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
