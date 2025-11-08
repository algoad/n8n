import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { getTradingExecutionContext, determineTestModeWithCredentials } from './execution-context';

describe('Execution Context Utilities', () => {
	describe('getTradingExecutionContext', () => {
		it('should extract workflow and execution context', () => {
			const mockContext = {
				getWorkflow: jest.fn(() => ({
					id: 'workflow-123',
					active: true,
				})),
				getWorkflowDataProxy: jest.fn(() => ({
					$execution: {
						id: 'execution-123',
						mode: 'production',
					},
				})),
				additionalData: {
					userId: 'user-123',
				},
			} as unknown as IExecuteFunctions;

			const result = getTradingExecutionContext(mockContext);

			expect(result.workflowId).toBe('workflow-123');
			expect(result.executionId).toBe('execution-123');
			expect(result.userId).toBe('user-123');
			expect(result.executionMode).toBe('production');
		});

		it('should detect test mode when execution mode is test', () => {
			const mockContext = {
				getWorkflow: jest.fn(() => ({
					id: 'workflow-123',
					active: true,
				})),
				getWorkflowDataProxy: jest.fn(() => ({
					$execution: {
						id: 'execution-123',
						mode: 'test',
					},
				})),
				additionalData: {
					userId: 'user-123',
				},
			} as unknown as IExecuteFunctions;

			const result = getTradingExecutionContext(mockContext);

			expect(result.executionMode).toBe('test');
			expect(result.isTestMode).toBe(true);
		});

		it('should detect test mode when workflow is not active', () => {
			const mockContext = {
				getWorkflow: jest.fn(() => ({
					id: 'workflow-123',
					active: false,
				})),
				getWorkflowDataProxy: jest.fn(() => ({
					$execution: {
						id: 'execution-123',
						mode: 'production',
					},
				})),
				additionalData: {
					userId: 'user-123',
				},
			} as unknown as IExecuteFunctions;

			const result = getTradingExecutionContext(mockContext);

			expect(result.isTestMode).toBe(true);
		});
	});

	describe('determineTestModeWithCredentials', () => {
		it('should return true when credentials environment is paper', () => {
			const credentials: IDataObject = {
				environment: 'paper',
			};

			const result = determineTestModeWithCredentials(credentials, 'production', true);

			expect(result).toBe(true);
		});

		it('should return true when execution mode is test', () => {
			const credentials: IDataObject = {
				environment: 'live',
			};

			const result = determineTestModeWithCredentials(credentials, 'test', true);

			expect(result).toBe(true);
		});

		it('should return true when workflow is not active', () => {
			const credentials: IDataObject = {
				environment: 'live',
			};

			const result = determineTestModeWithCredentials(credentials, 'production', false);

			expect(result).toBe(true);
		});

		it('should return false when all conditions indicate production', () => {
			const credentials: IDataObject = {
				environment: 'live',
			};

			const result = determineTestModeWithCredentials(credentials, 'production', true);

			expect(result).toBe(false);
		});

		it('should handle undefined credentials', () => {
			const result = determineTestModeWithCredentials(undefined, 'production', true);

			expect(result).toBe(false);
		});
	});
});
