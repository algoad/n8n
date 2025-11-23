import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import type { ExecutionContextWithMode, WorkflowWithOwner } from './order-node-shared-types';

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
	const contextWithAdditionalData = context as ExecutionContextWithMode;
	const additionalData = contextWithAdditionalData.additionalData;
	let userId = additionalData?.userId;

	// Fallback: Try to get userId from workflow owner if not in additionalData
	// This is needed for active workflows where userId might not be in execution context
	if (!userId) {
		try {
			const workflowWithOwner = workflow as WorkflowWithOwner;
			// Try different possible properties for workflow owner
			userId =
				workflowWithOwner.ownerId ??
				workflowWithOwner.userId ??
				workflowWithOwner.ownedBy?.id ??
				workflowWithOwner.owner?.id;
		} catch (error) {
			// Ignore errors, userId will remain undefined
		}
	}

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
