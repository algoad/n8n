import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mockAlpacaPlaceOrderResponse } from '../../utils/mock-trade-response';
import { OrderNodeExecutor } from '../../utils/order-node-executor';
import type { NodeTypeWithMetadata } from '../../utils/order-node-shared-types';
import { TradingEnvironment, OrderExecutionContext } from '../../utils/order-node-types';
import { trackOrder } from '../../utils/trading-node-helper';

export class AlpacaMarkets implements INodeType {
	description: INodeTypeDescription & { metadata?: { tags: string[] } } = {
		displayName: 'Alpaca Markets',
		name: 'alpacaMarkets',
		icon: 'file:alpaca.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute trades and manage positions on Alpaca Markets',
		defaults: {
			name: 'Alpaca Markets',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'alpacaMarketsApi',
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
						url: 'https://alpaca.markets/docs/',
					},
				],
			},
		},
		// Custom metadata tag for behind-the-scenes classification
		// This identifies nodes that execute trades
		// Accessible at runtime via:
		// - this.nodeType.description.metadata (during node execution)
		// - workflow.nodeTypes.getByNameAndVersion('alpacaMarkets', 1).description.metadata
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
						description: 'Place a buy or sell order',
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
						name: 'Buy',
						value: 'buy',
					},
					{
						name: 'Sell',
						value: 'sell',
					},
				],
				default: 'buy',
				required: true,
				description: 'Whether to buy or sell',
			},
			{
				displayName: 'Symbol',
				name: 'symbol',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: '',
				placeholder: 'AAPL',
				required: true,
				description: 'The stock symbol to trade (e.g., AAPL, TSLA, GOOGL)',
			},
			{
				displayName: 'Quantity Type',
				name: 'quantityType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Shares',
						value: 'qty',
						description: 'Specify number of shares',
					},
					{
						name: 'Notional (Dollar Amount)',
						value: 'notional',
						description: 'Specify dollar amount to invest',
					},
				],
				default: 'qty',
				required: true,
				description: 'Whether to specify quantity in shares or dollar amount',
			},
			{
				displayName: 'Quantity',
				name: 'qty',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
						quantityType: ['qty'],
					},
				},
				default: 1,
				typeOptions: {
					minValue: 0,
				},
				required: true,
				description: 'Number of shares to buy or sell',
			},
			{
				displayName: 'Notional Amount',
				name: 'notional',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
						quantityType: ['notional'],
					},
				},
				default: 100,
				typeOptions: {
					minValue: 0,
				},
				required: true,
				description: 'Dollar amount to invest (minimum $1)',
			},
			{
				displayName: 'Order Type',
				name: 'type',
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
					{
						name: 'Stop',
						value: 'stop',
						description: 'Execute when price reaches stop price',
					},
					{
						name: 'Stop Limit',
						value: 'stop_limit',
						description: 'Combination of stop and limit orders',
					},
				],
				default: 'market',
				required: true,
				description: 'The type of order to place',
			},
			{
				displayName: 'Time In Force',
				name: 'time_in_force',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Day',
						value: 'day',
						description: 'Valid for the trading day',
					},
					{
						name: 'Good Till Canceled',
						value: 'gtc',
						description: 'Valid until canceled',
					},
					{
						name: 'Immediate or Cancel',
						value: 'ioc',
						description: 'Fill immediately or cancel',
					},
					{
						name: 'Fill or Kill',
						value: 'fok',
						description: 'Fill entirely or cancel',
					},
				],
				default: 'day',
				required: true,
				description: 'How long the order remains active',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Limit Price',
						name: 'limit_price',
						type: 'number',
						displayOptions: {
							show: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'/type': ['limit', 'stop_limit'],
							},
						},
						default: 0,
						description: 'Limit price for limit orders',
					},
					{
						displayName: 'Stop Price',
						name: 'stop_price',
						type: 'number',
						displayOptions: {
							show: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'/type': ['stop', 'stop_limit'],
							},
						},
						default: 0,
						description: 'Stop price for stop orders',
					},
					{
						displayName: 'Extended Hours',
						name: 'extended_hours',
						type: 'boolean',
						default: false,
						description: 'Whether to allow trading during extended hours',
					},
					{
						displayName: 'Client Order ID',
						name: 'client_order_id',
						type: 'string',
						default: '',
						description: 'A unique identifier for the order',
					},
				],
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
				let credentials = await this.getCredentials('alpacaMarketsApi', i);

				// Force paper trading if needed
				if (executionResult.forcePaperTrading && !OrderNodeExecutor.isPaperTrading(credentials)) {
					credentials = OrderNodeExecutor.forcePaperTradingCredentials(credentials);
					this.logger?.info(
						`ORDER node: Forcing paper trading credentials (context: ${executionResult.context})`,
					);
				}

				// Determine base URL based on environment
				const environment =
					(credentials.environment as TradingEnvironment) ?? TradingEnvironment.paper;
				const baseUrl =
					environment === TradingEnvironment.paper
						? 'https://paper-api.alpaca.markets'
						: 'https://api.alpaca.markets';

				let responseData: IDataObject = {};

				if (operation === 'placeOrder') {
					const side = getParameter<string>('side', 'buy');
					const symbol = getParameter<string>('symbol', '');
					const quantityType = getParameter<string>('quantityType', 'qty');
					const type = getParameter<string>('type', 'market');
					const timeInForce = getParameter<string>('time_in_force', 'day');
					const additionalOptions = getParameter<IDataObject>('additionalOptions', {});

					const body: IDataObject = {
						symbol: symbol.trim().toUpperCase(),
						side,
						type,
						time_in_force: timeInForce,
					};

					// Add quantity or notional
					if (quantityType === 'qty') {
						body.qty = getParameter<number>('qty', 1);
					} else {
						body.notional = getParameter<number>('notional', 100);
					}

					// Add additional options (merge input data additional options if present)
					const inputAdditionalOptions: IDataObject = {};
					if (items[i].json.limit_price !== undefined) {
						inputAdditionalOptions.limit_price = items[i].json.limit_price;
					}
					if (items[i].json.stop_price !== undefined) {
						inputAdditionalOptions.stop_price = items[i].json.stop_price;
					}
					if (items[i].json.extended_hours !== undefined) {
						inputAdditionalOptions.extended_hours = items[i].json.extended_hours;
					}
					if (items[i].json.client_order_id !== undefined) {
						inputAdditionalOptions.client_order_id = items[i].json.client_order_id;
					}

					// Merge: node additionalOptions first, then input data overrides
					Object.assign(body, additionalOptions, inputAdditionalOptions);

					// Check if we should mock the response
					if (executionResult.shouldMock && isTradeOperation) {
						// Mock the response instead of making a real API call
						this.logger?.warn(
							'ORDER node: Mocking trade execution response. NO REAL TRADE WILL BE EXECUTED.',
						);
						responseData = mockAlpacaPlaceOrderResponse(body);
					} else if (executionResult.executeRealTrade) {
						// Execute real trade
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `${baseUrl}/v2/orders`,
							headers: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						};

						responseData = (await this.helpers.httpRequestWithAuthentication.call(
							this,
							'alpacaMarketsApi',
							options,
						)) as IDataObject;
					} else {
						// Should not happen, but safety check
						this.logger?.warn(
							'ORDER node: Neither mocking nor executing trade. Using mock as fallback.',
						);
						responseData = mockAlpacaPlaceOrderResponse(body);
					}

					// Track the order in our database
					try {
						const orderTrackingData: IDataObject = {
							brokerOrderId: responseData.id as string,
							symbol: symbol.trim().toUpperCase(),
							side,
							quantityType,
							quantity: quantityType === 'qty' ? body.qty : undefined,
							notional: quantityType === 'notional' ? body.notional : undefined,
							orderType: type,
							timeInForce,
							limitPrice: body.limit_price as number | undefined,
							stopPrice: body.stop_price as number | undefined,
							status: (responseData.status as string) || 'pending',
							filledAt: responseData.filled_at
								? new Date(responseData.filled_at as string)
								: undefined,
							metadata: {
								brokerResponse: responseData,
								clientOrderId: body.client_order_id,
								extendedHours: body.extended_hours,
							},
						};

						// Pass the execution context and shouldMock flag that was already determined
						await trackOrder(
							this,
							orderTrackingData,
							'stock',
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
						url: `${baseUrl}/v2/account`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'alpacaMarketsApi',
						options,
					)) as IDataObject;
				} else if (operation === 'getPositions') {
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: `${baseUrl}/v2/positions`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'alpacaMarketsApi',
						options,
					)) as IDataObject;
				} else if (operation === 'cancelOrder') {
					const orderId = getParameter<string>('orderId', '');

					const options: IHttpRequestOptions = {
						method: 'DELETE',
						url: `${baseUrl}/v2/orders/${orderId}`,
						json: true,
					};

					responseData = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'alpacaMarketsApi',
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
