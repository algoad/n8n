import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mockKalshiPlaceOrderResponse } from '../../utils/mock-trade-response';
import { OrderNodeExecutor } from '../../utils/order-node-executor';
import type { NodeTypeWithMetadata } from '../../utils/order-node-shared-types';
import { TradingEnvironment, OrderExecutionContext } from '../../utils/order-node-types';
import { trackOrder } from '../../utils/trading-node-helper';

export class Kalshi implements INodeType {
	description: INodeTypeDescription & { metadata?: { tags: string[] } } = {
		displayName: 'Kalshi',
		name: 'kalshi',
		icon: 'file:kalshi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute trades and manage positions on Kalshi prediction markets',
		defaults: {
			name: 'Kalshi',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'kalshiApi',
				required: true,
			},
		],
		codex: {
			categories: ['Trading'],
			subcategories: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Trading: ['Trade'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.kalshi.com/',
					},
				],
			},
		},
		// Custom metadata tag for behind-the-scenes classification
		// This identifies nodes that execute trades
		// Accessible at runtime via:
		// - this.nodeType.description.metadata (during node execution)
		// - workflow.nodeTypes.getByNameAndVersion('kalshi', 1).description.metadata
		// - nodeType.description.metadata (when you have the node type instance)
		metadata: {
			tags: ['ORDER'],
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'placeOrder',
				noDataExpression: true,
				options: [
					{
						name: 'Place Order',
						value: 'placeOrder',
						description: 'Place a yes or no prediction market order',
						action: 'Place an order',
					},
					{
						name: 'Get Account',
						value: 'getAccount',
						description: 'Get account information',
						action: 'Get account information',
					},
					{
						name: 'Get Positions',
						value: 'getPositions',
						description: 'Get all open positions',
						action: 'Get all open positions',
					},
					{
						name: 'Cancel Order',
						value: 'cancelOrder',
						description: 'Cancel an existing order',
						action: 'Cancel an order',
					},
				],
			},

			// Place Order Fields
			{
				displayName: 'Market ID',
				name: 'marketId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: '',
				required: true,
				description: 'The Kalshi market identifier (e.g., KALS-2024-ELECTION)',
			},
			{
				displayName: 'Side',
				name: 'side',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Yes',
						value: 'yes',
					},
					{
						name: 'No',
						value: 'no',
					},
				],
				default: 'yes',
				required: true,
				description: 'Whether to buy yes or no',
			},
			{
				displayName: 'Quantity',
				name: 'quantity',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				required: true,
				description: 'Number of shares to buy',
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: 50,
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				required: true,
				description: 'Price per share (0-100 cents)',
			},
			{
				displayName: 'Order Type',
				name: 'orderType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Market',
						value: 'market',
						description: 'Execute at current market price',
					},
					{
						name: 'Limit',
						value: 'limit',
						description: 'Execute at specified price or better',
					},
				],
				default: 'limit',
				required: true,
				description: 'The type of order to place',
			},

			// Cancel Order Fields
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['cancelOrder'],
					},
				},
				default: '',
				required: true,
				description: 'The ID of the order to cancel',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Helper function to get parameter from input data or node parameter
				const getParameter = <T = unknown>(paramName: string, defaultValue?: T): T => {
					return (
						items[i].json[paramName] !== undefined
							? items[i].json[paramName]
							: this.getNodeParameter(paramName, i, defaultValue)
					) as T;
				};

				const operation = getParameter<string>('operation', 'placeOrder');

				// Get node type to check for ORDER metadata
				// The nodeType property exists on IExecuteFunctions at runtime but isn't in the type definition
				const nodeType = (this as IExecuteFunctions & { nodeType?: NodeTypeWithMetadata }).nodeType;
				const hasOrderMetadata = OrderNodeExecutor.hasOrderMetadata(nodeType);
				const isTradeOperation = OrderNodeExecutor.isTradeOperation(operation);

				// Determine execution behavior using ORDER node utilities
				const config = {
					hasOrderMetadata,
					executionContext: null as OrderExecutionContext | null,
					operation,
					isTradeOperation,
				};

				// Get execution context if this is an ORDER node
				if (hasOrderMetadata) {
					try {
						const { getOrderExecutionContext } = await import('../../utils/execution-context');
						config.executionContext = getOrderExecutionContext(this);
					} catch (error) {
						// Default to execute-step for safety if detection fails
						config.executionContext = OrderExecutionContext.executeStep;
					}
				}

				const executionResult = OrderNodeExecutor.determineExecutionBehavior(this, config);

				// Log execution context for debugging
				if (hasOrderMetadata) {
					this.logger?.warn(
						`[ORDER Node] Context: ${executionResult.context}, Mock: ${executionResult.shouldMock}, Force Paper: ${executionResult.forcePaperTrading}, Operation: ${operation}`,
					);
				}

				// Get credentials
				let credentials = await this.getCredentials('kalshiApi', i);

				// Force paper trading if needed
				if (executionResult.forcePaperTrading && !OrderNodeExecutor.isPaperTrading(credentials)) {
					credentials = OrderNodeExecutor.forcePaperTradingCredentials(credentials);
					this.logger?.info(
						`ORDER node: Forcing paper trading credentials (context: ${executionResult.context})`,
					);
				}

				// Determine base URL based on environment
				// Per Kalshi docs: demo uses .co, production uses .com
				const environment =
					(credentials.environment as TradingEnvironment) ?? TradingEnvironment.paper;
				const baseUrl =
					environment === TradingEnvironment.paper
						? 'https://demo-api.kalshi.co/trade-api/v2'
						: 'https://api.kalshi.com/trade-api/v2';

				let responseData: IDataObject = {};

				if (operation === 'placeOrder') {
					const marketId = getParameter<string>('marketId', '');
					const side = getParameter<string>('side', 'yes');
					const quantity = getParameter<number>('quantity', 1);
					const price = getParameter<number>('price', 50);
					const orderType = getParameter<string>('orderType', 'limit');

					const body: IDataObject = {
						market_id: marketId.trim(),
						side,
						count: quantity,
						price,
					};

					// Add order type if it's a limit order
					if (orderType === 'limit') {
						body.type = 'limit';
					} else {
						body.type = 'market';
					}

					// Check if we should mock the response
					if (executionResult.shouldMock && isTradeOperation) {
						// Mock the response instead of making a real API call
						this.logger?.warn(
							'ORDER node: Mocking trade execution response. NO REAL TRADE WILL BE EXECUTED.',
						);
						responseData = mockKalshiPlaceOrderResponse(body);
					} else if (executionResult.executeRealTrade) {
						// Execute real trade
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `${baseUrl}/portfolio/orders`,
							headers: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						};

						responseData = (await this.helpers.httpRequestWithAuthentication.call(
							this,
							'kalshiApi',
							options,
						)) as IDataObject;
					} else {
						// Should not happen, but safety check
						this.logger?.warn(
							'ORDER node: Neither mocking nor executing trade. Using mock as fallback.',
						);
						responseData = mockKalshiPlaceOrderResponse(body);
					}

					// Track the order in our database
					try {
						const orderTrackingData: IDataObject = {
							brokerOrderId: (responseData.order_id as string) || (responseData.id as string),
							marketId: marketId.trim(),
							side,
							quantity,
							price,
							status: (responseData.status as string) || 'pending',
							filledAt: responseData.filled_at
								? new Date(responseData.filled_at as string)
								: undefined,
							metadata: {
								brokerResponse: responseData,
								orderType,
							},
						};

						// Pass the execution context and shouldMock flag that was already determined
						await trackOrder(
							this,
							orderTrackingData,
							'predictionMarket',
							credentials,
							undefined,
							executionResult.context,
							executionResult.shouldMock,
						);
					} catch (trackingError) {
						// Log tracking error but don't fail the node execution
						// Order was successfully placed, tracking is non-critical
						this.logger?.warn(
							`Failed to track order: ${trackingError instanceof Error ? trackingError.message : 'Unknown error'}`,
						);
					}
				} else if (operation === 'getAccount') {
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: `${baseUrl}/portfolio/balance`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'kalshiApi',
						options,
					)) as IDataObject;
				} else if (operation === 'getPositions') {
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: `${baseUrl}/portfolio/positions`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'kalshiApi',
						options,
					)) as IDataObject;
				} else if (operation === 'cancelOrder') {
					const orderId = getParameter<string>('orderId', '');

					const options: IHttpRequestOptions = {
						method: 'DELETE',
						url: `${baseUrl}/portfolio/orders/${orderId}`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'kalshiApi',
						options,
					)) as IDataObject;
				}

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
