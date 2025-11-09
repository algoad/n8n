import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { getOrderExecutionContext } from './execution-context';
import {
	OrderExecutionContext,
	TradingEnvironment,
	type OrderNodeConfig,
	type OrderExecutionResult,
} from './order-node-types';

/**
 * Base utility class for ORDER metadata nodes
 * Provides common execution logic for all trading nodes
 */
export class OrderNodeExecutor {
	/**
	 * Check if a node has ORDER metadata tag
	 */
	static hasOrderMetadata(
		nodeType: { description?: { metadata?: { tags?: string[] } } } | null | undefined,
	): boolean {
		if (!nodeType?.description) return false;
		const metadata = (nodeType.description as { metadata?: { tags?: string[] } })?.metadata;
		return metadata?.tags?.includes('ORDER') ?? false;
	}

	/**
	 * Check if an operation executes a trade
	 */
	static isTradeOperation(operation: string): boolean {
		return operation === 'placeOrder' || operation === 'cancelOrder' || operation === 'modifyOrder';
	}

	/**
	 * Determine ORDER node execution behavior based on context and workflow settings
	 */
	static determineExecutionBehavior(
		context: IExecuteFunctions,
		config: OrderNodeConfig,
	): OrderExecutionResult {
		const { hasOrderMetadata, executionContext, isTradeOperation } = config;

		// If not an ORDER node or not a trade operation, use default behavior
		if (!hasOrderMetadata || !isTradeOperation) {
			return {
				context: executionContext || OrderExecutionContext.ManualInactive,
				shouldMock: false,
				forcePaperTrading: false,
				executeRealTrade: true,
			};
		}

		// Get execution context if not already determined
		let detectedContext = executionContext;
		if (!detectedContext) {
			try {
				detectedContext = getOrderExecutionContext(context);
			} catch (error) {
				// Default to execute-step for safety if detection fails
				detectedContext = OrderExecutionContext.ExecuteStep;
			}
		}

		// Additional safety checks for execute-step detection
		if (detectedContext === OrderExecutionContext.ManualInactive) {
			detectedContext = this.refineExecutionContext(context, detectedContext);
		}

		// Get workflow trading mode setting
		const workflow = context.getWorkflow();
		// Type assertion: workflow object has settings at runtime even though IWorkflowMetadata doesn't include it
		const workflowSettings = (workflow as any).settings || {};
		const tradingMode = (workflowSettings.tradingMode as 'mock' | 'paper') || 'mock';

		// Execute step: ALWAYS mock (node-level override)
		if (detectedContext === OrderExecutionContext.ExecuteStep) {
			return {
				context: detectedContext,
				shouldMock: true,
				forcePaperTrading: true,
				executeRealTrade: false,
			};
		}

		// For workflow-level execution (manual-inactive or active), check workflow trading mode
		if (tradingMode === 'mock') {
			// Workflow is in mock mode: mock all trades regardless of context
			return {
				context: detectedContext,
				shouldMock: true,
				forcePaperTrading: true,
				executeRealTrade: false,
			};
		}

		// Workflow is in paper mode: execute real trades on paper account
		// Determine behavior based on context
		switch (detectedContext) {
			case OrderExecutionContext.ManualInactive:
				return {
					context: detectedContext,
					shouldMock: false,
					forcePaperTrading: true,
					executeRealTrade: true,
				};

			case OrderExecutionContext.Active:
				return {
					context: detectedContext,
					shouldMock: false,
					forcePaperTrading: false,
					executeRealTrade: true,
				};

			default:
				// Safety fallback: treat unknown as execute-step
				return {
					context: OrderExecutionContext.ExecuteStep,
					shouldMock: true,
					forcePaperTrading: true,
					executeRealTrade: false,
				};
		}
	}

	/**
	 * Refine execution context detection using additional checks
	 */
	private static refineExecutionContext(
		context: IExecuteFunctions,
		currentContext: OrderExecutionContext,
	): OrderExecutionContext {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const contextAny = context as any;
		const mode = contextAny.mode ?? context.getMode();
		const workflow = context.getWorkflow();

		if (
			mode === 'manual' &&
			!workflow.active &&
			currentContext === OrderExecutionContext.ManualInactive
		) {
			try {
				// Check parent nodes
				const parentNodes = context.getParentNodes
					? context.getParentNodes(context.getNode().name)
					: [];

				// Check input data
				const items = context.getInputData();
				const hasMinimalInput =
					items.length === 0 || (items.length === 1 && Object.keys(items[0].json).length === 0);

				// If no parent nodes or minimal input, this is likely execute-step
				if (parentNodes.length === 0 || hasMinimalInput) {
					return OrderExecutionContext.ExecuteStep;
				}
			} catch {
				// If checks fail, use input data as fallback
				try {
					const items = context.getInputData();
					const hasMinimalInput =
						items.length === 0 || (items.length === 1 && Object.keys(items[0].json).length === 0);
					if (hasMinimalInput) {
						return OrderExecutionContext.ExecuteStep;
					}
				} catch {
					// Ignore errors
				}
			}
		}

		return currentContext;
	}

	/**
	 * Force credentials to use paper trading environment
	 */
	static forcePaperTradingCredentials<T extends IDataObject>(credentials: T): T {
		return {
			...credentials,
			environment: TradingEnvironment.Paper,
		} as T;
	}

	/**
	 * Check if credentials are using paper trading
	 */
	static isPaperTrading(credentials: IDataObject | undefined): boolean {
		return credentials?.environment === TradingEnvironment.Paper;
	}
}
