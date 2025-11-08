import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { OrderNodeExecutor } from './order-node-executor';
import {
	OrderExecutionContext,
	TradingEnvironment,
	type OrderNodeConfig,
} from './order-node-types';

/**
 * Interface for ORDER node implementations
 * All trading nodes that execute orders should implement this
 */
export interface IOrderNode extends INodeType {
	/**
	 * Get the mock response for a trade execution
	 * Each broker should implement their own mock response generator
	 */
	getMockTradeResponse(orderData: IDataObject): IDataObject;

	/**
	 * Get the base URL for the trading API based on environment
	 */
	getBaseUrl(environment: TradingEnvironment): string;

	/**
	 * Get the credential type name for this node
	 */
	getCredentialTypeName(): string;
}

/**
 * Abstract base class for ORDER metadata nodes
 * Provides common execution logic that all trading nodes can inherit
 */
export abstract class OrderNodeBase implements IOrderNode {
	abstract description: INodeTypeDescription & { metadata?: { tags: string[] } };

	/**
	 * Abstract methods that each ORDER node must implement
	 */
	abstract getMockTradeResponse(orderData: IDataObject): IDataObject;
	abstract getBaseUrl(environment: TradingEnvironment): string;
	abstract getCredentialTypeName(): string;

	/**
	 * Common execute method that handles ORDER metadata logic
	 * Subclasses should call this and then implement their specific trade execution
	 */
	protected async executeOrderNode(
		this: IExecuteFunctions,
		operation: string,
		executeTrade: (credentials: IDataObject, baseUrl: string) => Promise<IDataObject>,
	): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get node type to check for ORDER metadata
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const nodeType = (this as any).nodeType as
			| { description?: { metadata?: { tags?: string[] } } }
			| undefined;
		const hasOrderMetadata = OrderNodeExecutor.hasOrderMetadata(nodeType);
		const isTradeOperation = OrderNodeExecutor.isTradeOperation(operation);

		// Get execution context if this is an ORDER node
		let executionContext: OrderExecutionContext | null = null;
		if (hasOrderMetadata) {
			try {
				const { getOrderExecutionContext } = await import('./execution-context');
				executionContext = getOrderExecutionContext(this);
			} catch (error) {
				// Default to execute-step for safety if detection fails
				executionContext = OrderExecutionContext.ExecuteStep;
			}
		}

		// Determine execution behavior
		const config: OrderNodeConfig = {
			hasOrderMetadata,
			executionContext,
			operation,
			isTradeOperation,
		};

		const executionResult = OrderNodeExecutor.determineExecutionBehavior(this, config);

		// Log execution context for debugging
		if (hasOrderMetadata) {
			this.logger?.warn(
				`[ORDER Node] Context: ${executionResult.context}, Mock: ${executionResult.shouldMock}, Force Paper: ${executionResult.forcePaperTrading}, Operation: ${operation}`,
			);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				// Get credentials
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const credentialTypeName = (this as any).getCredentialTypeName();
				let credentials = await this.getCredentials(credentialTypeName, i);

				// Force paper trading if needed
				if (executionResult.forcePaperTrading && !OrderNodeExecutor.isPaperTrading(credentials)) {
					credentials = OrderNodeExecutor.forcePaperTradingCredentials(credentials);
					this.logger?.info(
						`ORDER node: Forcing paper trading credentials (context: ${executionResult.context})`,
					);
				}

				// Determine base URL
				const environment =
					(credentials.environment as TradingEnvironment) || TradingEnvironment.Paper;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const baseUrl = (this as any).getBaseUrl(environment);

				let responseData: IDataObject = {};

				// Check if we should mock the response
				if (executionResult.shouldMock && isTradeOperation) {
					// Get order data from items
					const orderData = items[i].json;
					this.logger?.warn(
						'ORDER node: Mocking trade execution response. NO REAL TRADE WILL BE EXECUTED.',
					);
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					responseData = (this as any).getMockTradeResponse(orderData);
				} else if (executionResult.executeRealTrade) {
					// Execute real trade
					responseData = await executeTrade(credentials, baseUrl);
				} else {
					// Should not happen, but safety check
					this.logger?.warn(
						'ORDER node: Neither mocking nor executing trade. This should not happen.',
					);
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					responseData = (this as any).getMockTradeResponse(items[i].json);
				}

				// Return the response data
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push.apply(returnData, executionData);
			} catch (error: unknown) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					returnData.push({
						json: {
							error: errorMessage,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
