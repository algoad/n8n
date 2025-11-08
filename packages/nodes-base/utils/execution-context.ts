import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

export interface TradingExecutionContext {
	workflowId: string | undefined;
	executionId: string | undefined;
	userId: string | undefined;
	executionMode: 'test' | 'production';
	isTestMode: boolean;
}

/**
 * Extract trading execution context from n8n node execution context
 * @param context - The IExecuteFunctions context from node execution
 * @returns Trading execution context with workflow, execution, and user info
 */
export function getTradingExecutionContext(context: IExecuteFunctions): TradingExecutionContext {
	const workflow = context.getWorkflow();
	const workflowDataProxy = context.getWorkflowDataProxy(0);

	// Get workflow ID
	const workflowId = workflow.id;

	// Get execution ID from $execution
	const executionId = (workflowDataProxy.$execution as IDataObject)?.id as string | undefined;

	// Get execution mode from $execution
	const executionModeRaw = (workflowDataProxy.$execution as IDataObject)?.mode as
		| string
		| undefined;
	const executionMode = executionModeRaw === 'test' ? 'test' : 'production';

	// Get user ID from additionalData
	// Access via the context's internal additionalData
	const additionalData = (context as any).additionalData as { userId?: string } | undefined;
	const userId = additionalData?.userId;

	// Determine test mode based on multiple factors
	const isTestMode = determineTestMode(context, executionMode, workflow.active);

	return {
		workflowId,
		executionId,
		userId,
		executionMode,
		isTestMode,
	};
}

/**
 * Determine if execution is in test mode based on multiple factors
 * @param _context - The IExecuteFunctions context (reserved for future use with credentials)
 * @param executionMode - The execution mode from $execution
 * @param workflowActive - Whether the workflow is active
 * @returns true if execution is in test mode
 */
export function determineTestMode(
	_context: IExecuteFunctions,
	executionMode: 'test' | 'production',
	workflowActive: boolean,
): boolean {
	// If execution mode is test, it's test mode
	if (executionMode === 'test') {
		return true;
	}

	// If workflow is not active, it's test mode
	if (!workflowActive) {
		return true;
	}

	// Check credentials environment (paper = test)
	// Note: This requires credentials to be loaded, which may not always be available
	// We'll handle this in the node implementation where credentials are accessible

	return false;
}

/**
 * Determine test mode including credentials check
 * @param credentials - The credentials object (may have environment field)
 * @param executionMode - The execution mode
 * @param workflowActive - Whether workflow is active
 * @returns true if execution is in test mode
 */
export function determineTestModeWithCredentials(
	credentials: IDataObject | undefined,
	executionMode: 'test' | 'production',
	workflowActive: boolean,
): boolean {
	// Check credentials environment first (paper = test)
	if (credentials?.environment === 'paper') {
		return true;
	}

	// If execution mode is test, it's test mode
	if (executionMode === 'test') {
		return true;
	}

	// If workflow is not active, it's test mode
	if (!workflowActive) {
		return true;
	}

	return false;
}

import { OrderExecutionContext } from './order-node-types';

/**
 * Determine the execution context for ORDER metadata nodes
 * @param context - The IExecuteFunctions context from node execution
 * @returns The execution context type
 */
export function getOrderExecutionContext(context: IExecuteFunctions): OrderExecutionContext {
	const workflow = context.getWorkflow();
	const node = context.getNode();

	// Access runExecutionData - it's a readonly property on NodeExecutionContext
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const contextAny = context as any;
	const runExecutionData = contextAny.runExecutionData as
		| {
				startData?: { destinationNode?: string };
		  }
		| null
		| undefined;

	const destinationNode = runExecutionData?.startData?.destinationNode;
	const mode = contextAny.mode ?? context.getMode();
	const isManual = mode === 'manual';
	const isWorkflowActive = workflow.active;

	// For execute-step detection: check if destinationNode matches current node
	const isExecuteStep = destinationNode === node.name;

	// Debug logging (can be enabled with N8N_DEBUG_ORDER_CONTEXT=true)
	// Also log in development mode for easier debugging
	const shouldDebug =
		process.env.N8N_DEBUG_ORDER_CONTEXT === 'true' || process.env.NODE_ENV === 'development';
	if (shouldDebug) {
		console.log('[ORDER Context Debug]', {
			nodeName: node.name,
			destinationNode,
			isExecuteStep,
			mode,
			isManual,
			isWorkflowActive,
			hasRunExecutionData: !!runExecutionData,
			runExecutionDataKeys: runExecutionData ? Object.keys(runExecutionData) : [],
			startData: runExecutionData?.startData,
			workflowId: workflow.id,
		});
	}

	// 1. Execute step: destinationNode matches current node and mode is manual
	// This is the most reliable indicator of single-node execution
	// Note: We check isExecuteStep first as it's the most reliable indicator
	if (isExecuteStep && isManual) {
		// Even if workflow is active, if destinationNode matches, it's execute-step
		return OrderExecutionContext.ExecuteStep;
	}

	// 2. Manual inactive: manual mode and workflow is inactive
	// This covers full workflow execution when inactive
	if (isManual && !isWorkflowActive) {
		return OrderExecutionContext.ManualInactive;
	}

	// 3. Active: workflow is active (regardless of mode)
	if (isWorkflowActive) {
		return OrderExecutionContext.Active;
	}

	// Default to manual-inactive for safety (prevents accidental live trades)
	return OrderExecutionContext.ManualInactive;
}
