/**
 * Enums and types for ORDER metadata nodes
 */

/**
 * Execution context types for ORDER metadata nodes
 */
export const enum OrderExecutionContext {
	executeStep = 'execute-step',
	manualInactive = 'manual-inactive',
	active = 'active',
}

/**
 * ORDER operation types that execute trades
 */
export const enum OrderOperation {
	placeOrder = 'placeOrder',
	cancelOrder = 'cancelOrder',
	modifyOrder = 'modifyOrder',
}

/**
 * Trading environment types
 */
export const enum TradingEnvironment {
	mock = 'mock',
	paper = 'paper',
	live = 'live',
}

/**
 * ORDER node metadata configuration
 */
export interface OrderNodeMetadata {
	tags: string[];
}

/**
 * Configuration for ORDER node execution behavior
 */
export interface OrderNodeConfig {
	/**
	 * Whether this node has ORDER metadata tag
	 */
	hasOrderMetadata: boolean;

	/**
	 * The detected execution context
	 */
	executionContext: OrderExecutionContext | null;

	/**
	 * The current operation being executed
	 */
	operation: string;

	/**
	 * Whether the operation executes a trade
	 */
	isTradeOperation: boolean;
}

/**
 * Result of ORDER node execution context check
 */
export interface OrderExecutionResult {
	/**
	 * The detected execution context
	 */
	context: OrderExecutionContext;

	/**
	 * Whether to mock the response (execute-step mode)
	 */
	shouldMock: boolean;

	/**
	 * Whether to force paper trading credentials
	 */
	forcePaperTrading: boolean;

	/**
	 * Whether to execute real trades
	 */
	executeRealTrade: boolean;
}
