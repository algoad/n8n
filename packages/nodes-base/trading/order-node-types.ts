/**
 * Enums and types for ORDER metadata nodes
 */

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
	 * The current operation being executed
	 */
	operation: string;

	/**
	 * Whether the operation executes a trade
	 */
	isTradeOperation: boolean;
}

/**
 * Result of ORDER node execution behavior determination
 */
export interface OrderExecutionResult {
	/**
	 * The trading environment to use
	 */
	tradingEnvironment: TradingEnvironment;
}
