import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import * as executionContextModule from './execution-context';
import { TradingEnvironment } from './order-node-types';
import * as tradingApiClientModule from './trading-api-client';
import { trackOrder } from './trading-node-helper';

// Mock dependencies
jest.mock('./execution-context');
jest.mock('./trading-api-client');

describe('trading-node-helper', () => {
	describe('trackOrder', () => {
		const mockContext = {
			getWorkflow: jest.fn(),
			getWorkflowDataProxy: jest.fn(),
			logger: {
				info: jest.fn(),
				warn: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		const mockOrderData: IDataObject = {
			brokerOrderId: 'order-123',
			symbol: 'AAPL',
			side: 'buy',
			quantity: 10,
		};

		beforeEach(() => {
			jest.clearAllMocks();

			// Default mock implementations
			(executionContextModule.getTradingExecutionContext as jest.Mock).mockReturnValue({
				workflowId: 'workflow-123',
				executionId: 'execution-123',
				userId: 'user-123',
				executionMode: 'production',
			});

			(executionContextModule.determineTestModeWithCredentials as jest.Mock).mockReturnValue(false);

			(executionContextModule.determineTestModeWithCredentials as jest.Mock).mockReturnValue(false);

			mockContext.getWorkflow = jest.fn(() => ({
				id: 'workflow-123',
				active: true,
				settings: {},
			}));
		});

		describe('Mock mode detection', () => {
			it('should skip database write when shouldMock is explicitly true', async () => {
				const result = await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.mock, // tradingEnvironment = mock
				);

				expect(result).toEqual({});
				expect(tradingApiClientModule.sendOrderToAPI).not.toHaveBeenCalled();
				expect(mockContext.logger?.info).toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});

			it('should skip database write when shouldMock is false but execution context is execute-step', async () => {
				const result = await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.mock, // tradingEnvironment = mock
				);

				expect(result).toEqual({});
				expect(tradingApiClientModule.sendOrderToAPI).not.toHaveBeenCalled();
				expect(mockContext.logger?.info).toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});

			it('should proceed with database write when shouldMock is false and not execute-step', async () => {
				(tradingApiClientModule.sendOrderToAPI as jest.Mock).mockResolvedValue({ success: true });

				await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.paper, // tradingEnvironment = paper
				);

				expect(tradingApiClientModule.sendOrderToAPI).toHaveBeenCalled();
				expect(mockContext.logger?.info).not.toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});

			it('should skip database write when shouldMock is undefined and trading mode is mock', async () => {
				mockContext.getWorkflow = jest.fn(() => ({
					id: 'workflow-123',
					active: true,
					settings: {
						tradingMode: 'mock',
					},
				}));

				const result = await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.mock, // tradingEnvironment = mock
				);

				expect(result).toEqual({});
				expect(tradingApiClientModule.sendOrderToAPI).not.toHaveBeenCalled();
				expect(mockContext.logger?.info).toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});

			it('should skip database write when shouldMock is undefined and execution context is execute-step', async () => {
				const result = await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.mock, // tradingEnvironment = mock
				);

				expect(result).toEqual({});
				expect(tradingApiClientModule.sendOrderToAPI).not.toHaveBeenCalled();
				expect(mockContext.logger?.info).toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});

			it('should proceed with database write when shouldMock is undefined, trading mode is paper, and not execute-step', async () => {
				mockContext.getWorkflow = jest.fn(() => ({
					id: 'workflow-123',
					active: true,
					settings: {
						tradingMode: 'paper',
					},
				}));

				(tradingApiClientModule.sendOrderToAPI as jest.Mock).mockResolvedValue({ success: true });

				await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.paper, // tradingEnvironment = paper
				);

				expect(tradingApiClientModule.sendOrderToAPI).toHaveBeenCalled();
				expect(mockContext.logger?.info).not.toHaveBeenCalledWith(
					'Skipping database write for mock mode trade',
				);
			});
		});

		describe('Order tracking data preparation', () => {
			it('should prepare tracking data with correct environment and execution mode', async () => {
				(tradingApiClientModule.sendOrderToAPI as jest.Mock).mockResolvedValue({ success: true });

				(executionContextModule.determineTestModeWithCredentials as jest.Mock).mockReturnValue(
					true,
				);

				await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'paper' },
					undefined,
					undefined,
					TradingEnvironment.paper,
				);

				expect(tradingApiClientModule.sendOrderToAPI).toHaveBeenCalledWith(
					mockContext,
					expect.objectContaining({
						...mockOrderData,
						environment: 'paper',
						executionMode: 'test',
					}),
					'stock',
					undefined,
				);
			});

			it('should pass correct environment to API', async () => {
				(tradingApiClientModule.sendOrderToAPI as jest.Mock).mockResolvedValue({ success: true });

				await trackOrder(
					mockContext,
					mockOrderData,
					'stock',
					{ environment: 'live' },
					undefined,
					TradingEnvironment.live,
				);

				expect(tradingApiClientModule.sendOrderToAPI).toHaveBeenCalledWith(
					mockContext,
					expect.objectContaining({
						environment: 'live',
					}),
					'stock',
					undefined,
				);
			});
		});
	});
});
