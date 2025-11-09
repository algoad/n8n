import type {
	IExecuteFunctions,
	IWorkflowMetadata,
	IWorkflowSettings,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/**
 * Extended workflow metadata that includes settings at runtime
 * The getWorkflow() method returns IWorkflowMetadata, but at runtime
 * the workflow object includes settings even though it's not in the type definition
 */
export interface WorkflowWithSettings extends IWorkflowMetadata {
	settings?: IWorkflowSettings;
}

/**
 * Extended execution context that includes mode and runExecutionData properties
 * The context object has these properties at runtime that's not in the IExecuteFunctions type
 */
export interface ExecutionContextWithMode extends IExecuteFunctions {
	mode?: WorkflowExecuteMode;
	runExecutionData?: {
		startData?: { destinationNode?: string };
	} | null;
	additionalData?: {
		userId?: string;
	};
}

/**
 * Extended workflow that may include owner information at runtime
 */
export interface WorkflowWithOwner extends WorkflowWithSettings {
	ownerId?: string;
	userId?: string;
	ownedBy?: { id?: string };
	owner?: { id?: string };
}

/**
 * Node type with metadata for ORDER node detection
 */
export interface NodeTypeWithMetadata {
	description?: { metadata?: { tags?: string[] } };
}

/**
 * Type guard to check if a node type has ORDER metadata
 */
export function isNodeTypeWithMetadata(nodeType: unknown): nodeType is NodeTypeWithMetadata {
	return typeof nodeType === 'object' && nodeType !== null && 'description' in nodeType;
}
