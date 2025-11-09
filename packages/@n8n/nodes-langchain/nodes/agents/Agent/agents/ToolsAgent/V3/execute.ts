import { sleep } from 'n8n-workflow';
import type {
	EngineRequest,
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	EngineResponse,
} from 'n8n-workflow';

<<<<<<< HEAD
import { buildExecutionContext, executeBatch, checkMaxIterations } from './helpers';
import type { RequestResponseMetadata } from './types';
=======
import { getPromptInputByType } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';

import {
	fixEmptyContentMessage,
	getAgentStepsParser,
	getChatModel,
	getOptionalMemory,
	getTools,
	prepareMessages,
	preparePrompt,
} from '../common';
import { SYSTEM_MESSAGE } from '../prompt';

type ToolCallRequest = {
	tool: string;
	toolInput: Record<string, unknown>;
	toolCallId: string;
	type?: string;
	log?: string;
	messageLog?: unknown[];
};

async function createEngineRequests(
	toolCalls: ToolCallRequest[],
	itemIndex: number,
	tools: Array<DynamicStructuredTool | Tool>,
) {
	return toolCalls.map((toolCall) => {
		// First try to get from metadata (for toolkit tools)
		const foundTool = tools.find((tool) => tool.name === toolCall.tool);

		if (!foundTool) return;

		const nodeName = foundTool.metadata?.sourceNodeName;

		// For toolkit tools, include the tool name so the node knows which tool to execute
		const input = foundTool.metadata?.isFromToolkit
			? { ...toolCall.toolInput, tool: toolCall.tool }
			: toolCall.toolInput;

		return {
			nodeName,
			input,
			type: NodeConnectionTypes.AiTool,
			id: toolCall.toolCallId,
			metadata: {
				itemIndex,
			},
		};
	});
}

/**
 * Uses provided tools and tried to get tools from model metadata
 * Some chat model nodes can define built-in tools in their metadata
 */
function getAllTools(model: BaseChatModel, tools: Array<DynamicStructuredTool | Tool>) {
	const modelTools = (model.metadata?.tools as Tool[]) ?? [];
	const allTools = [...tools, ...modelTools];
	return allTools;
}

/**
 * Creates an agent executor with the given configuration
 */
function createAgentSequence(
	model: BaseChatModel,
	tools: Array<DynamicStructuredTool | Tool>,
	prompt: ChatPromptTemplate,
	_options: { maxIterations?: number; returnIntermediateSteps?: boolean },
	outputParser?: N8nOutputParser,
	memory?: BaseChatMemory,
	fallbackModel?: BaseChatModel | null,
) {
	const agent = createToolCallingAgent({
		llm: model,
		tools: getAllTools(model, tools),
		prompt,
		streamRunnable: false,
	});

	let fallbackAgent: AgentRunnableSequence | undefined;
	if (fallbackModel) {
		fallbackAgent = createToolCallingAgent({
			llm: fallbackModel,
			tools: getAllTools(fallbackModel, tools),
			prompt,
			streamRunnable: false,
		});
	}
	const runnableAgent = RunnableSequence.from([
		fallbackAgent ? agent.withFallbacks([fallbackAgent]) : agent,
		getAgentStepsParser(outputParser, memory),
		fixEmptyContentMessage,
	]) as AgentRunnableSequence;

	runnableAgent.singleAction = true;
	runnableAgent.streamRunnable = false;

	return runnableAgent;
}

type IntermediateStep = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string;
		messageLog: unknown[];
		toolCallId: string;
		type: string;
	};
	observation?: string;
};

type AgentResult = {
	output: string;
	intermediateSteps?: IntermediateStep[];
	toolCalls?: ToolCallRequest[];
};

async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
	returnIntermediateSteps: boolean = false,
	memory?: BaseChatMemory,
	input?: string,
): Promise<AgentResult> {
	const agentResult: AgentResult = {
		output: '',
	};

	if (returnIntermediateSteps) {
		agentResult.intermediateSteps = [];
	}

	const toolCalls: ToolCallRequest[] = [];

	ctx.sendChunk('begin', itemIndex);
	for await (const event of eventStream) {
		// Stream chat model tokens as they come in
		switch (event.event) {
			case 'on_chat_model_stream':
				const chunk = event.data?.chunk as AIMessageChunk;
				if (chunk?.content) {
					const chunkContent = chunk.content;
					let chunkText = '';
					if (Array.isArray(chunkContent)) {
						for (const message of chunkContent) {
							if (message?.type === 'text') {
								chunkText += (message as MessageContentText)?.text;
							}
						}
					} else if (typeof chunkContent === 'string') {
						chunkText = chunkContent;
					}
					ctx.sendChunk('item', itemIndex, chunkText);

					agentResult.output += chunkText;
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (event.data) {
					const chatModelData = event.data as {
						output?: { tool_calls?: ToolCall[]; content?: string };
					};
					const output = chatModelData.output;

					// Check if this LLM response contains tool calls
					if (output?.tool_calls && output.tool_calls.length > 0) {
						// Collect tool calls for request building
						for (const toolCall of output.tool_calls) {
							toolCalls.push({
								tool: toolCall.name,
								toolInput: toolCall.args,
								toolCallId: toolCall.id || 'unknown',
								type: toolCall.type || 'tool_call',
								log:
									output.content ||
									`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
								messageLog: [output],
							});
						}

						// Also add to intermediate steps if needed
						if (returnIntermediateSteps) {
							for (const toolCall of output.tool_calls) {
								agentResult.intermediateSteps!.push({
									action: {
										tool: toolCall.name,
										toolInput: toolCall.args,
										log:
											output.content ||
											`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
										messageLog: [output], // Include the full LLM response
										toolCallId: toolCall.id || 'unknown',
										type: toolCall.type || 'tool_call',
									},
								});
							}
						}
					}
				}
				break;
			case 'on_tool_end':
				// Capture tool execution results and match with action
				if (returnIntermediateSteps && event.data && agentResult.intermediateSteps!.length > 0) {
					const toolData = event.data as { output?: string };
					// Find the matching intermediate step for this tool call
					const matchingStep = agentResult.intermediateSteps!.find(
						(step) => !step.observation && step.action.tool === event.name,
					);
					if (matchingStep) {
						matchingStep.observation = toolData.output || '';
					}
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk('end', itemIndex);

	// Save conversation to memory if memory is connected
	if (memory && input && agentResult.output) {
		await memory.saveContext({ input }, { output: agentResult.output });
	}

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}

export type RequestResponseMetadata = {
	itemIndex?: number;
	previousRequests: ToolCallData[];
	iterationCount?: number;
};

type ToolCallData = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string | number | true | object;
		toolCallId: IDataObject | GenericValue | GenericValue[] | IDataObject[];
		type: string | number | true | object;
	};
	observation: string;
};

function buildSteps(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): ToolCallData[] {
	const steps: ToolCallData[] = [];

	if (response) {
		const responses = response?.actionResponses ?? [];

		if (response.metadata?.previousRequests) {
			steps.push.apply(steps, response.metadata.previousRequests);
		}

		for (const tool of responses) {
			if (tool.action?.metadata?.itemIndex !== itemIndex) continue;

			const toolInput: IDataObject = {
				...tool.action.input,
				id: tool.action.id,
			};
			if (!toolInput || !tool.data) {
				continue;
			}

			const step = steps.find((step) => step.action.toolCallId === toolInput.id);
			if (step) {
				continue;
			}
			// Create a synthetic AI message for the messageLog
			// This represents the AI's decision to call the tool
			const syntheticAIMessage = new AIMessage({
				content: `Calling ${tool.action.nodeName} with input: ${JSON.stringify(toolInput)}`,
				tool_calls: [
					{
						id: (toolInput?.id as string) ?? 'reconstructed_call',
						name: nodeNameToToolName(tool.action.nodeName),
						args: toolInput,
						type: 'tool_call',
					},
				],
			});

			const toolResult = {
				action: {
					tool: nodeNameToToolName(tool.action.nodeName),
					toolInput: (toolInput.input as IDataObject) || {},
					log: toolInput.log || syntheticAIMessage.content,
					messageLog: [syntheticAIMessage],
					toolCallId: toolInput?.id,
					type: toolInput.type || 'tool_call',
				},
				observation: JSON.stringify(tool.data?.data?.ai_tool?.[0]?.map((item) => item?.json) ?? ''),
			};

			steps.push(toolResult);
		}
	}
	return steps;
}
>>>>>>> 3c22a04bff (trading and linting)

/* -----------------------------------------------------------
   Main Executor Function
----------------------------------------------------------- */
/**
 * The main executor method for the Tools Agent V3.
 *
 * This function orchestrates the execution across input batches, handling:
 * - Building shared execution context (models, memory, batching config)
 * - Processing items in batches with continue-on-fail logic
 * - Returning either tool call requests or node output data
 *
 * @param this Execute context. SupplyDataContext is passed when agent is used as a tool
 * @param response Optional engine response containing tool call results from previous execution
 * @returns Array of execution data for all processed items, or engine request for tool calls
 */
export async function toolsAgentExecute(
	this: IExecuteFunctions | ISupplyDataFunctions,
	response?: EngineResponse<RequestResponseMetadata>,
): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
	this.logger.debug('Executing Tools Agent V3');

	// Check max iterations if this is a continuation of a previous execution
	const maxIterations = this.getNodeParameter('options.maxIterations', 0, 10) as number;
	checkMaxIterations(response, maxIterations, this.getNode());

	const returnData: INodeExecutionData[] = [];
	let request: EngineRequest<RequestResponseMetadata> | undefined = undefined;

	// Build execution context with shared configuration
	const executionContext = await buildExecutionContext(this);
	const { items, batchSize, delayBetweenBatches, model, fallbackModel, memory } = executionContext;

	// Process items in batches
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);

		const { returnData: batchReturnData, request: batchRequest } = await executeBatch(
			this,
			batch,
			i,
			model,
			fallbackModel,
			memory,
			response,
		);

		// Collect results from batch
		returnData.push.apply(returnData, batchReturnData);

		// Collect requests from batch
		if (batchRequest) {
			if (!request) {
				request = batchRequest;
			} else {
				request.actions.push.apply(request.actions, batchRequest.actions);
			}
		}

		// Apply delay between batches if configured
		if (i + batchSize < items.length && delayBetweenBatches > 0) {
			await sleep(delayBetweenBatches);
		}
	}

	// Return tool call request if any tools need to be executed
	if (request) {
		return request;
	}

	// Otherwise return execution data
	return [returnData];
}

// Re-export types for backwards compatibility
export type { RequestResponseMetadata } from './types';
