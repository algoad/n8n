import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { getOrderExecutionContext } from './execution-context';
import type { ExecutionContextWithMode, WorkflowWithSettings } from './order-node-shared-types';
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
		const metadata = nodeType.description.metadata;
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
				context: executionContext ?? OrderExecutionContext.manualInactive,
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
				detectedContext = OrderExecutionContext.executeStep;
			}
		}

		// Get workflow trading mode setting
		const workflow = context.getWorkflow() as WorkflowWithSettings;
		const workflowSettings = workflow.settings ?? {};
		const tradingMode = workflowSettings.tradingMode ?? 'mock';
		const isWorkflowActive = workflow.active;

		// Debug logging
		if (process.env.N8N_DEBUG_ORDER_CONTEXT === 'true' || process.env.NODE_ENV === 'development') {
			console.log('[OrderNodeExecutor] determineExecutionBehavior:', {
				detectedContext,
				tradingMode,
				isWorkflowActive,
				workflowId: workflow.id,
				workflowSettingsKeys: Object.keys(workflowSettings),
				workflowSettingsFull: workflowSettings,
				workflowHasSettings: 'settings' in workflow,
				workflowSettingsDirect: workflow.settings,
			});
		}

		// Execute step: ALWAYS mock (node-level override)
		if (detectedContext === OrderExecutionContext.executeStep) {
			return {
				context: detectedContext,
				shouldMock: true,
				forcePaperTrading: true,
				executeRealTrade: false,
			};
		}

		// When workflow is ACTIVE: Always execute LIVE trades (ignore trading mode toggle)
		// The trading mode toggle is disabled when active, so we always use live credentials
		if (isWorkflowActive) {
			return {
				context: detectedContext,
				shouldMock: false,
				forcePaperTrading: false, // Use credentials as configured (live)
				executeRealTrade: true,
			};
		}

		// When workflow is INACTIVE: Respect the trading mode toggle (mock vs paper)
		// Additional safety checks for execute-step detection (only when inactive)
		// Only refine if we're in ManualInactive - this helps distinguish execute-step from full workflow execution
		if (detectedContext === OrderExecutionContext.manualInactive) {
			const refinedContext = this.refineExecutionContext(context, detectedContext);
			// Only use refined context if it's clearly execute-step
			// If it stays ManualInactive, we proceed with workflow-level trading mode
			if (refinedContext === OrderExecutionContext.executeStep) {
				return {
					context: refinedContext,
					shouldMock: true,
					forcePaperTrading: true,
					executeRealTrade: false,
				};
			}
			// Keep ManualInactive for workflow-level execution
			detectedContext = refinedContext;
		}

		// Now handle inactive workflow with trading mode toggle
		if (tradingMode === 'mock') {
			// Inactive + Mock mode: mock all trades
			return {
				context: detectedContext,
				shouldMock: true,
				forcePaperTrading: true,
				executeRealTrade: false,
			};
		}

		// Inactive + Paper mode: execute real trades on paper account
		const result = {
			context: detectedContext,
			shouldMock: false,
			forcePaperTrading: true, // Force paper trading
			executeRealTrade: true,
		};

		// Debug logging
		if (process.env.N8N_DEBUG_ORDER_CONTEXT === 'true' || process.env.NODE_ENV === 'development') {
			console.log('[OrderNodeExecutor] Final result (Inactive + Paper):', result);
		}

		return result;
	}

	/**
	 * Refine execution context detection using additional checks
	 * This is a safety check to distinguish execute-step from full workflow execution
	 * Only refines if BOTH conditions are met (no parent nodes AND minimal input)
	 * to avoid incorrectly classifying full workflow executions as execute-step
	 */
	private static refineExecutionContext(
		context: IExecuteFunctions,
		currentContext: OrderExecutionContext,
	): OrderExecutionContext {
		const contextWithMode = context as ExecutionContextWithMode;
		const mode = contextWithMode.mode ?? context.getMode?.();
		const workflow = context.getWorkflow() as WorkflowWithSettings;

		// Only refine ManualInactive context when workflow is inactive and mode is manual
		if (
			mode === 'manual' &&
			!workflow.active &&
			currentContext === OrderExecutionContext.manualInactive
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

				// Only classify as execute-step if BOTH conditions are met:
				// 1. No parent nodes (node is isolated)
				// 2. Minimal or no input data
				// This prevents full workflow executions from being incorrectly classified
				if (parentNodes.length === 0 && hasMinimalInput) {
					return OrderExecutionContext.executeStep;
				}
			} catch {
				// If checks fail, don't refine - keep ManualInactive
				// This is safer than incorrectly classifying as execute-step
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
			environment: TradingEnvironment.paper,
		} as T;
	}

	/**
	 * Check if credentials are using paper trading
	 */
	static isPaperTrading(credentials: IDataObject | undefined): boolean {
		return credentials?.environment === TradingEnvironment.paper;
	}
}
