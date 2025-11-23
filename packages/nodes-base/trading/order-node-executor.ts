import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import {
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
	 * Determine ORDER node execution behavior based on workflow settings
	 */
	static determineExecutionBehavior(
		context: IExecuteFunctions,
		config: OrderNodeConfig,
	): OrderExecutionResult {
		const { hasOrderMetadata, isTradeOperation } = config;

		// If not an ORDER node or not a trade operation, use default behavior
		if (!hasOrderMetadata || !isTradeOperation) {
			return {
				tradingEnvironment: TradingEnvironment.live,
			};
		}

		// Get workflow trading mode setting
		const workflow = context.getWorkflow();

		// Debug: Log the workflow object to understand its structure
		if (process.env.N8N_DEBUG_ORDER_CONTEXT === 'true' || process.env.NODE_ENV === 'development') {
			console.log('[OrderNodeExecutor] determineExecutionBehavior - workflow object:', {
				workflowId: workflow.id,
				workflowName: workflow.name,
				workflowActive: workflow.active,
				hasSettings: 'settings' in workflow,
				settings: workflow.settings,
				settingsType: typeof workflow.settings,
				settingsKeys: workflow.settings ? Object.keys(workflow.settings) : [],
				workflowKeys: Object.keys(workflow),
				fullWorkflow: JSON.stringify(workflow, null, 2),
			});
		}

		// Strict validation: settings must exist
		if (!workflow.settings || typeof workflow.settings !== 'object') {
			throw new ApplicationError('Workflow settings are missing from the workflow object');
		}

		const tradingMode = workflow.settings.tradingMode as TradingEnvironment | undefined;

		if (!tradingMode) {
			throw new ApplicationError('Trading mode is not defined in workflow settings', {
				level: 'error',
				tags: {
					workflowId: workflow.id,
					settings: JSON.stringify(workflow.settings),
				},
			});
		}

		const isWorkflowActive = workflow.active;

		console.log('workflow NODE', JSON.stringify(workflow, null, 2));

		// When workflow is ACTIVE: Always execute LIVE trades (ignore trading mode toggle)
		// The trading mode toggle is disabled when active, so we always use live credentials
		if (isWorkflowActive) {
			return {
				tradingEnvironment: TradingEnvironment.live,
			};
		}

		// When workflow is INACTIVE: Respect the trading mode toggle (mock vs paper)

		// 1. Mock Mode (default): Mock everything
		if (tradingMode === 'mock') {
			return {
				tradingEnvironment: TradingEnvironment.mock,
			};
		}

		// 2. Paper Mode: Execute REAL trades on PAPER account
		return {
			tradingEnvironment: TradingEnvironment.paper,
		};
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
